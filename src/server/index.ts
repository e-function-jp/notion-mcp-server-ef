import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG } from "../config/index.js";

/**
 * Create a new MCP server instance with standard configuration
 */
export function createMcpServer(): McpServer {
  return new McpServer(
    {
      name: CONFIG.serverName,
      version: CONFIG.serverVersion,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
      instructions: `
        MCP server for the Notion.
        It is used to create, update and delete Notion entities.
      `,
    }
  );
}

// Default server instance for backward compatibility (stdio mode)
export const server = createMcpServer();

