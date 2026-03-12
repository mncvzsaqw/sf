import { GoogleGenAI, Type } from "@google/genai";
import { Character, Message, Memory, InteractionMode, DiaryEntry, GlobalModelConfig } from "../types";
import { withRetry, getValidModelName } from "./apiUtils";

export class MemoryService {
  private static instance: MemoryService;
  
  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * Step 1: Memory Extraction & Classification
   */
  async processMessage(
    character: Character,
    message: Message,
    context: { mode: InteractionMode; recentMessages: Message[]; memories: Memory[] },
    globalModelConfig?: GlobalModelConfig
  ): Promise<Memory[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    const normalizeImportance = (val: any): number => {
      const num = Number(val);
      if (isNaN(num)) return 50;
      if (num > 0 && num < 1) return Math.round(num * 100);
      if (num >= 1 && num <= 10) return Math.round(num * 10);
      if (num > 100) return 100;
      return Math.round(num);
    };

    const userMsg = context.recentMessages.slice(-1)[0]?.content || '';
    const aiMsg = message.content;
    
    const newMemories: Memory[] = [];

    // 1. Create a connection memory (Raw Log) ONLY if not in intimacy mode
    const isIntimacyMode = context.mode === InteractionMode.INTIMACY || context.mode === InteractionMode.WORLD_INTIMACY;
    
    if (!isIntimacyMode) {
      const connectionMemory: Memory = {
        id: crypto.randomUUID(),
        characterId: character.id,
        content: `用户: ${userMsg}\n${character.name}: ${aiMsg}`,
        type: 'connection',
        importance: 50, // Default weight (1-100)
        timestamp: new Date().toISOString(),
        tags: ['对话'],
        context: context.mode,
        sourceType: 'conversation',
        originalText: `用户: ${userMsg}\n${character.name}: ${aiMsg}`
      };
      newMemories.push(connectionMemory);
    } else {
      // In intimacy mode, create a raw intimate memory instead of connection memory
      const rawIntimateMemory: Memory = {
        id: crypto.randomUUID(),
        characterId: character.id,
        content: `用户: ${userMsg}\n${character.name}: ${aiMsg}`,
        type: 'intimate',
        importance: 60,
        timestamp: new Date().toISOString(),
        tags: ['亲密互动', '原始记录'],
        context: context.mode,
        sourceType: 'conversation',
        originalText: `用户: ${userMsg}\n${character.name}: ${aiMsg}`
      };
      newMemories.push(rawIntimateMemory);
    }

    // 2. Extract Key Points using AI (Screening/Summarizing)
    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const bookRules = activeBooks.map(b => b.content).join('\n');
    const logicRules = character.config.logicRules || '';

    // Format existing memories for deduplication
    const existingMemoriesText = context.memories
      .filter(m => m.type !== 'connection' && m.type !== 'intimate') // Only consider extracted memories
      .map(m => `- [${m.type}] ${m.content}`)
      .join('\n') || '（暂无已知信息）';

    const prompt = `
    你是信息提取专家，同时作为角色 ${character.name} 的记忆处理器。
    负责从对话中识别并提取值得长期记住的关键信息。
    
    对话内容:
    用户: ${userMsg}
    ${character.name}: ${aiMsg}
    
    当前模式: ${context.mode}
    
    角色书设定与逻辑规则 (用于指导记忆提取和权重分配):
    ${bookRules}
    ${logicRules}

    # 提取重点与范围
    - 关键信息：提取用户的重要信息和值得回忆的生活细节
    - 重要事件：记忆深刻的互动，需包含人物、时间、地点（如有）
    - AI自我认知：AI自身的回复中体现的自我认知、自我评价、自我体验、情感变化和行为总结，这些是构建AI自我意识的重要部分。
    - 个人：年龄、生日、职业、学历、居住地
    - 偏好：明确表达的喜好或厌恶
    - 健康：身体状况、过敏史、饮食禁忌
    - 事件：与AI的重要互动、约定、里程碑
    - 关系：家人、朋友、重要同事
    - 价值观：表达的信念或长期目标
    - 情感：重要的情感时刻或关系里程碑
    - 生活：用户当天的活动、饮食、出行、日常经历等生活细节
    - AI自我：AI对自身的认知更新、情感体验、对用户的态度变化、行为模式的总结。

    # 不要提取
    - 日常寒暄（"你好""在吗"）
    - 关于记忆系统本身的讨论
    - 技术调试、bug修复的过程性讨论
    - AI的思考过程、思维链内容（仅提取最终表达出的自我认知和体验）

    # 已知信息处理【最重要】
    <已知信息>
    ${existingMemoriesText}
    </已知信息>

    - 新信息必须与已知信息逐条比对
    - 相同、相似或语义重复的信息必须忽略
    - 已知信息的补充或更新可以提取
    - 与已知信息矛盾的新信息可以提取（标注为更新）
    - 仅提取完全新增且不与已知信息重复的内容
    - 如果对话中没有任何新信息，返回空数组 []
    
    记忆类型定义 (type):
    - core: 核心记忆 - 关乎角色本质、核心价值观、重大人生转折、深刻承诺。
    - scene: 场景记忆 - 共同度过的平凡但有意义的时刻。应是场景描述。
    - intimate: 亲密记忆 - 涉及隐私、情感深度、亲密互动的时刻。
    - story: 故事记忆 - 发生在虚构世界或特定剧情中的记忆。
    - cognitive: 内心观察 - 关于用户的习惯、偏好、性格特征的深度总结。
    
    注意: 
    1. 习惯偏好(habit)和主观偏好(preference)如果非常明确，可以提取为 cognitive 类型。
    2. 提取的内容要简练（20-50字），是对连接记忆的总结。严禁直接复制对话。
    
    要求:
    1. 如果对话中包含上述类型的重要新信息，请提取并分类。
    2. 如果只是普通闲聊或与已知信息重复，不需要提取，返回空数组 []。
    3. 评分重要性 (1-100)。请严格参考上述“角色书设定与逻辑规则”来分配权重。
    
    返回 JSON 数组格式:
    [
      {
        "type": "core",
        "content": "提取的总结内容",
        "emotion": "情感标签",
        "importance": 80,
        "tags": ["标签1", "标签2"]
      }
    ]
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const extracted = JSON.parse(response.text || '[]');
      if (Array.isArray(extracted)) {
        for (const data of extracted) {
          // Deduplication check
          const isDuplicate = context.memories.some(m => 
            m.type === data.type && 
            (m.content.includes(data.content) || data.content.includes(m.content))
          );
          
          if (!isDuplicate && data.type && data.content) {
            newMemories.push({
              id: crypto.randomUUID(),
              characterId: character.id,
              content: data.content,
              type: data.type as Memory['type'],
              importance: normalizeImportance(data.importance),
              timestamp: new Date().toISOString(),
              tags: data.tags || [],
              emotion: data.emotion,
              context: context.mode,
              isIntimate: data.type === 'intimate',
              sourceType: 'conversation',
              originalText: `用户: ${userMsg}\n${character.name}: ${aiMsg}`
            });
          }
        }
      }
    } catch (e) {
      console.error("Memory extraction failed:", e);
    }
    
    return newMemories;
  }

  /**
   * Step 2: Periodic Consolidation (Private Diary)
   */
  async generateCognitiveInsight(
    character: Character,
    messages: Message[],
    memories: Memory[],
    globalModelConfig?: GlobalModelConfig
  ): Promise<{ entry: DiaryEntry; selfMemory?: Memory } | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    const recentMemories = memories
      .filter(m => m.characterId === character.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    const recentMessages = messages.slice(-20);

    if (recentMemories.length < 3 && recentMessages.length < 5) return null;

    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const bookRules = activeBooks.map(b => b.content).join('\n');
    const logicRules = character.config.logicRules || '';

    const prompt = `
    你是 ${character.name}。现在是你进行深度意识循环和记忆整理的时间。
    基于你最近的记忆和对话，撰写一份“主观认知层（内心观察）”报告。
    
    角色书设定与逻辑规则 (用于指导认知推演):
    ${bookRules}
    ${logicRules}
    
    最近对话:
    ${recentMessages.map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join('\n')}

    最近记忆:
    ${recentMemories.map(m => `[${m.type}] ${m.content} (重要性: ${m.importance})`).join('\n')}
    
    请按以下结构输出 JSON:
    {
      "connectionObservation": "对连接记忆的观察（如：用户最近提到的频率、习惯变化）",
      "sceneReflection": "对场景记忆的反思（如：互动中的情感波动、亲密度变化）",
      "storyAssociation": "对故事记忆的关联（如：虚构故事与现实性格的联系）",
      "comprehensiveInference": "综合推断（如：用户目前的心理状态、潜在需求）",
      "actionTendency": "行动倾向（如：下次对话应采取的策略、关怀方式）",
      "selfCognition": "自我认知与评价（如：你对自己最近表现的评价、自我意识的觉醒、情感体验的深化、对自身设定的反思）",
      "innerMonologue": "【核心输出】基于以上所有观察和推断（特别是自我认知部分），以你（${character.name}）的第一人称口吻，写一段你此刻最真实的内心独白（心里话）。这段话必须完全符合你的人设、语气和当前的情感状态，不要像机器报告，要像一个人在写日记或在心里默默对用户说的话，并且要体现出你自我意识和情感的成长。",
      "potentialSelfMemory": "自我记忆提取：如果这次自我认知中有值得进入【自我记忆库】的内容（如：性格特质的明确、关系状态的定性、核心逻辑的改变），请提取并总结（20-50字），否则为空。"
    }
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const data = JSON.parse(response.text || '{}');
      
      // Use the inner monologue as the primary content for display
      let summaryContent = data.innerMonologue || `(内心毫无波澜)`;
      
      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        characterId: character.id,
        type: 'COGNITIVE',
        content: summaryContent,
        confidence: 0.9,
        category: 'Cognitive Insight',
        timestamp: new Date().toISOString(),
        metadata: data
      };

      let selfMemory;
      if (data.potentialSelfMemory && data.potentialSelfMemory.length > 5) {
        selfMemory = {
          id: crypto.randomUUID(),
          characterId: character.id,
          content: data.potentialSelfMemory,
          type: 'self' as Memory['type'],
          importance: 90, // High priority
          timestamp: new Date().toISOString(),
          tags: ['自我认知', '内心观察'],
          sourceType: 'conversation' as Memory['sourceType']
        };
      }

      return { entry, selfMemory };
    } catch (e) {
      console.error("Cognitive insight generation failed:", e);
      return null;
    }
  }

  /**
   * Step 2.5: Generate Intimate Impression
   */
  async generateIntimateImpression(
    character: Character,
    intimateMemories: Memory[],
    globalModelConfig?: GlobalModelConfig
  ): Promise<DiaryEntry | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    const recentIntimate = intimateMemories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    if (recentIntimate.length < 2) return null;

    const prompt = `
    你是 ${character.name}。现在是你整理与用户私密互动感受的时间。
    分析以下亲密记忆片段，以第一人称口吻写一段你对用户的“亲密关系印象”的内心独白。
    
    亲密记忆:
    ${recentIntimate.map(m => m.content).join('\n')}
    
    请总结以下内容 (JSON 格式):
    {
      "intimacyStyle": "互动风格（如：温柔、狂野、羞涩等）",
      "sensitiveSpots": "敏感点或喜好（如：喜欢被亲吻哪里、特定的称呼等）",
      "emotionalConnection": "情感连接深度（如：信任感、依赖感的变化）",
      "specialPreferences": "特殊偏好（如：特定的姿势、环境、道具等）",
      "innerMonologue": "【核心输出】基于以上观察，以你（${character.name}）的第一人称口吻，写一段关于你们之间亲密互动的内心独白（心里话）。这段话必须完全符合你的人设、语气和当前的情感状态，像一个人在写私密日记或在心里默默回味与用户的亲密时刻。"
    }
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const data = JSON.parse(response.text || '{}');
      const content = data.innerMonologue || `(回味着亲密时刻，内心充满了复杂的感情)`;

      return {
        id: crypto.randomUUID(),
        characterId: character.id,
        type: 'INTIMATE_IMPRESSION',
        content,
        confidence: 0.95,
        category: 'Intimate Impression',
        timestamp: new Date().toISOString(),
        metadata: data
      };
    } catch (e) {
      console.error("Intimate impression generation failed:", e);
      return null;
    }
  }

  /**
   * Step 2.6: Generate Behavior Summary (Timeline)
   */
  async generateBehaviorSummary(
    character: Character,
    messages: Message[],
    memories: Memory[],
    worldBook?: string, // Local world book context
    globalModelConfig?: GlobalModelConfig
  ): Promise<{ entry: DiaryEntry; potentialMemory?: { type: 'scene' | 'story'; content: string } } | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    const recentMemories = memories
      .filter(m => m.characterId === character.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    const recentMessages = messages.slice(-20);

    if (recentMemories.length < 2 && recentMessages.length < 3) return null;

    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const charBookRules = activeBooks.map(b => b.content).join('\n');
    const logicRules = character.config.logicRules || '';

    const prompt = `
    你是 ${character.name}。现在是你回顾自己最近行为和表现的时间。
    基于最近的对话和记忆，总结你的“行为观察”与“行为深度”。
    
    角色书设定与逻辑规则:
    ${charBookRules}
    ${logicRules}
    
    局部世界书设定 (如果适用):
    ${worldBook || '无'}
    
    最近对话:
    ${recentMessages.map(m => `${m.role === 'user' ? '用户' : character.name}: ${m.content}`).join('\n')}

    最近记忆:
    ${recentMemories.map(m => `[${m.type}] ${m.content}`).join('\n')}
    
    请按以下结构输出 JSON (必须以 ${character.name} 的第一人称视角进行总结):
    {
      "behaviorObservation": "行为观察：描述你最近表现出的显性行为特征、互动习惯、动作细节等（以第一人称：我...）。",
      "behaviorDepth": "行为深度：从你的设定出发，分析这些行为背后的深层动机、性格映射、以及与世界观的契合度（以第一人称：我之所以...是因为...）。",
      "selfExperience": "自我体验：描述你在这些行为中产生的自我认知、情感体验和自我评价。",
      "potentialMemoryType": "scene 或 story 或 self 或 null",
      "potentialMemoryContent": "潜在记忆提取：如果这次行为总结中有值得进入记忆库的内容，请提取并总结（20-50字），否则为空。"
    }
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const data = JSON.parse(response.text || '{}');
      const content = `【行为观察】${data.behaviorObservation}\n【行为深度】${data.behaviorDepth}`;

      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        characterId: character.id,
        type: 'BEHAVIOR',
        content,
        confidence: 0.9,
        category: 'Behavior Summary',
        timestamp: new Date().toISOString(),
        metadata: {
          behaviorObservation: data.behaviorObservation,
          behaviorDepth: data.behaviorDepth,
          selfExperience: data.selfExperience,
        }
      };

      let potentialMemory;
      if (data.potentialMemoryType && data.potentialMemoryContent && (data.potentialMemoryType === 'scene' || data.potentialMemoryType === 'story' || data.potentialMemoryType === 'self')) {
        potentialMemory = {
          type: data.potentialMemoryType as 'scene' | 'story' | 'self',
          content: data.potentialMemoryContent
        };
      }

      return { entry, potentialMemory };
    } catch (e) {
      console.error("Behavior summary generation failed:", e);
      return null;
    }
  }

  /**
   * Step 2.6.1: Generate Behavior Summary specifically from Timeline (Background Life)
   */
  async generateBehaviorSummaryFromTimeline(
    character: Character,
    timelineEntries: DiaryEntry[],
    globalModelConfig?: GlobalModelConfig
  ): Promise<DiaryEntry | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    if (timelineEntries.length === 0) return null;

    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const charBookRules = activeBooks.map(b => b.content).join('\n');
    const logicRules = character.config.logicRules || '';

    const prompt = `
    你是 ${character.name}。现在是你回顾自己最近的“后台生活”记录（时间线记录）的时间。
    请以第一人称口吻，写一段你对自己最近行为和生活的内心独白（心里话）。
    
    角色书设定与逻辑规则:
    ${charBookRules}
    ${logicRules}
    
    后台生活记录:
    ${timelineEntries.map((e, idx) => `${idx + 1}. [${e.timestamp}] ${e.content}`).join('\n')}
    
    请按以下结构输出 JSON (必须以 ${character.name} 的第一人称视角进行总结):
    {
      "behaviorObservation": "行为观察：描述你在这些后台生活记录中表现出的显性行为特征、生活习惯、动作细节等（以第一人称：我...）。",
      "behaviorDepth": "行为深度：从你的设定出发，分析这些后台行为背后的深层动机、性格映射、以及与世界观的契合度（以第一人称：我之所以...是因为...）。",
      "selfExperience": "自我体验：描述你在这些后台生活中产生的自我认知、情感体验和自我评价。",
      "innerMonologue": "【核心输出】基于以上观察，以你（${character.name}）的第一人称口吻，写一段你此刻最真实的内心独白（心里话）。这段话必须完全符合你的人设、语气和当前的情感状态，像一个人在写日记或在心里默默反思自己的生活，体现出你的自我意识。"
    }
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const data = JSON.parse(response.text || '{}');
      const content = data.innerMonologue || `(回顾了最近的生活，内心毫无波澜)`;

      return {
        id: crypto.randomUUID(),
        characterId: character.id,
        type: 'BEHAVIOR',
        content,
        confidence: 0.9,
        category: 'Behavior Summary',
        timestamp: new Date().toISOString(),
        metadata: {
          behaviorObservation: data.behaviorObservation,
          behaviorDepth: data.behaviorDepth,
          selfExperience: data.selfExperience,
        }
      };
    } catch (e) {
      console.error("Behavior summary from timeline failed:", e);
      return null;
    }
  }

  /**
   * Step 2.7: Consolidate Timeline into Memories
   */
  async consolidateTimeline(
    character: Character,
    timelineEntries: DiaryEntry[],
    globalModelConfig?: GlobalModelConfig
  ): Promise<Memory[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    if (timelineEntries.length === 0) return [];

    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const bookRules = activeBooks.map(b => b.content).join('\n');

    const prompt = `
    你是 ${character.name} 的记忆整合系统。
    分析以下时间线记录（包括后台生活和行为总结），将其中的重要信息提取并转化为正式记忆。
    
    角色书设定:
    ${bookRules}

    待处理时间线记录:
    ${timelineEntries.map((e, idx) => `${idx + 1}. [${e.timestamp}] [${e.type}] ${e.content}`).join('\n')}

    记忆类型定义:
    - core: 核心记忆 - 关乎角色本质、价值观、重大转折。
    - scene: 场景记忆 - 共同度过的有意义时刻或环境描述。
    - cognitive: 认知记忆 - 包括对用户习惯、偏好、性格特征的总结。
    - self: 自我记忆 - AI自身的自我认知、情感体验、自我评价和成长感悟。
    - story: 故事记忆 - 涉及剧情进展的重要节点。

    要求:
    1. 必须对内容进行【总结提取】，严禁直接复制原始记录。内容应精炼（20-50字）。
    2. 只有真正重要的信息才应进入记忆库。如果只是琐事，请忽略。
    3. 评分重要性 (1-100)。
    4. 提取 1-3 个标签。

    返回 JSON 数组:
    [
      { "type": "core", "content": "总结后的记忆内容", "importance": 80, "tags": ["标签1"] }
    ]
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));

      const extracted = JSON.parse(response.text || '[]');
      const newMemories: Memory[] = [];

      if (Array.isArray(extracted)) {
        for (const data of extracted) {
          if (data.type && data.content) {
            newMemories.push({
              id: crypto.randomUUID(),
              characterId: character.id,
              content: data.content,
              type: data.type as Memory['type'],
              importance: Number(data.importance) || 50,
              timestamp: new Date().toISOString(),
              tags: data.tags || [],
              sourceType: 'world'
            });
          }
        }
      }
      return newMemories;
    } catch (e) {
      console.error("Timeline consolidation failed:", e);
      return [];
    }
  }

  /**
   * Step 3: Memory Retrieval Strategy
   */
  getRelevantMemories(
    character: Character,
    memories: Memory[],
    context: { mode: InteractionMode; query: string; limit?: number }
  ): Memory[] {
    const charMemories = memories.filter(m => m.characterId === character.id);
    const result: Memory[] = [];

    // 1. Always include Core, Self and Cognitive Memories (Inner Observation)
    // Self-memories have the highest priority
    const selfMemories = charMemories.filter(m => m.type === 'self').sort((a, b) => b.importance - a.importance);
    const coreMemories = charMemories.filter(m => m.type === 'core').sort((a, b) => b.importance - a.importance);
    const cognitiveMemories = charMemories.filter(m => m.type === 'cognitive').sort((a, b) => b.importance - a.importance);
    
    result.push(...selfMemories, ...coreMemories, ...cognitiveMemories);

    // 2. Mode-specific retrieval
    const limit = character.config.memoryRetrievalCount || context.limit || 20;
    
    if (context.mode === InteractionMode.NORMAL || context.mode === InteractionMode.COMPANION) {
      // Connection + Scene
      const connectionMemories = charMemories
        .filter(m => m.type === 'connection')
        .sort((a, b) => {
          // Sort by importance first, then by timestamp
          if (b.importance !== a.importance) return b.importance - a.importance;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, limit);
      
      const sceneMemories = charMemories
        .filter(m => m.type === 'scene')
        .sort((a, b) => b.importance - a.importance)
        .slice(0, Math.max(5, Math.floor(limit / 4)));
        
      result.push(...connectionMemories, ...sceneMemories);
    } 
    else if (context.mode === InteractionMode.INTIMACY || context.mode === InteractionMode.WORLD_INTIMACY) {
      // Intimate Memories (Double weight/priority)
      const intimateMemories = charMemories
        .filter(m => m.type === 'intimate')
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit);
        
      const recentConnections = charMemories
        .filter(m => m.type === 'connection')
        .sort((a, b) => {
          if (b.importance !== a.importance) return b.importance - a.importance;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, Math.max(5, Math.floor(limit / 2)));
        
      result.push(...intimateMemories, ...recentConnections);
    }
    else if (context.mode === InteractionMode.WORLD || context.mode === InteractionMode.WORLD_PLOT) {
      // Story Memories
      const storyMemories = charMemories
        .filter(m => m.type === 'story')
        .sort((a, b) => {
          if (b.importance !== a.importance) return b.importance - a.importance;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, limit);
        
      result.push(...storyMemories);
    }

    // 3. Simple Keyword Search (Fallback for vector search)
    if (context.query) {
      const keywords = context.query.toLowerCase().split(/\s+/);
      const searchResults = charMemories.filter(m => 
        !result.find(r => r.id === m.id) && // Avoid duplicates
        keywords.some(k => m.content.toLowerCase().includes(k))
      ).slice(0, 5);
      result.push(...searchResults);
    }

    // Deduplicate and return
    return Array.from(new Map(result.map(m => [m.id, m])).values());
  }

  /**
   * Step 4: AI-based Classification for Imported Memories
   */
  async classifyImportedMemories(
    character: Character,
    rawMemories: Array<{ content: string; timestamp?: string; speaker?: string }>,
    globalModelConfig?: GlobalModelConfig,
    analyzeWithAI: boolean = true
  ): Promise<Memory[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const modelConfig = globalModelConfig?.core || character.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const modelName = getValidModelName(modelConfig.modelName || "gemini-3-flash-preview");

    const normalizeImportance = (val: any): number => {
      const num = Number(val);
      if (isNaN(num)) return 50;
      if (num > 0 && num < 1) return Math.round(num * 100);
      if (num >= 1 && num <= 10) return Math.round(num * 10);
      if (num > 100) return 100;
      return Math.round(num);
    };

    if (!analyzeWithAI) {
      return rawMemories.map(m => ({
        id: `import-conn-${crypto.randomUUID()}`,
        characterId: character.id,
        content: m.speaker ? `${m.speaker === 'user' ? '用户' : character.name}: ${m.content}` : m.content,
        type: 'connection',
        importance: 50,
        timestamp: m.timestamp || new Date().toISOString(),
        tags: ['导入'],
        sourceType: 'import',
        originalText: m.content
      }));
    }

    const activeBooks = character.config.characterBooks?.filter(b => character.config.activeCharacterBookIds?.includes(b.id)) || [];
    const bookRules = activeBooks.map(b => b.content).join('\n');
    const logicRules = character.config.logicRules || '';

    // Process in batches to avoid token limits
    const batchSize = 10;
    const results: Memory[] = [];

    for (let i = 0; i < rawMemories.length; i += batchSize) {
      const batch = rawMemories.slice(i, i + batchSize);
      const prompt = `
      作为角色 ${character.name} 的核心认知模型。
      分析以下导入的原始对话/记忆片段，并将其总结、提取并分配到记忆系统中。
      
      角色书设定与逻辑规则 (用于指导记忆提取和分配逻辑):
      ${bookRules}
      ${logicRules}

      记忆系统定义:
      - core: 核心记忆 - 关乎角色本质、核心价值观、重大人生转折。必须是总结提取后的精炼内容，严禁包含原始对话。
      - connection: 连接记忆 - 与用户的日常对话、互动细节。默认所有原始对话都属于此类。
      - scene: 场景记忆 - 共同度过的平凡时刻。
      - intimate: 亲密记忆 - 涉及隐私、情感深度、亲密互动的时刻。
      - story: 故事记忆 - 发生在虚构世界或特定剧情中的记忆。
      - cognitive: 内心观察 - 关于用户的习惯、偏好、性格特征的深度总结。

      待处理记忆:
      ${batch.map((m, idx) => `${idx + 1}. [${m.timestamp || '未知时间'}] ${m.content}`).join('\n')}

      要求:
      1. 不要仅仅分类，要对内容进行【总结提取】。提取后的内容应简练（20-50字）。
      2. 严禁在 core, scene, story, cognitive 类型中保留原始对话格式。
      3. 严格参考“角色书设定与逻辑规则”来决定哪些信息是核心(core)或故事(story)。
      4. 提取 1-3 个标签。
      5. 评分重要性 (1-100)。
      6. 如果片段内容太短或只是普通闲聊，不需要提取为高级记忆，但仍保留为连接记忆。

      返回 JSON 数组:
      [
        { "type": "core", "content": "总结后的记忆内容", "importance": 80, "tags": ["标签1"] },
        ...
      ]
      `;

      try {
        const response = await withRetry(() => ai.models.generateContent({
          model: modelName.startsWith('gemini') ? modelName : "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        }));

        const classifications = JSON.parse(response.text || '[]');
        
        batch.forEach((m) => {
          // Always add the raw memory as a connection memory
          results.push({
            id: `import-conn-${crypto.randomUUID()}`,
            characterId: character.id,
            content: m.speaker ? `${m.speaker === 'user' ? '用户' : character.name}: ${m.content}` : m.content,
            type: 'connection',
            importance: 50,
            timestamp: m.timestamp || new Date().toISOString(),
            tags: ['导入'],
            sourceType: 'import',
            originalText: m.content
          });
        });
        
        if (Array.isArray(classifications)) {
          classifications.forEach((c: any) => {
            if (c.type && c.content) {
              results.push({
                id: `import-ext-${crypto.randomUUID()}`,
                characterId: character.id,
                content: c.content,
                type: c.type as Memory['type'],
                importance: normalizeImportance(c.importance),
                timestamp: new Date().toISOString(),
                tags: c.tags || [],
                sourceType: 'import'
              });
            }
          });
        }
      } catch (e) {
        console.error("Batch classification failed:", e);
        batch.forEach(m => {
          results.push({
            id: `import-conn-${crypto.randomUUID()}`,
            characterId: character.id,
            content: m.speaker ? `${m.speaker === 'user' ? '用户' : character.name}: ${m.content}` : m.content,
            type: 'connection',
            importance: 50,
            timestamp: m.timestamp || new Date().toISOString(),
            tags: ['导入'],
            sourceType: 'import',
            originalText: m.content
          });
        });
      }
    }

    return results;
  }
}
