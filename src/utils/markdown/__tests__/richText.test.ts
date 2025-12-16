import { describe, it, expect } from "vitest";
import {
  stripInlineMarkdown,
  createPlainTextRichText,
  createLinkRichText,
} from "../richText.js";

describe("stripInlineMarkdown", () => {
  it("should return empty string for empty input", () => {
    expect(stripInlineMarkdown("")).toBe("");
    expect(stripInlineMarkdown(null as unknown as string)).toBe("");
  });

  it("should strip bold markdown", () => {
    expect(stripInlineMarkdown("**bold**")).toBe("bold");
    expect(stripInlineMarkdown("__bold__")).toBe("bold");
  });

  it("should strip italic markdown", () => {
    expect(stripInlineMarkdown("*italic*")).toBe("italic");
    expect(stripInlineMarkdown("_italic_")).toBe("italic");
  });

  it("should strip bold and italic combined", () => {
    expect(stripInlineMarkdown("***bolditalic***")).toBe("bolditalic");
    expect(stripInlineMarkdown("___bolditalic___")).toBe("bolditalic");
  });

  it("should strip inline code", () => {
    expect(stripInlineMarkdown("`code`")).toBe("code");
    expect(stripInlineMarkdown("some `inline code` here")).toBe(
      "some inline code here"
    );
  });

  it("should strip strikethrough", () => {
    expect(stripInlineMarkdown("~~deleted~~")).toBe("deleted");
  });

  it("should strip links but keep text", () => {
    expect(stripInlineMarkdown("[link text](https://example.com)")).toBe(
      "link text"
    );
    expect(
      stripInlineMarkdown("Check out [this link](https://example.com) now")
    ).toBe("Check out this link now");
  });

  it("should strip images but keep alt text", () => {
    expect(stripInlineMarkdown("![alt text](image.png)")).toBe("alt text");
  });

  it("should handle mixed formatting", () => {
    expect(
      stripInlineMarkdown(
        "This is **bold** and *italic* with `code` and a [link](url)"
      )
    ).toBe("This is bold and italic with code and a link");
  });

  it("should handle escaped characters", () => {
    // Escaped markdown characters should be unescaped
    expect(stripInlineMarkdown("\\*")).toBe("*");
    expect(stripInlineMarkdown("\\`")).toBe("`");
    expect(stripInlineMarkdown("\\[")).toBe("[");
  });
});

describe("createPlainTextRichText", () => {
  it("should return empty array for null/undefined", () => {
    expect(createPlainTextRichText(null as unknown as string)).toEqual([]);
    expect(createPlainTextRichText(undefined as unknown as string)).toEqual([]);
  });

  it("should create rich_text with empty string", () => {
    const result = createPlainTextRichText("");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "text",
      text: { content: "" },
    });
  });

  it("should create rich_text from plain text", () => {
    const result = createPlainTextRichText("Hello World");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "text",
      text: { content: "Hello World" },
    });
  });

  it("should strip markdown from input", () => {
    const result = createPlainTextRichText("**bold** and *italic*");
    expect(result).toHaveLength(1);
    expect(result[0].text.content).toBe("bold and italic");
  });

  it("should split long text into chunks", () => {
    const longText = "a".repeat(3000);
    const result = createPlainTextRichText(longText);
    expect(result.length).toBeGreaterThan(1);
    // Total content should be preserved
    const totalContent = result.map((r) => r.text.content).join("");
    expect(totalContent.length).toBe(3000);
  });

  it("should not exceed 2000 characters per chunk", () => {
    const longText = "word ".repeat(500); // About 2500 characters
    const result = createPlainTextRichText(longText);
    for (const item of result) {
      expect(item.text.content.length).toBeLessThanOrEqual(2000);
    }
  });
});

describe("createLinkRichText", () => {
  it("should create rich_text with link", () => {
    const result = createLinkRichText("Click here", "https://example.com");
    expect(result).toEqual({
      type: "text",
      text: {
        content: "Click here",
        link: { url: "https://example.com" },
      },
    });
  });
});
