import { z } from "zod";
import { getRootPageId } from "../services/notion.js";
import { ICON_SCHEMA } from "./icon.js";
import { TEXT_BLOCK_REQUEST_SCHEMA } from "./blocks.js";
import { preprocessJson } from "./preprocess.js";
import { TEXT_CONTENT_REQUEST_SCHEMA } from "./rich-text.js";
import { FILE_SCHEMA } from "./file.js";

export const TITLE_PROPERTY_SCHEMA = z.object({
  title: z
    .array(
      z.object({
        text: TEXT_CONTENT_REQUEST_SCHEMA.describe(
          "Text content for title segment"
        ),
      })
    )
    .describe("Array of text segments that make up the title"),
});

export const PARENT_SCHEMA = z.preprocess(
  (val) => (typeof val === "string" ? JSON.parse(val) : val),
  z.union([
    z.object({
      type: z.literal("page_id").describe("Parent type for page"),
      page_id: z.string().describe("ID of the parent page"),
    }),
    z.object({
      type: z.literal("database_id").describe("Parent type for database"),
      database_id: z.string().describe("ID of the parent database"),
    }),
  ])
);

export const CREATE_PAGE_SCHEMA = {
  parent: PARENT_SCHEMA.optional()
    .default({
      type: "page_id",
      page_id: getRootPageId(),
    })
    .describe(
      "Optional parent - if not provided, will use NOTION_PAGE_ID as parent page"
    ),
  properties: z
    .object({
      title: TITLE_PROPERTY_SCHEMA.describe("The title of the page"),
    })
    .describe("Properties of the page"),
  children: z
    .array(TEXT_BLOCK_REQUEST_SCHEMA)
    .optional()
    .describe("Optional array of paragraph blocks to add as page content"),
  icon: z.preprocess(
    preprocessJson,
    ICON_SCHEMA.nullable().optional().describe("Optional icon for the page")
  ),
  cover: z.preprocess(
    preprocessJson,
    FILE_SCHEMA.nullable()
      .optional()
      .describe("Optional cover image for the page")
  ),
};

export const ARCHIVE_PAGE_SCHEMA = {
  pageId: z.string().describe("The ID of the page to archive"),
};

export const RESTORE_PAGE_SCHEMA = {
  pageId: z.string().describe("The ID of the page to restore"),
};

export const SEARCH_PAGES_SCHEMA = {
  query: z.string().optional().describe("Search query for filtering by title"),
  sort: z
    .object({
      direction: z.enum(["ascending", "descending"]),
      timestamp: z.literal("last_edited_time"),
    })
    .optional()
    .describe("Sort order for results"),
  start_cursor: z.string().optional().describe("Cursor for pagination"),
  page_size: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results to return (1-100)"),
};
