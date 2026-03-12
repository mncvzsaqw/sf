import { GoogleGenAI } from "@google/genai";
import { withRetry, getValidModelName } from "../services/apiUtils";
import { GlobalModelConfig } from "../types";

/**
 * Vision Processor
 * Converts images to descriptive text using Gemini Vision.
 */
export async function processVision(base64Data: string, mimeType: string, globalModelConfig?: GlobalModelConfig): Promise<string> {
  try {
    const modelConfig = globalModelConfig?.core || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Remove data:image/jpeg;base64, prefix if present
    const cleanData = base64Data.split(',')[1] || base64Data;

    const response = await withRetry(() => ai.models.generateContent({
      model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { data: cleanData, mimeType } },
            { text: "请详细描述这张图片的内容，以便我作为AI伴侣能够理解并据此与用户交流。请用简洁的文字描述。" }
          ]
        }
      ],
    }));

    const description = response.text || "一张图片";
    return `[用户分享了一张图片，内容为：${description}]`;
  } catch (error) {
    console.error("Vision processing error:", error);
    return "[图片识别失败]";
  }
}
