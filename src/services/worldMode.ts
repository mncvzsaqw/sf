import { GoogleGenAI } from "@google/genai";
import { Character, LiveScene, Plot, PlotChapter, WorldBook, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export async function expandLiveScene(
  character: Character,
  userInput: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<LiveScene> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
  
  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是一个沉浸式场景构建引擎。基于用户的输入，将其扩展为一个充满感官细节的、与角色 ${character.name} 共同经历的场景。

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

用户输入: "${userInput}"
角色背景: ${character.persona.backgroundStory}
说话风格: ${character.persona.speechStyle}

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请返回一个 JSON 对象，包含以下字段：
1. sceneType: 场景类型 (如: eating, walking, working, relaxing, shopping)
2. expandedScene: 扩展后的完整场景描述（使用中文，富有文学性，包含环境、氛围）
3. sensoryDetails: 包含 sounds, smells, sights, textures, tastes 的数组（每个数组包含1-2个细节）
4. aiResponse: 角色 ${character.name} 在这个场景下的第一句沉浸式回应。

JSON 格式示例:
{
  "sceneType": "eating",
  "expandedScene": "我们在一家昏暗的酒馆里...",
  "sensoryDetails": {
    "sounds": ["壁炉里木材燃烧的噼啪声"],
    "smells": ["浓郁的麦芽酒香"],
    "sights": ["摇曳的烛火映照在桌面上"],
    "textures": ["粗糙的木质桌面"],
    "tastes": ["苦涩而醇厚的酒液"]
  },
  "aiResponse": "这里的酒总是能让人暂时忘记烦恼，你觉得呢？"
}
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  }));

  const data = JSON.parse(response.text || '{}');
  
  return {
    id: `scene-${Date.now()}`,
    characterId: character.id,
    userInput,
    sceneType: data.sceneType || 'conversation',
    expandedScene: data.expandedScene || userInput,
    sensoryDetails: data.sensoryDetails || {},
    aiResponse: data.aiResponse,
    timestamp: new Date().toISOString()
  };
}

export async function expandPlot(
  character: Character,
  plot: Plot,
  mode: 'continue' | 'branch' | 'deepen' | 'twist',
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<PlotChapter> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const lastChapter = plot.chapters[plot.chapters.length - 1];
  
  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是一个专业的故事创作AI。请基于以下设定和当前故事，为故事创作下一个章节。

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

角色: ${character.name}
故事标题: ${plot.title}
故事类型: ${plot.genre}
故事风格: ${plot.style}

当前故事:
${lastChapter.content}

扩展模式: ${mode} (continue: 继续推进, branch: 产生分支, deepen: 深化细节/内心, twist: 意想不到的转折)

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请创作接下来的情节（使用中文，约200-400字）。保持角色的性格一致性。
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { temperature: 0.8 }
  }));

  return {
    id: plot.chapters.length + 1,
    content: response.text || "故事陷入了沉默...",
    type: mode,
    timestamp: new Date().toISOString(),
    generatedBy: 'auto'
  };
}

export async function generatePlotSetting(
  character: Character,
  userInput: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<{ title: string; genre: string; style: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

基于用户的故事开头，为这个故事生成一个标题、类型和风格。

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

用户输入: "${userInput}"
角色: ${character.name}

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

返回 JSON:
{
  "title": "故事标题",
  "genre": "类型",
  "style": "风格"
}
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  }));

  return JSON.parse(response.text || '{"title": "未命名故事", "genre": "日常", "style": "写实"}');
}

async function extractKeywords(text: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const prompt = `从以下文本中提取3-5个核心关键词，用于记忆检索。只返回关键词，用逗号分隔。\n\n文本: "${text}"`;
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return (response.text || '').split(/[,，]/).map(k => k.trim()).filter(k => k);
  } catch (e) {
    console.error("Keyword extraction failed:", e);
    return [];
  }
}

export async function generateEncounterResponse(
  character: Character,
  userInput: string,
  history: { role: 'user' | 'model', content: string }[],
  subType: 'intimacy' | 'daily',
  activeCharacters: Character[] = [],
  mountedNPCs: any[] = [],
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<{ content: string; speakerId?: string; speakerName?: string; speakerAvatar?: string }[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const otherChars = activeCharacters.filter(c => c.id !== character.id);
  
  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition)); // Default to front if undefined
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  // Extract keywords for memory retrieval
  const keywords = await extractKeywords(userInput);
  
  // Process NPC specific context (Memories and Books)
  const npcContexts = mountedNPCs.map(npc => {
    // Memory retrieval
    let retrievedMemories = [];
    if (npc.memories && npc.memories.length > 0 && keywords.length > 0) {
      const retrievalRounds = npc.memoryConfig?.retrievalRounds || 10;
      retrievedMemories = npc.memories
        .filter((m: any) => keywords.some(k => m.content.includes(k)))
        .sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0))
        .slice(0, retrievalRounds);
    }

    // Book mounting
    const npcBooks = (npc.bookIds || []).map((id: string) => {
      const book = activeBooks.find(b => b.id === id);
      return book ? `【NPC挂载角色书-${npc.name}】${book.name}: ${book.content}` : null;
    }).filter(Boolean);

    return {
      name: npc.name,
      persona: npc.persona,
      memories: retrievedMemories.map((m: any) => `[${new Date(m.timestamp).toLocaleDateString()}] ${m.content}`).join('\n'),
      books: npcBooks.join('\n')
    };
  });

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你现在正处于“相逢时刻”。在这个模式下，你 (${character.name}) 预设正和用户在一起。
${otherChars.length > 0 ? `当前场景中还有其他角色: ${otherChars.map(c => c.name).join(', ')}。` : ''}
${mountedNPCs.length > 0 ? `当前场景中还有NPC: ${mountedNPCs.map(n => n.name).join(', ')}。` : ''}

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

当前互动类型: ${subType === 'intimacy' ? '亲密互动' : '日常相处'}
主要角色性格: ${character.persona.backgroundStory}
说话风格: ${character.persona.speechStyle}

${otherChars.length > 0 ? `
其他角色信息:
${otherChars.map(c => `- ${c.name}: ${c.persona.backgroundStory} (风格: ${c.persona.speechStyle})`).join('\n')}
` : ''}

${npcContexts.length > 0 ? `
NPC详细信息与记忆:
${npcContexts.map(ctx => `
### ${ctx.name}
- 人设: ${ctx.persona}
${ctx.books ? `- 挂载角色书:\n${ctx.books}` : ''}
${ctx.memories ? `- 相关记忆检索:\n${ctx.memories}` : ''}
`).join('\n')}
` : ''}

最近的连接历史:
${history.map(h => `${h.role === 'user' ? '用户' : character.name}: ${h.content}`).join('\n')}

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

用户说: "${userInput}"

请生成回应。
如果只有 ${character.name} 回应，直接返回回应内容。
如果有多个角色或NPC回应，或者其他角色/NPC插话，请以 JSON 数组格式返回，每个对象包含:
{
  "speakerId": "角色或NPC的ID (主要角色ID: ${character.id}, 其他见下)",
  "content": "回应内容"
}

其他角色/NPC ID对照:
${otherChars.map(c => `${c.name}: ${c.id}`).join('\n')}
${mountedNPCs.map(n => `${n.name}: ${n.id}`).join('\n')}

如果返回 JSON，请确保是合法的 JSON 数组。如果只是普通文本，则视为主要角色 ${character.name} 的回应。
回应要自然、感性，体现出你们正待在一起的亲密感或生活气息。不要提及你是AI。
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { temperature: 0.9 }
  }));

  const text = response.text || "……";
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\n/, '').replace(/\n```$/, '').trim();
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\n/, '').replace(/\n```$/, '').trim();
  }

  try {
    // Try to parse as JSON if it looks like JSON
    if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
      const parsed = JSON.parse(cleanText);
      return parsed.map((p: any) => {
        const speaker = activeCharacters.find(c => c.id === p.speakerId) || mountedNPCs.find(n => n.id === p.speakerId) || character;
        return {
          content: p.content,
          speakerId: speaker.id,
          speakerName: speaker.name,
          speakerAvatar: speaker.avatar
        };
      });
    }
  } catch (e) {
    // Fallback to text
  }

  return [{
    content: text,
    speakerId: character.id,
    speakerName: character.name,
    speakerAvatar: character.avatar
  }];
}

export async function optimizePlotChapter(
  character: Character,
  plot: Plot,
  chapterContent: string,
  optimizationPrompt: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.story || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const prompt = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是一个故事优化专家。请基于用户的优化提示，对以下故事章节进行修改和优化。

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

角色: ${character.name}
故事标题: ${plot.title}
当前章节内容:
${chapterContent}

优化提示: "${optimizationPrompt}"

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请返回优化后的完整章节内容（使用中文）。保持风格一致，并精准执行用户的优化要求。
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { temperature: 0.7 }
  }));

  return response.text || chapterContent;
}
