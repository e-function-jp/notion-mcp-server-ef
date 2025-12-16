import { notion } from "../services/notion.js";
import { AppendBlockChildrenParams } from "../types/blocks.js";
import { handleNotionError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { markdownToBlocks, getConversionWarnings } from "../utils/markdown/index.js";
import { appendBlocksInBatches, NOTION_BLOCK_LIMIT } from "../utils/blocks/index.js";
import type { NotionBlock } from "../utils/markdown/types.js";

/**
 * Appends blocks to a parent block.
 * Supports both direct blocks (children) and Markdown input.
 * Automatically batches requests when block count exceeds 100.
 */
export const appendBlockChildren = async (
  params: AppendBlockChildrenParams
): Promise<CallToolResult> => {
  try {
    // Note: Mutual exclusivity is now enforced at schema level (APPEND_BLOCK_CHILDREN_VALIDATED_SCHEMA)
    // These runtime checks remain as defense-in-depth
    if (params.children && params.markdown) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Cannot use both 'children' and 'markdown' parameters. Please use only one.",
          },
        ],
        isError: true,
      };
    }

    if (!params.children && !params.markdown) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Either 'children' or 'markdown' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    // Convert markdown to blocks if provided
    let blocks: NotionBlock[];
    let fromMarkdown = false;
    let conversionWarnings: string[] = [];

    if (params.markdown) {
      blocks = markdownToBlocks(params.markdown);
      conversionWarnings = getConversionWarnings();
      fromMarkdown = true;
    } else {
      blocks = params.children as NotionBlock[];
    }

    // Use batch utility for automatic batching when > 100 blocks
    if (blocks.length > NOTION_BLOCK_LIMIT) {
      // Batch mode: use appendBlocksInBatches
      const batchResult = await appendBlocksInBatches(params.blockId, blocks);

      const messages: string[] = [
        `Successfully appended ${batchResult.totalBlocks} block(s) to ${params.blockId} in ${batchResult.batchCount} batch(es)${fromMarkdown ? " (converted from Markdown)" : ""}`,
      ];

      if (conversionWarnings.length > 0) {
        messages.push(`Conversion warnings: ${conversionWarnings.join("; ")}`);
      }

      if (!batchResult.success) {
        messages.push(
          `Partial success: ${batchResult.successfulBatches}/${batchResult.batchCount} batches succeeded`
        );
        messages.push(
          `Errors: ${batchResult.errors.map(e => `Batch ${e.batchIndex}: ${String(e.error)}`).join("; ")}`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: messages.join("\n"),
          },
        ],
        isError: !batchResult.success,
      };
    }

    // Standard mode: single API call for <= 100 blocks
    const response = await notion.blocks.children.append({
      block_id: params.blockId,
      children: blocks as Parameters<typeof notion.blocks.children.append>[0]["children"],
    });

    const messages: string[] = [
      `Successfully appended ${blocks.length} block(s) to ${params.blockId}${fromMarkdown ? " (converted from Markdown)" : ""}`,
    ];

    if (conversionWarnings.length > 0) {
      messages.push(`Conversion warnings: ${conversionWarnings.join("; ")}`);
    }

    return {
      content: [
        {
          type: "text",
          text: messages.join("\n"),
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
