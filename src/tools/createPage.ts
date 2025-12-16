import { notion } from "../services/notion.js";
import { CreatePageParams } from "../types/page.js";
import { handleNotionError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { markdownToBlocks } from "../utils/markdown/index.js";

export const registerCreatePageTool = async (
  params: CreatePageParams
): Promise<CallToolResult> => {
  try {
    // Validate mutual exclusivity
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

    // Convert markdown to blocks if provided
    let children: unknown[] | undefined;
    let contentInfo = "";

    if (params.markdown) {
      children = markdownToBlocks(params.markdown);
      contentInfo = ` with ${children.length} block(s) from Markdown`;
    } else if (params.children) {
      children = params.children;
      contentInfo = ` with ${children.length} block(s)`;
    }

    // Build the create page request
    const createParams: Parameters<typeof notion.pages.create>[0] = {
      parent: params.parent as Parameters<typeof notion.pages.create>[0]["parent"],
      properties: params.properties as Parameters<typeof notion.pages.create>[0]["properties"],
      ...(params.icon && { icon: params.icon as Parameters<typeof notion.pages.create>[0]["icon"] }),
      ...(params.cover && { cover: params.cover as Parameters<typeof notion.pages.create>[0]["cover"] }),
      ...(children && { children: children as Parameters<typeof notion.pages.create>[0]["children"] }),
    };

    const response = await notion.pages.create(createParams);

    return {
      content: [
        {
          type: "text",
          text: `Page created successfully: ${response.id}${contentInfo}`,
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};
