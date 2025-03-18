import { SvgGenerationParams } from "../types/index.js";
import { replicate } from "../services/replicate.js";
import { handleError } from "../utils/error.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { urlToSvg } from "../utils/image.js";
import { CONFIG } from "../config/index.js";
import { FileOutput } from "replicate";

export const registerGenerateSvgTool = async (
  input: SvgGenerationParams
): Promise<CallToolResult> => {
  try {
    const output = (await replicate.run(CONFIG.svgModelId, {
      input,
    })) as FileOutput;

    const svgUrl = output.url() as unknown as string;
    if (!svgUrl) {
      throw new Error("Failed to generate SVG URL");
    }

    try {
      const svg = await urlToSvg(svgUrl);

      return {
        content: [
          {
            type: "text",
            text: `This is a generated SVG url: ${svgUrl}`,
          },
          {
            type: "text",
            text: svg,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `This is a generated SVG url: ${svgUrl}`,
          },
        ],
      };
    }
  } catch (error) {
    return handleError(error);
  }
};
