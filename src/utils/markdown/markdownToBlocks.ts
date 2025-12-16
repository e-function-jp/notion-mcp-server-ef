import type { NotionBlock } from "./types.js";
import { Lexer, type Token, type Tokens } from "marked";
import {
  createParagraphBlock,
  createHeading1Block,
  createHeading2Block,
  createHeading3Block,
  createBulletedListItemBlock,
  createNumberedListItemBlock,
  createCodeBlock,
  createQuoteBlock,
  createDividerBlock,
  createToDoBlock,
  createImageBlock,
} from "./blockCreators.js";

/** Maximum nesting depth supported by Notion API */
const MAX_NESTING_DEPTH = 3;

/** Warnings collected during conversion */
let conversionWarnings: string[] = [];

/**
 * Converts Markdown text into an array of Notion block objects.
 * 
 * @param markdown - Markdown text to convert
 * @returns Array of Notion block objects
 */
export function markdownToBlocks(markdown: string): NotionBlock[] {
  if (!markdown || markdown.trim() === "") {
    return [];
  }

  // Reset warnings for each conversion
  conversionWarnings = [];

  // Tokenize Markdown using marked lexer
  const tokens = Lexer.lex(markdown);
  const blocks: NotionBlock[] = [];

  for (const token of tokens) {
    const processedBlocks = processToken(token);
    blocks.push(...processedBlocks);
  }

  return blocks;
}

/**
 * Get warnings from the last conversion.
 */
export function getConversionWarnings(): string[] {
  return [...conversionWarnings];
}

/**
 * Process a single marked token into Notion block(s).
 */
function processToken(token: Token): NotionBlock[] {
  switch (token.type) {
    case "heading":
      return [processHeading(token as Tokens.Heading)];

    case "paragraph":
      return processParagraph(token as Tokens.Paragraph);

    case "code":
      return [processCodeBlock(token as Tokens.Code)];

    case "blockquote":
      return processBlockquote(token as Tokens.Blockquote);

    case "list":
      return processList(token as Tokens.List);

    case "hr":
      return [createDividerBlock()];

    case "space":
      // Skip whitespace tokens
      return [];

    case "html":
      // Convert HTML to paragraph (basic support)
      const htmlToken = token as Tokens.HTML;
      if (htmlToken.text.trim()) {
        return [createParagraphBlock(htmlToken.text.trim())];
      }
      return [];

    default:
      // Unknown token type - log warning and skip
      conversionWarnings.push(`Unknown token type: ${token.type}`);
      return [];
  }
}

/**
 * Process heading token.
 */
function processHeading(token: Tokens.Heading): NotionBlock {
  const text = token.text || "";
  
  // Map depth to heading level (h4-h6 treated as h3)
  switch (token.depth) {
    case 1:
      return createHeading1Block(text);
    case 2:
      return createHeading2Block(text);
    case 3:
    default:
      return createHeading3Block(text);
  }
}

/**
 * Process paragraph token.
 * May return multiple blocks if paragraph contains images.
 */
function processParagraph(token: Tokens.Paragraph): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  
  // Check if paragraph contains images
  if (token.tokens) {
    let textParts: string[] = [];
    
    for (const inlineToken of token.tokens) {
      if (inlineToken.type === "image") {
        // Flush accumulated text as paragraph
        if (textParts.length > 0) {
          blocks.push(createParagraphBlock(textParts.join("")));
          textParts = [];
        }
        // Add image block
        const imgToken = inlineToken as Tokens.Image;
        blocks.push(createImageBlock(imgToken.href, imgToken.text || imgToken.title || undefined));
      } else {
        // Accumulate text (raw property contains the original text)
        textParts.push((inlineToken as { raw?: string; text?: string }).raw || (inlineToken as { raw?: string; text?: string }).text || "");
      }
    }
    
    // Flush remaining text
    if (textParts.length > 0) {
      const text = textParts.join("").trim();
      if (text) {
        blocks.push(createParagraphBlock(text));
      }
    }
  } else {
    // Simple paragraph without inline tokens
    if (token.text.trim()) {
      blocks.push(createParagraphBlock(token.text));
    }
  }

  return blocks.length > 0 ? blocks : [createParagraphBlock(token.text || "")];
}

/**
 * Process code block token.
 */
function processCodeBlock(token: Tokens.Code): NotionBlock {
  return createCodeBlock(token.text || "", token.lang);
}

/**
 * Process blockquote token.
 * Returns multiple blocks if blockquote contains multiple paragraphs.
 */
function processBlockquote(token: Tokens.Blockquote): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  
  if (token.tokens) {
    for (const innerToken of token.tokens) {
      if (innerToken.type === "paragraph") {
        blocks.push(createQuoteBlock((innerToken as Tokens.Paragraph).text || ""));
      } else {
        // Process other tokens inside blockquote
        const processed = processToken(innerToken);
        // Convert to quotes if they're paragraphs
        for (const block of processed) {
          if (block.type === "paragraph") {
            const paragraph = block.paragraph as { rich_text?: Array<{ text?: { content?: string } }> };
            blocks.push(createQuoteBlock(paragraph?.rich_text?.[0]?.text?.content || ""));
          } else {
            blocks.push(block);
          }
        }
      }
    }
  } else {
    blocks.push(createQuoteBlock(token.text || ""));
  }

  return blocks;
}

/**
 * Process list token (ordered or unordered).
 */
function processList(token: Tokens.List): NotionBlock[] {
  return processListItems(token.items, token.ordered, 1);
}

/**
 * Recursively process list items with proper nesting.
 * When nesting depth exceeds MAX_NESTING_DEPTH, items are flattened to siblings.
 * 
 * @param items - List items to process
 * @param ordered - Whether the list is ordered (numbered)
 * @param depth - Current nesting depth (1-based)
 * @returns Array of list item blocks
 */
function processListItems(
  items: Tokens.ListItem[],
  ordered: boolean,
  depth: number
): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  for (const item of items) {
    const { block, flattenedItems } = processListItem(item, ordered, depth);
    blocks.push(block);
    // Add any flattened items as siblings (for depth > MAX_NESTING_DEPTH)
    if (flattenedItems.length > 0) {
      blocks.push(...flattenedItems);
    }
  }

  return blocks;
}

/**
 * Process a single list item, handling nested lists.
 * Returns the block and any flattened items that exceed nesting depth.
 */
function processListItem(
  item: Tokens.ListItem,
  ordered: boolean,
  depth: number
): { block: NotionBlock; flattenedItems: NotionBlock[] } {
  // Check for task list item (checkbox)
  if (item.task) {
    return {
      block: createToDoBlock(item.text || "", item.checked || false),
      flattenedItems: [],
    };
  }

  // Extract text content (excluding nested lists)
  let textContent = "";
  let nestedList: Tokens.List | null = null;

  if (item.tokens) {
    for (const token of item.tokens) {
      if (token.type === "list") {
        nestedList = token as Tokens.List;
      } else if (token.type === "text" || token.type === "paragraph") {
        textContent += (token as { text?: string }).text || "";
      }
    }
  } else {
    textContent = item.text || "";
  }

  // Process nested list
  let children: NotionBlock[] | undefined;
  let flattenedItems: NotionBlock[] = [];
  
  if (nestedList) {
    if (depth < MAX_NESTING_DEPTH) {
      // Within depth limit: add as children
      children = processListItems(nestedList.items, nestedList.ordered, depth + 1);
    } else {
      // Exceeds depth limit: flatten to siblings with warning
      conversionWarnings.push(
        `Nested list at depth ${depth + 1} exceeds maximum depth of ${MAX_NESTING_DEPTH}. Flattening to siblings.`
      );
      // Flatten: process nested items at the same level
      flattenedItems = processListItems(nestedList.items, nestedList.ordered, depth);
    }
  }

  // Create appropriate list item type
  const block = ordered
    ? createNumberedListItemBlock(textContent, children)
    : createBulletedListItemBlock(textContent, children);

  return { block, flattenedItems };
}
