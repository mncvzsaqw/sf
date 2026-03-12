import { GoogleGenAI } from "@google/genai";
import { Character, DiaryEntry, WorldSetting, WorldBook, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export async function simulateBackgroundLife(
  character: Character,
  world: WorldSetting,
  lastUpdate: string,
  currentTime: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<{
  diaryEntries: DiaryEntry[];
  newStatus: string;
  newLocation: string;
}> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.background || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const timeGap = new Date(currentTime).getTime() - new Date(lastUpdate).getTime();
  const minutesGap = timeGap / (1000 * 60);

  // If gap is too small (less than 10 seconds), don't simulate
  if (minutesGap < 0.16) {
    return { diaryEntries: [], newStatus: character.state.survival.status, newLocation: world.currentLocation };
  }

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是一个角色生活记录器。角色 ${character.name} 正在她的世界中生活。
当前世界设定: ${world.name} - ${world.description}
世界规则: ${world.rules.join(', ')}

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

当前地点: ${world.currentLocation}
当前状态: ${character.state.survival.status}

现在时间是 ${currentTime}，距离上次更新已经过去了 ${minutesGap.toFixed(1)} 分钟（上次更新时间: ${lastUpdate}）。

请根据时间流逝和世界设定，记录这段时间内角色经历了什么。
如果是深夜，角色应该在睡觉；如果是清晨，应该在洗漱或早餐。

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请返回一个 JSON 对象：
{
  "events": [
    {
      "time": "ISO格式时间戳",
      "content": "记录内容（第一人称，富有生活气息，反映内心感受，不要提及你是AI或模拟器）",
      "category": "生活类别",
      "location": "发生地点"
    }
  ],
  "currentStatus": "角色现在的简短状态（如：正在午睡、正在赶路）",
  "currentLocation": "角色现在的所在地点"
}
`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));

    const data = JSON.parse(response.text || '{}');
    
    const diaryEntries: DiaryEntry[] = (data.events || []).map((e: any, i: number) => ({
      id: `life-${Date.now()}-${i}`,
      characterId: character.id,
      type: 'LIFE',
      content: e.content,
      confidence: 1.0,
      category: e.category || '日常',
      timestamp: e.time || new Date().toISOString()
    }));

    return {
      diaryEntries,
      newStatus: data.currentStatus || character.state.survival.status,
      newLocation: data.currentLocation || world.currentLocation
    };
  } catch (e: any) {
    console.error("Life recording failed", e);
    return { diaryEntries: [], newStatus: character.state.survival.status, newLocation: world.currentLocation };
  }
}

export async function logWorldEventToDiary(
  character: Character,
  world: WorldSetting,
  messages: { role: string, content: string }[],
  type: 'encounter' | 'plot',
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<DiaryEntry | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.background || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是一个角色生活记录器。角色 ${character.name} 刚刚经历了一段互动。

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

当前世界设定: ${world.name}
当前地点: ${world.currentLocation}

互动类型: ${type === 'encounter' ? '日常/亲密互动' : '故事'}
互动内容摘要:
${messages.map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join('\n')}

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请以 ${character.name} 的第一人称视角，将这段互动总结为一条生活记录。
要求：
1. 必须非常简洁，只用一句话概括发生了什么关键事件或感受。
2. 不要提及“模拟”、“AI”或“系统”。
3. 就像随手记下的备忘录或短句日记。
4. 字数控制在 30 字以内。

请直接返回记录内容，不要包含其他文字。
`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { temperature: 0.7 }
    }));

    const content = response.text;
    if (!content) return null;

    return {
      id: `world-event-${Date.now()}`,
      characterId: character.id,
      type: 'LIFE',
      content: content.trim(),
      confidence: 1.0,
      category: type === 'encounter' ? '互动' : '故事',
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    console.error("Failed to log world event", e);
    return null;
  }
}
