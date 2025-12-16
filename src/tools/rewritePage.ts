import { RewritePageParams } from "../types/page.js";
import { handleNotionError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { markdownToBlocks, getConversionWarnings } from "../utils/markdown/index.js";
import { appendBlocksInBatches, deleteAllChildBlocks, fetchAllChildBlockIds } from "../utils/blocks/index.js";

/**
 * Rewrites entire page content by deleting existing blocks and replacing with Markdown.
 * 
 * Uses an "append-first" strategy to prevent data loss:
 * 1. Convert Markdown to blocks and validate
 * 2. Append new blocks FIRST (page temporarily has both old and new content)
 * 3. Delete old blocks only AFTER append succeeds
 * 
 * This ensures the page is never left empty if the append fails.
 */
export const rewritePage = async (
  params: RewritePageParams
): Promise<CallToolResult> => {
  const { pageId, markdown, validateBeforeDelete = true } = params;

  try {
    // Step 1: Convert Markdown to blocks
    const blocks = markdownToBlocks(markdown);
    const warnings = getConversionWarnings();

    if (blocks.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Markdown conversion resulted in 0 blocks. Please provide valid Markdown content.",
          },
        ],
        isError: true,
      };
    }

    // Step 2: Fetch existing block IDs BEFORE appending (for later deletion)
    let existingBlockIds: string[] = [];
    if (validateBeforeDelete) {
      existingBlockIds = await fetchAllChildBlockIds(pageId);
    }

    // Step 3: APPEND NEW BLOCKS FIRST (append-first strategy)
    // This ensures the page is never left empty if append fails
    const batchResult = await appendBlocksInBatches(pageId, blocks);

    if (!batchResult.success) {
      // Append failed - do NOT delete existing content
      // Page still has original content (safe failure)
      return {
        content: [
          {
            type: "text",
            text: [
              `Error: Failed to append new content to page ${pageId}`,
              `Original content has been preserved (no data lost).`,
              `Successful batches: ${batchResult.successfulBatches}/${batchResult.batchCount}`,
              `Errors: ${batchResult.errors.map(e => `Batch ${e.batchIndex}: ${String(e.error)}`).join("; ")}`,
              `Note: ${batchResult.successfulBatches > 0 ? "Some new blocks were added but original content remains." : "No new blocks were added."}`,
            ].join("\n"),
          },
        ],
        isError: true,
      };
    }

    // Step 4: Delete old blocks ONLY AFTER successful append
    let deletedCount = 0;
    const deleteErrors: string[] = [];
    
    if (existingBlockIds.length > 0) {
      const deleteResult = await deleteBlocksByIds(existingBlockIds);
      deletedCount = deleteResult.deletedCount;
      deleteErrors.push(...deleteResult.errors);
    }

    // Build response
    const resultMessages: string[] = [
      `Page rewrite completed for ${pageId}`,
      `Added: ${batchResult.totalBlocks} new block(s) in ${batchResult.batchCount} batch(es)`,
      `Deleted: ${deletedCount} existing block(s)`,
    ];

    if (warnings.length > 0) {
      resultMessages.push(`Conversion warnings: ${warnings.join("; ")}`);
    }

    if (deleteErrors.length > 0) {
      resultMessages.push(
        `Note: Some old blocks could not be deleted: ${deleteErrors.slice(0, 3).join("; ")}${deleteErrors.length > 3 ? ` (+${deleteErrors.length - 3} more)` : ""}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: resultMessages.join("\n"),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return handleNotionError(error);
  }
};

/**
 * Delete blocks by their IDs.
 * Continues on individual failures to delete as many as possible.
 */
async function deleteBlocksByIds(blockIds: string[]): Promise<{ deletedCount: number; errors: string[] }> {
  const { notion } = await import("../services/notion.js");
  let deletedCount = 0;
  const errors: string[] = [];

  for (const blockId of blockIds) {
    try {
      await notion.blocks.delete({ block_id: blockId });
      deletedCount++;
    } catch (error) {
      errors.push(`${blockId}: ${String(error)}`);
    }
  }

  return { deletedCount, errors };
}
