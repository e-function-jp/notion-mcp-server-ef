import { notion } from "../services/notion.js";
import { RetrieveBlockChildrenParams } from "../types/blocks.js";
import { handleNotionError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { notionMarkdownService } from "../services/NotionMarkdownService.js";
import { getMarkdownDefaultForRead, getMarkdownMaxChars } from "../config/index.js";

/**
 * Response envelope for Markdown mode.
 * Matches plan specification for token optimization.
 */
interface MarkdownResponseEnvelope {
  block_id: string;
  blocks: [];  // Empty array for token savings
  markdown: string;
  markdown_truncated: boolean;
}

export const retrieveBlockChildren = async (
  params: RetrieveBlockChildrenParams
): Promise<CallToolResult> => {
  try {
    const useMarkdown = params.markdown ?? getMarkdownDefaultForRead();

    if (useMarkdown) {
      // Return content as Markdown with proper envelope structure
      const md = await notionMarkdownService.blockToMarkdown(params.blockId);
      const maxChars = getMarkdownMaxChars();

      let markdown = md;
      let truncated = false;

      if (markdown.length > maxChars) {
        markdown = markdown.slice(0, maxChars) + "\n\n...(truncated)";
        truncated = true;
      }

      // Return structured envelope for token optimization
      const envelope: MarkdownResponseEnvelope = {
        block_id: params.blockId,
        blocks: [],  // Required empty array per plan spec
        markdown,
        markdown_truncated: truncated,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(envelope, null, 2),
          },
        ],
      };
    }

    // Default: return as JSON
    const response = await notion.blocks.children.list({
      block_id: params.blockId,
      start_cursor: params.start_cursor,
      page_size: params.page_size,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully retrieved ${response.results.length} children of block ${params.blockId}`,
        },
        {
          type: "text",
          text: `Has more: ${response.has_more ? "Yes" : "No"}${
            response.has_more && response.next_cursor
              ? `, Next cursor: ${response.next_cursor}`
              : ""
          }`,
        },
        {
          type: "text",
          text: JSON.stringify(response.results, null, 2),
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};
