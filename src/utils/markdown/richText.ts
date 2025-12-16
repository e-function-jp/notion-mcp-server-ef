import type { NotionRichTextItem } from "./types.js";

/** Maximum characters per rich_text item (Notion API limit) */
const MAX_RICH_TEXT_LENGTH = 2000;

/**
 * Strips inline Markdown formatting from text.
 * Removes: **bold**, *italic*, __bold__, _italic_, `code`, [links](url), ~~strikethrough~~
 * 
 * @param text - Text with potential Markdown formatting
 * @returns Plain text without formatting
 */
export function stripInlineMarkdown(text: string): string {
  if (!text) return "";
  
  return text
    // Remove images first (before links) - ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Remove links - [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove bold/italic combined - ***text*** or ___text___
    .replace(/(\*\*\*|___)(.+?)\1/g, "$2")
    // Remove bold - **text** or __text__
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    // Remove italic - *text* or _text_
    .replace(/(\*|_)(.+?)\1/g, "$2")
    // Remove strikethrough - ~~text~~
    .replace(/~~(.+?)~~/g, "$1")
    // Remove inline code - `code`
    .replace(/`([^`]+)`/g, "$1")
    // Clean up any remaining escape characters
    .replace(/\\([*_`~\[\]])/g, "$1");
}

/**
 * Splits text into chunks that fit within Notion's rich_text length limit.
 * 
 * @param text - Text to split
 * @param maxLength - Maximum length per chunk (default: 2000)
 * @returns Array of text chunks
 */
function splitTextIntoChunks(text: string, maxLength: number = MAX_RICH_TEXT_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a space or punctuation near the limit
    let splitIndex = maxLength;
    const searchStart = Math.max(0, maxLength - 100);
    
    for (let i = maxLength - 1; i >= searchStart; i--) {
      if (/[\s.,;:!?]/.test(remaining[i])) {
        splitIndex = i + 1;
        break;
      }
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex);
  }

  return chunks;
}

/**
 * Creates a plain text rich_text array from a string.
 * Strips Markdown formatting and handles Notion's 2000-character limit.
 * 
 * @param text - Input text (may contain Markdown formatting)
 * @returns Array of RichTextItemRequest objects
 */
export function createPlainTextRichText(text: string): NotionRichTextItem[] {
  if (text === null || text === undefined) {
    return [];
  }

  const plainText = stripInlineMarkdown(text);
  
  // Handle empty string - Notion requires non-empty rich_text for text blocks
  if (plainText.length === 0) {
    return [{
      type: "text" as const,
      text: { content: "" }
    }];
  }

  // Split into chunks if necessary
  const chunks = splitTextIntoChunks(plainText);
  
  return chunks.map(chunk => ({
    type: "text" as const,
    text: { content: chunk }
  }));
}

/**
 * Creates a rich_text item with a link.
 * 
 * @param text - Display text
 * @param url - Link URL
 * @returns RichTextItemRequest with link
 */
export function createLinkRichText(text: string, url: string): NotionRichTextItem {
  return {
    type: "text" as const,
    text: {
      content: text,
      link: { url }
    }
  };
}
