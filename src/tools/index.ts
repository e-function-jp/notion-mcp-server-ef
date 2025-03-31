import { server } from "../server/index.js";
import {
  CREATE_PAGE_SCHEMA,
  ARCHIVE_PAGE_SCHEMA,
  RESTORE_PAGE_SCHEMA,
  SEARCH_PAGES_SCHEMA,
  UPDATE_PAGE_PROPERTIES_SCHEMA,
} from "../schema/page.js";
import {
  APPEND_BLOCK_CHILDREN_SCHEMA,
  RETRIEVE_BLOCK_SCHEMA,
  RETRIEVE_BLOCK_CHILDREN_SCHEMA,
  UPDATE_BLOCK_SCHEMA,
  DELETE_BLOCK_SCHEMA,
  BATCH_APPEND_BLOCK_CHILDREN_SCHEMA,
  BATCH_UPDATE_BLOCKS_SCHEMA,
  BATCH_DELETE_BLOCKS_SCHEMA,
  BATCH_MIXED_OPERATIONS_SCHEMA,
} from "../schema/blocks.js";
import {
  CREATE_DATABASE_SCHEMA,
  QUERY_DATABASE_SCHEMA,
  UPDATE_DATABASE_SCHEMA,
} from "../schema/database.js";
import { archivePage, restorePage } from "./updatePage.js";
import { registerCreatePageTool } from "./createPage.js";
import { searchPages } from "./searchPage.js";
import { appendBlockChildren } from "./appendBlockChildren.js";
import { retrieveBlock } from "./retrieveBlock.js";
import { retrieveBlockChildren } from "./retrieveBlockChildren.js";
import { updateBlock } from "./updateBlock.js";
import { deleteBlock } from "./deleteBlock.js";
import { batchAppendBlockChildren } from "./batchAppendBlockChildren.js";
import { batchUpdateBlocks } from "./batchUpdateBlocks.js";
import { batchDeleteBlocks } from "./batchDeleteBlocks.js";
import { batchMixedOperations } from "./batchMixedOperations.js";
import { createDatabase } from "./createDatabase.js";
import { queryDatabase } from "./queryDatabase.js";
import { updateDatabase } from "./updateDatabase.js";
import { updatePageProperties } from "./updatePageProperties.js";
import {
  registerAddDiscussionCommentTool,
  registerAddPageCommentTool,
  registerGetCommentsTool,
} from "./comments.js";
import {
  ADD_DISCUSSION_COMMENT_SCHEMA,
  ADD_PAGE_COMMENT_SCHEMA,
  GET_COMMENTS_SCHEMA,
} from "../schema/comments.js";
import { registerGetListUsersTool } from "./users.js";
import { LIST_USERS_SCHEMA } from "../schema/users.js";
import { registerGetBotUserTool, registerGetUserTool } from "./users.js";
import { GET_USER_SCHEMA } from "../schema/users.js";

export const registerAllTools = () => {
  server.tool(
    "create_page",
    "Create a new page in Notion",
    CREATE_PAGE_SCHEMA,
    registerCreatePageTool
  );

  server.tool(
    "archive_page",
    "Archive (trash) a Notion page",
    ARCHIVE_PAGE_SCHEMA,
    archivePage
  );

  server.tool(
    "update_page_properties",
    "Update the properties of a Notion page",
    UPDATE_PAGE_PROPERTIES_SCHEMA,
    updatePageProperties
  );

  server.tool(
    "restore_page",
    "Restore a previously archived Notion page",
    RESTORE_PAGE_SCHEMA,
    restorePage
  );

  server.tool(
    "search_pages",
    "Search for pages and databases in Notion by title",
    SEARCH_PAGES_SCHEMA,
    searchPages
  );

  server.tool(
    "append_block_children",
    "Append child blocks to a parent block in Notion",
    APPEND_BLOCK_CHILDREN_SCHEMA,
    appendBlockChildren
  );

  server.tool(
    "retrieve_block",
    "Retrieve a block from Notion by ID",
    RETRIEVE_BLOCK_SCHEMA,
    retrieveBlock
  );

  server.tool(
    "retrieve_block_children",
    "Retrieve the children of a block from Notion",
    RETRIEVE_BLOCK_CHILDREN_SCHEMA,
    retrieveBlockChildren
  );

  server.tool(
    "update_block",
    "Update a block's content in Notion",
    UPDATE_BLOCK_SCHEMA,
    updateBlock
  );

  server.tool(
    "delete_block",
    "Delete (move to trash) a block in Notion",
    DELETE_BLOCK_SCHEMA,
    deleteBlock
  );

  // Register database tools
  server.tool(
    "create_database",
    "Create a new database in Notion",
    CREATE_DATABASE_SCHEMA,
    createDatabase
  );

  server.tool(
    "query_database",
    "Query a database in Notion",
    QUERY_DATABASE_SCHEMA,
    queryDatabase
  );

  server.tool(
    "update_database",
    "Update a database in Notion",
    UPDATE_DATABASE_SCHEMA,
    updateDatabase
  );

  // Register batch operation tools
  server.tool(
    "batch_append_block_children",
    "Append children to multiple blocks in a single operation",
    BATCH_APPEND_BLOCK_CHILDREN_SCHEMA,
    batchAppendBlockChildren
  );
  server.tool(
    "batch_update_blocks",
    "Update multiple blocks in a single operation",
    BATCH_UPDATE_BLOCKS_SCHEMA,
    batchUpdateBlocks
  );

  server.tool(
    "batch_delete_blocks",
    "Delete multiple blocks in a single operation",
    BATCH_DELETE_BLOCKS_SCHEMA,
    batchDeleteBlocks
  );

  server.tool(
    "batch_mixed_operations",
    "Perform a mix of append, update, and delete operations in a single request",
    BATCH_MIXED_OPERATIONS_SCHEMA,
    batchMixedOperations
  );

  server.tool(
    "get_comments",
    "Get comments for a page or discussion",
    GET_COMMENTS_SCHEMA,
    registerGetCommentsTool
  );

  server.tool(
    "add_page_comment",
    "Add a comment to a page",
    ADD_PAGE_COMMENT_SCHEMA,
    registerAddPageCommentTool
  );

  server.tool(
    "add_discussion_comment",
    "Add a comment to a discussion",
    ADD_DISCUSSION_COMMENT_SCHEMA,
    registerAddDiscussionCommentTool
  );

  server.tool(
    "get_list_users",
    "Get a list of users in Notion",
    LIST_USERS_SCHEMA,
    registerGetListUsersTool
  );

  server.tool(
    "get_user",
    "Get a user in Notion",
    GET_USER_SCHEMA,
    registerGetUserTool
  );

  server.tool(
    "get_bot_user",
    "Get the bot user in Notion",
    {},
    registerGetBotUserTool
  );
};
