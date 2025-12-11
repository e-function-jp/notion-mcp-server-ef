import { type ZodRawShape, type ZodTypeAny } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { server } from "../server/index.js";
import { registerPagesOperationTool } from "./pages.js";
import { registerBlocksOperationTool } from "./blocks.js";
import { registerDatabaseOperationTool } from "./database.js";
import { registerCommentsOperationTool } from "./comments.js";
import { registerUsersOperationTool } from "./users.js";

/**
 * Wrap schema as ZodRawShape to pass type checking without deep inference
 * The schema is still validated at runtime by Zod
 */
const asRawShape = (schema: Record<string, ZodTypeAny>): ZodRawShape => schema as ZodRawShape;

/**
 * Register all tools to a given server instance
 * @param targetServer - The MCP server instance to register tools to
 * 
 * Note: We use dynamic imports and asRawShape helper to avoid TypeScript's 
 * "Type instantiation is excessively deep" error that occurs with SDK 1.24.3
 * when using deeply nested ZodEffects schemas.
 */
export const registerAllToolsForServer = async (targetServer: McpServer) => {
  // Dynamic imports to avoid TypeScript's deep type inference at compile time
  const { PAGES_OPERATION_SCHEMA } = await import("../schema/page.js");
  const { BLOCKS_OPERATION_SCHEMA } = await import("../schema/blocks.js");
  const { DATABASE_OPERATION_SCHEMA } = await import("../schema/database.js");
  const { COMMENTS_OPERATION_SCHEMA } = await import("../schema/comments.js");
  const { USERS_OPERATION_SCHEMA } = await import("../schema/users.js");

  // Use any cast to avoid SDK 1.24.3 type compatibility issues with callback return types
  const registerTool = targetServer.registerTool.bind(targetServer) as any;

  // Register combined pages operation tool
  registerTool(
    "notion_pages",
    {
      description: "Perform various page operations (create, archive, restore, search, update). Actions: create_page, archive_page, restore_page, search_pages, update_page_properties",
      inputSchema: asRawShape(PAGES_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerPagesOperationTool(args as any)
  );

  // Register combined blocks operation tool
  registerTool(
    "notion_blocks",
    {
      description: "Perform various block operations (retrieve, update, delete, append children, batch operations). Actions: retrieve_block, retrieve_block_children, append_block_children, update_block, delete_block, batch_append_block_children, batch_update_blocks, batch_delete_blocks, batch_mixed_operations",
      inputSchema: asRawShape(BLOCKS_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerBlocksOperationTool(args as any)
  );

  // Register combined database operation tool
  registerTool(
    "notion_database",
    {
      description: "Perform various database operations (create, query, update). Actions: create_database, query_database, update_database",
      inputSchema: asRawShape(DATABASE_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerDatabaseOperationTool(args as any)
  );

  // Register combined comments operation tool
  registerTool(
    "notion_comments",
    {
      description: "Perform various comment operations (get, add to page, add to discussion). Actions: get_comments, add_comment_to_page, add_comment_to_discussion",
      inputSchema: asRawShape(COMMENTS_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerCommentsOperationTool(args as any)
  );

  // Register combined users operation tool
  registerTool(
    "notion_users",
    {
      description: "Perform various user operations (list, get, get bot). Actions: list_users, get_user, get_bot",
      inputSchema: asRawShape(USERS_OPERATION_SCHEMA),
    },
    async (args: unknown) => registerUsersOperationTool(args as any)
  );
};

/**
 * Register all tools to the default server instance
 * This is for backward compatibility with stdio mode
 */
export const registerAllTools = async () => {
  await registerAllToolsForServer(server);
};
