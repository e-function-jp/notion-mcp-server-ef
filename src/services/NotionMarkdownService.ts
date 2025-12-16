import { NotionToMarkdown } from "notion-to-md";
import type { Client as NotionClient } from "@notionhq/client";
import { notion } from "./notion.js";

/**
 * Service for converting Notion content to Markdown format.
 * Uses notion-to-md library with custom transformers for unsupported blocks.
 */
export class NotionMarkdownService {
  private n2m: NotionToMarkdown;

  constructor(notionClient: NotionClient) {
    this.n2m = new NotionToMarkdown({ notionClient });

    // Register custom transformers for block types that might not be fully supported
    this.registerCustomTransformers();
  }

  /**
   * Register custom transformers for unsupported or special block types.
   */
  private registerCustomTransformers(): void {
    // Block types that we want to handle gracefully
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
    ];

    for (const type of unsupportedTypes) {
      this.n2m.setCustomTransformer(type as Parameters<typeof this.n2m.setCustomTransformer>[0], (block) => {
        // Provide readable placeholder in Markdown output
        const blockType = (block as { type?: string }).type || type;
        return `\n<!-- [${blockType} block - not rendered] -->\n`;
      });
    }

    // Special handling for child_page to show title
    this.n2m.setCustomTransformer("child_page", (block) => {
      const childPage = block as unknown as { child_page?: { title?: string } };
      const title = childPage?.child_page?.title || "Untitled";
      return `\n📄 **[Child Page: ${title}]**\n`;
    });

    // Special handling for child_database to show title
    this.n2m.setCustomTransformer("child_database", (block) => {
      const childDb = block as unknown as { child_database?: { title?: string } };
      const title = childDb?.child_database?.title || "Untitled";
      return `\n📊 **[Child Database: ${title}]**\n`;
    });

    // Special handling for bookmark to preserve URL
    this.n2m.setCustomTransformer("bookmark", (block) => {
      const bookmark = block as unknown as { bookmark?: { url?: string; caption?: Array<{ plain_text?: string }> } };
      const url = bookmark?.bookmark?.url || "";
      const caption = bookmark?.bookmark?.caption?.[0]?.plain_text || url;
      return url ? `\n🔖 [${caption}](${url})\n` : "\n<!-- [Bookmark - no URL] -->\n";
    });

    // Special handling for video to preserve URL
    this.n2m.setCustomTransformer("video", (block) => {
      const video = block as unknown as { video?: { external?: { url?: string }; file?: { url?: string } } };
      const url = video?.video?.external?.url || video?.video?.file?.url || "";
      return url ? `\n🎬 [Video](${url})\n` : "\n<!-- [Video block] -->\n";
    });

    // Special handling for file to preserve URL
    this.n2m.setCustomTransformer("file", (block) => {
      const file = block as unknown as { file?: { external?: { url?: string }; file?: { url?: string }; name?: string } };
      const url = file?.file?.external?.url || file?.file?.file?.url || "";
      const name = file?.file?.name || "File";
      return url ? `\n📎 [${name}](${url})\n` : "\n<!-- [File block] -->\n";
    });

    // Special handling for PDF to preserve URL
    this.n2m.setCustomTransformer("pdf", (block) => {
      const pdf = block as unknown as { pdf?: { external?: { url?: string }; file?: { url?: string } } };
      const url = pdf?.pdf?.external?.url || pdf?.pdf?.file?.url || "";
      return url ? `\n📄 [PDF](${url})\n` : "\n<!-- [PDF block] -->\n";
    });

    // Special handling for embed to preserve URL
    this.n2m.setCustomTransformer("embed", (block) => {
      const embed = block as unknown as { embed?: { url?: string } };
      const url = embed?.embed?.url || "";
      return url ? `\n🔗 [Embed](${url})\n` : "\n<!-- [Embed block] -->\n";
    });
  }

  /**
   * Converts a Notion page to Markdown format.
   * Recursively fetches all child blocks.
   * 
   * @param pageId - The ID of the page to convert
   * @returns Markdown string representation of the page
   */
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

  /**
   * Converts a specific block and its children to Markdown.
   * 
   * @param blockId - The ID of the block to convert
   * @returns Markdown string representation of the block and its children
   */
  async blockToMarkdown(blockId: string): Promise<string> {
    try {
      // notion-to-md treats block IDs the same as page IDs for children
      const mdBlocks = await this.n2m.pageToMarkdown(blockId);
      const { parent } = this.n2m.toMarkdownString(mdBlocks);
      return parent;
    } catch (error) {
      console.error(`Error converting block ${blockId} to Markdown:`, error);
      throw error;
    }
  }
}

// Export singleton instance using the shared Notion client
export const notionMarkdownService = new NotionMarkdownService(notion);
