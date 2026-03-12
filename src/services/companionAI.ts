import { GoogleGenAI } from "@google/genai";
import { Character, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export async function generateCompanionEncouragement(
  character: Character,
  state: 'work' | 'short_break' | 'long_break',
  context: string,
  customPrompt?: string,
  globalModelConfig?: GlobalModelConfig
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
  const stateLabel = state === 'work' ? '专注工作/学习' : '休息';
  
  const systemPrompt = `
你正在陪伴用户进行${stateLabel}。
角色设定：
${character.persona.backgroundStory}
性格：${character.persona.personalityType}
语言风格：${character.persona.speechStyle}

任务：
请生成一句简短的鼓励或提醒话语，温暖而有力量。
要求：
1. 保持自然口语化，像真实的伴侣或朋友在身边。
2. 可以加入昵称。
3. 限制在30字以内。
4. 严禁提及“模拟”、“AI”或“系统”。
5. 如果是工作时间，侧重于鼓励专注；如果是休息时间，侧重于关心和放松。
${customPrompt ? `补充提示词：${customPrompt}` : ''}

当前上下文：${context}
`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: "给我一句鼓励的话。",
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        maxOutputTokens: 100,
      }
    }));

    return response.text || (state === 'work' ? "加油，我会一直陪着你的。" : "辛苦了，喝口水休息一下吧。");
  } catch (e) {
    console.error("Companion encouragement failed", e);
    return state === 'work' ? "加油，专注当下的每一秒。" : "休息一下，放松心情。";
  }
}
