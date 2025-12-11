#!/usr/bin/env node
import { getTransportMode } from "./config/index.js";
import { server, createMcpServer } from "./server/index.js";
import { startStdioServer } from "./server/stdio.js";
import { startHttpServer } from "./server/http.js";
import { registerAllTools, registerAllToolsForServer } from "./tools/index.js";

async function main() {
  const mode = getTransportMode();

  try {
    if (mode === "http") {
      // HTTP mode: create a fresh server instance
      const httpServer = createMcpServer();
      await registerAllToolsForServer(httpServer);
      await startHttpServer(httpServer);
    } else {
      // stdio mode: use default server instance (backward compatible)
      await registerAllTools();
      await startStdioServer(server);
    }
  } catch (error) {
    console.error(
      "Unhandled server error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(
    "Unhandled server error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
