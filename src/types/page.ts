import { z } from "zod";
import {
  ARCHIVE_PAGE_SCHEMA,
  CREATE_PAGE_SCHEMA,
  CREATE_PAGE_VALIDATED_SCHEMA,
  RESTORE_PAGE_SCHEMA,
  SEARCH_PAGES_SCHEMA,
  UPDATE_PAGE_PROPERTIES_SCHEMA,
  REWRITE_PAGE_SCHEMA,
  PAGES_OPERATION_SCHEMA,
} from "../schema/page.js";

// Use validated schema with mutual exclusivity refinement for children XOR markdown
export const createPageSchema = CREATE_PAGE_VALIDATED_SCHEMA;
export type CreatePageParams = z.infer<typeof createPageSchema>;

// Also export the raw schema for cases where validation is handled elsewhere
export const createPageSchemaRaw = z.object(CREATE_PAGE_SCHEMA);

export const archivePageSchema = z.object(ARCHIVE_PAGE_SCHEMA);
export type ArchivePageParams = z.infer<typeof archivePageSchema>;

export const restorePageSchema = z.object(RESTORE_PAGE_SCHEMA);
export type RestorePageParams = z.infer<typeof restorePageSchema>;

export const searchPagesSchema = z.object(SEARCH_PAGES_SCHEMA);
export type SearchPagesParams = z.infer<typeof searchPagesSchema>;

export const updatePagePropertiesSchema = z.object(
  UPDATE_PAGE_PROPERTIES_SCHEMA
);
export type UpdatePagePropertiesParams = z.infer<
  typeof updatePagePropertiesSchema
>;

export const rewritePageSchema = z.object(REWRITE_PAGE_SCHEMA);
export type RewritePageParams = z.infer<typeof rewritePageSchema>;

export const pagesOperationSchema = z.object(PAGES_OPERATION_SCHEMA);
export type PagesOperationParams = z.infer<typeof pagesOperationSchema>;
