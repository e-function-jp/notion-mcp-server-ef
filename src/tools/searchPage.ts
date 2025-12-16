import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { notion } from "../services/notion.js";
import { handleNotionError } from "../utils/error.js";
import { SearchPagesParams } from "../types/page.js";
import { notionMarkdownService } from "../services/NotionMarkdownService.js";
import {
  getMarkdownDefaultForRead,
  getMarkdownMaxChars,
} from "../config/index.js";

/**
 * Search result with optional Markdown content.
 */
interface SearchResultWithMarkdown {
  id: string;
  url: string;
  title?: string;
  markdown?: string;
  markdown_truncated?: boolean;
}

export async function searchPages(
  params: SearchPagesParams
): Promise<CallToolResult> {
  try {
    const response = await notion.search({
      query: params.query || "",
      sort: params.sort,
      start_cursor: params.start_cursor,
      page_size: params.page_size || 10,
    });

    const useMarkdown = params.markdown ?? getMarkdownDefaultForRead();

    if (useMarkdown) {
      // Fetch Markdown for each page result
      const maxChars = getMarkdownMaxChars();
      const results: SearchResultWithMarkdown[] = [];

      for (const result of response.results) {
        if (result.object !== "page") {
          continue;
        }

        const page = result as { id: string; url: string; properties?: Record<string, unknown> };

        // Extract title from properties
        let title: string | undefined;
        if (page.properties) {
          const titleProp = Object.values(page.properties).find(
            (prop: unknown) => (prop as { type?: string })?.type === "title"
          ) as { title?: Array<{ plain_text?: string }> } | undefined;
          if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
          }
        }

        try {
          let markdown = await notionMarkdownService.pageToMarkdown(page.id);
          let truncated = false;

          if (markdown.length > maxChars) {
            markdown = markdown.slice(0, maxChars) + "\n\n...(truncated)";
            truncated = true;
          }

          results.push({
            id: page.id,
            url: page.url,
            title,
            markdown,
            markdown_truncated: truncated,
          });
        } catch {
          // If Markdown conversion fails, include page without content
          results.push({
            id: page.id,
            url: page.url,
            title,
            markdown: "[Error: Could not convert page to Markdown]",
            markdown_truncated: false,
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: response.results.length,
                has_more: response.has_more,
                next_cursor: response.next_cursor,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Default JSON response
    const resultsText = JSON.stringify(response, null, 2);

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.results.length} results. ${
            response.has_more ? "More results available." : ""
          }\n\n${resultsText}`,
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
}
