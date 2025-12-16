# Implementation Plan v2 (English Version)

# Markdown Support for `awkoy/notion-mcp-server`

## 0. Goals and Premises

### Primary Goal (P0 – Highest Priority)

Enable AI systems to **submit Markdown text that is converted into Notion block structures and written into Notion**.
This includes:

* Creating new pages
* Appending block content
* (Optionally) rewriting entire pages using Markdown

### Secondary Goal (P2)

Allow Notion → AI data retrieval to be optionally provided as Markdown.

* **Default behavior should remain JSON**, not Markdown.
* Markdown output should be explicitly requested or enabled via environment configuration.

### Critical Design Constraint

To ensure token efficiency:

* When returning Markdown, **do NOT include the original block JSON**.
* Only lightweight metadata (e.g., page ID, page URL) should be kept.

This avoids doubling the payload size.

---

## 1. Functional Overview

### 1.1 Write Operations (Mandatory – Highest Priority)

Write-oriented tools must support two mutually exclusive input modes:

* **Raw Notion blocks** (`children`)
* **Markdown input** (`markdown` or `content_markdown`)

Affected tools:

* Page creation tools
* Append block tools
* Newly introduced full-page rewrite tool

Behavior:

* If `markdown` is provided, convert Markdown → Notion blocks and submit to Notion.
* No compression is applied during write operations.
* Markdown is treated as the canonical source.

### 1.2 Read Operations (Optional – Default OFF)

Read-oriented tools will receive a new optional flag:

* `markdown?: boolean`

If true → return Markdown output only (with `blocks` removed or empty).
If false or unspecified → return standard JSON.

Environment variable for default behavior:

```env
NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ=false
```

---

## 2. Token Reduction Policy (Important Revision)

### 2.1 Prohibition of Redundant Payloads

When Markdown is requested, do **not** return block JSON.

#### ❌ Incorrect (bloated, double payload)

```json
{
  "page": { ... },
  "blocks": [ ... ],
  "markdown": "# Title...",
  "markdown_truncated": false
}
```

#### ✅ Correct (token-optimized)

```json
{
  "page": { "id": "xxx", "url": "..." },
  "blocks": [],
  "markdown": "# Title...\n",
  "markdown_truncated": false
}
```

Agent Implementation Requirement:

> When `markdown === true`, omit the `blocks` field entirely or return an empty array.

### 2.2 Database Markdown Output

* Limit columns to *primary fields only* to avoid wide tables.
* Title, status, due date are sufficient for initial implementation.
* Leave extended formatting rules as TODO notes if necessary.

---

## 3. Libraries and Architecture

### 3.1 Dependencies

Install required packages:

```
npm install notion-to-md marked
```

### 3.2 NotionMarkdownService (Read → Markdown)

File: `src/notion/NotionMarkdownService.ts`

Responsibilities:

* Convert Notion pages/blocks → Markdown using `notion-to-md`.
* Automatically fetch nested child blocks using `notionClient`.
* Preserve image/file URLs in Markdown format.
* Protect against unsupported block crashes using custom transformers.

Example Implementation:

```ts
import { NotionToMarkdown } from "notion-to-md";
import { Client as NotionClient } from "@notionhq/client";

export class NotionMarkdownService {
  private n2m: NotionToMarkdown;

  constructor(private notion: NotionClient) {
    this.n2m = new NotionToMarkdown({ notionClient: notion });

    // Avoid crashes for unsupported block types
    this.n2m.setCustomTransformer("unsupported", (block) => {
      return `\n[Unsupported block: ${block.type}]\n`;
    });
  }

  async pageToMarkdown(pageId: string): Promise<string> {
    const mdBlocks = await this.n2m.pageToMarkdown(pageId);
    const { parent } = this.n2m.toMarkdownString(mdBlocks);
    return parent;
  }
}
```

### 3.3 Markdown → Notion Conversion (Write Path)

File: `src/notion/markdownToBlocks.ts`

Responsibilities:

* Convert Markdown → Notion block arrays (`BlockObjectRequest[]`).
* **Critical: Construct nested block structures** according to Markdown indentation rules.
* **Critical: Output blocks must be suitable for batching** due to the 100-block API limit.

Implementation Outline:

```ts
import { marked } from "marked";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

export function markdownToBlocks(markdown: string): BlockObjectRequest[] {
  const tokens = marked.lexer(markdown);
  // TODO: Implement a converter that handles:
  // 1. Heading mapping (h1 -> heading_1, h2 -> heading_2, etc.)
  // 2. List nesting: Indented list items must become children of their parent block
  // 3. Code blocks with language detection
  // 4. Plain-text-only inline formatting (bold/italic ignored) for MVP
  return [];
}
```

Constraints:

* **Nested Lists:** Markdown nested lists must be converted into Notion’s `children` structure, not a flat sequence.
* **Rich Text Handling:** For the MVP, inline formatting such as bold/italic/link may be ignored and treated as plain text. (Optional advanced mode may parse inline formatting into Notion `rich_text` annotations, but this significantly increases complexity.)

---

## 4. Tool Schema Updates

### 4.1 Page Creation Tool

Add `markdown` field and enforce mutual exclusivity.

```jsonc
{
  "type": "object",
  "properties": {
    "parent_page_id": { "type": "string" },
    "title": { "type": "string" },

    "children": {
      "type": "array",
      "description": "Raw Notion block objects. Use this OR markdown."
    },

    "markdown": {
      "type": "string",
      "description": "Page body in Markdown. Use this OR children."
    }
  },

  "required": ["parent_page_id", "title"],

  "oneOf": [
    { "required": ["children"] },
    { "required": ["markdown"] }
  ]
}
```

### 4.2 Block Append Tool

* Add `markdown?: string`.
* If provided, convert to blocks using `markdownToBlocks`.

### 4.3 Page Rewrite Tool (High Priority)

A dedicated tool for full-page Markdown replacement.

### Behavior

1. Fetch existing child blocks.
2. Generate new block array via `markdownToBlocks`.
3. **Validation:** Ensure block generation is successful *before* modifying the page to avoid accidental data loss.
4. Archive existing blocks (clear page safely).
5. **Batch Insert:** Append new blocks in batches of **100** due to Notion API limits.

   * Implementation must split the block array into chunks of 100 and send sequential requests.

### Additional Requirements

* Must gracefully handle failures so that partial writes do not corrupt page structure.
* Consider logging or returning diagnostic information when batching occurs.

---

## 5. Markdown Retrieval Output (Optional)

### 5.1 Environment Variables

```env
NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ=false
NOTION_MCP_MARKDOWN_MAX_CHARS=12000
```

### 5.2 Retrieval Behavior

```ts
const useMarkdown = args.markdown ?? (process.env.NOTION_MCP_MARKDOWN_DEFAULT_FOR_READ === "true");

if (useMarkdown) {
  const md = await markdownService.pageToMarkdown(pageId);

  let markdown = md;
  let truncated = false;

  if (markdown.length > MARKDOWN_MAX_CHARS) {
    markdown = markdown.slice(0, MARKDOWN_MAX_CHARS) + "\n\n...(truncated)";
    truncated = true;
  }

  return {
    page: { id: page.id, url: page.url },
    blocks: [], // required for token saving
    markdown,
    markdown_truncated: truncated
  };
}

return { page, blocks };
```

---

## 6. Agent Implementation Checklist

1. Add dependencies: `notion-to-md`, `marked`.
2. Implement `NotionMarkdownService` with:

   * Recursively fetched child blocks
   * Custom transformers for unsupported blocks
   * Image/file link preservation
3. Implement `markdownToBlocks` to support all basic Markdown constructs.
4. Update page creation tool schema and logic for mutual exclusivity of `children` vs `markdown`.
5. Update block append tool to accept Markdown input.
6. Add new page rewrite tool (`rewrite_page_with_markdown`).
7. Update all read tools to support optional Markdown output.
8. Ensure blocks are removed/omitted during Markdown output.
9. Update `.env.example` and `README.md` with full instructions.
10. Include examples of both write and read flows using Markdown.

---

## 7. Completeness Check

### Covered in this document:

* ✔ Full write-path Markdown support
* ✔ JSON/Markdown mutual exclusivity
* ✔ Token-optimized retrieval design
* ✔ Database Markdown considerations
* ✔ Recursive block handling
* ✔ Image/file URL preservation
* ✔ Crash-safe handling for unsupported blocks
* ✔ New tool for page rewriting
* ✔ Agent-ready task list
* ✔ English translation without information loss

**All required information from the Japanese v2 plan has been included without omission.**
