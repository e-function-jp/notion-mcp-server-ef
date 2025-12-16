import { notion } from "../../services/notion.js";
import type { NotionBlock } from "../markdown/types.js";

export const NOTION_BLOCK_LIMIT = 100;

/**
 * Splits an array of blocks into chunks of specified size.
 * 
 * @param blocks - Array of blocks to chunk
 * @param chunkSize - Maximum size of each chunk (default: 100)
 * @returns Array of block arrays, each at most chunkSize items
 */
export function chunkBlocks<T>(
  blocks: T[],
  chunkSize: number = NOTION_BLOCK_LIMIT
): T[][] {
  if (blocks.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Result of a batch append operation
 */
export interface BatchAppendResult {
  success: boolean;
  totalBlocks: number;
  batchCount: number;
  successfulBatches: number;
  results: unknown[];
  errors: Array<{ batchIndex: number; error: unknown }>;
}

/**
 * Appends blocks to a parent in batches, respecting Notion's 100-block limit.
 * Batches are sent sequentially to maintain order.
 * 
 * @param blockId - The parent block ID to append children to
 * @param blocks - Array of blocks to append
 * @returns Summary of all batch operations
 */
export async function appendBlocksInBatches(
  blockId: string,
  blocks: NotionBlock[]
): Promise<BatchAppendResult> {
  if (blocks.length === 0) {
    return {
      success: true,
      totalBlocks: 0,
      batchCount: 0,
      successfulBatches: 0,
      results: [],
      errors: [],
    };
  }

  const chunks = chunkBlocks(blocks);
  const results: unknown[] = [];
  const errors: Array<{ batchIndex: number; error: unknown }> = [];
  let successfulBatches = 0;

  // Execute batches sequentially to preserve order
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const response = await notion.blocks.children.append({
        block_id: blockId,
        children: chunk as Parameters<typeof notion.blocks.children.append>[0]["children"],
      });
      results.push(response);
      successfulBatches++;
    } catch (error) {
      errors.push({ batchIndex: i, error });
      // Continue with remaining batches even if one fails
    }
  }

  return {
    success: errors.length === 0,
    totalBlocks: blocks.length,
    batchCount: chunks.length,
    successfulBatches,
    results,
    errors,
  };
}

/**
 * Fetches all child block IDs from a parent block.
 * Handles pagination automatically.
 * 
 * @param blockId - The parent block ID
 * @returns Array of child block IDs
 */
export async function fetchAllChildBlockIds(blockId: string): Promise<string[]> {
  const childIds: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ("id" in block) {
        childIds.push(block.id);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return childIds;
}

/**
 * Deletes all child blocks from a parent block.
 * 
 * @param blockId - The parent block ID
 * @returns Number of blocks deleted
 */
export async function deleteAllChildBlocks(blockId: string): Promise<number> {
  const childIds = await fetchAllChildBlockIds(blockId);
  let deletedCount = 0;

  // Delete all children sequentially
  for (const childId of childIds) {
    try {
      await notion.blocks.delete({ block_id: childId });
      deletedCount++;
    } catch (error) {
      // Log but continue - block might already be deleted
      console.warn(`Failed to delete block ${childId}:`, error);
    }
  }

  return deletedCount;
}
