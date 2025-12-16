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

// Markdown configuration from environment variables
export const MARKDOWN_CONFIG = {
  /** Default to Markdown output for read operations (default: false = JSON) */
  defaultForRead: process.env.NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ === "true",
  /** Maximum characters for Markdown output (default: 12000) */
  maxChars: parseInt(process.env.NOTION_MCP_MARKDOWN_MAX_CHARS || "12000", 10),
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

/**
 * Check if Markdown should be the default output format for read operations
 */
export function getMarkdownDefaultForRead(): boolean {
  return MARKDOWN_CONFIG.defaultForRead;
}

/**
 * Get maximum characters for Markdown output
 */
export function getMarkdownMaxChars(): number {
  return MARKDOWN_CONFIG.maxChars;
}
