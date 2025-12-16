import { describe, it, expect } from "vitest";
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
  createCalloutBlock,
  createToggleBlock,
} from "../blockCreators.js";

describe("createParagraphBlock", () => {
  it("should create a paragraph block", () => {
    const result = createParagraphBlock("Hello World");
    expect(result.type).toBe("paragraph");
    expect((result as any).paragraph.rich_text[0].text.content).toBe("Hello World");
  });

  it("should strip markdown from text", () => {
    const result = createParagraphBlock("**bold** text");
    expect((result as any).paragraph.rich_text[0].text.content).toBe("bold text");
  });
});

describe("createHeadingBlocks", () => {
  it("should create heading_1 block", () => {
    const result = createHeading1Block("Title");
    expect(result.type).toBe("heading_1");
    expect((result as any).heading_1.rich_text[0].text.content).toBe("Title");
  });

  it("should create heading_2 block", () => {
    const result = createHeading2Block("Subtitle");
    expect(result.type).toBe("heading_2");
    expect((result as any).heading_2.rich_text[0].text.content).toBe("Subtitle");
  });

  it("should create heading_3 block", () => {
    const result = createHeading3Block("Section");
    expect(result.type).toBe("heading_3");
    expect((result as any).heading_3.rich_text[0].text.content).toBe("Section");
  });
});

describe("createBulletedListItemBlock", () => {
  it("should create bulleted list item", () => {
    const result = createBulletedListItemBlock("Item 1");
    expect(result.type).toBe("bulleted_list_item");
    expect((result as any).bulleted_list_item.rich_text[0].text.content).toBe("Item 1");
  });

  it("should support children", () => {
    const child = createBulletedListItemBlock("Child");
    const result = createBulletedListItemBlock("Parent", [child]);
    expect((result as any).bulleted_list_item.children).toHaveLength(1);
    expect((result as any).bulleted_list_item.children[0].type).toBe("bulleted_list_item");
  });
});

describe("createNumberedListItemBlock", () => {
  it("should create numbered list item", () => {
    const result = createNumberedListItemBlock("Step 1");
    expect(result.type).toBe("numbered_list_item");
    expect((result as any).numbered_list_item.rich_text[0].text.content).toBe("Step 1");
  });

  it("should support children", () => {
    const child = createNumberedListItemBlock("Sub-step");
    const result = createNumberedListItemBlock("Step", [child]);
    expect((result as any).numbered_list_item.children).toHaveLength(1);
  });
});

describe("createCodeBlock", () => {
  it("should create code block with language", () => {
    const result = createCodeBlock('console.log("hi")', "javascript");
    expect(result.type).toBe("code");
    expect((result as any).code.rich_text[0].text.content).toBe('console.log("hi")');
    expect((result as any).code.language).toBe("javascript");
  });

  it("should map language aliases", () => {
    expect((createCodeBlock("code", "js") as any).code.language).toBe("javascript");
    expect((createCodeBlock("code", "ts") as any).code.language).toBe("typescript");
    expect((createCodeBlock("code", "py") as any).code.language).toBe("python");
    expect((createCodeBlock("code", "sh") as any).code.language).toBe("shell");
  });

  it("should default to plain text", () => {
    const result = createCodeBlock("some code");
    expect((result as any).code.language).toBe("plain text");
  });

  it("should NOT strip markdown from code content", () => {
    const result = createCodeBlock("**not bold** in code");
    expect((result as any).code.rich_text[0].text.content).toBe("**not bold** in code");
  });
});

describe("createQuoteBlock", () => {
  it("should create quote block", () => {
    const result = createQuoteBlock("A quote");
    expect(result.type).toBe("quote");
    expect((result as any).quote.rich_text[0].text.content).toBe("A quote");
  });
});

describe("createDividerBlock", () => {
  it("should create divider block", () => {
    const result = createDividerBlock();
    expect(result.type).toBe("divider");
    expect((result as any).divider).toEqual({});
  });
});

describe("createToDoBlock", () => {
  it("should create unchecked todo", () => {
    const result = createToDoBlock("Task", false);
    expect(result.type).toBe("to_do");
    expect((result as any).to_do.rich_text[0].text.content).toBe("Task");
    expect((result as any).to_do.checked).toBe(false);
  });

  it("should create checked todo", () => {
    const result = createToDoBlock("Done task", true);
    expect((result as any).to_do.checked).toBe(true);
  });
});

describe("createImageBlock", () => {
  it("should create image block with valid URL", () => {
    const result = createImageBlock("https://example.com/image.png");
    expect(result.type).toBe("image");
    expect((result as any).image.type).toBe("external");
    expect((result as any).image.external.url).toBe("https://example.com/image.png");
  });

  it("should include caption if provided", () => {
    const result = createImageBlock("https://example.com/image.png", "My caption");
    expect((result as any).image.caption[0].text.content).toBe("My caption");
  });

  it("should return paragraph for invalid URL", () => {
    const result = createImageBlock("not-a-url");
    expect(result.type).toBe("paragraph");
  });
});

describe("createCalloutBlock", () => {
  it("should create callout block", () => {
    const result = createCalloutBlock("Important note");
    expect(result.type).toBe("callout");
    expect((result as any).callout.rich_text[0].text.content).toBe("Important note");
  });

  it("should include emoji icon if provided", () => {
    const result = createCalloutBlock("Warning", "⚠️");
    expect((result as any).callout.icon.type).toBe("emoji");
    expect((result as any).callout.icon.emoji).toBe("⚠️");
  });
});

describe("createToggleBlock", () => {
  it("should create toggle block", () => {
    const result = createToggleBlock("Click to expand");
    expect(result.type).toBe("toggle");
    expect((result as any).toggle.rich_text[0].text.content).toBe("Click to expand");
  });

  it("should include children if provided", () => {
    const child = createParagraphBlock("Hidden content");
    const result = createToggleBlock("Toggle", [child]);
    expect((result as any).toggle.children).toHaveLength(1);
  });
});
