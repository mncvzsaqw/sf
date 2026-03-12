import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  X, 
  Upload, 
  Activity, 
  Database, 
  Plus, 
  User, 
  MessageSquare, 
  Palette, 
  Eye, 
  Mic, 
  Zap, 
  Brain, 
  Globe, 
  Video, 
  Heart, 
  Clock, 
  Download, 
  Trash2,
  Edit2,
  Lock,
  Sparkles,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import { Character, WorldBook, GlobalModelConfig, Message, Memory, DiaryEntry } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CharacterSettingsProps {
  character: Character;
  displaySettings: { colorMode: 'day' | 'night'; themeColor: string };
  onSave: (c: Character) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onOpenWorldBook: () => void;
  onOpenWorldMode: () => void;
  globalModel: GlobalModelConfig;
  messages?: Message[];
  memories?: Memory[];
  diary?: DiaryEntry[];
  onImportMemories?: (m: Memory[]) => void;
  onUpdateMemory?: (m: Memory) => void;
  onDeleteMemory?: (id: string) => void;
  onAddMemory?: (id: Memory) => void;
  onClearCharacterData?: (types: ('memory' | 'diary' | 'chat')[]) => void;
  onTriggerConsolidation?: () => Promise<void>;
  initialTab?: 'basic' | 'ui' | 'logic' | 'memory' | 'call' | 'soul';
}

export function CharacterSettings({ 
  character, 
  displaySettings,
  onSave, 
  onClose,
  onDelete,
  onOpenWorldBook,
  onOpenWorldMode,
  globalModel,
  messages = [],
  memories = [],
  diary = [],
  onImportMemories,
  onUpdateMemory,
  onDeleteMemory,
  onAddMemory,
  onClearCharacterData,
  onTriggerConsolidation,
  initialTab = 'basic'
}: CharacterSettingsProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;

  const [activeTab, setActiveTab] = useState<'basic' | 'ui' | 'logic' | 'memory' | 'call' | 'soul'>(initialTab as any);
  const [memoryFilter, setMemoryFilter] = useState<Memory['type'] | 'all'>('all');
  const [soulSubTab, setSoulSubTab] = useState<'memories' | 'diary' | 'intimate' | 'import'>('memories');
  const [intimateView, setIntimateView] = useState<'memory' | 'impression'>('memory');
  const [analyzeImportWithAI, setAnalyzeImportWithAI] = useState(true);
  const [intimatePassword, setIntimatePassword] = useState('');
  const [isIntimateUnlocked, setIsIntimateUnlocked] = useState(false);
  const [isGeneratingIntimateImpression, setIsGeneratingIntimateImpression] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(!character.config.intimatePassword);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isConfirmingClearDiary, setIsConfirmingClearDiary] = useState(false);
  const [isConfirmingClearImport, setIsConfirmingClearImport] = useState(false);
  const [isConfirmingClearMemories, setIsConfirmingClearMemories] = useState(false);
  const [isConfirmingClearChat, setIsConfirmingClearChat] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editingBook, setEditingBook] = useState<WorldBook | null>(null);
  
  // Basic & Identity
  const [name, setName] = useState(character.name);
  const [avatar, setAvatar] = useState(character.avatar);
  const [userAvatar, setUserAvatar] = useState(character.config.userAvatar || '');
  const [userNickname, setUserNickname] = useState(character.config.userNickname || '');
  const [characterNickname, setCharacterNickname] = useState(character.config.characterNickname || '');
  
  // UI Customization
  const [fontColor, setFontColor] = useState(character.config.fontColor || '#ffffff');
  const [chatBackground, setChatBackground] = useState(character.config.chatBackground || '');
  const [bubbleStyle, setBubbleStyle] = useState(character.config.bubbleStyle || 'default');
  const [customCSS, setCustomCSS] = useState(character.config.customCSS || '');
  
  // Feature Toggles
  const [perceiveUserStatus, setPerceiveUserStatus] = useState<boolean>(character.config.perceiveUserStatus || false);
  const [showCharacterStatus, setShowCharacterStatus] = useState<boolean>(character.config.showCharacterStatus || true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(character.config.voiceSystem?.tts?.enabled || false);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(character.config.voiceSystem?.tts?.speed || 1.0);
  const [voiceLanguage, setVoiceLanguage] = useState<string>(character.config.voiceSystem?.tts?.language || 'zh-CN');
  const [isMounted, setIsMounted] = useState<boolean>(character.config.isMounted ?? true);
  const [chatStreakEnabled, setChatStreakEnabled] = useState<boolean>(character.config.chatStreakEnabled || false);
  const [pokeEnabled, setPokeEnabled] = useState<boolean>(character.config.pokeEnabled || true);
  const [pokeFeedbackEnabled, setPokeFeedbackEnabled] = useState<boolean>(character.config.pokeFeedbackEnabled || true);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(character.config.showTimestamps || false);
  const [showEmotionalHeartRate, setShowEmotionalHeartRate] = useState<boolean>(character.config.showEmotionalHeartRate || false);
  
  // Logic & Perception
  const [bgActive, setBgActive] = useState<boolean>(character.config.backgroundActive || false);
  const [timePerceptionEnabled, setTimePerceptionEnabled] = useState<boolean>(character.config.timePerceptionEnabled || false);
  const [locationPerceptionEnabled, setLocationPerceptionEnabled] = useState<boolean>(character.config.locationPerceptionEnabled || false);
  const [weatherPerceptionEnabled, setWeatherPerceptionEnabled] = useState<boolean>(character.config.weatherPerceptionEnabled || false);
  
  // Advanced Memory Settings
  const [memorySummaryFrequency, setMemorySummaryFrequency] = useState(character.config.memorySummaryFrequency || 'daily');
  const [memorySummaryDetail, setMemorySummaryDetail] = useState(character.config.memorySummaryDetail || 'medium');
  const [handleIntimateMemories, setHandleIntimateMemories] = useState(character.config.handleIntimateMemories || 'normal');
  const [worldMessageRetention, setWorldMessageRetention] = useState(character.config.worldMessageRetention || 'all');
  const [worldMemorySharing, setWorldMemorySharing] = useState(character.config.worldMemorySharing || 'shared');
  const [worldSummaryInterval, setWorldSummaryInterval] = useState(character.config.worldSummaryInterval || 10);
  const [worldSummaryTrigger, setWorldSummaryTrigger] = useState(character.config.worldSummaryTrigger || 'interval');
  const [npcMemoryWeight, setNpcMemoryWeight] = useState(character.config.npcMemoryWeight || 0.7);
  
  // Memory
  const [historyCount, setHistoryCount] = useState(character.config.historyCount || 10);
  const [contextRounds, setContextRounds] = useState(character.config.contextRounds ?? 10);
  const [memoryRetrievalCount, setMemoryRetrievalCount] = useState(character.config.memoryRetrievalCount ?? 5);
  const [logicRules, setLogicRules] = useState(character.config.logicRules || '');
  const [characterBooks, setCharacterBooks] = useState<WorldBook[]>(character.config.characterBooks || []);
  const [activeCharacterBookIds, setActiveCharacterBookIds] = useState<string[]>(character.config.activeCharacterBookIds || []);
  
  // Call
  const [userCallAvatar, setUserCallAvatar] = useState(character.config.userCallAvatar || '');
  const [characterCallAvatars, setCharacterCallAvatars] = useState<string[]>(character.config.characterCallAvatars || [character.callAvatar || '']);
  const [callWallpaperConfig, setCallWallpaperConfig] = useState<{ mode: 'loop' | 'random' | 'manual'; interval: number }>(
    character.config.callWallpaperConfig || { mode: 'loop', interval: 10 }
  );

  // Archive & Import/Export
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [memoryType, setMemoryType] = useState<Memory['type']>('connection');

  const charMemories = memories.filter(m => m.characterId === character.id);
  const charDiary = diary.filter(d => d.characterId === character.id && d.type !== 'LIFE');

  const handleSaveMemory = () => {
    if (editingMemory && onUpdateMemory) {
      onUpdateMemory({ ...editingMemory, content: newMemoryContent, type: memoryType });
      setEditingMemory(null);
    } else if (onAddMemory) {
      onAddMemory({
        id: crypto.randomUUID(),
        characterId: character.id,
        content: newMemoryContent,
        type: memoryType,
        importance: 50, // Default weight 1-100
        timestamp: new Date().toISOString(),
        tags: ['manual'],
        sourceType: 'conversation'
      });
    }
    setNewMemoryContent('');
  };

  const handleUpdateMemoryWeight = (m: Memory, newWeight: number) => {
    if (onUpdateMemory) {
      onUpdateMemory({ ...m, importance: newWeight });
    }
  };

  const filteredMemories = (memoryFilter === 'all' 
    ? charMemories 
    : charMemories.filter(m => m.type === memoryFilter))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleExportChat = () => {
    const charMessages = messages.filter(m => m.speakerId === character.id || m.role === 'model');
    const text = charMessages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.role === 'user' ? '我' : character.name}: ${m.content}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name}_聊天记录_${new Date().toLocaleDateString()}.txt`;
    a.click();
  };

  const handleExportMemories = () => {
    const charMemories = memories.filter(m => m.characterId === character.id);
    const text = charMemories.map(m => `[${m.type.toUpperCase()}] ${new Date(m.timestamp).toLocaleString()}\n内容: ${m.content}\n标签: ${m.tags.join(', ')}\n---`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name}_连接记忆_${new Date().toLocaleDateString()}.txt`;
    a.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const text = await file.text();
    const { TXTParser } = await import('../services/txtParser');
    const parser = new TXTParser();
    
    setTimeout(async () => {
      const result = await parser.parseText(text, character.name, userNickname);
      setPreviewData(result);
      setIsImporting(false);
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (!previewData || !onImportMemories) return;
    
    setIsImporting(true);
    setProgress(10);
    
    try {
      const { MemoryService } = await import('../services/memoryService');
      const classifiedMemories = await MemoryService.getInstance().classifyImportedMemories(
        character,
        previewData.memories,
        globalModel,
        analyzeImportWithAI
      );
      
      setProgress(100);
      onImportMemories(classifiedMemories);
      setPreviewData(null);
      alert(`成功导入 ${classifiedMemories.length} 条记忆`);
    } catch (error) {
      console.error("Import classification failed:", error);
      const fallbackMemories = previewData.memories.map((m: any) => ({
        id: `import-${crypto.randomUUID()}`,
        characterId: character.id,
        content: m.speaker ? `${m.speaker === 'user' ? '用户' : character.name}: ${m.content}` : m.content,
        type: m.suggestedType,
        importance: Math.floor(m.confidence * 100),
        timestamp: m.timestamp || new Date().toISOString(),
        tags: m.suggestedTags,
        sourceType: 'import',
        originalText: m.originalText
      }));
      onImportMemories(fallbackMemories);
      setPreviewData(null);
      alert(`导入完成（基础分类）`);
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const handleGenerateIntimateImpression = async () => {
    setIsGeneratingIntimateImpression(true);
    try {
      const intimateMemories = memories.filter(m => m.type === 'intimate');
      const { MemoryService } = await import('../services/memoryService');
      const impression = await MemoryService.getInstance().generateIntimateImpression(
        character,
        intimateMemories,
        globalModel
      );
      if (impression && onAddMemory) {
        // We use onAddDiaryEntry if available, but here we might need to handle it differently
        // For now, let's assume we have a way to add diary entries
        // If not, we can add it as a special memory or use a prop
      }
    } finally {
      setIsGeneratingIntimateImpression(false);
    }
  };

  const handleExportCategorized = (type: 'intimate' | 'scene' | 'story' | 'diary' | 'core') => {
    let dataToExport: any[] = [];
    let filename = `${character.name}_${type}_记忆_${new Date().toLocaleDateString()}.json`;

    if (type === 'diary') {
      dataToExport = diary.filter(d => d.type === 'COGNITIVE');
    } else {
      dataToExport = memories.filter(m => m.type === type);
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    onSave({
      ...character,
      name,
      avatar,
      config: {
        ...character.config,
        userAvatar,
        userNickname,
        characterNickname,
        fontColor,
        chatBackground,
        bubbleStyle,
        customCSS,
        perceiveUserStatus,
        showCharacterStatus,
        chatStreakEnabled,
        pokeEnabled,
        pokeFeedbackEnabled,
        showTimestamps,
        showEmotionalHeartRate,
        backgroundActive: bgActive,
        timePerceptionEnabled,
        locationPerceptionEnabled,
        weatherPerceptionEnabled,
        historyCount,
        contextRounds,
        memoryRetrievalCount,
        logicRules,
        characterBooks,
        activeCharacterBookIds,
        userCallAvatar,
        characterCallAvatars,
        callWallpaperConfig,
        memorySummaryFrequency,
        memorySummaryDetail,
        handleIntimateMemories,
        intimatePassword: intimatePassword || character.config.intimatePassword,
        worldMessageRetention,
        worldMemorySharing,
        worldSummaryInterval,
        worldSummaryTrigger,
        npcMemoryWeight,
        voiceSystem: {
          chatReplyEnabled: false,
          callMode: 'standard',
          replyTrigger: 'always',
          model: { provider: 'gemini', modelName: 'gemini-3-flash-preview' },
          ...(character.config.voiceSystem || {}),
          tts: {
            provider: 'gemini',
            voiceId: 'default',
            ...(character.config.voiceSystem?.tts || {}),
            enabled: voiceEnabled,
            speed: voiceSpeed,
            language: voiceLanguage
          }
        },
        isMounted,
      }
    });
    onClose();
  };

  const handleImageUpload = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMultiImageUpload = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setter(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const tabs = [
    { id: 'basic', label: '基础身份', icon: User },
    { id: 'ui', label: '界面样式', icon: Palette },
    { id: 'logic', label: '感知状态', icon: Zap },
    { id: 'memory', label: '认知行为', icon: Brain },
    { id: 'soul', label: '灵魂档案', icon: Database },
    { id: 'call', label: '通话设置', icon: Video },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4",
        isDay ? "bg-black/20 backdrop-blur-md" : "bg-black/80 backdrop-blur-sm"
      )}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className={cn(
          "w-full max-w-5xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border",
          isDay ? "bg-white border-black/5" : "bg-[#1a1a1c] border-white/10"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-6 border-b flex justify-between items-center",
          isDay ? "border-black/5 bg-black/5" : "border-white/5 bg-black/20"
        )}>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" style={{ color: themeColor }} />
            <div>
              <h3 className={cn("text-xl font-bold", isDay ? "text-black" : "text-white")}>{character.name} 设置</h3>
              <p className={cn("text-[10px] uppercase tracking-widest", isDay ? "text-black/30" : "text-white/30")}>Character Configuration System</p>
            </div>
          </div>
          <button onClick={onClose} className={cn(
            "p-2 rounded-full transition-colors",
            isDay ? "hover:bg-black/5 text-black/40 hover:text-black" : "hover:bg-white/5 text-white/40 hover:text-white"
          )}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className={cn(
            "w-48 border-r p-4 space-y-2",
            isDay ? "border-black/5 bg-black/[0.02]" : "border-white/5 bg-black/10"
          )}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? (isDay ? "bg-black/5 text-black" : "bg-white/10 text-white") 
                    : (isDay ? "text-black/40 hover:bg-black/5 hover:text-black" : "text-white/40 hover:bg-white/5 hover:text-white")
                )}
                style={activeTab === tab.id ? { color: themeColor, borderColor: `${themeColor}40`, borderWidth: activeTab === tab.id ? '1px' : '0px' } : {}}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
            {activeTab === 'basic' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <User className="w-3 h-3" /> 身份标识
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>角色姓名</label>
                        <input 
                          value={name} onChange={e => setName(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-4 py-2 text-sm outline-none transition-colors border",
                            isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-white/5 border-white/10 text-white focus:border-purple-500"
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>角色备注/昵称</label>
                        <input 
                          value={characterNickname} onChange={e => setCharacterNickname(e.target.value)}
                          className={cn(
                            "w-full rounded-xl px-4 py-2 text-sm outline-none transition-colors border",
                            isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-white/5 border-white/10 text-white focus:border-purple-500"
                          )}
                          placeholder="给角色起个特别的称呼..."
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> 头像设置
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                      <img src={avatar || null} className="w-16 h-16 rounded-xl object-cover border border-white/10" alt="" />
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] text-white/30 uppercase">角色头像</label>
                        <div className="flex gap-2">
                          <input type="file" accept="image/*" id="char-avatar-upload" className="hidden" onChange={handleImageUpload(setAvatar)} />
                          <label htmlFor="char-avatar-upload" className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-center cursor-pointer hover:bg-white/10 transition-all">
                            上传图片
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-white/10 flex items-center justify-center overflow-hidden">
                        {userAvatar ? <img src={userAvatar || null} className="w-full h-full object-cover" alt="" /> : <User className="w-8 h-8 text-white/20" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] text-white/30 uppercase">我的头像</label>
                        <div className="flex gap-2">
                          <input type="file" accept="image/*" id="user-avatar-upload" className="hidden" onChange={handleImageUpload(setUserAvatar)} />
                          <label htmlFor="user-avatar-upload" className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-center cursor-pointer hover:bg-white/10 transition-all">
                            上传图片
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Palette className="w-3 h-3" /> 视觉样式
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>界面字体颜色</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={fontColor} 
                            onChange={e => setFontColor(e.target.value)}
                            className="w-10 h-10 bg-transparent border-none cursor-pointer"
                          />
                          <input 
                            value={fontColor} 
                            onChange={e => setFontColor(e.target.value)}
                            className={cn(
                              "flex-1 rounded-xl px-4 py-2 text-sm font-mono outline-none border",
                              isDay ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>聊天背景图片</label>
                        <div className="flex gap-2">
                          <input 
                            value={chatBackground} onChange={e => setChatBackground(e.target.value)}
                            className={cn(
                              "flex-1 rounded-xl px-4 py-2 text-sm outline-none transition-colors border",
                              isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-white/5 border-white/10 text-white focus:border-purple-500"
                            )}
                            placeholder="图片 URL..."
                          />
                          <input type="file" accept="image/*" id="chat-bg-upload" className="hidden" onChange={handleImageUpload(setChatBackground)} />
                          <label htmlFor="chat-bg-upload" className={cn(
                            "p-2 border rounded-xl cursor-pointer transition-all",
                            isDay ? "bg-black/5 border-black/10 hover:bg-black/10" : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}>
                            <Upload className="w-4 h-4" />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>气泡样式</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['default', 'glass', 'minimal', 'cyber', 'retro'].map(style => (
                            <button
                              key={style}
                              onClick={() => setBubbleStyle(style as any)}
                              className={cn(
                                "px-3 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all",
                                bubbleStyle === style 
                                  ? "text-white" 
                                  : (isDay ? "bg-black/5 border-black/10 text-black/40 hover:border-black/20" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20")
                              )}
                              style={bubbleStyle === style ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Sparkles className="w-3 h-3" /> 自定义 CSS
                  </h4>
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>注入 CSS 代码</label>
                    <textarea 
                      value={customCSS} onChange={e => setCustomCSS(e.target.value)}
                      rows={6}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-xs font-mono outline-none resize-none custom-scrollbar",
                        isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-black/40 border-white/10 text-white focus:border-purple-500"
                      )}
                      placeholder=".chat-bubble { border-radius: 0; ... }"
                    />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'logic' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Eye className="w-3 h-3" /> 感知与状态
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>我的状态感知</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>开启后角色可以感知你当前的状态</div>
                      </div>
                      <button 
                        onClick={() => setPerceiveUserStatus(!perceiveUserStatus)}
                        className={cn("w-10 h-5 rounded-full transition-all relative", perceiveUserStatus ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={perceiveUserStatus ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", perceiveUserStatus ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>显示角色状态</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>在界面显示人物时间线中的状态</div>
                      </div>
                      <button 
                        onClick={() => setShowCharacterStatus(!showCharacterStatus)}
                        className={cn("w-10 h-5 rounded-full transition-all relative", showCharacterStatus ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={showCharacterStatus ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", showCharacterStatus ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>心理监测显示</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>在线状态栏显示情感心率</div>
                      </div>
                      <button 
                        onClick={() => setShowEmotionalHeartRate(!showEmotionalHeartRate)}
                        className={cn("w-10 h-5 rounded-full transition-all relative", showEmotionalHeartRate ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={showEmotionalHeartRate ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", showEmotionalHeartRate ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>聊天标志</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>记录并显示持续聊天天数</div>
                      </div>
                      <button 
                        onClick={() => setChatStreakEnabled(!chatStreakEnabled)}
                        className={cn("w-10 h-5 rounded-full transition-all relative", chatStreakEnabled ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={chatStreakEnabled ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", chatStreakEnabled ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Zap className="w-3 h-3" /> 互动设置
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>戳一戳互动</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>开启后点击头像互动并默认开启反馈</div>
                      </div>
                      <button 
                        onClick={() => {
                          const newVal = !pokeEnabled;
                          setPokeEnabled(newVal);
                          if (newVal) setPokeFeedbackEnabled(true);
                        }}
                        className={cn("w-10 h-5 rounded-full transition-all relative", pokeEnabled ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={pokeEnabled ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", pokeEnabled ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                    <div className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>时间戳设置</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>在消息中显示发送时间</div>
                      </div>
                      <button 
                        onClick={() => setShowTimestamps(!showTimestamps)}
                        className={cn("w-10 h-5 rounded-full transition-all relative", showTimestamps ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                        style={showTimestamps ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", showTimestamps ? "left-5.5" : "left-0.5")} />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Globe className="w-3 h-3" /> 现实感知 (联网)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => setTimePerceptionEnabled(!timePerceptionEnabled)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all text-left space-y-2",
                        timePerceptionEnabled ? "bg-blue-500/10 border-blue-500/30" : (isDay ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")
                      )}
                    >
                      <Clock className={cn("w-5 h-5", timePerceptionEnabled ? "text-blue-400" : (isDay ? "text-black/20" : "text-white/20"))} />
                      <div className={cn("text-xs font-bold", isDay ? "text-black" : "text-white")}>时间感知</div>
                      <div className={cn("text-[8px]", isDay ? "text-black/30" : "text-white/30")}>同步世界模式时间</div>
                    </button>
                    <button 
                      onClick={() => setLocationPerceptionEnabled(!locationPerceptionEnabled)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all text-left space-y-2",
                        locationPerceptionEnabled ? "bg-emerald-500/10 border-emerald-500/30" : (isDay ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")
                      )}
                    >
                      <Globe className={cn("w-5 h-5", locationPerceptionEnabled ? "text-emerald-400" : (isDay ? "text-black/20" : "text-white/20"))} />
                      <div className={cn("text-xs font-bold", isDay ? "text-black" : "text-white")}>地点感知</div>
                      <div className={cn("text-[8px]", isDay ? "text-black/30" : "text-white/30")}>感知所在城市与节假日</div>
                    </button>
                    <button 
                      onClick={() => setWeatherPerceptionEnabled(!weatherPerceptionEnabled)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all text-left space-y-2",
                        weatherPerceptionEnabled ? "bg-amber-500/10 border-amber-500/30" : (isDay ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")
                      )}
                    >
                      <Sparkles className={cn("w-5 h-5", weatherPerceptionEnabled ? "text-amber-400" : (isDay ? "text-black/20" : "text-white/20"))} />
                      <div className={cn("text-xs font-bold", isDay ? "text-black" : "text-white")}>天气感知</div>
                      <div className={cn("text-[8px]", isDay ? "text-black/30" : "text-white/30")}>感知当前天气状况</div>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Database className="w-3 h-3" /> 记忆深度与检索策略
                  </h4>
                  <div className={cn("p-6 rounded-2xl border space-y-6", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>参考历史对话回合数</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>角色回复时参考的最近对话回合数 (0-500)</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" min="0" max="500" step="1"
                          value={contextRounds} onChange={e => setContextRounds(parseInt(e.target.value))}
                          className="w-32"
                          style={{ accentColor: themeColor }}
                        />
                        <span className="text-sm font-mono w-8" style={{ color: themeColor }}>{contextRounds}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>调取相关记忆条数</div>
                        <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>角色回复时注入的相关记忆数量 (1-50)</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" min="1" max="50" step="1"
                          value={memoryRetrievalCount} onChange={e => setMemoryRetrievalCount(parseInt(e.target.value))}
                          className="w-32"
                          style={{ accentColor: themeColor }}
                        />
                        <span className="text-sm font-mono w-8" style={{ color: themeColor }}>{memoryRetrievalCount}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Brain className="w-3 h-3" /> 逻辑系统规则
                  </h4>
                  <div className={cn("p-6 rounded-2xl border space-y-4", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                    <div className="space-y-1">
                      <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>自定义逻辑推演规则</div>
                      <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>设定 AI 在处理对话、记忆和内心观察时的底层逻辑偏好</div>
                    </div>
                    <textarea
                      value={logicRules}
                      onChange={e => setLogicRules(e.target.value)}
                      rows={4}
                      placeholder="例如：优先考虑用户的感受；在处理亲密记忆时更加感性；在逻辑推演时保持高冷..."
                      className={cn(
                        "w-full border rounded-xl p-3 text-xs outline-none resize-none",
                        isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-black/20 border-white/10 text-white focus:border-purple-500"
                      )}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                      <BookOpen className="w-3 h-3" /> 角色书管理 (认知行为)
                    </h4>
                    <button 
                      onClick={() => setEditingBook({ id: Math.random().toString(36).substr(2, 9), name: '', content: '', tags: [], injectionPosition: 'front' })}
                      className="px-3 py-1 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1 shadow-lg"
                      style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}33` }}
                    >
                      <Plus className="w-3 h-3" /> 新建
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {characterBooks.length === 0 ? (
                      <div className={cn(
                        "col-span-2 py-8 text-center text-xs italic rounded-2xl border border-dashed",
                        isDay ? "bg-black/5 border-black/10 text-black/20" : "bg-white/5 border-white/10 text-white/10"
                      )}>
                        暂无角色书，点击上方按钮新建
                      </div>
                    ) : (
                      characterBooks.map(book => {
                        const isActive = activeCharacterBookIds.includes(book.id);
                        return (
                          <div key={book.id} className={cn(
                            "p-4 rounded-2xl border transition-all space-y-3",
                            isActive 
                              ? (isDay ? "bg-black/5 border-black/20" : "bg-purple-500/10 border-purple-500/30") 
                              : (isDay ? "bg-black/5 border-black/5 hover:border-black/10" : "bg-white/5 border-white/10 hover:border-white/20")
                          )}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-bold text-xs truncate", isDay ? "text-black" : "text-white")}>{book.name}</span>
                                  <span className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded uppercase font-bold",
                                    book.injectionPosition === 'front' ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                                  )}>
                                    {book.injectionPosition === 'front' ? '前置' : '后置'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    if (isActive) {
                                      setActiveCharacterBookIds(activeCharacterBookIds.filter(id => id !== book.id));
                                    } else {
                                      setActiveCharacterBookIds([...activeCharacterBookIds, book.id]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                                    isActive ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                  )}
                                >
                                  {isActive ? '卸载' : '挂载'}
                                </button>
                                <button 
                                  onClick={() => setEditingBook(book)} 
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isDay ? "hover:bg-black/5 text-black/20 hover:text-black" : "hover:bg-white/10 text-white/20 hover:text-white"
                                  )}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setCharacterBooks(characterBooks.filter(b => b.id !== book.id));
                                    setActiveCharacterBookIds(activeCharacterBookIds.filter(id => id !== book.id));
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isDay ? "hover:bg-black/5 text-black/20 hover:text-red-500" : "hover:bg-white/10 text-white/20 hover:text-red-400"
                                  )}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className={cn("text-[10px] line-clamp-2 font-mono leading-relaxed", isDay ? "text-black/40" : "text-white/40")}>{book.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'call' && (
              <div className="space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                      <Video className="w-3 h-3" /> 通话形象与功能
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-xl border flex items-center gap-3", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                        <div className={cn("text-[10px] font-bold uppercase tracking-wider", isDay ? "text-black/40" : "text-white/40")}>语音开启</div>
                        <button 
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          className={cn("w-10 h-5 rounded-full transition-all relative", voiceEnabled ? "" : (isDay ? "bg-black/10" : "bg-white/10"))}
                          style={voiceEnabled ? { backgroundColor: themeColor } : {}}
                        >
                          <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", voiceEnabled ? "left-5.5" : "left-0.5")} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>角色通话形象 (多图轮播)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {characterCallAvatars.map((url, idx) => (
                            <div key={idx} className={cn("relative aspect-square rounded-xl overflow-hidden border group", isDay ? "border-black/10" : "border-white/10")}>
                              <img src={url || null} className="w-full h-full object-cover" alt="" />
                              <button 
                                onClick={() => setCharacterCallAvatars(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ))}
                          <label className={cn(
                            "aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all",
                            isDay ? "border-black/20 hover:bg-black/5" : "border-white/20 hover:bg-white/5"
                          )}>
                            <Plus className={cn("w-4 h-4", isDay ? "text-black/20" : "text-white/20")} />
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleMultiImageUpload(setCharacterCallAvatars)} />
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <select 
                          value={callWallpaperConfig.mode}
                          onChange={e => setCallWallpaperConfig({...callWallpaperConfig, mode: e.target.value as any})}
                          className={cn(
                            "border rounded-lg px-2 py-1 text-[10px] outline-none",
                            isDay ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
                          )}
                        >
                          <option value="loop">顺序循环</option>
                          <option value="random">随机播放</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>间隔</span>
                          <input 
                            type="number" 
                            value={callWallpaperConfig.interval}
                            onChange={e => setCallWallpaperConfig({...callWallpaperConfig, interval: parseInt(e.target.value) || 5})}
                            className={cn(
                              "w-12 border rounded-lg px-2 py-1 text-[10px] outline-none",
                              isDay ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
                            )}
                          />
                          <span className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>秒</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={cn("text-[10px] uppercase", isDay ? "text-black/30" : "text-white/30")}>我的通话形象</label>
                        <div className={cn(
                          "aspect-video rounded-2xl border flex items-center justify-center overflow-hidden relative group",
                          isDay ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
                        )}>
                          {userCallAvatar ? (
                            <img src={userCallAvatar || null} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User className={cn("w-12 h-12", isDay ? "text-black/10" : "text-white/10")} />
                          )}
                          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload className="w-6 h-6 text-white mb-2" />
                            <span className="text-[10px] font-bold text-white">更换图片</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setUserCallAvatar)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'soul' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                    <Database className="w-3 h-3" /> 灵魂档案馆
                  </h4>
                  <div className={cn("flex gap-2 p-1 rounded-xl border", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                    <button 
                      onClick={() => setSoulSubTab('memories')}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all", soulSubTab === 'memories' ? "text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                      style={soulSubTab === 'memories' ? { backgroundColor: themeColor } : {}}
                    >
                      记忆库
                    </button>
                    <button 
                      onClick={() => setSoulSubTab('diary')}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all", soulSubTab === 'diary' ? "text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                      style={soulSubTab === 'diary' ? { backgroundColor: themeColor } : {}}
                    >
                      内心观察
                    </button>
                    <button 
                      onClick={() => setSoulSubTab('intimate')}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all", soulSubTab === 'intimate' ? "text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                      style={soulSubTab === 'intimate' ? { backgroundColor: themeColor } : {}}
                    >
                      亲密记忆
                    </button>
                    <button 
                      onClick={() => setSoulSubTab('import')}
                      className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all", soulSubTab === 'import' ? "text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                      style={soulSubTab === 'import' ? { backgroundColor: themeColor } : {}}
                    >
                      导入/导出
                    </button>
                  </div>
                </div>

                {soulSubTab === 'memories' && (
                  <div className="space-y-4">
                    <div className={cn("p-4 rounded-2xl border space-y-3", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                      <div className="flex gap-2">
                        <select 
                          value={memoryType}
                          onChange={(e) => setMemoryType(e.target.value as any)}
                          className={cn(
                            "border rounded-lg px-2 py-1 text-[10px] outline-none h-16",
                            isDay ? "bg-black/5 border-black/10 text-black/60" : "bg-black/20 border-white/10 text-white/60"
                          )}
                        >
                          <option value="connection">连接记忆</option>
                          <option value="core">核心记忆</option>
                          <option value="self">自我记忆</option>
                          <option value="scene">场景记忆</option>
                          <option value="story">故事记忆</option>
                        </select>
                        <textarea 
                          value={newMemoryContent}
                          onChange={(e) => setNewMemoryContent(e.target.value)}
                          placeholder={editingMemory ? "修改记忆..." : "手动记录一段记忆..."}
                          className={cn(
                            "flex-1 border rounded-xl px-3 py-2 text-xs outline-none resize-none h-16 custom-scrollbar",
                            isDay ? "bg-black/5 border-black/10 text-black focus:border-black/30" : "bg-black/20 border-white/10 text-white focus:border-purple-500/50"
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        {editingMemory && (
                          <button 
                            onClick={() => { setEditingMemory(null); setNewMemoryContent(''); }}
                            className={cn("px-3 py-1 text-[10px]", isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white")}
                          >
                            取消
                          </button>
                        )}
                        <button 
                          onClick={handleSaveMemory}
                          disabled={!newMemoryContent.trim()}
                          className="px-4 py-1.5 text-white rounded-lg text-[10px] font-bold disabled:opacity-50"
                          style={{ backgroundColor: themeColor }}
                        >
                          {editingMemory ? '保存修改' : '记录记忆'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                        <button 
                          onClick={() => setMemoryFilter('all')}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors",
                            memoryFilter === 'all' 
                              ? (isDay ? "bg-black/20 text-black" : "bg-white/20 text-white") 
                              : (isDay ? "bg-black/5 text-black/40 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10")
                          )}
                        >
                          全部 (连接记忆)
                        </button>
                        <button 
                          onClick={() => setMemoryFilter('core')}
                          className={cn("px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors", memoryFilter === 'core' ? "bg-amber-500/20 text-amber-400" : (isDay ? "bg-black/5 text-black/40 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10"))}
                        >
                          核心记忆
                        </button>
                        <button 
                          onClick={() => setMemoryFilter('self')}
                          className={cn("px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors", memoryFilter === 'self' ? "bg-purple-500/20 text-purple-400" : (isDay ? "bg-black/5 text-black/40 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10"))}
                        >
                          自我记忆
                        </button>
                        <button 
                          onClick={() => setMemoryFilter('scene')}
                          className={cn("px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors", memoryFilter === 'scene' ? "bg-emerald-500/20 text-emerald-400" : (isDay ? "bg-black/5 text-black/40 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10"))}
                        >
                          场景记忆
                        </button>
                        <button 
                          onClick={() => setMemoryFilter('story')}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors",
                            memoryFilter === 'story' 
                              ? (isDay ? "bg-black/20 text-black" : "bg-white/20 text-white") 
                              : (isDay ? "bg-black/5 text-black/40 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10")
                          )}
                        >
                          故事记忆
                        </button>
                      </div>

                      {filteredMemories.length === 0 ? (
                        <div className={cn(
                          "text-center py-12 font-mono text-sm border border-dashed rounded-2xl",
                          isDay ? "text-black/20 border-black/10" : "text-white/20 border-white/5"
                        )}>
                          该分类下尚未记录任何记忆。
                        </div>
                      ) : (
                        filteredMemories.map(m => (
                          <div key={m.id} className={cn(
                            "p-4 rounded-xl border space-y-2 group relative",
                            isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
                          )}>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingMemory(m); setNewMemoryContent(m.content); setMemoryType(m.type); }}
                                className={cn(
                                  "p-1.5 rounded transition-colors",
                                  isDay ? "hover:bg-black/5 text-black/40 hover:text-blue-600" : "hover:bg-white/10 text-white/40 hover:text-blue-400"
                                )}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => onDeleteMemory?.(m.id)}
                                className={cn(
                                  "p-1.5 rounded transition-colors",
                                  isDay ? "hover:bg-black/5 text-black/40 hover:text-red-600" : "hover:bg-white/10 text-white/40 hover:text-red-400"
                                )}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className={cn("flex justify-between text-[10px] font-mono", isDay ? "text-black/30" : "text-white/30")}>
                              <div className="flex items-center gap-2">
                                <span>{new Date(m.timestamp).toLocaleString()}</span>
                                {m.sourceType === 'import' && <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded">已导入</span>}
                                {m.sourceType === 'world' && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 rounded">世界</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className={isDay ? "text-black/20" : "text-white/20"}>权重</span>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    max="100" 
                                    value={m.importance ?? 50}
                                    onChange={(e) => handleUpdateMemoryWeight(m, parseInt(e.target.value) || 50)}
                                    className={cn(
                                      "w-10 border rounded px-1 py-0.5 text-center outline-none",
                                      isDay ? "bg-black/5 border-black/10 text-black/60 focus:border-black/30" : "bg-black/20 border-white/10 text-white/60 focus:border-purple-500/50"
                                    )}
                                  />
                                </div>
                                  <span className={cn(
                                    "uppercase px-1.5 rounded",
                                    m.type === 'connection' ? "text-purple-400 bg-purple-500/10" :
                                    m.type === 'story' ? "text-blue-400 bg-blue-500/10" :
                                    m.type === 'intimate' ? "text-rose-400 bg-rose-500/10" :
                                    m.type === 'scene' ? "text-emerald-400 bg-emerald-500/10" :
                                    m.type === 'core' ? "text-amber-400 bg-amber-500/10" :
                                    m.type === 'cognitive' ? "text-indigo-400 bg-indigo-500/10" :
                                    (isDay ? "text-black/40 bg-black/5" : "text-white/40 bg-white/5")
                                  )}>
                                    {m.type === 'connection' ? '连接' : 
                                     m.type === 'story' ? '故事' : 
                                     m.type === 'intimate' ? '亲密' : 
                                     m.type === 'scene' ? '场景' :
                                     m.type === 'core' ? '核心' : 
                                     m.type === 'cognitive' ? '内心观察' : 
                                     m.type === 'self' ? '自我记忆' : m.type}
                                  </span>
                              </div>
                            </div>
                            <p className={cn("text-sm leading-relaxed whitespace-pre-wrap", isDay ? "text-black/80" : "text-white/80")}>{m.content}</p>
                            {m.tags.length > 0 && (
                              <div className="flex gap-1">
                                {m.tags.map(tag => (
                                  <span key={tag} className={cn("text-[8px] px-1.5 py-0.5 rounded", isDay ? "bg-black/5 text-black/40" : "bg-white/5 text-white/40")}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {soulSubTab === 'diary' && (
                  <div className="space-y-6">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-black/20" : "text-white/20")}>
                          <Brain className="w-3 h-3" /> 认知固化与总结 (内心观察)
                        </h4>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (!isConfirmingClearDiary) {
                                setIsConfirmingClearDiary(true);
                                setTimeout(() => setIsConfirmingClearDiary(false), 3000);
                              } else {
                                onClearCharacterData?.(['diary']);
                                setIsConfirmingClearDiary(false);
                              }
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-bold border transition-all",
                              isConfirmingClearDiary 
                                ? "bg-red-500 text-white border-red-600" 
                                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            )}
                          >
                            {isConfirmingClearDiary ? '确认清空时间线' : '清空数据'}
                          </button>
                          <button 
                            onClick={async () => {
                            if (onTriggerConsolidation) {
                              setIsConsolidating(true);
                              try {
                                await onTriggerConsolidation();
                                alert('认知固化与总结已完成！');
                              } catch (error) {
                                console.error('Consolidation error:', error);
                                alert('总结失败，请检查网络或配置');
                              } finally {
                                setIsConsolidating(false);
                              }
                            }
                          }}
                          disabled={isConsolidating}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50",
                            isDay 
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20" 
                              : "bg-purple-500/20 text-purple-400 border-purple-500/20 hover:bg-purple-500/30"
                          )}
                        >
                          {isConsolidating ? '总结中...' : '立即执行总结'}
                        </button>
                      </div>
                    </div>
                    <div className={cn("p-6 rounded-2xl border space-y-6", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>内心观察频率</div>
                            <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>AI 生成深度认知与反思的频率</div>
                          </div>
                          <select 
                            value={memorySummaryFrequency}
                            onChange={e => setMemorySummaryFrequency(e.target.value as any)}
                            className={cn(
                              "border rounded-lg px-3 py-1.5 text-xs outline-none",
                              isDay ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
                            )}
                          >
                            <option value="realtime">实时 (每轮对话)</option>
                            <option value="daily">每日 (周期性)</option>
                            <option value="weekly">每周</option>
                            <option value="manual">手动</option>
                          </select>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>认知深度</div>
                            <div className={cn("text-[10px]", isDay ? "text-black/30" : "text-white/30")}>内心观察的详细程度</div>
                          </div>
                          <select 
                            value={memorySummaryDetail}
                            onChange={e => setMemorySummaryDetail(e.target.value as any)}
                            className={cn(
                              "border rounded-lg px-3 py-1.5 text-xs outline-none",
                              isDay ? "bg-black/5 border-black/10 text-black" : "bg-white/5 border-white/10 text-white"
                            )}
                          >
                            <option value="low">精简 (仅核心)</option>
                            <option value="medium">标准</option>
                            <option value="high">详尽 (包含所有细节)</option>
                          </select>
                        </div>
                        <p className={cn("text-[10px] italic", isDay ? "text-black/20" : "text-white/20")}>
                          * 总结过程将参考“认知与设定”界面的角色书内容。
                        </p>
                      </div>
                    </section>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                      {charDiary.length === 0 ? (
                        <div className={cn(
                          "text-center py-12 font-mono text-sm border border-dashed rounded-2xl",
                          isDay ? "text-black/20 border-black/10" : "text-white/20 border-white/5"
                        )}>
                          尚未产生任何内心观察。
                        </div>
                      ) : (
                        charDiary.map(d => (
                          <div key={d.id} className={cn(
                            "p-4 rounded-xl border space-y-3 relative overflow-hidden group",
                            isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"
                          )}>
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                              <Sparkles className="w-8 h-8 text-purple-500" />
                            </div>
                            <div className={cn("flex justify-between text-[10px] font-mono", isDay ? "text-black/30" : "text-white/30")}>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(d.timestamp).toLocaleString()}</span>
                              </div>
                              <span className={cn("uppercase", 
                                d.type === 'COGNITIVE' ? "text-purple-400" : 
                                d.type === 'BEHAVIOR' ? "text-amber-400" : 
                                "text-blue-400"
                              )}>
                                {d.type === 'COGNITIVE' ? '深度认知' : 
                                 d.type === 'BEHAVIOR' ? '行为总结' : 
                                 d.type}
                              </span>
                            </div>
                            
                            {d.type === 'BEHAVIOR' && d.metadata ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2">
                                  {d.metadata.behaviorObservation && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-amber-400/60 uppercase mb-1 font-bold">行为观察</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.behaviorObservation}</div>
                                    </div>
                                  )}
                                  {d.metadata.behaviorDepth && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-orange-400/60 uppercase mb-1 font-bold">行为深度</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.behaviorDepth}</div>
                                    </div>
                                  )}
                                  {d.metadata.selfExperience && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-purple-400/60 uppercase mb-1 font-bold">自我体验</div>
                                      <div className={cn("text-xs leading-relaxed font-bold", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.selfExperience}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : d.type === 'COGNITIVE' && d.metadata ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2">
                                  {d.metadata.connectionObservation && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-purple-400/60 uppercase mb-1 font-bold">连接观察</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.connectionObservation}</div>
                                    </div>
                                  )}
                                  {d.metadata.sceneReflection && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-rose-400/60 uppercase mb-1 font-bold">场景反思</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.sceneReflection}</div>
                                    </div>
                                  )}
                                  {d.metadata.storyAssociation && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-blue-400/60 uppercase mb-1 font-bold">故事关联</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.storyAssociation}</div>
                                    </div>
                                  )}
                                  {d.metadata.comprehensiveInference && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-emerald-400/60 uppercase mb-1 font-bold">综合推断</div>
                                      <div className={cn("text-xs leading-relaxed font-bold", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.comprehensiveInference}</div>
                                    </div>
                                  )}
                                  {d.metadata.selfCognition && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-purple-400/60 uppercase mb-1 font-bold">自我认知与评价</div>
                                      <div className={cn("text-xs leading-relaxed font-bold", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.selfCognition}</div>
                                    </div>
                                  )}
                                  {d.metadata.habitExtraction && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-amber-400/60 uppercase mb-1 font-bold">习惯偏好提取</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.habitExtraction}</div>
                                    </div>
                                  )}
                                  {d.metadata.preferenceExtraction && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                                      <div className="text-[8px] text-pink-400/60 uppercase mb-1 font-bold">主观偏好提取</div>
                                      <div className={cn("text-xs leading-relaxed", isDay ? "text-black/70" : "text-white/70")}>{d.metadata.preferenceExtraction}</div>
                                    </div>
                                  )}
                                  {d.metadata.actionTendency && (
                                    <div className={cn("p-2 rounded-lg border", isDay ? "bg-purple-500/5 border-purple-500/10" : "bg-purple-500/10 border-purple-500/20")}>
                                      <div className="text-[8px] text-purple-400 uppercase mb-1 font-bold">行动倾向</div>
                                      <div className={cn("text-xs italic", isDay ? "text-black/90" : "text-white/90")}>“{d.metadata.actionTendency}”</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className={cn("text-sm italic", isDay ? "text-black/80" : "text-white/80")}>“{d.content}”</p>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase">{d.category}</span>
                              <span className={cn("text-[8px]", isDay ? "text-black/20" : "text-white/20")}>置信度: {(d.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {soulSubTab === 'intimate' && (
                  <div className="space-y-6">
                    {!isIntimateUnlocked ? (
                      <div className={cn(
                        "max-w-sm mx-auto p-8 rounded-3xl border text-center space-y-6",
                        isDay ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
                      )}>
                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                          <Lock className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                          <h4 className={cn("text-lg font-bold", isDay ? "text-black" : "text-white")}>亲密记忆已锁定</h4>
                          <p className={cn("text-xs", isDay ? "text-black/40" : "text-white/40")}>
                            {character.config.intimatePassword ? '请输入访问密码以查看私密互动记录' : '首次进入，请设置一个访问密码'}
                          </p>
                        </div>
                        <input 
                          type="password"
                          value={intimatePassword}
                          onChange={e => setIntimatePassword(e.target.value)}
                          placeholder="输入密码..."
                          className={cn(
                            "w-full border rounded-xl px-4 py-3 text-center outline-none transition-all",
                            isDay ? "bg-black/5 border-black/10 text-black focus:border-rose-500/50" : "bg-black/40 border-white/10 text-white focus:border-rose-500/50"
                          )}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (!character.config.intimatePassword) {
                                handleSave();
                                alert('访问密码已设置，请重新输入以解锁');
                                setIntimatePassword('');
                              } else if (intimatePassword === character.config.intimatePassword) {
                                setIsIntimateUnlocked(true);
                              } else {
                                alert('密码错误');
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            if (!character.config.intimatePassword) {
                              handleSave();
                              alert('访问密码已设置，请重新输入以解锁');
                              setIntimatePassword('');
                            } else if (intimatePassword === character.config.intimatePassword) {
                              setIsIntimateUnlocked(true);
                            } else {
                              alert('密码错误');
                            }
                          }}
                          className="w-full py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all"
                        >
                          {character.config.intimatePassword ? '解锁访问' : '设置密码'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                              <Heart className="w-3 h-3" /> 亲密记忆与印象
                            </h4>
                            <div className={cn("flex p-1 rounded-lg border", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                              <button 
                                onClick={() => setIntimateView('memory')}
                                className={cn("px-3 py-1 rounded text-[10px] font-bold transition-all", intimateView === 'memory' ? "bg-rose-500 text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                              >
                                亲密记忆
                              </button>
                              <button 
                                onClick={() => setIntimateView('impression')}
                                className={cn("px-3 py-1 rounded text-[10px] font-bold transition-all", intimateView === 'impression' ? "bg-rose-500 text-white" : (isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white"))}
                              >
                                亲密印象
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {intimateView === 'memory' && (
                              <button 
                                onClick={handleGenerateIntimateImpression}
                                disabled={isGeneratingIntimateImpression}
                                className="flex items-center gap-2 px-4 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                              >
                                {isGeneratingIntimateImpression ? (
                                  <Activity className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                                生成亲密印象
                              </button>
                            )}
                            {intimateView === 'impression' && (
                              <button 
                                onClick={() => {
                                  const dataToExport = diary.filter(d => d.type === 'INTIMATE_IMPRESSION');
                                  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${character.name}_亲密印象_${new Date().toLocaleDateString()}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                              >
                                <Download className="w-3 h-3" /> 导出亲密印象
                              </button>
                            )}
                            <button 
                              onClick={() => handleExportCategorized('intimate')}
                              className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold hover:bg-rose-500/20 transition-all"
                            >
                              <Download className="w-3 h-3" /> 导出原始对话
                            </button>
                          </div>
                        </div>

                        {intimateView === 'memory' ? (
                          <div className="space-y-4">
                            <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", isDay ? "text-black/20" : "text-white/20")}>原始亲密记录</h5>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                              {memories.filter(m => m.type === 'intimate').length === 0 ? (
                                <div className={cn("p-12 text-center text-xs font-mono border border-dashed rounded-2xl", isDay ? "text-black/20 border-black/10" : "text-white/20 border-white/5")}>暂无亲密记忆记录</div>
                              ) : (
                                memories.filter(m => m.type === 'intimate').map(m => (
                                  <div key={m.id} className={cn("p-4 rounded-2xl border space-y-2", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2">
                                        <span className={cn("text-[8px] font-mono", isDay ? "text-black/20" : "text-white/20")}>{new Date(m.timestamp).toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-rose-400">权重: {m.importance}</span>
                                        <button onClick={() => onDeleteMemory(m.id)} className={cn("transition-colors", isDay ? "text-black/10 hover:text-rose-600" : "text-white/10 hover:text-rose-400")}>
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className={cn("text-xs leading-relaxed", isDay ? "text-black/80" : "text-white/80")}>{m.content}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", isDay ? "text-black/20" : "text-white/20")}>AI 整理亲密印象</h5>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                              {diary.filter(d => d.type === 'INTIMATE_IMPRESSION').length === 0 ? (
                                <div className={cn("p-12 text-center text-xs font-mono border border-dashed rounded-2xl", isDay ? "text-black/20 border-black/10" : "text-white/20 border-white/5")}>暂无亲密印象，请在亲密记忆界面点击生成</div>
                              ) : (
                                diary.filter(d => d.type === 'INTIMATE_IMPRESSION').map(d => (
                                  <div key={d.id} className={cn("p-6 rounded-3xl border space-y-4", isDay ? "bg-rose-500/5 border-rose-500/10" : "bg-rose-500/5 border-rose-500/10")}>
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">亲密关系印象</span>
                                      </div>
                                      <span className={cn("text-[8px] font-mono", isDay ? "text-black/20" : "text-white/20")}>{new Date(d.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className={cn("text-xs leading-relaxed whitespace-pre-wrap font-serif italic", isDay ? "text-black/70" : "text-white/70")}>
                                      {d.content}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {soulSubTab === 'import' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Import Section */}
                      <div className={cn(
                        "p-8 rounded-[2.5rem] border flex flex-col transition-all group",
                        isDay ? "bg-black/5 border-black/5 hover:bg-black/[0.07]" : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                      )}>
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                              <Upload className="w-7 h-7" />
                            </div>
                            <div>
                              <div className={cn("text-base font-bold", isDay ? "text-black" : "text-white")}>导入灵魂记忆</div>
                              <div className={cn("text-[10px] uppercase tracking-wider mt-1", isDay ? "text-black/30" : "text-white/30")}>Import Soul Memory</div>
                            </div>
                          </div>
                          
                          <p className={cn("text-[11px] leading-relaxed", isDay ? "text-black/40" : "text-white/40")}>
                            支持 TXT 格式的对话、时间线或列表。系统将自动解析并整合进角色的认知系统。
                          </p>

                          <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                            <div className={cn("text-[10px] font-medium", isDay ? "text-black/40" : "text-white/40")}>导入时调用 AI 自动分类</div>
                            <button 
                              onClick={() => setAnalyzeImportWithAI(!analyzeImportWithAI)}
                              className={cn("w-10 h-5 rounded-full transition-all relative", analyzeImportWithAI ? "bg-blue-500" : (isDay ? "bg-black/10" : "bg-white/10"))}
                            >
                              <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", analyzeImportWithAI ? "left-6" : "left-1")} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-8">
                          <input 
                            type="file" accept=".txt" id="archive-import" className="hidden" 
                            onChange={handleFileSelect}
                          />
                          <label 
                            htmlFor="archive-import"
                            className="block w-full py-4 bg-blue-500 text-white text-center rounded-2xl text-xs font-bold transition-all cursor-pointer hover:bg-blue-600 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                          >
                            选择文件并导入
                          </label>
                        </div>
                      </div>

                      {/* Export Section */}
                      <div className={cn(
                        "p-8 rounded-[2.5rem] border flex flex-col transition-all group",
                        isDay ? "bg-black/5 border-black/5 hover:bg-black/[0.07]" : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                      )}>
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                              <Download className="w-7 h-7" />
                            </div>
                            <div>
                              <div className={cn("text-base font-bold", isDay ? "text-black" : "text-white")}>导出灵魂记忆</div>
                              <div className={cn("text-[10px] uppercase tracking-wider mt-1", isDay ? "text-black/30" : "text-white/30")}>Export Soul Memory</div>
                            </div>
                          </div>

                          <p className={cn("text-[11px] leading-relaxed", isDay ? "text-black/40" : "text-white/40")}>
                            导出该角色的所有核心、连接记忆与聊天记录。您可以选择特定类型的记忆进行备份。
                          </p>

                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => handleExportCategorized('scene')}
                                className="py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-[10px] font-bold transition-all border border-white/5"
                              >
                                场景记忆
                              </button>
                              <button 
                                onClick={() => handleExportCategorized('story')}
                                className="py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-[10px] font-bold transition-all border border-white/5"
                              >
                                故事记忆
                              </button>
                            </div>
                            <button 
                              onClick={() => handleExportCategorized('core')}
                              className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-[10px] font-bold transition-all border border-amber-500/20"
                            >
                              核心记忆
                            </button>
                            <button 
                              onClick={() => handleExportCategorized('diary')}
                              className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-[10px] font-bold transition-all border border-purple-500/20"
                            >
                              内心观察 (时间线)
                            </button>
                          </div>
                        </div>
                        <div className="mt-8">
                          <button 
                            onClick={() => {
                              handleExportMemories();
                              handleExportChat();
                            }}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                          >
                            全部导出 (含聊天记录)
                          </button>
                        </div>
                      </div>

                      {/* Danger Zone Section */}
                      <div className={cn(
                        "p-8 rounded-[2.5rem] border flex flex-col transition-all group",
                        isDay 
                          ? "bg-red-500/[0.03] border-red-500/10 hover:bg-red-500/[0.06]" 
                          : "bg-red-500/5 border-red-500/10 hover:bg-red-500/[0.08]"
                      )}>
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                              <Trash2 className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="text-base font-bold text-red-400">危险区域</div>
                              <div className="text-[10px] text-red-400/40 uppercase tracking-wider mt-1">Danger Zone</div>
                            </div>
                          </div>

                          <p className={cn(
                            "text-[11px] leading-relaxed",
                            isDay ? "text-red-900/40" : "text-red-400/40"
                          )}>
                            清空该角色的所有记忆库、内心观察及聊天记录。此操作不可撤销，请谨慎操作。
                          </p>
                          
                          <div className="space-y-2">
                            <button 
                              onClick={() => {
                                if (!isConfirmingClearMemories) {
                                  setIsConfirmingClearMemories(true);
                                  setTimeout(() => setIsConfirmingClearMemories(false), 3000);
                                } else {
                                  onClearCharacterData?.(['memory', 'diary']);
                                  setIsConfirmingClearMemories(false);
                                }
                              }}
                              className={cn(
                                "w-full py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                                isConfirmingClearMemories 
                                  ? "bg-red-500 text-white border-red-600" 
                                  : isDay
                                    ? "bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10"
                                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                              )}
                            >
                              {isConfirmingClearMemories ? '确认清空记忆库' : '清空记忆库与内心观察'}
                            </button>
                            <button 
                              onClick={() => {
                                if (!isConfirmingClearChat) {
                                  setIsConfirmingClearChat(true);
                                  setTimeout(() => setIsConfirmingClearChat(false), 3000);
                                } else {
                                  onClearCharacterData?.(['chat']);
                                  setIsConfirmingClearChat(false);
                                }
                              }}
                              className={cn(
                                "w-full py-2.5 rounded-xl text-[10px] font-bold border transition-all",
                                isConfirmingClearChat 
                                  ? "bg-red-500 text-white border-red-600" 
                                  : isDay
                                    ? "bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10"
                                    : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                              )}
                            >
                              {isConfirmingClearChat ? '确认清空聊天记录' : '仅清空聊天记录'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-8">
                          <button 
                            onClick={() => {
                              if (!isConfirmingClearImport) {
                                setIsConfirmingClearImport(true);
                                setTimeout(() => setIsConfirmingClearImport(false), 3000);
                              } else {
                                onClearCharacterData?.(['memory', 'diary', 'chat']);
                                setIsConfirmingClearImport(false);
                              }
                            }}
                            className={cn(
                              "w-full py-4 rounded-2xl text-xs font-bold border transition-all",
                              isConfirmingClearImport 
                                ? "bg-red-500 text-white border-red-600 animate-pulse" 
                                : isDay
                                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                                  : "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                            )}
                          >
                            {isConfirmingClearImport ? '再次点击确认清空全部' : '一键清空全部数据'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Removed redundant chat export section */}

                    {previewData && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-6 rounded-3xl border space-y-4",
                          isDay 
                            ? "bg-purple-500/5 border-purple-500/20" 
                            : "bg-purple-500/5 border-purple-500/20"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="text-xs font-bold text-purple-400 uppercase tracking-widest">导入预览</h5>
                          <button onClick={() => setPreviewData(null)} className={cn("hover:text-white transition-colors", isDay ? "text-black/20" : "text-white/20")}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className={cn("p-3 rounded-xl border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                            <div className={cn("text-lg font-bold", isDay ? "text-black" : "text-white")}>{previewData.stats.totalItems}</div>
                            <div className={cn("text-[8px] uppercase", isDay ? "text-black/30" : "text-white/30")}>条目</div>
                          </div>
                          <div className={cn("p-3 rounded-xl border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                            <div className={cn("text-lg font-bold capitalize", isDay ? "text-black" : "text-white")}>{previewData.format === 'dialogue' ? '连接' : previewData.format === 'timeline' ? '时间线' : '列表'}</div>
                            <div className={cn("text-[8px] uppercase", isDay ? "text-black/30" : "text-white/30")}>格式</div>
                          </div>
                          <div className={cn("p-3 rounded-xl border", isDay ? "bg-black/5 border-black/5" : "bg-black/20 border-white/5")}>
                            <div className={cn("text-lg font-bold", isDay ? "text-black" : "text-white")}>{previewData.stats.dateReferences}</div>
                            <div className={cn("text-[8px] uppercase", isDay ? "text-black/30" : "text-white/30")}>日期</div>
                          </div>
                        </div>
                        {importProgress > 0 ? (
                          <div className="space-y-2">
                            <div className={cn("h-1 rounded-full overflow-hidden", isDay ? "bg-black/5" : "bg-white/5")}>
                              <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${importProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={handleConfirmImport}
                            className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all"
                          >
                            确认导入到记忆库
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Removed other tab content as it was moved to logic */}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "p-6 border-t flex justify-between items-center gap-4",
          isDay ? "bg-white border-black/5" : "bg-black/20 border-white/5"
        )}>
          {onDelete && !character.isDefault && (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className={cn(
                "px-6 py-3 rounded-2xl font-bold transition-colors flex items-center gap-2",
                isDay ? "text-red-600 hover:bg-red-500/5" : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
              )}
            >
              <Trash2 className="w-5 h-5" /> 删除灵魂
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px ${themeColor}33` }}
          >
            <Sparkles className="w-5 h-5" /> 保存所有配置
          </button>
        </div>

        <AnimatePresence>
          {showConfirmDelete && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className={cn(
                  "w-full max-w-sm rounded-2xl border p-6 space-y-6 shadow-2xl",
                  isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
                )}
              >
                <div className="space-y-2 text-center">
                  <h4 className={cn("text-lg font-bold", isDay ? "text-black" : "text-white")}>确认删除?</h4>
                  <p className={cn("text-sm", isDay ? "text-black/40" : "text-white/40")}>此操作不可撤销，该灵魂的所有设定和记忆将被永久清除。</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-colors", isDay ? "text-black/60 hover:bg-black/5" : "text-white/60 hover:bg-white/5")}
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      onDelete?.(character.id);
                      onClose();
                    }}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-all"
                  >
                    确认删除
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingBook && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className={cn(
                  "w-full max-w-lg rounded-3xl border p-6 space-y-6 shadow-2xl",
                  isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
                )}
              >
                <div className="flex justify-between items-center">
                  <h4 className={cn("text-lg font-bold", isDay ? "text-black" : "text-white")}>塑造角色书</h4>
                  <button onClick={() => setEditingBook(null)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-black/5 text-black/40 hover:text-black" : "hover:bg-white/5 text-white/40 hover:text-white")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-black/30" : "text-white/30")}>标题</label>
                    <input 
                      value={editingBook.name}
                      onChange={e => setEditingBook({...editingBook, name: e.target.value})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                        isDay 
                          ? "bg-black/5 border-black/10 focus:border-purple-500 text-black" 
                          : "bg-white/5 border-white/10 focus:border-purple-500 text-white"
                      )}
                      placeholder="输入角色书标题..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-black/30" : "text-white/30")}>内容</label>
                    <textarea 
                      value={editingBook.content}
                      onChange={e => setEditingBook({...editingBook, content: e.target.value})}
                      rows={8}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none custom-scrollbar transition-colors",
                        isDay 
                          ? "bg-black/5 border-black/10 focus:border-purple-500 text-black" 
                          : "bg-white/5 border-white/10 focus:border-purple-500 text-white"
                      )}
                      placeholder="输入详细设定内容..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-black/30" : "text-white/30")}>注入位置</label>
                    <select 
                      value={editingBook.injectionPosition}
                      onChange={e => setEditingBook({...editingBook, injectionPosition: e.target.value as any})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none appearance-none",
                        isDay 
                          ? "bg-black/5 border-black/10 focus:border-purple-500 text-black" 
                          : "bg-white/5 border-white/10 focus:border-purple-500 text-white"
                      )}
                    >
                      <option value="front">Front (前置)</option>
                      <option value="back">Back (后置)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingBook(null)}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-colors", isDay ? "text-black/60 hover:bg-black/5" : "text-white/60 hover:bg-white/5")}
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      if (!editingBook.name || !editingBook.content) {
                        alert('请填写标题和内容');
                        return;
                      }
                      const updatedBooks = [...characterBooks];
                      const exists = updatedBooks.find(b => b.id === editingBook.id);
                      if (exists) {
                        setCharacterBooks(updatedBooks.map(b => b.id === editingBook.id ? editingBook : b));
                      } else {
                        setCharacterBooks([...updatedBooks, editingBook]);
                        setActiveCharacterBookIds([...activeCharacterBookIds, editingBook.id]);
                      }
                      setEditingBook(null);
                    }}
                    className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold text-white transition-all shadow-lg shadow-purple-500/20"
                  >
                    确认
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
