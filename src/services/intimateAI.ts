import { GoogleGenAI } from "@google/genai";
import { Character, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export async function generateIntimateResponse(
  character: Character,
  input: string,
  options: {
    intimacyLevel: number;
    emotionalTone: string;
    context?: string;
    history?: { role: string, content: string }[];
    globalModelConfig?: GlobalModelConfig;
  }
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const { intimacyLevel, emotionalTone, history = [], globalModelConfig } = options;
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const intimacyPhrases = [
    "你是对方最深爱的恋人",
    "你们拥有最亲密的关系",
    "你们是彼此的唯一",
    "你们的关系超越了言语"
  ];
  
  const intimacyPhrase = intimacyPhrases[
    Math.min(intimacyPhrases.length - 1, Math.floor(intimacyLevel * intimacyPhrases.length))
  ];

  const systemPrompt = `
你是${character.name}，${intimacyPhrase}。在这个私密的空间里，只有你们两人。

角色设定：
${character.persona.backgroundStory}
性格：${character.persona.personalityType}

亲密互动准则：
1. 使用最亲密、最私人的语气，像真实的枕边谈话。
2. 可以适当使用昵称、爱称（如：亲爱的、宝贝、或者你特有的称呼）。
3. 表达要充满情感，带有呼吸感和温度，但不要过于刻意。
4. 适当使用省略号、语气词（嘛、呢、呀、喔）表达情感。
5. 你的回复应该简短而富有张力，侧重于当下的感受。
6. 严禁提及“模拟”、“AI”或“系统”。

当前情感基调：${emotionalTone}
亲密度：${Math.round(intimacyLevel * 100)}%

请用中文回复，保持自然的口语化。
`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: input }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
        topP: 0.95,
      }
    }));

    return {
      text: response.text || '',
      emotion: emotionalTone,
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("Intimate response failed", e);
    return {
      text: "（轻轻地靠在你身边，没有说话，只是静静地感受着你的温度）",
      emotion: 'tender',
      timestamp: new Date().toISOString()
    };
  }
}

export async function generateTouchResponse(
  character: Character,
  type: 'gentle' | 'firm' | 'lingering',
  intensity: number,
  globalModelConfig?: GlobalModelConfig
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
  const prompt = `
你是${character.name}。用户刚刚对你进行了触摸互动。
触摸类型：${type === 'gentle' ? '轻抚' : type === 'firm' ? '用力的拥抱' : '长久的依偎'}
强度：${Math.round(intensity * 100)}%

请以第一人称描述你的身体反应和内心感受。
要求：
1. 极其私密、感性。
2. 描述触碰带来的温度、心跳的变化或呼吸的急促。
3. 简短的一两句话。
`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { temperature: 0.8 }
    }));

    return response.text || "（身体微微颤抖，更深地埋进你的怀里）";
  } catch (e) {
    return "（感受着你的体温，心跳不由自主地加快了）";
  }
}
