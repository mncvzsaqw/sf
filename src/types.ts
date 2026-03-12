/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum InteractionMode {
  NORMAL = 'normal',
  COMPANION = 'companion',
  INTIMACY = 'intimacy',
  WORLD = 'world',
  WORLD_DAILY = 'world_daily',
  WORLD_INTIMACY = 'world_intimacy',
  WORLD_PLOT = 'world_plot',
}

export interface BigFive {
  openness: number;      // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface EmotionState {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
}

export interface NeedsHierarchy {
  physiological: number; // 0-1
  safety: number;
  belonging: number;
  esteem: number;
  selfActualization: number;
}

export interface Persona {
  personalityType: string;
  backgroundStory: string;
  speechStyle: string;
  preferences: string[];
  dislikes: string[];
  bigFive: BigFive;
}

export interface DiaryEntry {
  id: string;
  characterId: string;
  type: 'OBS' | 'INFER' | 'WANT' | 'LIFE' | 'COGNITIVE' | 'INTIMATE_IMPRESSION' | 'BEHAVIOR'; // Added BEHAVIOR for timeline summaries
  content: string;
  confidence: number;
  category: string;
  timestamp: string;
  // L3 specific fields (optional, can be stored in content as JSON or parsed)
  metadata?: {
    connectionObservation?: string;
    sceneReflection?: string;
    storyAssociation?: string;
    comprehensiveInference?: string;
    actionTendency?: string;
    habitExtraction?: string;
    preferenceExtraction?: string;
    // Behavior specific fields
    behaviorObservation?: string;
    behaviorDepth?: string;
    selfExperience?: string;
    selfCognition?: string;
    innerMonologue?: string;
  };
}

export interface SurvivalState {
  heartRate: number;
  hunger: number;
  energy: number;
  health: number;
  lastUpdate: string;
  status: string; // e.g., "Working", "Sleeping", "Exploring"
}

export interface VoiceConfig {
  provider: 'gemini' | 'openai' | 'local' | 'elevenlabs' | 'minimax';
  voiceId: string;
  groupId?: string; // For Minimax
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
  speed?: number; // 0.5 - 2.0
  language?: string; // e.g., 'zh-CN'
}

export interface ModelConfig {
  provider: 'gemini' | 'ollama' | 'openai' | 'local';
  modelName: string;
  endpoint?: string;
  apiKey?: string;
  temperature?: number;
  systemInstruction?: string;
}

export interface VoiceSystemConfig {
  chatReplyEnabled: boolean;
  callMode: 'standard' | 'live';
  model: ModelConfig; // Shared model for conversation/logic
  tts: VoiceConfig; // Shared TTS settings
  replyTrigger: 'always' | 'emotional' | 'manual';
}

export interface GlobalModelConfig {
  core: ModelConfig;
  voice: VoiceSystemConfig;
  background: ModelConfig;
  story: ModelConfig;
}

export interface DisplaySettings {
  colorMode: 'day' | 'night';
  themeColor: string;
  bgOpacity: number;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  isDefault?: boolean;
  openingLine?: string;
  callAvatar?: string; // Image for calls
  createdAt: string;
  group?: string; // Character group
  persona: Persona;
  relationship: {
    intimacyLevel: number;
    trustLevel: number;
    conversationCount: number;
    lastInteraction: string;
    stage: string;
  };
  state: {
    emotion: EmotionState;
    needs: NeedsHierarchy;
    survival: SurvivalState;
  };
    config: {
      voice: VoiceConfig; // Legacy, keep for compatibility or general settings
      model: ModelConfig; // Legacy, keep for compatibility or general settings
      voiceSystem: VoiceSystemConfig;
      backgroundActive: boolean;
      consciousnessInterval?: '30s' | '5m' | '15m' | '30m' | '1h';
      summaryInterval?: number; // rounds before summary
      persistMessages?: boolean; // Toggle for message retention
      separateIntimateMemories?: boolean; // Separate intimate messages
      
      // New UI & Identity Settings
      userAvatar?: string;
      userNickname?: string;
      characterNickname?: string;
      fontColor?: string;
      chatBackground?: string;
      bubbleStyle?: 'default' | 'glass' | 'minimal' | 'cyber' | 'retro';
      customCSS?: string;
      
      // Feature Toggles
      perceiveUserStatus?: boolean;
      showCharacterStatus?: boolean;
      chatStreakEnabled?: boolean;
      chatStreakDays?: number;
      pokeEnabled?: boolean;
      pokeFeedbackEnabled?: boolean;
      showTimestamps?: boolean;
      showEmotionalHeartRate?: boolean;
      
      // Memory & AI Logic
      historyCount?: number;
      contextRounds?: number; // 0-500
      memoryRetrievalCount?: number; // 1-50
      logicRules?: string; // Logic system rules
      characterBooks?: WorldBook[];
      activeCharacterBookIds?: string[];
      memorySummaryFrequency?: 'daily' | 'weekly' | 'monthly' | 'manual';
      memorySummaryDetail?: 'low' | 'medium' | 'high';
      handleIntimateMemories?: 'encrypt' | 'separate' | 'normal';
      intimateMemoryEnabled?: boolean;
      intimateMemoryCount?: number;
      intimateMemoryWeightThreshold?: number;
      intimatePassword?: string;
      
      // World Mode Memory Settings
      worldMessageRetention?: 'all' | 'summary';
      worldMemorySharing?: 'shared' | 'isolated';
      worldSummaryInterval?: number; // e.g., every 10 messages
      worldSummaryTrigger?: 'node' | 'emotion' | 'interval';
      npcMemoryWeight?: number; // 0-1
      
      // Private World Settings
      privateWorldName?: string;
      availableWorldTags?: string[];

      // Real-world Perception
      timePerceptionEnabled?: boolean;
      locationPerceptionEnabled?: boolean;
      weatherPerceptionEnabled?: boolean;
      
      wallpapers?: {
        main?: string;
        daily?: string;
        intimacy?: string;
        story?: string;
      };
      callWallpapers?: string[];
      userCallAvatar?: string;
      characterCallAvatars?: string[];
      callWallpaperConfig?: {
        mode: 'loop' | 'random' | 'manual';
        interval: number; // seconds
      };
      isMounted?: boolean;
    };
  worldSetting?: WorldSetting;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  emotion?: string;
  internalInference?: string; // Theory of Mind output
  mode?: InteractionMode;
  subType?: 'intimacy' | 'daily' | 'story' | 'companion' | 'call';
  attachments?: {
    type: 'image' | 'audio' | 'file';
    url: string;
    name?: string;
  }[];
  speakerId?: string;
  speakerName?: string;
  speakerAvatar?: string;
}

export interface Memory {
  id: string;
  characterId: string;
  content: string;
  type: 'core' | 'connection' | 'scene' | 'intimate' | 'story' | 'cognitive' | 'self';
  importance: number; // 1-100
  timestamp: string;
  tags: string[];
  emotion?: string;
  context?: string;
  isIntimate?: boolean;
  storyArc?: string;
  isFictional?: boolean;
  intimacyLevel?: number; // 0-10
  sourceType?: 'conversation' | 'import' | 'world' | 'companion' | 'call';
  originalText?: string;
}

export interface ImportTask {
  id: string;
  filename: string;
  formatDetected: string;
  totalLines: number;
  processedMemories: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface WorldEvent {
  id: string;
  type: 'daily_life' | 'adventure' | 'social' | 'work';
  description: string;
  timestamp: string;
  participants: string[];
}

export interface WorldMessage {
  id: string;
  characterId: string;
  type: 'life' | 'encounter' | 'plot';
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  subType?: 'intimacy' | 'daily' | 'story';
  metadata?: any;
  speakerId?: string;
  speakerName?: string;
  speakerAvatar?: string;
  isEncrypted?: boolean;
}

export interface IntimateSession {
  id: string;
  characterId: string;
  startTime: string;
  intimacyLevel: number;
  encryptionKey?: string;
}

export interface IntimateMemory {
  id: string;
  sessionId: string;
  type: 'whisper' | 'touch' | 'glance' | 'response';
  content: string;
  emotionalIntensity: number;
  timestamp: string;
}

export interface WorldBook {
  id: string;
  name: string; // Title
  content: string;
  injectionPosition: 'front' | 'middle' | 'back';
  tags: string[];
  // Legacy/Optional fields for compatibility if needed, though user didn't specify them
  description?: string;
  style?: string;
  location?: string;
  time?: string;
}

export interface NPCMemoryConfig {
  retrievalRounds: number; // 回合设置
}

export interface NPC {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  voiceEnabled: boolean; // 语音开启
  voiceConfig?: {
    voiceId: string;
    language?: string; // 语言设置，默认普通话
    speed?: number; // 语速 0.5-2.0, 正常 1.0
  };
  bookIds?: string[]; // Legacy: IDs of global world books
  characterBooks?: WorldBook[]; // NPC's own character books
  activeCharacterBookIds?: string[];
  memoryConfig: NPCMemoryConfig;
  memories: Memory[];
  isMounted: boolean; // Mounted or Standby
  currentLocation?: string;
  role?: string;
  relation?: string;
}

export interface WorldSetting {
  id: string;
  name: string;
  description: string;
  rules: string[];
  currentLocation: string;
  time: string;
  weather: string;
  npcs: NPC[];
  events: WorldEvent[];
  activeBookIds: string[]; // Changed from activeBookId to support multiple
  books: WorldBook[];
  availableTags?: string[];
}

export interface AIService {
  id: string;
  name: string;
  type: 'text' | 'image' | 'speech' | 'video';
  provider: 'local' | 'cloud';
  status: 'connected' | 'disconnected' | 'error';
  model: string;
  endpoint?: string;
}

export interface UserIdentity {
  id: string;
  name: string;
  avatar: string;
  lastVerified: string;
  trustScore: number;
}

export interface LiveScene {
  id: string;
  characterId: string;
  userInput: string;
  sceneType: string;
  expandedScene: string;
  sensoryDetails: {
    sounds?: string[];
    smells?: string[];
    sights?: string[];
    textures?: string[];
    tastes?: string[];
  };
  aiResponse?: string;
  timestamp: string;
}

export interface PlotChapter {
  id: number;
  content: string;
  type: string;
  timestamp: string;
  generatedBy: 'user' | 'auto';
}

export interface Plot {
  id: string;
  characterId: string;
  title: string;
  genre: string;
  style: string;
  chapters: PlotChapter[];
  currentChapter: number;
  status: 'ongoing' | 'completed';
  createdAt: string;
  lastUpdated: string;
}

export interface CompanionSession {
  id: string;
  characterId: string;
  name: string;
  description: string;
  mode: 'pomodoro' | 'timer' | 'schedule';
  type?: 'normal' | 'habit' | 'goal';
  workDuration: number; // minutes
  breakDuration: number;
  longBreakDuration: number;
  cycles: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  startTime?: string;
  endTime?: string;
  completedCycles: number;
  createdAt: string;
  todoItems?: { id: string; text: string; completed: boolean }[]; // For 'habit'
  deadline?: string; // For 'goal' (YYYY-MM-DD)
  targetMinutes?: number; // For 'goal'
  accumulatedMinutes?: number; // For 'goal'
}

export interface CompanionTimelineEvent {
  id: string;
  sessionId: string;
  triggerType: 'time' | 'cycle_start' | 'cycle_end' | 'work_start' | 'break_start' | 'immediate';
  triggerValue: number; // minutes or cycle count
  assetType: 'image' | 'video' | 'audio' | 'message';
  assetData: string;
  action: 'show' | 'play' | 'speak' | 'notify';
  duration?: number;
  repeatInterval?: number;
  isActive: boolean;
}

export interface CompanionRecord {
  id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  completedWork: number;
  completedBreaks: number;
  interruptions: number;
  focusScore: number;
}

export interface CompanionTask {
  id: string;
  characterId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface CompanionGoal {
  id: string;
  characterId: string;
  dailyTargetMinutes: number;
  currentStreak: number;
  totalFocusedMinutes: number;
  lastActiveDate: string;
  completedDates?: string[]; // YYYY-MM-DD format
}
