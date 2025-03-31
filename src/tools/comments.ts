import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { notion } from "../services/notion.js";
import {
  AddDiscussionCommentParams,
  AddPageCommentParams,
  GetCommentsParams,
} from "../types/comments.js";
import { handleNotionError } from "../utils/error.js";

export const registerGetCommentsTool = async (
  params: GetCommentsParams
): Promise<CallToolResult> => {
  try {
    const response = await notion.comments.list(params);

    return {
      content: [
        {
          type: "text",
          text: `Comments retrieved successfully: ${response.results.length}`,
        },
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};

export const registerAddPageCommentTool = async (
  params: AddPageCommentParams
): Promise<CallToolResult> => {
  try {
    const response = await notion.comments.create(params);

    return {
      content: [
        {
          type: "text",
          text: `Comment created successfully: ${response.id}`,
        },
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};

export const registerAddDiscussionCommentTool = async (
  params: AddDiscussionCommentParams
): Promise<CallToolResult> => {
  try {
    const response = await notion.comments.create(params);

    return {
      content: [
        {
          type: "text",
          text: `Comment created successfully: ${response.id}`,
        },
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return handleNotionError(error);
  }
};
