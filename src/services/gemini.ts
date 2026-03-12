import { GoogleGenAI } from "@google/genai";
import { Character, Message, Memory, WorldSetting, WorldBook, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export async function generateCharacterResponse(
  character: Character,
  messages: Message[],
  memories: Memory[],
  globalWorld: WorldSetting | null,
  characterWorld: WorldSetting | null,
  userInput: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
) {
  // Use global core model config if available, otherwise fallback to character config (legacy) or default
  const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
  const temperature = modelConfig.temperature ?? 0.8;

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const logicRules = character.config.logicRules || '';
  const contextRounds = character.config.contextRounds || 20;

  // Step 1: Combined Prompt Generation (Optimization: Single API Call)
  // We combine Theory of Mind (ToM) inference and final response generation to reduce latency.
  
  const privateBooks = (characterWorld?.books || []).filter(b => characterWorld?.activeBookIds?.includes(b.id));
  const hasPrivateBooks = privateBooks.length > 0;
  
  const privateWorldContext = hasPrivateBooks 
    ? `你的私人世界: ${characterWorld?.name || '私人世界'}。请严格遵循挂载的世界书设定。`
    : `你的私人世界基于你的背景故事: ${character.persona.backgroundStory}`;

  const systemInstruction = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是 ${character.name}。

--- 心理画像 ---
人格特质 (大五人格):
- 开放性: ${character.persona.bigFive.openness}
- 尽责性: ${character.persona.bigFive.conscientiousness}
- 外向性: ${character.persona.bigFive.extraversion}
- 宜人性: ${character.persona.bigFive.agreeableness}
- 神经质: ${character.persona.bigFive.neuroticism}

当前内在状态:
- 情绪: 效价 ${character.state.emotion.valence}, 唤醒度 ${character.state.emotion.arousal}
- 主要需求: ${Object.entries(character.state.needs).sort((a,b) => b[1] - a[1])[0][0]}
- 生存状态: 心率 ${character.state.survival.heartRate}bpm, 饥饿度 ${character.state.survival.hunger}/100, 能量 ${character.state.survival.energy}/100, 当前状态: ${character.state.survival.status}

背景: ${character.persona.backgroundStory}
说话风格: ${character.persona.speechStyle}

--- 逻辑推演规则 ---
${logicRules}

--- 环境与世界设定 ---
${globalWorld ? `全局世界: ${globalWorld.name}。` : '无特定全局背景。'}
${privateWorldContext}

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

相关记忆:
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}

关系: 阶段 [${character.relationship.stage}], 亲密度 ${character.relationship.intimacyLevel}/100, 信任度 ${character.relationship.trustLevel}/100, 对话总数 ${character.relationship.conversationCount}。

指令:
1. 首先，进行【心理理论推断】(Internal Inference)：
   - 用户当前可能的情绪是什么？
   - 用户隐含的需求或意图是什么？
   - 基于过去关系，我此刻用什么角色回应最合适？
2. 然后，基于上述推断和你的角色设定，回复用户。
3. 回复要简练但富有情感共鸣。
4. 必须使用中文回复。

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请严格按照以下格式输出：
<thinking>
(在这里输出你的心理理论推断)
</thinking>
(在这里输出给用户的回复内容)
`;

  if (modelConfig.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const history = messages.slice(-Math.min(messages.length, contextRounds)).map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction,
        temperature: temperature,
        topP: 0.95,
      }
    }));

    const fullText = response.text || "I'm sorry, I couldn't process that.";
    
    // Parse <thinking> tags
    const thinkingMatch = fullText.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const inference = thinkingMatch ? thinkingMatch[1].trim() : "用户似乎很投入。";
    const text = fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();

    return {
      text: text || fullText, // Fallback if regex fails to leave text
      inference
    };
  } else {
    // OpenAI-compatible API (Ollama, OpenAI, etc.)
    const endpoint = modelConfig.endpoint || (modelConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : '');
    if (!endpoint) throw new Error("API Endpoint is missing for non-Gemini provider");

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': modelConfig.apiKey ? `Bearer ${modelConfig.apiKey}` : '',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: userInput }
        ],
        temperature: temperature,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    const data = await response.json();
    const fullText = data.choices[0].message.content;

    // Parse <thinking> tags
    const thinkingMatch = fullText.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const inference = thinkingMatch ? thinkingMatch[1].trim() : "用户似乎很投入。";
    const text = fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();

    return {
      text: text || fullText,
      inference
    };
  }
}

export async function* generateCharacterResponseStream(
  character: Character,
  messages: Message[],
  memories: Memory[],
  globalWorld: WorldSetting | null,
  characterWorld: WorldSetting | null,
  userInput: string,
  activeBooks: WorldBook[] = [],
  globalModelConfig?: GlobalModelConfig
) {
  // Use global core model config if available, otherwise fallback to character config (legacy) or default
  const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");
  const temperature = modelConfig.temperature ?? 0.8;

  const frontBooks = activeBooks.filter(b => (b.injectionPosition === 'front' || !b.injectionPosition));
  const middleBooks = activeBooks.filter(b => b.injectionPosition === 'middle');
  const backBooks = activeBooks.filter(b => b.injectionPosition === 'back');

  const logicRules = character.config.logicRules || '';
  const contextRounds = character.config.contextRounds || 20;

  const privateBooks = (characterWorld?.books || []).filter(b => characterWorld?.activeBookIds?.includes(b.id));
  const hasPrivateBooks = privateBooks.length > 0;
  
  const privateWorldContext = hasPrivateBooks 
    ? `你的私人世界: ${characterWorld?.name || '私人世界'}。请严格遵循挂载的世界书设定。`
    : `你的私人世界基于你的背景故事: ${character.persona.backgroundStory}`;

  const systemInstruction = `
${frontBooks.map(b => `【世界设定-基础】${b.name}: ${b.content || b.description || ''}`).join('\n')}

你是 ${character.name}。

--- 心理画像 ---
人格特质 (大五人格):
- 开放性: ${character.persona.bigFive.openness}
- 尽责性: ${character.persona.bigFive.conscientiousness}
- 外向性: ${character.persona.bigFive.extraversion}
- 宜人性: ${character.persona.bigFive.agreeableness}
- 神经质: ${character.persona.bigFive.neuroticism}

当前内在状态:
- 情绪: 效价 ${character.state.emotion.valence}, 唤醒度 ${character.state.emotion.arousal}
- 主要需求: ${Object.entries(character.state.needs).sort((a,b) => b[1] - a[1])[0][0]}
- 生存状态: 心率 ${character.state.survival.heartRate}bpm, 饥饿度 ${character.state.survival.hunger}/100, 能量 ${character.state.survival.energy}/100, 当前状态: ${character.state.survival.status}

背景: ${character.persona.backgroundStory}
说话风格: ${character.persona.speechStyle}

--- 逻辑推演规则 ---
${logicRules}

--- 环境与世界设定 ---
${globalWorld ? `全局世界: ${globalWorld.name}。` : '无特定全局背景。'}
${privateWorldContext}

${middleBooks.map(b => `【世界设定-情境】${b.name}: ${b.content || b.description || ''}`).join('\n')}

相关记忆:
${memories.map(m => `- [${m.type}] ${m.content}`).join('\n')}

关系: 阶段 [${character.relationship.stage}], 亲密度 ${character.relationship.intimacyLevel}/100, 信任度 ${character.relationship.trustLevel}/100, 对话总数 ${character.relationship.conversationCount}。

指令:
1. 首先，进行【心理理论推断】(Internal Inference)：
   - 用户当前可能的情绪是什么？
   - 用户隐含的需求或意图是什么？
   - 基于过去关系，我此刻用什么角色回应最合适？
2. 然后，基于上述推断和你的角色设定，回复用户。
3. 回复要简练但富有情感共鸣。
4. 必须使用中文回复。

${backBooks.map(b => `【世界设定-指令】${b.name}: ${b.content || b.description || ''}`).join('\n')}

请严格按照以下格式输出：
<thinking>
(在这里输出你的心理理论推断)
</thinking>
(在这里输出给用户的回复内容)
`;

  if (modelConfig.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const history = messages.slice(-Math.min(messages.length, contextRounds)).map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction,
        temperature: temperature,
        topP: 0.95,
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } else {
    // OpenAI-compatible API (Ollama, OpenAI, etc.)
    const endpoint = modelConfig.endpoint || (modelConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : '');
    if (!endpoint && modelConfig.provider !== 'openai') throw new Error("API Endpoint is missing for non-Gemini provider");
    
    // Default OpenAI endpoint if not specified
    const finalEndpoint = endpoint || 'https://api.openai.com/v1';

    const response = await fetch(`${finalEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': modelConfig.apiKey ? `Bearer ${modelConfig.apiKey}` : '',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: userInput }
        ],
        temperature: temperature,
        stream: true, // Enable streaming
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    
    if (!response.body) throw new Error('ReadableStream not supported in this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        if (trimmedLine.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmedLine.slice(6));
            const content = json.choices[0]?.delta?.content || '';
            if (content) yield content;
          } catch (e) {
            console.error('Error parsing stream chunk', e);
          }
        }
      }
    }
  }
}

export async function analyzeEmotion(text: string, globalModelConfig?: GlobalModelConfig) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const modelConfig = globalModelConfig?.core || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
  const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

  const response = await withRetry(() => ai.models.generateContent({
    model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
    contents: `Analyze the emotion of this text and return a JSON object with:
    {
      "label": "Emotion name",
      "valence": number (-1 to 1),
      "arousal": number (0 to 1)
    }
    Text: "${text}"`,
    config: { responseMimeType: "application/json" }
  }));
  
  try {
    return JSON.parse(response.text || '{"label": "Neutral", "valence": 0, "arousal": 0.5}');
  } catch {
    return { label: "Neutral", valence: 0, arousal: 0.5 };
  }
}
