import { describe, it, expect } from "vitest";
import { chunkBlocks, NOTION_BLOCK_LIMIT } from "../batchUtils.js";

describe("chunkBlocks", () => {
  it("should return empty array for empty input", () => {
    expect(chunkBlocks([])).toEqual([]);
  });

  it("should return single chunk for small arrays", () => {
    const blocks = [1, 2, 3, 4, 5];
    const result = chunkBlocks(blocks);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([1, 2, 3, 4, 5]);
  });

  it("should return single chunk for exactly 100 items", () => {
    const blocks = Array.from({ length: 100 }, (_, i) => i);
    const result = chunkBlocks(blocks);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(100);
  });

  it("should split 101 items into 2 chunks", () => {
    const blocks = Array.from({ length: 101 }, (_, i) => i);
    const result = chunkBlocks(blocks);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(1);
  });

  it("should split 150 items into 2 chunks", () => {
    const blocks = Array.from({ length: 150 }, (_, i) => i);
    const result = chunkBlocks(blocks);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(50);
  });

  it("should split 250 items into 3 chunks", () => {
    const blocks = Array.from({ length: 250 }, (_, i) => i);
    const result = chunkBlocks(blocks);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(100);
    expect(result[2]).toHaveLength(50);
  });

  it("should respect custom chunk size", () => {
    const blocks = Array.from({ length: 25 }, (_, i) => i);
    const result = chunkBlocks(blocks, 10);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(10);
    expect(result[1]).toHaveLength(10);
    expect(result[2]).toHaveLength(5);
  });

  it("should preserve order across chunks", () => {
    const blocks = Array.from({ length: 150 }, (_, i) => i);
    const result = chunkBlocks(blocks);
    
    // Flatten and check order
    const flattened = result.flat();
    expect(flattened).toEqual(blocks);
  });

  it("should export NOTION_BLOCK_LIMIT constant", () => {
    expect(NOTION_BLOCK_LIMIT).toBe(100);
  });
});
