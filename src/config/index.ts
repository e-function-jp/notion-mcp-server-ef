// Transport mode type
export type TransportMode = "stdio" | "http";

// Configuration
export const CONFIG = {
  serverName: "notion-mcp-server",
  serverVersion: "1.0.1",
};

// Transport configuration from environment variables
export const TRANSPORT_CONFIG = {
  mode: (process.env.MCP_TRANSPORT_MODE || "stdio") as TransportMode,
  httpPort: parseInt(process.env.MCP_HTTP_PORT || "3000", 10),
  httpStateful: process.env.MCP_HTTP_STATEFUL === "true",
  httpJsonResponse: process.env.MCP_HTTP_JSON_RESPONSE !== "false", // default true
};

/**
 * Get the current transport mode from environment
 */
export function getTransportMode(): TransportMode {
  const mode = TRANSPORT_CONFIG.mode;
  if (mode !== "stdio" && mode !== "http") {
    console.warn(`Unknown transport mode "${mode}", falling back to stdio`);
    return "stdio";
  }
  return mode;
}
