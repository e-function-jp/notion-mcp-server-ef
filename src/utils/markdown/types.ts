/**
 * Rich text item for Notion API
 */
export interface NotionRichTextItem {
  type: "text";
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

/**
 * Notion block type used for markdown conversion
 * Using a flexible type to accommodate various block types
 */
export type NotionBlock = {
  object?: "block";
  type: string;
  [key: string]: unknown;
};

/**
 * Options for markdown to blocks conversion
 */
export interface MarkdownConversionOptions {
  /** Preserve nested list structure (default: true) */
  preserveNestedLists?: boolean;
}

/**
 * Result of markdown conversion with metadata
 */
export interface MarkdownConversionResult {
  /** Converted Notion blocks */
  blocks: NotionBlock[];
  /** Number of blocks generated */
  blockCount: number;
  /** Warnings encountered during conversion */
  warnings: string[];
}
