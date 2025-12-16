import express, { Request, Response, NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CONFIG, TRANSPORT_CONFIG } from "../config/index.js";
import { randomUUID } from "crypto";

/**
 * Start the MCP server using Streamable HTTP transport
 * This mode is for remote MCP clients (ChatGPT Web, etc.)
 */
export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  // Create transport configuration
  const transportOptions: ConstructorParameters<typeof StreamableHTTPServerTransport>[0] = {
    // Stateless mode (no session management) - set to undefined for stateless
    sessionIdGenerator: TRANSPORT_CONFIG.httpStateful 
      ? () => randomUUID() 
      : undefined,
    // Enable JSON responses (instead of SSE streaming)
    enableJsonResponse: TRANSPORT_CONFIG.httpJsonResponse,
  };

  // Store transports for session management (only used in stateful mode)
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      server: CONFIG.serverName, 
      version: CONFIG.serverVersion,
      mode: "http",
      stateful: TRANSPORT_CONFIG.httpStateful,
    });
  });

  // MCP endpoint - handles POST requests
  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      // Get session ID from header
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      let transport: StreamableHTTPServerTransport;
      let isNewSession = false;
      let newSessionId: string | undefined;

      if (TRANSPORT_CONFIG.httpStateful && sessionId && transports.has(sessionId)) {
        // Reuse existing transport for stateful mode
        transport = transports.get(sessionId)!;
      } else {
        // Generate session ID upfront for stateful mode
        if (TRANSPORT_CONFIG.httpStateful) {
          newSessionId = randomUUID();
          isNewSession = true;
        }
        
        // Create new transport with pre-generated session ID
        const options: ConstructorParameters<typeof StreamableHTTPServerTransport>[0] = {
          sessionIdGenerator: TRANSPORT_CONFIG.httpStateful 
            ? () => newSessionId!
            : undefined,
          enableJsonResponse: TRANSPORT_CONFIG.httpJsonResponse,
        };
        transport = new StreamableHTTPServerTransport(options);
        
        // Connect server to this transport
        await server.connect(transport);
        
        // In stateful mode, store the transport immediately with our known session ID
        if (TRANSPORT_CONFIG.httpStateful && newSessionId) {
          transports.set(newSessionId, transport);
          
          // Clean up on close
          transport.onclose = () => {
            if (newSessionId) {
              transports.delete(newSessionId);
            }
          };
        }
      }

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("HTTP request error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // Handle GET requests for SSE streams (optional, for SSE-supporting clients)
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (!TRANSPORT_CONFIG.httpStateful || !sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "SSE streams require stateful mode with valid session ID",
        },
        id: null,
      });
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // Handle DELETE for session cleanup
  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
      res.status(200).json({ status: "session closed" });
    } else {
      res.status(404).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Session not found",
        },
        id: null,
      });
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Express error:", err);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
      },
      id: null,
    });
  });

  // Start the server
  const port = TRANSPORT_CONFIG.httpPort;
  app.listen(port, () => {
    console.error(
      `${CONFIG.serverName} v${CONFIG.serverVersion} running on http://localhost:${port}/mcp`
    );
    console.error(`  Mode: ${TRANSPORT_CONFIG.httpStateful ? "stateful" : "stateless"}`);
    console.error(`  JSON Response: ${TRANSPORT_CONFIG.httpJsonResponse}`);
  });
}
