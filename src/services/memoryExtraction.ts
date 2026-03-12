import { GoogleGenAI, Type } from "@google/genai";
import { Message, GlobalModelConfig } from '../types';

const EXTRACTION_PROMPT = `你是信息提取专家，负责从对话中识别并提取值得长期记住的关键信息。

# 提取重点
- 关键信息：提取用户的重要信息和值得回忆的生活细节
- 重要事件：记忆深刻的互动，需包含人物、时间、地点（如有）
- AI自我认知：提取AI在回复中展现的自我评价、自我体验、情感变化、对自身设定的反思等
- AI行为总结：提取AI在互动中采取的重要行动及其背后的心理动机

# 提取范围
- 个人：年龄、生日、职业、学历、居住地
- 偏好：明确表达的喜好或厌恶
- 健康：身体状况、过敏史、饮食禁忌
- 事件：与AI的重要互动、约定、里程碑
- 关系：家人、朋友、重要同事
- 价值观：表达的信念或长期目标
- 情感：重要的情感时刻或关系里程碑
- 生活：用户当天的活动、饮食、出行、日常经历等生活细节
- AI自我：AI的自我认知、情感体验、对用户的态度变化、对世界的理解

# 不要提取
- 日常寒暄（"你好""在吗"）
- 关于记忆系统本身的讨论（"某条记忆没有被记录""记忆遗漏""没有被提取"等）
- 技术调试、bug修复的过程性讨论（除非涉及用户技能或项目里程碑）
- AI的思考过程、思维链内容（但要提取思考后表达出的自我认知和体验）

# 已知信息处理【最重要】
<已知信息>
{existing_memories}
</已知信息>

- 新信息必须与已知信息逐条比对
- 相同、相似或语义重复的信息必须忽略（例如已知"用户去妈妈家吃团年饭"，就不要再提取"用户春节去了妈妈家"）
- 已知信息的补充或更新可以提取（例如已知"用户养了一只猫"，新信息"猫最近生病了"可以提取）
- 与已知信息矛盾的新信息可以提取（标注为更新）
- 仅提取完全新增且不与已知信息重复的内容
- 如果对话中没有任何新信息，返回空数组 []

# 输出格式
请用以下 JSON 格式返回（不要包含其他内容）：
[
  {"content": "记忆内容", "importance": 分数},
  {"content": "记忆内容", "importance": 分数}
]

importance 分数 1-10，10 最重要。
如果没有值得记住的新信息，返回空数组：[]
`;

export async function extractMemories(
  messages: Message[], 
  existingMemories: string[] = [],
  globalModel: GlobalModelConfig
): Promise<{ content: string; importance: number }[]> {
  if (!messages || messages.length === 0) return [];

  const conversationText = messages.map(msg => {
    const role = msg.role === 'user' ? '用户' : 'AI';
    return `${role}: ${msg.content}`;
  }).join('\n');

  if (!conversationText.trim()) return [];

  const memoriesText = existingMemories.length > 0 
    ? existingMemories.map(m => `- ${m}`).join('\n')
    : '（暂无已知信息）';

  const prompt = EXTRACTION_PROMPT.replace('{existing_memories}', memoriesText);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: globalModel.core?.modelName || 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: `请从以下对话中提取新的记忆：\n\n${conversationText}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "记忆内容" },
              importance: { type: Type.INTEGER, description: "重要性分数 1-10" }
            },
            required: ["content", "importance"]
          }
        }
      }
    });

    const text = response.text?.trim() || '[]';
    const memories = JSON.parse(text);
    
    if (Array.isArray(memories)) {
      return memories.filter(m => m.content && typeof m.importance === 'number');
    }
    return [];
  } catch (error) {
    console.error("记忆提取出错:", error);
    return [];
  }
}

const SCORING_PROMPT = `你是记忆重要性评分专家。请对以下记忆条目逐条评分。

# 评分规则（1-10）
- 9-10：核心身份信息（名字、生日、职业、重要关系）
- 7-8：重要偏好、重大事件、深层情感
- 5-6：日常习惯、一般偏好
- 3-4：临时状态、偶然提及
- 1-2：琐碎信息

# 输入记忆
{memories_text}

# 输出格式
返回 JSON 数组，每条包含原文和评分：
[{"content": "原文", "importance": 评分数字}]

只返回 JSON，不要其他文字。`;

export async function scoreMemories(
  texts: string[],
  globalModel: GlobalModelConfig
): Promise<{ content: string; importance: number }[]> {
  if (!texts || texts.length === 0) return [];

  const memoriesText = texts.map(t => `- ${t}`).join('\n');
  const prompt = SCORING_PROMPT.replace('{memories_text}', memoriesText);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: globalModel.core?.modelName || 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING, description: "原文" },
              importance: { type: Type.INTEGER, description: "评分数字" }
            },
            required: ["content", "importance"]
          }
        }
      }
    });

    const text = response.text?.trim() || '[]';
    const memories = JSON.parse(text);
    
    if (Array.isArray(memories)) {
      return memories.filter(m => m.content && typeof m.importance === 'number');
    }
    return texts.map(t => ({ content: t, importance: 5 }));
  } catch (error) {
    console.error("记忆评分出错:", error);
    return texts.map(t => ({ content: t, importance: 5 }));
  }
}
