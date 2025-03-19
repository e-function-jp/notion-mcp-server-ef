import { z } from "zod";
import {
  ARCHIVE_PAGE_SCHEMA,
  CREATE_PAGE_SCHEMA,
  RESTORE_PAGE_SCHEMA,
  SEARCH_PAGES_SCHEMA,
} from "../schema/page.js";

export const createPageSchema = z.object(CREATE_PAGE_SCHEMA);
export type CreatePageParams = z.infer<typeof createPageSchema>;

export const archivePageSchema = z.object(ARCHIVE_PAGE_SCHEMA);
export type ArchivePageParams = z.infer<typeof archivePageSchema>;

export const restorePageSchema = z.object(RESTORE_PAGE_SCHEMA);
export type RestorePageParams = z.infer<typeof restorePageSchema>;

export const searchPagesSchema = z.object(SEARCH_PAGES_SCHEMA);
export type SearchPagesParams = z.infer<typeof searchPagesSchema>;
