# Markdown Support Implementation Task List

## Document Information

- **Project**: notion-mcp-server-ef
- **Based on**: [plan.md](plan.md)
- **Created**: 2024-12-11
- **Status**: Implementation Planning

---

## ⚠️ Implementation Notes (Lessons from HTTP Phase)

### TypeScript Type Inference Issues

MCP SDK 1.24.3 has deep type inference issues with `server.registerTool()` when using complex Zod schemas. **DO NOT** register tools with static imports of schemas.

**Current Solution** (see `src/tools/index.ts`):
1. Use dynamic `import()` for schema modules
2. Use `asRawShape()` helper to wrap schemas
3. Use `as any` casting for `registerTool` callback return types

When adding new schemas or modifying existing ones:
- Keep using the dynamic import pattern
- Test build with `npm run build` before committing
- If OOM occurs during build, increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

### XServer Deployment Constraints

- **Node.js 16 only** - GLIBC too old for Node 18+
- Use `npm install --ignore-scripts` on server to skip build
- Pre-build locally and deploy `build/` directory
- pm2 for process management with `ecosystem.config.cjs`

### Testing Setup

- vitest is configured (`npm test`, `npm run test:watch`)
- Test files in `**/__tests__/*.ts` or `**/*.test.ts`
- Tests are excluded from TypeScript build output

---

## Phase 0 – Preparation / Repository Analysis

### P0-T01: Add Required Dependencies

| Field | Details |
|-------|---------|
| **Task ID** | P0-T01 |
| **Priority** | P0 (must-have) |
| **Target files** | `package.json` |
| **Dependencies** | None (first task) |
| **Parallel** | Can run in parallel with P0-T02 |

**Implementation Details:**
- Install `marked` package for Markdown parsing (Markdown → tokens)
- Install `notion-to-md` package for Notion → Markdown conversion
- Run: `npm install notion-to-md marked`
- Install type definitions: `npm install -D @types/marked` (if available)

**Acceptance Criteria:**
- `package.json` includes `notion-to-md` and `marked` in dependencies
- `npm install` completes without errors
- TypeScript can import both packages without type errors

---

### P0-T02: Create Environment Configuration for Markdown Features

| Field | Details |
|-------|---------|
| **Task ID** | P0-T02 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/config/index.ts` (modify), `.env.example` (create/modify) |
| **Dependencies** | None |
| **Parallel** | Can run in parallel with P0-T01 |

**Functions/Constants to create:**
```typescript
// src/config/index.ts
export const MARKDOWN_CONFIG = {
  defaultForRead: boolean,  // from NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ
  maxChars: number,         // from NOTION_MCP_MARKDOWN_MAX_CHARS (default: 12000)
};

export function getMarkdownDefaultForRead(): boolean;
export function getMarkdownMaxChars(): number;
```

**Implementation Details:**
- Add new environment variable parsing for:
  - `NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ` (default: `"false"`)
  - `NOTION_MCP_MARKDOWN_MAX_CHARS` (default: `12000`)
- Export configuration getters for use in tool handlers
- Ensure backward compatibility (defaults to JSON output)

**Acceptance Criteria:**
- Environment variables are correctly parsed
- Default values are applied when env vars are missing
- `getMarkdownDefaultForRead()` returns `false` by default
- `getMarkdownMaxChars()` returns `12000` by default
- `.env.example` documents all new environment variables

---

### P0-T03: Analyze Existing Block Schema Structure

| Field | Details |
|-------|---------|
| **Task ID** | P0-T03 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/schema/blocks.ts`, `src/types/blocks.ts` (read-only analysis) |
| **Dependencies** | None |
| **Parallel** | Can run in parallel with P0-T01, P0-T02 |

**Implementation Details:**
- Document all supported block types in existing schemas
- Map Markdown elements to Notion block types:
  - `# Heading` → `heading_1`
  - `## Heading` → `heading_2`
  - `### Heading` → `heading_3`
  - `Paragraph` → `paragraph`
  - `- Item` → `bulleted_list_item`
  - `1. Item` → `numbered_list_item`
  - `` ```code``` `` → `code`
  - `> Quote` → `quote`
  - `---` → `divider`
  - `![alt](url)` → `image`
  - `- [ ] / - [x]` → `to_do`
- Identify `rich_text` structure requirements for each block type
- Note: existing schema uses `TEXT_BLOCK_REQUEST_SCHEMA` discriminated union

**Acceptance Criteria:**
- Complete mapping document created
- All supported Notion block types identified
- Structure of `rich_text` array understood
- Nested children support verified (`bulleted_list_item.children`, etc.)

---

## Phase 1 – Core Markdown Write Path (P0)

### P1-T01: Create Core Markdown-to-Blocks Utility Module Structure

| Field | Details |
|-------|---------|
| **Task ID** | P1-T01 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/index.ts` (new), `src/utils/markdown/types.ts` (new) |
| **Dependencies** | P0-T01 (packages installed) |
| **Parallel** | None |

**Functions/Types to create:**
```typescript
// src/utils/markdown/types.ts
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

export type NotionBlock = BlockObjectRequest;

export interface MarkdownConversionOptions {
  preserveNestedLists?: boolean; // default: true
  // Future expansion options
}

// src/utils/markdown/index.ts
export * from "./markdownToBlocks.js";
export * from "./types.js";
```

**Implementation Details:**
- Create directory structure: `src/utils/markdown/`
- Define TypeScript types for conversion options
- Re-export from barrel file for clean imports
- Use `BlockObjectRequest` from `@notionhq/client` as the return type

**Acceptance Criteria:**
- Directory and files created
- Types compile without errors
- Can import from `src/utils/markdown/index.js`

---

### P1-T02: Implement Plain Text Rich Text Helper

| Field | Details |
|-------|---------|
| **Task ID** | P1-T02 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/richText.ts` (new) |
| **Dependencies** | P1-T01 |
| **Parallel** | None |

**Functions to create:**
```typescript
// src/utils/markdown/richText.ts
import type { RichTextItemRequest } from "@notionhq/client/build/src/api-endpoints";

/**
 * Creates a plain text rich_text array from a string.
 * MVP: Ignores bold, italic, code, and links - treats all as plain text.
 * 
 * @param text - The plain text content
 * @returns Array of RichTextItemRequest objects
 */
export function createPlainTextRichText(text: string): RichTextItemRequest[];

/**
 * Strips Markdown inline formatting and returns plain text.
 * Removes: **bold**, *italic*, `code`, [links](url), ~~strikethrough~~
 * 
 * @param markdown - Text that may contain inline Markdown
 * @returns Plain text with formatting removed
 */
export function stripInlineMarkdown(text: string): string;
```

**Implementation Details:**
- For MVP: **ignore all inline formatting** (bold, italic, code, links)
- Use regex to strip: `**text**`, `*text*`, `__text__`, `_text_`, `` `code` ``, `[text](url)`, `~~text~~`
- Return simple `{ type: "text", text: { content: plainText } }` structure
- Handle empty strings gracefully (return empty array or array with empty text)
- **Constraint**: Notion rich_text array cannot be empty for text blocks - use single space if needed

**Error Handling:**
- If text is null/undefined, return empty array or array with space
- If text exceeds Notion's 2000-character limit per rich_text item, split into multiple items

**Acceptance Criteria:**
- `createPlainTextRichText("Hello world")` returns valid RichTextItemRequest[]
- `stripInlineMarkdown("**bold** and *italic*")` returns `"bold and italic"`
- Empty string handling works correctly
- Long text (>2000 chars) is properly split

---

### P1-T03: Implement Basic Block Creators (Paragraph, Headings)

| Field | Details |
|-------|---------|
| **Task ID** | P1-T03 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/blockCreators.ts` (new) |
| **Dependencies** | P1-T02 |
| **Parallel** | None |

**Functions to create:**
```typescript
// src/utils/markdown/blockCreators.ts
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

export function createParagraphBlock(text: string): BlockObjectRequest;
export function createHeading1Block(text: string): BlockObjectRequest;
export function createHeading2Block(text: string): BlockObjectRequest;
export function createHeading3Block(text: string): BlockObjectRequest;
```

**Implementation Details:**
- Each function:
  1. Calls `stripInlineMarkdown()` on input text
  2. Calls `createPlainTextRichText()` to create rich_text array
  3. Returns correctly typed Notion block object
- Block structures must match existing schemas in `src/schema/blocks.ts`
- Example output for paragraph:
  ```typescript
  {
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: "Hello" } }]
    }
  }
  ```

**Acceptance Criteria:**
- All four block creator functions compile without errors
- Created blocks match Notion API expected structure
- Blocks pass validation against existing Zod schemas

---

### P1-T04: Implement List Item Block Creators (Bullet, Numbered)

| Field | Details |
|-------|---------|
| **Task ID** | P1-T04 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/blockCreators.ts` (modify) |
| **Dependencies** | P1-T03 |
| **Parallel** | None |

**Functions to add:**
```typescript
export function createBulletedListItemBlock(
  text: string, 
  children?: BlockObjectRequest[]
): BlockObjectRequest;

export function createNumberedListItemBlock(
  text: string, 
  children?: BlockObjectRequest[]
): BlockObjectRequest;
```

**Implementation Details:**
- **Critical**: Support nested children for nested list handling
- When `children` is provided, include it in block structure:
  ```typescript
  {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [...],
      children: children  // Optional nested blocks
    }
  }
  ```
- Children represent nested list items (indented items in Markdown)
- Notion allows up to 3 levels of nesting in the API

**Constraints:**
- Notion API limits: 100 blocks per append request
- Nested children count toward the total block limit
- Empty children array should be omitted, not included as `[]`

**Acceptance Criteria:**
- Bullet list item with no children creates correct structure
- Bullet list item with children includes nested blocks
- Same behavior for numbered list items
- Omit `children` property when not provided

---

### P1-T05: Implement Additional Block Creators (Code, Quote, Divider, To-Do)

| Field | Details |
|-------|---------|
| **Task ID** | P1-T05 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/blockCreators.ts` (modify) |
| **Dependencies** | P1-T03 |
| **Parallel** | Can run in parallel with P1-T04 |

**Functions to add:**
```typescript
export function createCodeBlock(code: string, language?: string): BlockObjectRequest;
export function createQuoteBlock(text: string): BlockObjectRequest;
export function createDividerBlock(): BlockObjectRequest;
export function createToDoBlock(text: string, checked: boolean): BlockObjectRequest;
```

**Implementation Details:**
- `createCodeBlock`:
  - Accept optional language parameter
  - Default language to `"plain text"` if not specified
  - Map common Markdown languages to Notion's `LANGUAGE_SCHEMA` values
  - Code content does NOT strip inline markdown (preserve as-is)
- `createQuoteBlock`:
  - Similar to paragraph but with `type: "quote"` and `quote` property
- `createDividerBlock`:
  - Simple: `{ type: "divider", divider: {} }`
- `createToDoBlock`:
  - Include `checked` boolean in `to_do` property
  - Parse checkbox state from Markdown: `- [ ]` = unchecked, `- [x]` = checked

**Acceptance Criteria:**
- Code blocks preserve content exactly (no stripping)
- Language detection works for common languages (js, ts, python, etc.)
- Divider creates empty divider object
- To-do blocks correctly set checked state

---

### P1-T06: Implement Image Block Creator

| Field | Details |
|-------|---------|
| **Task ID** | P1-T06 |
| **Priority** | P1 (important) |
| **Target files** | `src/utils/markdown/blockCreators.ts` (modify) |
| **Dependencies** | P1-T03 |
| **Parallel** | Can run in parallel with P1-T04, P1-T05 |

**Functions to add:**
```typescript
export function createImageBlock(url: string, caption?: string): BlockObjectRequest;
```

**Implementation Details:**
- Create external image block structure:
  ```typescript
  {
    type: "image",
    image: {
      type: "external",
      external: { url: imageUrl },
      caption: caption ? createPlainTextRichText(caption) : []
    }
  }
  ```
- Only support external URLs (not file uploads)
- Caption is optional

**Error Handling:**
- Validate URL format (basic URL validation)
- Skip invalid URLs or convert to paragraph with link text

**Acceptance Criteria:**
- Valid image URL creates correct external image block
- Caption is properly converted to rich_text array
- Invalid URLs are handled gracefully

---

### P1-T07: Implement Markdown Token Parser Using `marked`

| Field | Details |
|-------|---------|
| **Task ID** | P1-T07 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/markdownToBlocks.ts` (new) |
| **Dependencies** | P1-T03, P1-T04, P1-T05 |
| **Parallel** | None |

**Functions to create:**
```typescript
// src/utils/markdown/markdownToBlocks.ts
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import type { Token, Tokens } from "marked";

/**
 * Converts Markdown text into an array of Notion block objects.
 * 
 * @param markdown - The Markdown string to convert
 * @returns Array of BlockObjectRequest objects ready for Notion API
 */
export function markdownToBlocks(markdown: string): BlockObjectRequest[];

/**
 * Internal: Processes a single marked token into Notion block(s).
 */
function processToken(token: Token): BlockObjectRequest[];

/**
 * Internal: Recursively processes list items with proper nesting.
 */
function processListItems(items: Tokens.ListItem[], ordered: boolean): BlockObjectRequest[];
```

**Implementation Details:**
- Use `marked.lexer(markdown)` to tokenize Markdown
- Handle top-level tokens:
  - `heading` → heading_1/2/3 based on depth (h4-h6 treated as h3)
  - `paragraph` → paragraph block
  - `list` → iterate items, create bulleted/numbered list items
  - `code` → code block with language
  - `blockquote` → quote block (process inner content)
  - `hr` → divider block
  - `space` → skip (whitespace)
- **Critical nested list handling:**
  - `list.items[].tokens` may contain nested `list` tokens
  - Recursively process to build `children` arrays
  - Example: `- Item\n  - Nested` → parent with child

**Token Processing Flow:**
```
markdown string
    ↓
marked.lexer()
    ↓
Token[] (flat top-level structure)
    ↓
For each token:
  - heading → createHeadingXBlock
  - paragraph → createParagraphBlock
  - list → processListItems (recursive)
  - code → createCodeBlock
  - blockquote → createQuoteBlock
  - hr → createDividerBlock
    ↓
BlockObjectRequest[]
```

**Error Handling:**
- Unknown token types: skip with warning log
- Malformed tokens: attempt graceful degradation to paragraph
- Empty content: skip block creation

**Acceptance Criteria:**
- Simple Markdown converts correctly
- Headings map to correct heading levels
- Lists create correct list item types
- Code blocks include language
- **Nested lists produce proper `children` structure, not flat array**

---

### P1-T08: Implement Nested List Processing

| Field | Details |
|-------|---------|
| **Task ID** | P1-T08 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/markdownToBlocks.ts` (modify) |
| **Dependencies** | P1-T07 |
| **Parallel** | None |

**Implementation Details:**
- `marked` represents nested lists as:
  ```
  list.items = [
    {
      text: "Parent item",
      tokens: [
        { type: "text", raw: "Parent item" },
        { type: "list", items: [...] }  // Nested list
      ]
    }
  ]
  ```
- Must recursively process `item.tokens` to find nested lists
- Build Notion structure:
  ```typescript
  {
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [...],
      children: [  // Nested items
        { type: "bulleted_list_item", ... },
        { type: "bulleted_list_item", ... }
      ]
    }
  }
  ```
- Handle mixed content (text + nested list in same item)

**Algorithm:**
```
processListItem(item, ordered):
  1. Extract text content from item.tokens (exclude nested lists)
  2. Find nested list token in item.tokens
  3. If nested list exists:
     - Recursively call processListItems on nested list
     - Create list item with children
  4. Else:
     - Create list item without children
```

**Constraints:**
- Notion supports up to 3 levels of block nesting
- 4+ levels should flatten or skip with warning

**Test Cases:**
```markdown
- Level 1
  - Level 2
    - Level 3
      - Level 4 (should handle gracefully)
```

**Acceptance Criteria:**
- Two-level nesting works correctly
- Three-level nesting works correctly
- Four+ levels are handled without crashing (flatten or warn)
- Mixed ordered/unordered nesting is handled

---

### P1-T09: Add Comprehensive Unit Tests for markdownToBlocks

| Field | Details |
|-------|---------|
| **Task ID** | P1-T09 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/markdown/__tests__/markdownToBlocks.test.ts` (new) |
| **Dependencies** | P1-T07, P1-T08 |
| **Parallel** | Can run after P1-T08 |

**Implementation Details:**
- Add test framework if not present (vitest or jest)
- Test cases required:
  1. Empty string → empty array
  2. Single paragraph → one paragraph block
  3. Multiple paragraphs → multiple paragraph blocks
  4. H1, H2, H3 headings → correct heading types
  5. H4-H6 headings → treated as H3
  6. Bullet list (flat) → bulleted_list_item blocks
  7. Numbered list (flat) → numbered_list_item blocks
  8. **Nested bullet list** → parent with children
  9. **Nested numbered list** → parent with children
  10. **Mixed nested lists** → correct types preserved
  11. Code block with language → code block with language
  12. Code block without language → default language
  13. Blockquote → quote block
  14. Horizontal rule → divider block
  15. To-do items (if supported)
  16. Images → external image blocks
  17. Complex document with multiple elements

**Acceptance Criteria:**
- All test cases pass
- Nested list tests verify `children` structure
- Test coverage > 80% for markdownToBlocks module

---

### P1-T10: Update Page Creation Schema for Markdown Input

| Field | Details |
|-------|---------|
| **Task ID** | P1-T10 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/schema/page.ts` (modify) |
| **Dependencies** | P1-T07 |
| **Parallel** | Can run in parallel with P1-T09 |

**Schema changes:**
```typescript
// Add to CREATE_PAGE_SCHEMA
markdown: z.string()
  .optional()
  .describe("Page body in Markdown format. Mutually exclusive with children - use one or the other."),
```

**Implementation Details:**
- Add `markdown?: string` field to `CREATE_PAGE_SCHEMA`
- Implement mutual exclusivity validation using Zod refinement:
  ```typescript
  .refine(
    (data) => !(data.children && data.markdown),
    { message: "Cannot specify both 'children' and 'markdown'. Use one or the other." }
  )
  ```
- Update field descriptions to clarify mutual exclusivity
- Maintain backward compatibility (children-only still works)

**Acceptance Criteria:**
- Schema accepts `{ ...baseFields, markdown: "# Hello" }`
- Schema accepts `{ ...baseFields, children: [...] }`
- Schema **rejects** `{ ...baseFields, markdown: "...", children: [...] }`
- Schema accepts `{ ...baseFields }` (neither children nor markdown)
- Error message is clear about mutual exclusivity

---

### P1-T11: Update Page Creation Type Definitions

| Field | Details |
|-------|---------|
| **Task ID** | P1-T11 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/types/page.ts` (automatic via Zod inference) |
| **Dependencies** | P1-T10 |
| **Parallel** | None |

**Implementation Details:**
- Zod infers types automatically from schema
- Verify `CreatePageParams` type now includes:
  ```typescript
  markdown?: string
  ```
- No manual type changes needed if using `z.infer`

**Acceptance Criteria:**
- TypeScript recognizes `params.markdown` as valid
- Type `CreatePageParams` includes optional `markdown` field

---

### P1-T12: Update Page Creation Handler for Markdown

| Field | Details |
|-------|---------|
| **Task ID** | P1-T12 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/tools/createPage.ts` (modify) |
| **Dependencies** | P1-T07, P1-T11 |
| **Parallel** | None |

**Implementation Details:**
```typescript
import { markdownToBlocks } from "../utils/markdown/index.js";

export const registerCreatePageTool = async (
  params: CreatePageParams
): Promise<CallToolResult> => {
  try {
    // Determine children: from markdown conversion or direct input
    let children = params.children;
    
    if (params.markdown) {
      children = markdownToBlocks(params.markdown);
    }
    
    const response = await notion.pages.create({
      parent: params.parent,
      properties: params.properties,
      children: children,
      icon: params.icon,
      cover: params.cover,
    });

    return {
      content: [
        {
          type: "text",
          text: `Page created successfully: ${response.id}`,
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};
```

**Error Handling:**
- If `markdownToBlocks` throws, catch and return descriptive error
- If converted blocks exceed 100, split into batches (see P1-T15)
- Log conversion details for debugging

**Acceptance Criteria:**
- Creating page with `markdown` parameter works
- Created page has correct block structure
- Error messages are clear if conversion fails
- Still works with `children` parameter (backward compatible)

---

### P1-T13: Update Block Append Schema for Markdown Input

| Field | Details |
|-------|---------|
| **Task ID** | P1-T13 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/schema/blocks.ts` (modify) |
| **Dependencies** | P1-T07 |
| **Parallel** | Can run in parallel with P1-T10, P1-T12 |

**Schema changes:**
```typescript
export const APPEND_BLOCK_CHILDREN_SCHEMA = {
  blockId: z.string().describe("The ID of the block to append children to"),
  children: z
    .array(TEXT_BLOCK_REQUEST_SCHEMA)
    .optional()  // Make optional
    .describe("Array of blocks to append as children. Mutually exclusive with markdown."),
  markdown: z.string()
    .optional()
    .describe("Markdown content to convert and append. Mutually exclusive with children."),
};
```

**Implementation Details:**
- Add `markdown?: string` field
- Make `children` optional (was required)
- Add refinement for mutual exclusivity
- Add refinement requiring at least one of `children` or `markdown`

**Zod Refinements:**
```typescript
.refine(
  (data) => data.children || data.markdown,
  { message: "Either 'children' or 'markdown' must be provided." }
)
.refine(
  (data) => !(data.children && data.markdown),
  { message: "Cannot specify both 'children' and 'markdown'. Use one or the other." }
)
```

**Acceptance Criteria:**
- Schema accepts `{ blockId, markdown: "..." }`
- Schema accepts `{ blockId, children: [...] }`
- Schema rejects `{ blockId }` (neither provided)
- Schema rejects `{ blockId, markdown: "...", children: [...] }`

---

### P1-T14: Update Block Append Handler for Markdown

| Field | Details |
|-------|---------|
| **Task ID** | P1-T14 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/tools/appendBlockChildren.ts` (modify) |
| **Dependencies** | P1-T07, P1-T13 |
| **Parallel** | None |

**Implementation Details:**
```typescript
import { markdownToBlocks } from "../utils/markdown/index.js";

export const appendBlockChildren = async (
  params: AppendBlockChildrenParams
): Promise<CallToolResult> => {
  try {
    let children = params.children;
    
    if (params.markdown) {
      children = markdownToBlocks(params.markdown);
    }
    
    // Handle 100-block limit
    if (children && children.length > 100) {
      return await appendBlocksInBatches(params.blockId, children);
    }
    
    const response = await notion.blocks.children.append({
      block_id: params.blockId,
      children: children!,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully appended ${children!.length} block(s) to ${params.blockId}`,
        },
        {
          type: "text",
          text: `Response: ${JSON.stringify(response, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};
```

**Acceptance Criteria:**
- Appending blocks with `markdown` parameter works
- Blocks appear correctly in Notion page
- Still works with `children` parameter

---

### P1-T15: Implement Block Batching Utility for 100-Block Limit

| Field | Details |
|-------|---------|
| **Task ID** | P1-T15 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/utils/blocks/batchUtils.ts` (new) |
| **Dependencies** | P1-T07 |
| **Parallel** | Can run in parallel with P1-T12, P1-T14 |

**Functions to create:**
```typescript
// src/utils/blocks/batchUtils.ts
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "../../services/notion.js";

export const NOTION_BLOCK_LIMIT = 100;

/**
 * Splits an array of blocks into chunks of specified size.
 */
export function chunkBlocks(
  blocks: BlockObjectRequest[], 
  chunkSize: number = NOTION_BLOCK_LIMIT
): BlockObjectRequest[][];

/**
 * Appends blocks to a parent in batches, respecting Notion's 100-block limit.
 * Batches are sent sequentially to maintain order.
 * 
 * @returns Summary of all batch operations
 */
export async function appendBlocksInBatches(
  blockId: string,
  blocks: BlockObjectRequest[]
): Promise<{
  success: boolean;
  totalBlocks: number;
  batchCount: number;
  results: any[];
  errors: any[];
}>;
```

**Implementation Details:**
- `chunkBlocks`: Simple array chunking
- `appendBlocksInBatches`:
  1. Split blocks into 100-item chunks
  2. For each chunk, call `notion.blocks.children.append`
  3. **Execute sequentially** (not parallel) to preserve order
  4. Collect results and errors
  5. Return summary

**Error Handling:**
- If a batch fails, continue with remaining batches
- Track and return all errors
- Return partial success status

**Constraints:**
- Must be sequential, not parallel (order matters)
- If a batch fails mid-way, already-appended blocks remain (cannot rollback)

**Acceptance Criteria:**
- 150 blocks are split into 2 batches (100 + 50)
- 250 blocks are split into 3 batches (100 + 100 + 50)
- Order is preserved across batches
- Errors in one batch don't prevent other batches

---

### P1-T16: Create Page Rewrite Tool Schema

| Field | Details |
|-------|---------|
| **Task ID** | P1-T16 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/schema/page.ts` (modify) |
| **Dependencies** | P1-T07 |
| **Parallel** | Can run in parallel with P1-T15 |

**Schema to add:**
```typescript
export const REWRITE_PAGE_SCHEMA = {
  pageId: z.string().describe("The ID of the page to rewrite"),
  markdown: z.string().describe("The new Markdown content for the entire page"),
  validateBeforeDelete: z.boolean()
    .optional()
    .default(true)
    .describe("If true, validates Markdown conversion before deleting existing content. Default: true."),
};
```

**Implementation Details:**
- Define schema for new `rewrite_page` action
- Add to `PAGES_OPERATION_SCHEMA` discriminated union:
  ```typescript
  z.object({
    action: z.literal("rewrite_page")
      .describe("Use this action to replace entire page content with Markdown."),
    params: z.object(REWRITE_PAGE_SCHEMA),
  }),
  ```

**Acceptance Criteria:**
- Schema validates correctly
- Added to pages operation discriminated union
- Types are properly inferred

---

### P1-T17: Create Page Rewrite Tool Types

| Field | Details |
|-------|---------|
| **Task ID** | P1-T17 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/types/page.ts` (modify) |
| **Dependencies** | P1-T16 |
| **Parallel** | None |

**Types to add:**
```typescript
export const rewritePageSchema = z.object(REWRITE_PAGE_SCHEMA);
export type RewritePageParams = z.infer<typeof rewritePageSchema>;
```

**Acceptance Criteria:**
- `RewritePageParams` type is exported
- Type includes `pageId`, `markdown`, `validateBeforeDelete`

---

### P1-T18: Implement Page Rewrite Tool Handler

| Field | Details |
|-------|---------|
| **Task ID** | P1-T18 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/tools/rewritePage.ts` (new) |
| **Dependencies** | P1-T07, P1-T15, P1-T17 |
| **Parallel** | None |

**Function to create:**
```typescript
// src/tools/rewritePage.ts
import { notion } from "../services/notion.js";
import { RewritePageParams } from "../types/page.js";
import { markdownToBlocks } from "../utils/markdown/index.js";
import { appendBlocksInBatches, NOTION_BLOCK_LIMIT } from "../utils/blocks/batchUtils.js";
import { handleNotionError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const rewritePage = async (
  params: RewritePageParams
): Promise<CallToolResult>;
```

**Implementation Algorithm:**
```
1. Convert markdown to blocks using markdownToBlocks()
2. VALIDATION: If conversion fails or returns empty, abort with error
   - Do NOT delete existing content if conversion fails
3. Fetch existing child blocks:
   notion.blocks.children.list({ block_id: pageId })
   - Handle pagination to get ALL children
4. ONLY AFTER successful conversion:
   - Delete each existing child block sequentially
   - notion.blocks.delete({ block_id: childId })
5. Append new blocks in batches of 100:
   - Use appendBlocksInBatches()
6. Return success summary with:
   - Number of blocks deleted
   - Number of blocks created
   - Batch count used
```

**Error Handling:**
- **Critical**: Validate markdown conversion BEFORE deleting anything
- If deletion of old block fails, continue with remaining deletions
- If append fails mid-way, return partial success with details
- Log diagnostic information for debugging

**Constraints:**
- Must handle pages with more than 100 existing blocks (pagination)
- Must handle pages with more than 100 new blocks (batching)
- Deletion cannot be rolled back - document this behavior

**Acceptance Criteria:**
- Page with 50 blocks rewrites correctly
- Page with 150 blocks rewrites correctly (batching works)
- Invalid markdown does NOT delete existing content
- Empty markdown is rejected or handled gracefully
- Success message includes statistics

---

### P1-T19: Register Page Rewrite Tool

| Field | Details |
|-------|---------|
| **Task ID** | P1-T19 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/tools/pages.ts` (modify) |
| **Dependencies** | P1-T18 |
| **Parallel** | None |

**Implementation Details:**
- Import `rewritePage` handler
- Add case to switch statement:
  ```typescript
  case "rewrite_page":
    return rewritePage(params.payload.params);
  ```
- Update error message to include new action

**Acceptance Criteria:**
- `rewrite_page` action is handled by switch
- Tool is callable via MCP protocol

---

### P1-T20: Integration Tests for Write Path

| Field | Details |
|-------|---------|
| **Task ID** | P1-T20 |
| **Priority** | P0 (must-have) |
| **Target files** | `src/__tests__/integration/markdownWrite.test.ts` (new) |
| **Dependencies** | P1-T12, P1-T14, P1-T19 |
| **Parallel** | After all Phase 1 implementation |

**Test Cases:**
1. Create page with simple markdown
2. Create page with complex markdown (headings, lists, code)
3. Create page with nested lists
4. Create page with >100 blocks (batching)
5. Append markdown to existing page
6. Append markdown >100 blocks
7. Rewrite page with markdown
8. Rewrite page with >100 blocks (old and new)
9. Rewrite with invalid markdown (should fail safely)
10. Error handling for Notion API failures

**Note:** May require Notion API access - consider mocking

**Acceptance Criteria:**
- All integration tests pass
- Batching behavior is verified
- Safe failure behavior is verified

---

## Phase 2 – Optional Markdown Read Path (P2)

### P2-T01: Create NotionMarkdownService Class Structure

| Field | Details |
|-------|---------|
| **Task ID** | P2-T01 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/services/NotionMarkdownService.ts` (new) |
| **Dependencies** | P0-T01 (notion-to-md installed) |
| **Parallel** | Can run in parallel with Phase 1 tasks |

**Class to create:**
```typescript
// src/services/NotionMarkdownService.ts
import { NotionToMarkdown } from "notion-to-md";
import { Client as NotionClient } from "@notionhq/client";

export class NotionMarkdownService {
  private n2m: NotionToMarkdown;
  
  constructor(private notion: NotionClient);
  
  /**
   * Converts a Notion page to Markdown format.
   * Recursively fetches all child blocks.
   */
  async pageToMarkdown(pageId: string): Promise<string>;
  
  /**
   * Converts a specific block and its children to Markdown.
   */
  async blockToMarkdown(blockId: string): Promise<string>;
}
```

**Implementation Details:**
- Initialize `NotionToMarkdown` with the Notion client
- Configure custom transformers for unsupported blocks
- Handle recursive child block fetching (automatic with notion-to-md)

**Acceptance Criteria:**
- Class compiles without errors
- Can be instantiated with Notion client
- Stub methods return placeholder strings

---

### P2-T02: Implement Custom Transformers for Unsupported Blocks

| Field | Details |
|-------|---------|
| **Task ID** | P2-T02 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/services/NotionMarkdownService.ts` (modify) |
| **Dependencies** | P2-T01 |
| **Parallel** | None |

**Implementation Details:**
```typescript
constructor(private notion: NotionClient) {
  this.n2m = new NotionToMarkdown({ notionClient: notion });
  
  // Register fallback transformer for unsupported block types
  this.n2m.setCustomTransformer("unsupported", (block) => {
    return `\n[Unsupported block: ${block.type}]\n`;
  });
  
  // Handle any other blocks that might crash
  const unsupportedTypes = [
    "child_page",
    "child_database", 
    "embed",
    "bookmark",
    "pdf",
    "video",
    "audio",
    "file",
    "table_of_contents",
    "breadcrumb",
    "column_list",
    "column",
    "link_preview",
    "synced_block",
    "template",
    "link_to_page",
    "table",
    "table_row",
  ];
  
  for (const type of unsupportedTypes) {
    this.n2m.setCustomTransformer(type as any, (block) => {
      return `\n[${type} block]\n`;
    });
  }
}
```

**Purpose:**
- Prevent crashes from unknown block types
- Provide readable placeholders in Markdown output
- Preserve image/file URLs where possible

**Acceptance Criteria:**
- Unknown block types don't crash conversion
- Placeholder text appears in output
- Image blocks render as `![caption](url)` format

---

### P2-T03: Implement pageToMarkdown Method

| Field | Details |
|-------|---------|
| **Task ID** | P2-T03 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/services/NotionMarkdownService.ts` (modify) |
| **Dependencies** | P2-T02 |
| **Parallel** | None |

**Implementation Details:**
```typescript
async pageToMarkdown(pageId: string): Promise<string> {
  try {
    const mdBlocks = await this.n2m.pageToMarkdown(pageId);
    const { parent } = this.n2m.toMarkdownString(mdBlocks);
    return parent;
  } catch (error) {
    console.error(`Error converting page ${pageId} to Markdown:`, error);
    throw error;
  }
}
```

**Features:**
- Automatically fetches all nested children (notion-to-md handles this)
- Converts all supported block types
- Returns single Markdown string

**Acceptance Criteria:**
- Simple page converts to valid Markdown
- Nested content is included
- Errors are properly propagated

---

### P2-T04: Create Singleton Service Instance

| Field | Details |
|-------|---------|
| **Task ID** | P2-T04 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/services/NotionMarkdownService.ts` (modify), `src/services/index.ts` (new or modify) |
| **Dependencies** | P2-T03 |
| **Parallel** | None |

**Implementation Details:**
```typescript
// src/services/NotionMarkdownService.ts
import { notion } from "./notion.js";

// Export singleton instance
export const notionMarkdownService = new NotionMarkdownService(notion);
```

**Acceptance Criteria:**
- Singleton is properly exported
- Can be imported in tool handlers

---

### P2-T05: Update Retrieve Block Children Schema for Markdown Option

| Field | Details |
|-------|---------|
| **Task ID** | P2-T05 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/schema/blocks.ts` (modify) |
| **Dependencies** | P2-T04 |
| **Parallel** | Can run in parallel with P2-T06 |

**Schema changes:**
```typescript
export const RETRIEVE_BLOCK_CHILDREN_SCHEMA = {
  blockId: z.string().describe("The ID of the block to retrieve children for"),
  start_cursor: z.string().optional().describe("Cursor for pagination"),
  page_size: z.number().min(1).max(100).optional().describe("Number of results (1-100)"),
  markdown: z.boolean()
    .optional()
    .describe("If true, return Markdown instead of block JSON. Default: false."),
};
```

**Acceptance Criteria:**
- Schema accepts `markdown: true`
- Schema accepts `markdown: false`
- Schema accepts missing `markdown` (defaults to false)

---

### P2-T06: Update Page Search/Retrieve Schema for Markdown Option

| Field | Details |
|-------|---------|
| **Task ID** | P2-T06 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/schema/page.ts` (modify) |
| **Dependencies** | P2-T04 |
| **Parallel** | Can run in parallel with P2-T05 |

**Schema changes for SEARCH_PAGES_SCHEMA:**
```typescript
export const SEARCH_PAGES_SCHEMA = {
  // ... existing fields
  markdown: z.boolean()
    .optional()
    .describe("If true, return page content as Markdown. Default: false."),
};
```

**Acceptance Criteria:**
- Search results can optionally include Markdown
- Backward compatible (JSON default)

---

### P2-T07: Implement Markdown Response Logic in Retrieve Block Children

| Field | Details |
|-------|---------|
| **Task ID** | P2-T07 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/tools/retrieveBlockChildren.ts` (modify) |
| **Dependencies** | P2-T04, P2-T05 |
| **Parallel** | None |

**Implementation Details:**
```typescript
import { notionMarkdownService } from "../services/NotionMarkdownService.js";
import { getMarkdownDefaultForRead, getMarkdownMaxChars } from "../config/index.js";

export const retrieveBlockChildren = async (
  params: RetrieveBlockChildrenParams
): Promise<CallToolResult> => {
  try {
    const useMarkdown = params.markdown ?? getMarkdownDefaultForRead();
    
    if (useMarkdown) {
      const md = await notionMarkdownService.blockToMarkdown(params.blockId);
      const maxChars = getMarkdownMaxChars();
      
      let markdown = md;
      let truncated = false;
      
      if (markdown.length > maxChars) {
        markdown = markdown.slice(0, maxChars) + "\n\n...(truncated)";
        truncated = true;
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              block_id: params.blockId,
              blocks: [],  // Empty for token savings
              markdown,
              markdown_truncated: truncated,
            }, null, 2),
          },
        ],
      };
    }
    
    // Existing JSON logic
    const response = await notion.blocks.children.list({...});
    // ...
  } catch (error) {
    return handleNotionError(error);
  }
};
```

**Token Optimization (Critical):**
- When `markdown: true`, return `blocks: []` (empty array)
- Do NOT include full block JSON alongside Markdown
- Only include lightweight metadata

**Acceptance Criteria:**
- `markdown: true` returns Markdown string
- `blocks` array is empty in Markdown mode
- Truncation works at configured limit
- `markdown_truncated: true` flag is set when truncated

---

### P2-T08: Implement Markdown Response Logic in Search Pages

| Field | Details |
|-------|---------|
| **Task ID** | P2-T08 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/tools/searchPage.ts` (modify) |
| **Dependencies** | P2-T04, P2-T06 |
| **Parallel** | Can run in parallel with P2-T07 |

**Implementation Details:**
- When `markdown: true`:
  - For each page in results, fetch page content as Markdown
  - Include only `{ id, url, markdown, markdown_truncated }` per page
  - Omit full page properties if too large

**Considerations:**
- Fetching Markdown for each search result may be slow
- Consider limiting markdown output to first N results
- Add warning if many results are returned

**Acceptance Criteria:**
- Search with `markdown: true` returns Markdown for each page
- Token-optimized output structure
- Performance is acceptable for typical result sets

---

### P2-T09: Unit Tests for NotionMarkdownService

| Field | Details |
|-------|---------|
| **Task ID** | P2-T09 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/services/__tests__/NotionMarkdownService.test.ts` (new) |
| **Dependencies** | P2-T03 |
| **Parallel** | After P2-T03 |

**Test Cases:**
1. Simple page converts to Markdown
2. Page with various block types
3. Unsupported blocks show placeholder
4. Image URLs preserved
5. Nested content included
6. Error handling for invalid page ID

**Acceptance Criteria:**
- All tests pass
- Mock Notion API responses for unit testing

---

## Phase 3 – Tests, Documentation, and Cleanup

### P3-T01: Update README.md with Markdown Features

| Field | Details |
|-------|---------|
| **Task ID** | P3-T01 |
| **Priority** | P1 (important) |
| **Target files** | `README.md` (modify) |
| **Dependencies** | P1-T19 (all write path complete) |
| **Parallel** | Can run in parallel with P3-T02, P3-T03 |

**Content to add:**
- New section: "Markdown Support"
  - Explain write path: creating pages with Markdown
  - Explain block append with Markdown
  - Explain page rewrite with Markdown
  - Mutual exclusivity of `children` vs `markdown`
- Examples:
  ```javascript
  // Create page with Markdown
  {
    "payload": {
      "action": "create_page",
      "params": {
        "parent": { "type": "page_id", "page_id": "xxx" },
        "properties": { "title": { "title": [{ "text": { "content": "My Page" } }] } },
        "markdown": "# Heading\n\nParagraph text\n\n- Item 1\n- Item 2"
      }
    }
  }
  ```
- New section for `rewrite_page` action
- (If P2 done) Section on Markdown retrieval

**Acceptance Criteria:**
- All new features are documented
- Examples are valid and work correctly
- Mutual exclusivity is clearly explained

---

### P3-T02: Update .env.example with New Variables

| Field | Details |
|-------|---------|
| **Task ID** | P3-T02 |
| **Priority** | P1 (important) |
| **Target files** | `.env.example` (create or modify) |
| **Dependencies** | P0-T02 |
| **Parallel** | Can run in parallel with P3-T01 |

**Content:**
```env
# Required
NOTION_TOKEN=your_notion_api_key
NOTION_PAGE_ID=your_root_page_id

# Optional: Markdown feature configuration
NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ=false
NOTION_MCP_MARKDOWN_MAX_CHARS=12000
```

**Acceptance Criteria:**
- All environment variables documented
- Defaults are clearly indicated

---

### P3-T03: Add JSDoc Comments to New Functions

| Field | Details |
|-------|---------|
| **Task ID** | P3-T03 |
| **Priority** | P1 (important) |
| **Target files** | All new/modified source files |
| **Dependencies** | All Phase 1 and Phase 2 tasks |
| **Parallel** | Can run in parallel with P3-T01, P3-T02 |

**Implementation Details:**
- Add JSDoc to all exported functions
- Include `@param`, `@returns`, `@throws` tags
- Document any constraints (e.g., 100-block limit)
- Include usage examples where helpful

**Acceptance Criteria:**
- All public functions have JSDoc
- IDE shows documentation on hover

---

### P3-T04: Add Error Handling Documentation

| Field | Details |
|-------|---------|
| **Task ID** | P3-T04 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `README.md` (modify) or `docs/errors.md` (new) |
| **Dependencies** | P1-T20 |
| **Parallel** | After all implementation |

**Content:**
- Document common errors and solutions:
  - Invalid Markdown syntax handling
  - 100-block limit and batching behavior
  - Rewrite failure scenarios
  - API rate limiting

**Acceptance Criteria:**
- Error scenarios documented
- Troubleshooting guidance provided

---

### P3-T05: Performance Testing for Large Documents

| Field | Details |
|-------|---------|
| **Task ID** | P3-T05 |
| **Priority** | P2 (optional/enhancement) |
| **Target files** | `src/__tests__/performance/` (new directory) |
| **Dependencies** | P1-T20 |
| **Parallel** | After all implementation |

**Test Cases:**
1. Convert 1000-line Markdown document
2. Create page with 500 blocks
3. Rewrite page with 1000 blocks (delete old, add new)
4. Measure and document timing

**Acceptance Criteria:**
- Performance benchmarks established
- No memory issues with large documents
- Reasonable completion times documented

---

### P3-T06: Final Code Review and Cleanup

| Field | Details |
|-------|---------|
| **Task ID** | P3-T06 |
| **Priority** | P1 (important) |
| **Target files** | All modified/new files |
| **Dependencies** | All other tasks |
| **Parallel** | Last task |

**Checklist:**
- [ ] Remove any `console.log` debug statements
- [ ] Verify all imports are used
- [ ] Check for TypeScript strict mode compliance
- [ ] Run linter and fix issues
- [ ] Verify build succeeds: `npm run build`
- [ ] Test all functionality manually
- [ ] Update version in `package.json` if appropriate

**Acceptance Criteria:**
- Clean build with no warnings
- All features work as documented
- Code follows project style conventions

---

## Dependency Graph Summary

```
Phase 0 (Preparation):
  P0-T01 ─┬─────────────────────────→ Phase 1
  P0-T02 ─┤
  P0-T03 ─┘

Phase 1 (Write Path):
  P1-T01 → P1-T02 → P1-T03 ─┬─→ P1-T04 ─┐
                            ├─→ P1-T05 ─┼─→ P1-T07 → P1-T08 → P1-T09
                            └─→ P1-T06 ─┘           ↓
                                              P1-T10 → P1-T11 → P1-T12
                                              P1-T13 ────────→ P1-T14
                                              P1-T15 (parallel with above)
                                              P1-T16 → P1-T17 → P1-T18 → P1-T19
                                                                         ↓
                                                                      P1-T20

Phase 2 (Read Path - Optional):
  P2-T01 → P2-T02 → P2-T03 → P2-T04 ─┬─→ P2-T05 → P2-T07
                                     ├─→ P2-T06 → P2-T08
                                     └─→ P2-T09

Phase 3 (Documentation):
  P3-T01 ─┬─→ P3-T06
  P3-T02 ─┤
  P3-T03 ─┤
  P3-T04 ─┤
  P3-T05 ─┘
```

---

## Quick Reference: Key Constraints

| Constraint | Where Applied |
|------------|--------------|
| Notion 100-block API limit | P1-T15, P1-T18 |
| Nested list → children structure (not flat) | P1-T07, P1-T08 |
| MVP: Inline formatting ignored (plain text only) | P1-T02 |
| Mutual exclusivity: `children` XOR `markdown` | P1-T10, P1-T13 |
| Validate before delete (rewrite safety) | P1-T18 |
| Token optimization: empty `blocks` with markdown | P2-T07, P2-T08 |
| Markdown max chars truncation | P2-T07 |
| Unsupported block type handling | P2-T02 |

---

## Estimated Effort

| Phase | Tasks | Priority | Estimated Hours |
|-------|-------|----------|-----------------|
| Phase 0 | 3 | P0 | 1-2 |
| Phase 1 | 20 | P0 | 15-25 |
| Phase 2 | 9 | P2 | 8-12 |
| Phase 3 | 6 | P1-P2 | 4-6 |
| **Total** | **38** | - | **28-45** |

---

## Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-11 | Initial task list created |
