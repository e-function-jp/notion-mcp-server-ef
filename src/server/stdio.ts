import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CONFIG } from "../config/index.js";

/**
 * Start the MCP server using stdio transport
 * This is the classic mode for local MCP clients (Claude Desktop, etc.)
 */
export async function startStdioServer(server: McpServer): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(
      `${CONFIG.serverName} v${CONFIG.serverVersion} running on stdio`
    );
  } catch (error) {
    console.error(
      "Stdio server initialization error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
