import { describe, it, expect } from "vitest";
import { markdownToBlocks, getConversionWarnings } from "../markdownToBlocks.js";

describe("markdownToBlocks", () => {
  describe("empty input", () => {
    it("should return empty array for empty string", () => {
      expect(markdownToBlocks("")).toEqual([]);
    });

    it("should return empty array for whitespace only", () => {
      expect(markdownToBlocks("   ")).toEqual([]);
      expect(markdownToBlocks("\n\n")).toEqual([]);
    });
  });

  describe("headings", () => {
    it("should convert # to heading_1", () => {
      const result = markdownToBlocks("# Title");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("heading_1");
      expect((result[0] as any).heading_1.rich_text[0].text.content).toBe("Title");
    });

    it("should convert ## to heading_2", () => {
      const result = markdownToBlocks("## Subtitle");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("heading_2");
    });

    it("should convert ### to heading_3", () => {
      const result = markdownToBlocks("### Section");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("heading_3");
    });

    it("should treat h4-h6 as h3", () => {
      expect(markdownToBlocks("#### H4")[0].type).toBe("heading_3");
      expect(markdownToBlocks("##### H5")[0].type).toBe("heading_3");
      expect(markdownToBlocks("###### H6")[0].type).toBe("heading_3");
    });
  });

  describe("paragraphs", () => {
    it("should convert text to paragraph", () => {
      const result = markdownToBlocks("Hello World");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("paragraph");
      expect((result[0] as any).paragraph.rich_text[0].text.content).toBe("Hello World");
    });

    it("should strip inline formatting", () => {
      const result = markdownToBlocks("This is **bold** and *italic*");
      expect((result[0] as any).paragraph.rich_text[0].text.content).toBe(
        "This is bold and italic"
      );
    });
  });

  describe("code blocks", () => {
    it("should convert fenced code block", () => {
      const markdown = "```javascript\nconsole.log('hello');\n```";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("code");
      expect((result[0] as any).code.language).toBe("javascript");
      expect((result[0] as any).code.rich_text[0].text.content).toBe("console.log('hello');");
    });

    it("should handle code block without language", () => {
      const markdown = "```\nplain code\n```";
      const result = markdownToBlocks(markdown);
      expect((result[0] as any).code.language).toBe("plain text");
    });
  });

  describe("blockquotes", () => {
    it("should convert blockquote", () => {
      const result = markdownToBlocks("> This is a quote");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("quote");
      expect((result[0] as any).quote.rich_text[0].text.content).toBe("This is a quote");
    });

    it("should handle multi-line blockquote", () => {
      const markdown = "> Line 1\n> Line 2";
      const result = markdownToBlocks(markdown);
      // Each line becomes a separate quote block
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe("quote");
    });
  });

  describe("horizontal rules", () => {
    it("should convert --- to divider", () => {
      const result = markdownToBlocks("---");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("divider");
    });

    it("should convert *** to divider", () => {
      const result = markdownToBlocks("***");
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("divider");
    });
  });

  describe("unordered lists", () => {
    it("should convert - items to bulleted list", () => {
      const markdown = "- Item 1\n- Item 2";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("bulleted_list_item");
      expect(result[1].type).toBe("bulleted_list_item");
    });

    it("should convert * items to bulleted list", () => {
      const markdown = "* Item 1\n* Item 2";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("bulleted_list_item");
    });

    it("should handle nested unordered lists", () => {
      const markdown = "- Parent\n  - Child";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("bulleted_list_item");
      expect((result[0] as any).bulleted_list_item.children).toBeDefined();
      expect((result[0] as any).bulleted_list_item.children).toHaveLength(1);
    });
  });

  describe("ordered lists", () => {
    it("should convert 1. items to numbered list", () => {
      const markdown = "1. First\n2. Second";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("numbered_list_item");
      expect(result[1].type).toBe("numbered_list_item");
    });

    it("should handle nested ordered lists", () => {
      const markdown = "1. Parent\n   1. Child";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect((result[0] as any).numbered_list_item.children).toBeDefined();
    });
  });

  describe("task lists", () => {
    it("should convert unchecked task", () => {
      const markdown = "- [ ] Unchecked task";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("to_do");
      expect((result[0] as any).to_do.checked).toBe(false);
    });

    it("should convert checked task", () => {
      const markdown = "- [x] Checked task";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("to_do");
      expect((result[0] as any).to_do.checked).toBe(true);
    });
  });

  describe("images", () => {
    it("should convert image to image block", () => {
      const markdown = "![alt text](https://example.com/image.png)";
      const result = markdownToBlocks(markdown);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("image");
      expect((result[0] as any).image.external.url).toBe("https://example.com/image.png");
    });
  });

  describe("mixed content", () => {
    it("should handle complex markdown document", () => {
      const markdown = `# Main Title

This is a paragraph with **bold** text.

## Section 1

- Item 1
- Item 2
  - Nested item

\`\`\`javascript
const x = 1;
\`\`\`

> A quote

---

1. Step 1
2. Step 2
`;
      const result = markdownToBlocks(markdown);
      
      // Should have multiple blocks
      expect(result.length).toBeGreaterThan(5);
      
      // Check some block types are present
      const types = result.map((b) => b.type);
      expect(types).toContain("heading_1");
      expect(types).toContain("heading_2");
      expect(types).toContain("paragraph");
      expect(types).toContain("bulleted_list_item");
      expect(types).toContain("code");
      expect(types).toContain("quote");
      expect(types).toContain("divider");
      expect(types).toContain("numbered_list_item");
    });
  });

  describe("nesting limits", () => {
    it("should warn when nesting exceeds MAX_NESTING_DEPTH", () => {
      // Create deeply nested list (4 levels)
      const markdown = `- Level 1
  - Level 2
    - Level 3
      - Level 4`;
      
      markdownToBlocks(markdown);
      const warnings = getConversionWarnings();
      
      // Should have warning about exceeding depth
      const nestingWarning = warnings.find((w) => w.includes("exceeds maximum depth"));
      expect(nestingWarning).toBeDefined();
    });

    it("should flatten items that exceed MAX_NESTING_DEPTH to siblings", () => {
      // Create deeply nested list (4 levels - level 4 should be flattened)
      const markdown = `- Level 1
  - Level 2
    - Level 3
      - Level 4 A
      - Level 4 B`;
      
      const result = markdownToBlocks(markdown);
      
      // Level 4 items should be flattened to siblings of Level 3
      // Result structure: L1 has child L2, L2 has child L3, L3 has siblings L4A and L4B
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // Verify content is NOT lost
      const allText = JSON.stringify(result);
      expect(allText).toContain("Level 1");
      expect(allText).toContain("Level 2");
      expect(allText).toContain("Level 3");
      expect(allText).toContain("Level 4 A");
      expect(allText).toContain("Level 4 B");
    });
  });

  describe("warnings", () => {
    it("should clear warnings between conversions", () => {
      // First conversion with deeply nested list
      const deepMarkdown = `- L1
  - L2
    - L3
      - L4`;
      markdownToBlocks(deepMarkdown);
      expect(getConversionWarnings().length).toBeGreaterThan(0);

      // Second conversion without nesting issues
      markdownToBlocks("# Simple heading");
      expect(getConversionWarnings()).toHaveLength(0);
    });
  });
});
