import type { NotionBlock } from "./types.js";
import { createPlainTextRichText } from "./richText.js";

/**
 * Creates a paragraph block.
 */
export function createParagraphBlock(text: string): NotionBlock {
  return {
    type: "paragraph",
    paragraph: {
      rich_text: createPlainTextRichText(text)
    }
  };
}

/**
 * Creates a heading_1 block.
 */
export function createHeading1Block(text: string): NotionBlock {
  return {
    type: "heading_1",
    heading_1: {
      rich_text: createPlainTextRichText(text)
    }
  };
}

/**
 * Creates a heading_2 block.
 */
export function createHeading2Block(text: string): NotionBlock {
  return {
    type: "heading_2",
    heading_2: {
      rich_text: createPlainTextRichText(text)
    }
  };
}

/**
 * Creates a heading_3 block.
 */
export function createHeading3Block(text: string): NotionBlock {
  return {
    type: "heading_3",
    heading_3: {
      rich_text: createPlainTextRichText(text)
    }
  };
}

/**
 * Creates a bulleted_list_item block with optional children.
 */
export function createBulletedListItemBlock(
  text: string,
  children?: NotionBlock[]
): NotionBlock {
  const block: NotionBlock = {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: createPlainTextRichText(text)
    }
  };

  if (children && children.length > 0) {
    (block.bulleted_list_item as Record<string, unknown>).children = children;
  }

  return block;
}

/**
 * Creates a numbered_list_item block with optional children.
 */
export function createNumberedListItemBlock(
  text: string,
  children?: NotionBlock[]
): NotionBlock {
  const block: NotionBlock = {
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: createPlainTextRichText(text)
    }
  };

  if (children && children.length > 0) {
    (block.numbered_list_item as Record<string, unknown>).children = children;
  }

  return block;
}

/**
 * Creates a code block.
 * Note: Code content is NOT stripped of formatting.
 */
export function createCodeBlock(code: string, language?: string): NotionBlock {
  // Map common language aliases to Notion's supported languages
  const languageMap: Record<string, string> = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "rb": "ruby",
    "sh": "shell",
    "bash": "shell",
    "zsh": "shell",
    "yml": "yaml",
    "md": "markdown",
    "": "plain text"
  };

  const normalizedLanguage = language?.toLowerCase() || "";
  const notionLanguage = languageMap[normalizedLanguage] || normalizedLanguage || "plain text";

  return {
    type: "code",
    code: {
      rich_text: [{
        type: "text" as const,
        text: { content: code }
      }],
      language: notionLanguage
    }
  };
}

/**
 * Creates a quote block.
 */
export function createQuoteBlock(text: string): NotionBlock {
  return {
    type: "quote",
    quote: {
      rich_text: createPlainTextRichText(text)
    }
  };
}

/**
 * Creates a divider block.
 */
export function createDividerBlock(): NotionBlock {
  return {
    type: "divider",
    divider: {}
  };
}

/**
 * Creates a to_do block with checked state.
 */
export function createToDoBlock(text: string, checked: boolean): NotionBlock {
  return {
    type: "to_do",
    to_do: {
      rich_text: createPlainTextRichText(text),
      checked
    }
  };
}

/**
 * Creates an external image block.
 */
export function createImageBlock(url: string, caption?: string): NotionBlock {
  // Basic URL validation
  try {
    new URL(url);
  } catch {
    // Invalid URL - return paragraph with link text instead
    return createParagraphBlock(`[Image: ${caption || url}]`);
  }

  const block: NotionBlock = {
    type: "image",
    image: {
      type: "external",
      external: { url },
      ...(caption ? { caption: createPlainTextRichText(caption) } : {})
    }
  };

  return block;
}

/**
 * Creates a callout block with optional emoji icon.
 */
export function createCalloutBlock(text: string, emoji?: string): NotionBlock {
  const block: NotionBlock = {
    type: "callout",
    callout: {
      rich_text: createPlainTextRichText(text),
      ...(emoji ? { icon: { type: "emoji", emoji } } : {})
    }
  };

  return block;
}

/**
 * Creates a toggle block with optional children.
 */
export function createToggleBlock(text: string, children?: NotionBlock[]): NotionBlock {
  const block: NotionBlock = {
    type: "toggle",
    toggle: {
      rich_text: createPlainTextRichText(text),
      ...(children && children.length > 0 ? { children } : {})
    }
  };

  return block;
}
