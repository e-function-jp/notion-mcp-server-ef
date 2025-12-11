# Streamable HTTP Transport Support Plan

## Document Information

- **Project**: notion-mcp-server-ef
- **Feature**: Optional Streamable HTTP Transport for Remote MCP Clients
- **Created**: 2024-12-11
- **Updated**: 2024-12-11
- **Status**: Planning
- **MCP SDK Version**: 1.24.3+ (required for Streamable HTTP)

---

## 1. Overview

### 1.1 Background

現在の `notion-mcp-server` は **stdio** トランスポートのみをサポートしています。
これは Claude Desktop や Cursor などのローカルMCPクライアントでは問題ありませんが、
**ChatGPT Web版** などのリモートMCPクライアントでは使用できません。

### 1.2 Why Streamable HTTP over SSE?

MCP SDK 1.24.3 では新しい **Streamable HTTP Transport** が導入されました。

| 特徴 | SSE Transport | Streamable HTTP Transport |
|------|---------------|--------------------------|
| **エンドポイント** | GET /sse + POST /message | 単一 POST /mcp |
| **レスポンス形式** | SSEストリームのみ | JSON または SSE 選択可能 |
| **セッション管理** | 必須 | オプション（Stateless可能） |
| **プロトコル** | MCP 2024年仕様 | MCP 2025年仕様（最新） |
| **インフラ互換性** | Long-polling対応必要 | 通常のHTTPで動作可能 |
| **Resumability** | なし | EventStore で対応可能 |

**選択理由:**
1. **シンプルなインフラ** - 通常のHTTPサーバーで動作、nginx等との互換性が高い
2. **Statelessモード** - セッション管理不要でスケーラブル
3. **JSON応答オプション** - `enableJsonResponse: true` でプレーンHTTP
4. **最新仕様準拠** - MCP 2025年仕様に対応

### 1.3 Goals

1. **Streamable HTTP トランスポートをオプション機能として追加**
2. **既存の stdio モードを維持**（後方互換性）
3. **環境変数でモードを切り替え可能に**
4. **ChatGPT Web版のMCP対応を実現**
5. **Stateless/Stateful両モードをサポート**

### 1.4 Non-Goals

- WebSocket対応
- 認証機能の実装（将来のフェーズで検討）
- EventStore によるResumability（将来のフェーズで検討）

---

## 2. Architecture

### 2.1 Transport Mode Selection

```
                    ┌─────────────────────────────────┐
                    │         Environment             │
                    │  MCP_TRANSPORT_MODE=stdio|http  │
                    └─────────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │         src/index.ts            │
                    │    (Transport Mode Router)      │
                    └─────────────────────────────────┘
                          │                    │
              ┌───────────┘                    └───────────┐
              ▼                                            ▼
    ┌─────────────────────┐                  ┌─────────────────────────────┐
    │   Stdio Transport   │                  │   Streamable HTTP Transport │
    │   (Default Mode)    │                  │      (Optional Mode)        │
    │                     │                  │                             │
    │  StdioServerTransport                  │  Express + StreamableHTTP   │
    └─────────────────────┘                  │  StreamableHTTPServerTransport
                                             └─────────────────────────────┘
```

### 2.2 HTTP Server Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              HTTP Server (Express)                              │
│               Port: 3000 (configurable)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /mcp                                                      │
│    ├─ Receive JSON-RPC request                                  │
│    ├─ Process via StreamableHTTPServerTransport                 │
│    └─ Return JSON response (or SSE stream if needed)            │
│                                                                 │
│  GET /mcp (optional, for SSE notifications)                     │
│    └─ Server-initiated notifications stream                     │
│                                                                 │
│  DELETE /mcp (optional, for session termination)                │
│    └─ Close session (Stateful mode only)                        │
│                                                                 │
│  GET /health                                                    │
│    └─ Health check endpoint                                     │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 Stateless vs Stateful Mode

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Stateless Mode (Default)                         │
│  sessionIdGenerator: undefined                                       │
├─────────────────────────────────────────────────────────────────────┤
│  • No session ID in responses                                        │
│  • No session validation                                             │
│  • Each request is independent                                       │
│  • Simpler, more scalable                                            │
│  • Suitable for: Load-balanced environments, simple use cases        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Stateful Mode (Optional)                         │
│  sessionIdGenerator: () => randomUUID()                              │
├─────────────────────────────────────────────────────────────────────┤
│  • Session ID included in Mcp-Session-Id header                      │
│  • Session validation on subsequent requests                         │
│  • State maintained in memory                                        │
│  • Supports GET for server-initiated notifications                   │
│  • Suitable for: Long-running operations, complex workflows          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Details

### 3.1 Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.24.3",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

**Note**: 
- MCP SDK を 1.9.0 → 1.24.3 にアップグレード必須
- `raw-body` と `content-type` は SDK の依存関係として含まれる

### 3.2 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT_MODE` | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_HTTP_PORT` | `3000` | HTTP server port (when mode=http) |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP server bind address |
| `MCP_HTTP_ENDPOINT` | `/mcp` | MCP endpoint path |
| `MCP_HTTP_STATEFUL` | `false` | Enable stateful session mode |
| `MCP_HTTP_JSON_RESPONSE` | `true` | Use JSON instead of SSE for responses |
| `NOTION_TOKEN` | (required) | Notion API key |
| `NOTION_PAGE_ID` | (required) | Root Notion page ID |

### 3.3 File Structure

```
src/
├── index.ts                    # Entry point (mode router)
├── config/
│   └── index.ts                # Add transport config
├── server/
│   ├── index.ts                # McpServer factory (refactored)
│   ├── stdio.ts                # Stdio transport (extracted)
│   └── http.ts                 # NEW: Streamable HTTP transport
└── ...
```

### 3.4 Code Implementation

#### 3.4.1 Config Updates (`src/config/index.ts`)

```typescript
export type TransportMode = "stdio" | "http";

export const CONFIG = {
  serverName: "notion-mcp-server",
  serverVersion: "1.0.2",
};

export const TRANSPORT_CONFIG = {
  mode: (process.env.MCP_TRANSPORT_MODE || "stdio") as TransportMode,
  http: {
    port: parseInt(process.env.MCP_HTTP_PORT || "3000", 10),
    host: process.env.MCP_HTTP_HOST || "0.0.0.0",
    endpoint: process.env.MCP_HTTP_ENDPOINT || "/mcp",
    stateful: process.env.MCP_HTTP_STATEFUL === "true",
    jsonResponse: process.env.MCP_HTTP_JSON_RESPONSE !== "false", // default true
  },
};

export function getTransportMode(): TransportMode {
  const mode = process.env.MCP_TRANSPORT_MODE || "stdio";
  if (mode !== "stdio" && mode !== "http") {
    console.warn(`Invalid MCP_TRANSPORT_MODE: ${mode}, falling back to stdio`);
    return "stdio";
  }
  return mode;
}
```

#### 3.4.2 McpServer Factory (`src/server/index.ts`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG } from "../config/index.js";

// Factory function to create new MCP server instances
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
      instructions: `MCP server for Notion. Supports page, block, database, comment, and user operations.`,
    }
  );
}

// For backward compatibility with stdio mode
export const server = createMcpServer();
```

#### 3.4.3 Stdio Transport (`src/server/stdio.ts`)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./index.js";
import { CONFIG } from "../config/index.js";

export async function startStdioServer() {
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
```

#### 3.4.4 Streamable HTTP Transport (`src/server/http.ts`)

```typescript
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./index.js";
import { CONFIG, TRANSPORT_CONFIG } from "../config/index.js";
import { registerAllToolsForServer } from "../tools/index.js";

// Store active transports for stateful mode
const transports = new Map<string, StreamableHTTPServerTransport>();

export async function startHttpServer() {
  const app = express();
  
  // Parse JSON for POST requests
  app.use(express.json());

  const { endpoint, stateful, jsonResponse } = TRANSPORT_CONFIG.http;

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      server: CONFIG.serverName, 
      version: CONFIG.serverVersion,
      transport: "streamable-http",
      stateful,
    });
  });

  // Handle all MCP requests (POST, GET, DELETE)
  app.all(endpoint, async (req: Request, res: Response) => {
    // For stateful mode, check if we have an existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (stateful && sessionId && transports.has(sessionId)) {
      // Reuse existing transport for this session
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Create new transport for this request/session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: stateful ? () => randomUUID() : undefined,
      enableJsonResponse: jsonResponse,
      onsessioninitialized: (newSessionId) => {
        console.error(`Session initialized: ${newSessionId}`);
        if (stateful) {
          transports.set(newSessionId, transport);
        }
      },
      onsessionclosed: (closedSessionId) => {
        console.error(`Session closed: ${closedSessionId}`);
        transports.delete(closedSessionId);
      },
    });

    // Create new MCP server and register tools
    const mcpServer = createMcpServer();
    registerAllToolsForServer(mcpServer);

    // Connect server to transport
    await mcpServer.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, req.body);

    // For stateless mode, clean up after request
    if (!stateful) {
      // Transport will be garbage collected
    }
  });

  // Start server
  const { port, host } = TRANSPORT_CONFIG.http;
  
  app.listen(port, host, () => {
    console.error(
      `${CONFIG.serverName} v${CONFIG.serverVersion} running on http://${host}:${port}`
    );
    console.error(`MCP endpoint: http://${host}:${port}${endpoint}`);
    console.error(`Mode: ${stateful ? "Stateful" : "Stateless"}`);
    console.error(`Response format: ${jsonResponse ? "JSON" : "SSE"}`);
  });
}
```

#### 3.4.5 Updated Entry Point (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { getTransportMode } from "./config/index.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  const mode = getTransportMode();
  
  try {
    if (mode === "http") {
      // Dynamic import to avoid loading express when not needed
      const { startHttpServer } = await import("./server/http.js");
      await startHttpServer();
    } else {
      // Default: stdio mode
      registerAllTools();
      const { startStdioServer } = await import("./server/stdio.js");
      await startStdioServer();
    }
  } catch (error) {
    console.error(
      "Server error:",
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
```

### 3.5 Tool Registration Refactoring

現在の `registerAllTools()` はグローバルな `server` インスタンスに登録しています。
HTTPモードでは各リクエスト/セッションに独立したサーバーインスタンスが必要なため、
引数でサーバーを受け取る関数を追加します。

```typescript
// src/tools/index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { server } from "../server/index.js";
// ... other imports

// Original function for backward compatibility (stdio mode)
export const registerAllTools = () => {
  registerAllToolsForServer(server);
};

// New function that accepts server instance (http mode)
export const registerAllToolsForServer = (serverInstance: McpServer) => {
  serverInstance.tool(
    "notion_pages",
    "Perform various page operations",
    PAGES_OPERATION_SCHEMA,
    registerPagesOperationTool
  );

  serverInstance.tool(
    "notion_blocks",
    "Perform various block operations",
    BLOCKS_OPERATION_SCHEMA,
    registerBlocksOperationTool
  );

  // ... register all other tools
};
```

---

## 4. Task List

### Phase 1: Core HTTP Support

| Task ID | Priority | Description |
|---------|----------|-------------|
| H1-T01 | P0 | Upgrade MCP SDK to ^1.24.3 |
| H1-T02 | P0 | Add `express` and `@types/express` dependencies |
| H1-T03 | P0 | Add transport config to `src/config/index.ts` |
| H1-T04 | P0 | Refactor `src/server/index.ts` to export McpServer factory |
| H1-T05 | P0 | Extract stdio transport to `src/server/stdio.ts` |
| H1-T06 | P0 | Refactor `registerAllTools` to support server parameter |
| H1-T07 | P0 | Create `src/server/http.ts` with Streamable HTTP transport |
| H1-T08 | P0 | Update `src/index.ts` as mode router |
| H1-T09 | P0 | Test stdio mode still works |
| H1-T10 | P0 | Test HTTP mode with curl |

### Phase 2: Enhancements (Optional)

| Task ID | Priority | Description |
|---------|----------|-------------|
| H2-T01 | P1 | Add `/health` endpoint |
| H2-T02 | P1 | Add graceful shutdown handling |
| H2-T03 | P2 | Add request logging middleware |
| H2-T04 | P2 | Add error handling middleware |
| H2-T05 | P2 | Add CORS configuration (if needed for browser clients) |

### Phase 3: Documentation

| Task ID | Priority | Description |
|---------|----------|-------------|
| H3-T01 | P1 | Update README.md with HTTP mode instructions |
| H3-T02 | P1 | Update/Create `.env.example` with new variables |
| H3-T03 | P1 | Add ChatGPT Web setup instructions |

---

## 5. Usage Examples

### 5.1 Stdio Mode (Default)

```bash
# No changes needed - works as before
NOTION_TOKEN=xxx NOTION_PAGE_ID=yyy npx notion-mcp-server
```

### 5.2 HTTP Mode (Stateless - Recommended)

```bash
# Start in HTTP mode with JSON responses
MCP_TRANSPORT_MODE=http \
MCP_HTTP_PORT=3000 \
MCP_HTTP_JSON_RESPONSE=true \
NOTION_TOKEN=xxx \
NOTION_PAGE_ID=yyy \
node build/index.js
```

### 5.3 HTTP Mode (Stateful)

```bash
# Start in HTTP mode with session management
MCP_TRANSPORT_MODE=http \
MCP_HTTP_PORT=3000 \
MCP_HTTP_STATEFUL=true \
NOTION_TOKEN=xxx \
NOTION_PAGE_ID=yyy \
node build/index.js
```

### 5.4 ChatGPT Web MCP Configuration

ChatGPT開発者設定でMCPサーバーを追加する際：

```
URL: https://your-server.example.com:3000/mcp
```

**Note**: HTTPSが必要な場合は、nginx等のリバースプロキシでTLS終端を行う。

### 5.5 Testing with curl

```bash
# Initialize and call a tool in one request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test", "version": "1.0" }
    }
  }'
```

### 5.6 Docker / systemd

```yaml
# docker-compose.yml
services:
  notion-mcp:
    build: .
    environment:
      - MCP_TRANSPORT_MODE=http
      - MCP_HTTP_PORT=3000
      - MCP_HTTP_JSON_RESPONSE=true
      - NOTION_TOKEN=${NOTION_TOKEN}
      - NOTION_PAGE_ID=${NOTION_PAGE_ID}
    ports:
      - "3000:3000"
```

---

## 6. Testing

### 6.1 Manual Testing

```bash
# 1. Start HTTP server
MCP_TRANSPORT_MODE=http node build/index.js

# 2. Test health endpoint
curl http://localhost:3000/health

# 3. Test MCP initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# 4. Test tools/list
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### 6.2 Integration Testing

1. Start server in HTTP mode
2. Connect from ChatGPT Web MCP
3. Execute Notion operations
4. Verify results in Notion

---

## 7. Security Considerations

### 7.1 Current Scope (MVP)

- **No authentication**: Assumes network-level security (VPN, firewall, reverse proxy)
- **Single tenant**: One Notion account per server instance
- **HTTPS via proxy**: Use nginx/caddy for TLS termination

### 7.2 Future Enhancements

- API key authentication header
- OAuth2 for multi-tenant support
- Rate limiting
- Request validation
- DNS rebinding protection (use `allowedHosts` / `allowedOrigins` options)

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SDK upgrade breaking changes | Medium | Test all existing functionality |
| Express adds bundle size | Low | Dynamic import, only load when HTTP mode |
| Memory usage in stateful mode | Medium | Session timeout + cleanup |
| Breaking existing stdio usage | High | Default mode = stdio, extensive testing |
| ChatGPT compatibility | Medium | Test with actual ChatGPT MCP client |

---

## 9. Rollback Plan

1. If HTTP mode causes issues, users can continue using `MCP_TRANSPORT_MODE=stdio`
2. HTTP transport is completely isolated in `src/server/http.ts`
3. Can downgrade SDK if critical issues (not recommended)

---

## 10. Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Core HTTP | 2-3 hours |
| Phase 2: Enhancements | 1-2 hours |
| Phase 3: Documentation | 30 min |
| Testing & Debugging | 1-2 hours |
| **Total** | **4-7 hours** |

---

## 11. Implementation Notes: Challenges & Solutions

### 11.1 SDK 1.24.3 Type Inference Overflow

**問題**: MCP SDK 1.24.3 にアップグレード後、`tool()` メソッドでZodスキーマを渡すとTypeScriptコンパイラがメモリ不足（OOM）または "Type instantiation is excessively deep and possibly infinite" エラーを発生。

**原因**: 
- 既存のZodスキーマが `z.preprocess()`, `z.discriminatedUnion()`, `z.transform()` などの `ZodEffects` を深くネストしている
- SDK 1.24.3 の `tool()` メソッドは `ZodRawShapeCompat` 型を期待し、渡されたスキーマの型を推論しようとする
- 深くネストされた `ZodEffects` の型推論でTypeScriptコンパイラがスタックオーバーフロー

**試行錯誤**:
1. ❌ `z.object(SCHEMA).passthrough()` でラップ → 同じOOMエラー
2. ❌ `require()` で動的ロードして `any` キャスト → ES moduleで `require` 使用不可
3. ❌ `zodToJsonSchema` でJSONスキーマに変換 → SDKが期待するのはZodインスタンス
4. ✅ 動的インポート + `registerTool` メソッドへの `any` キャスト

**解決策**:

```typescript
// src/tools/index.ts

import { type ZodRawShape, type ZodTypeAny } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 型推論を回避するヘルパー
const asRawShape = (schema: Record<string, ZodTypeAny>): ZodRawShape => 
  schema as ZodRawShape;

export const registerAllToolsForServer = async (targetServer: McpServer) => {
  // 動的インポートでコンパイル時の型推論を回避
  const { PAGES_OPERATION_SCHEMA } = await import("../schema/page.js");
  // ... 他のスキーマも同様

  // any キャストで型チェックをバイパス
  const registerTool = targetServer.registerTool.bind(targetServer) as any;

  registerTool(
    "notion_pages",
    {
      description: "...",
      inputSchema: asRawShape(PAGES_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerPagesOperationTool(args as any)
  );
  // ... 他のツールも同様
};
```

**ポイント**:
- `await import()` を使用してスキーマを動的にロード（静的インポートだとコンパイル時に型解析される）
- `targetServer.registerTool.bind(targetServer) as any` で型チェックを完全にバイパス
- 関数は `async` に変更し、呼び出し側で `await` が必要

### 11.2 ES Module での require() 使用不可

**問題**: `package.json` に `"type": "module"` が設定されているため、`require()` は使用できない。

**エラー**:
```
ReferenceError: require is not defined in ES module scope
```

**解決策**: `require()` の代わりに `await import()` を使用。

### 11.3 CallToolResult の型変更

**問題**: SDK 1.24.3 では `CallToolResult` の `content` 配列の型が変更され、`type: string` ではなく `type: "text"` (リテラル型) を期待。

**解決策**: コールバックの戻り値型を `any` でキャストして既存のハンドラーをそのまま使用。

### 11.4 Accept ヘッダーの要件

**問題**: Streamable HTTP Transport では `Accept: application/json, text/event-stream` ヘッダーが必要。`application/json` のみでは "Not Acceptable" エラー。

**解決策**: curlテスト時に適切なヘッダーを指定:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '...'
```

### 11.5 Express バージョン

**実装時の変更**: 計画では Express 4.x を使用予定だったが、実装時に Express 5.2.1 を採用。Express 5 はPromiseベースのエラーハンドリングをネイティブサポート。

---

## 12. Final Implementation Status

### 12.1 Completed Tasks

| Task ID | Status | Notes |
|---------|--------|-------|
| H1-T01 | ✅ Done | SDK 1.9.0 → 1.24.3 |
| H1-T02 | ✅ Done | express 5.2.1, @types/express 5.0.6 |
| H1-T03 | ✅ Done | TransportMode, TRANSPORT_CONFIG 追加 |
| H1-T04 | ✅ Done | createMcpServer() factory 追加 |
| H1-T05 | ✅ Done | src/server/stdio.ts 作成 |
| H1-T06 | ✅ Done | registerAllToolsForServer() 追加、async化 |
| H1-T07 | ✅ Done | src/server/http.ts 作成 |
| H1-T08 | ✅ Done | src/index.ts をモードルーターに変更 |
| H1-T09 | ✅ Done | stdio モード動作確認 |
| H1-T10 | ✅ Done | HTTP モード curl テスト成功 |
| H2-T01 | ✅ Done | /health エンドポイント実装済み |

### 12.2 Verification Results

```bash
# stdio mode
$ echo '...' | NOTION_TOKEN=dummy NOTION_PAGE_ID=dummy node build/index.js
notion-mcp-server v1.0.1 running on stdio
# Tools: notion_pages, notion_blocks, notion_database, notion_comments, notion_users ✅

# HTTP mode
$ MCP_TRANSPORT_MODE=http MCP_HTTP_PORT=3002 node build/index.js
notion-mcp-server v1.0.1 running on http://localhost:3002/mcp
  Mode: stateless
  JSON Response: true

$ curl -s http://localhost:3002/health
{"status":"ok","server":"notion-mcp-server","version":"1.0.1","mode":"http","stateful":false}

$ curl -s -X POST http://localhost:3002/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
# Returns 5 tools with payload schema ✅
```

### 12.3 Key Differences from Original Plan

| Item | Planned | Actual |
|------|---------|--------|
| Express version | 4.21.0 | 5.2.1 |
| Tool registration | `tool()` method | `registerTool()` with any cast |
| Schema handling | Direct pass | Dynamic import + asRawShape helper |
| registerAllTools | Sync function | Async function |

### 12.4 Remaining Work

- [ ] H2-T02: Graceful shutdown handling
- [ ] H2-T03: Request logging middleware
- [ ] H2-T04: Error handling middleware
- [ ] H3-T01: README.md update
- [ ] H3-T02: .env.example creation
- [ ] H3-T03: ChatGPT Web setup instructions
