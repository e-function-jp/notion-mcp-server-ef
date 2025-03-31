import { z } from "zod";
import { RICH_TEXT_ITEM_REQUEST_SCHEMA } from "./rich-text.js";

// Schema for getting comments
export const GET_COMMENTS_SCHEMA = {
  block_id: z
    .string()
    .describe("The ID of the block or page to get comments from"),
  start_cursor: z
    .string()
    .optional()
    .describe("The cursor to start from for pagination"),
  page_size: z
    .number()
    .optional()
    .describe("Number of comments to return per page"),
};

// Schema for adding a comment to a page
export const ADD_PAGE_COMMENT_SCHEMA = {
  parent: z.object({
    page_id: z.string().describe("The ID of the page to add the comment to"),
  }),
  rich_text: z
    .array(RICH_TEXT_ITEM_REQUEST_SCHEMA)
    .describe("Rich text content for the comment"),
};

// Schema for adding a comment to a discussion
export const ADD_DISCUSSION_COMMENT_SCHEMA = {
  discussion_id: z
    .string()
    .describe("The ID of the discussion to add the comment to"),
  rich_text: z
    .array(RICH_TEXT_ITEM_REQUEST_SCHEMA)
    .describe("Rich text content for the comment"),
};
