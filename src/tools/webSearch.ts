import { GoogleGenAI } from "@google/genai";
import { config } from '../core/config';
import { withRetry, getValidModelName } from "../services/apiUtils";
import { GlobalModelConfig } from "../types";

/**
 * Web Search Tool
 */
export async function performWebSearch(query: string, globalModelConfig?: GlobalModelConfig): Promise<string> {
  if (!config.features.web_search.enable || !config.behavior.allow_internet_access) {
    return "网络访问被禁用";
  }

  try {
    const modelConfig = globalModelConfig?.core || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    }));

    return response.text || "未找到相关信息";
  } catch (error) {
    console.error("Web search error:", error);
    return "搜索失败";
  }
}
