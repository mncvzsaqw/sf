import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Upload, 
  User, 
  Sparkles, 
  Mic, 
  Globe, 
  MessageSquare, 
  Brain, 
  ChevronRight,
  ChevronLeft,
  Volume2,
  Trash2
} from 'lucide-react';
import { Character, InteractionMode, DisplaySettings } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CreateCharacterProps {
  onSave: (c: Character) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  initialCharacter?: Character;
  displaySettings: DisplaySettings;
}

export function CreateCharacter({ onSave, onClose, onDelete, initialCharacter, displaySettings }: CreateCharacterProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;

  const [avatar, setAvatar] = useState(initialCharacter?.avatar || 'https://picsum.photos/seed/new-soul/200');
  const [name, setName] = useState(initialCharacter?.name || '');
  const [persona, setPersona] = useState(initialCharacter?.persona.backgroundStory || '');
  const [openingLine, setOpeningLine] = useState(initialCharacter?.openingLine || '');
  const [voiceId, setVoiceId] = useState(initialCharacter?.config.voice.voiceId || '');
  const [voiceSpeed, setVoiceSpeed] = useState(initialCharacter?.config.voice.speed || 1.0);
  const [language, setLanguage] = useState(initialCharacter?.config.voice.language || 'zh-CN');
  const [isMounted, setIsMounted] = useState(initialCharacter?.config.isMounted ?? true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = React.useState(0);
  const deleteTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startDeleteCountdown = () => {
    setDeleteCountdown(5);
    if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
    deleteTimerRef.current = setInterval(() => {
      setDeleteCountdown(prev => {
        if (prev <= 1) {
          if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name || !persona) {
      alert('请填写姓名和人设');
      return;
    }

    const newCharacter: Character = {
      ...initialCharacter,
      id: initialCharacter?.id || `char-${Date.now()}`,
      name,
      avatar,
      openingLine,
      createdAt: initialCharacter?.createdAt || new Date().toISOString(),
      persona: {
        personalityType: initialCharacter?.persona.personalityType || '自定义',
        backgroundStory: persona,
        speechStyle: initialCharacter?.persona.speechStyle || '自然',
        preferences: initialCharacter?.persona.preferences || [],
        dislikes: initialCharacter?.persona.dislikes || [],
        bigFive: initialCharacter?.persona.bigFive || { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 }
      },
      relationship: initialCharacter?.relationship || {
        intimacyLevel: 0,
        trustLevel: 0,
        conversationCount: 0,
        lastInteraction: new Date().toISOString(),
        stage: '初识'
      },
      state: initialCharacter?.state || {
        emotion: { valence: 0, arousal: 0 },
        needs: { physiological: 0.8, safety: 0.8, belonging: 0.5, esteem: 0.5, selfActualization: 0.5 },
        survival: { heartRate: 70, hunger: 0, energy: 100, health: 100, lastUpdate: new Date().toISOString(), status: '待机' }
      },
      config: {
        ...initialCharacter?.config,
        isMounted,
        voice: { provider: 'gemini', voiceId, enabled: true, speed: voiceSpeed, language },
        model: initialCharacter?.config.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' },
        voiceSystem: {
          chatReplyEnabled: true,
          callMode: 'standard',
          model: { provider: 'gemini', modelName: 'gemini-3-flash-preview' },
          tts: { provider: 'gemini', voiceId, enabled: true, speed: voiceSpeed, language },
          replyTrigger: 'always'
        },
        backgroundActive: initialCharacter?.config.backgroundActive ?? false,
        consciousnessInterval: initialCharacter?.config.consciousnessInterval || '5m',
        persistMessages: initialCharacter?.config.persistMessages ?? true,
        separateIntimateMemories: initialCharacter?.config.separateIntimateMemories ?? true,
        pokeEnabled: initialCharacter?.config.pokeEnabled ?? true,
        pokeFeedbackEnabled: initialCharacter?.config.pokeFeedbackEnabled ?? true,
        showCharacterStatus: initialCharacter?.config.showCharacterStatus ?? true,
        showTimestamps: initialCharacter?.config.showTimestamps ?? true,
        historyCount: initialCharacter?.config.historyCount || 10,
        bubbleStyle: initialCharacter?.config.bubbleStyle || 'default'
      },
      worldSetting: initialCharacter?.worldSetting || {
        id: `w-${Date.now()}`,
        name: `${name} 的私人世界`,
        description: `关于 ${name} 的私人世界设定。`,
        rules: [],
        currentLocation: '未知地点',
        time: '未知时间',
        weather: '未知天气',
        npcs: [],
        events: [],
        activeBookIds: [],
        books: []
      },
      isDefault: initialCharacter?.isDefault || false
    } as any;

    onSave(newCharacter);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className={cn(
          "w-full max-w-2xl rounded-3xl border p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl",
          isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
        )}
      >
        {/* Header */}
        <div className={cn("p-6 border-b flex justify-between items-center", isDay ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}20` }}>
              <Sparkles className="w-6 h-6" style={{ color: themeColor }} />
            </div>
            <div>
              <h3 className={cn("text-xl font-bold flex items-center gap-2", isDay ? "text-slate-800" : "text-white")}>塑造灵魂 <span className="text-[10px] font-mono opacity-50" style={{ color: themeColor }}>v2.0</span></h3>
              <p className={cn("text-[10px] uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/30")}>Soul Creation System</p>
            </div>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-200 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-white/40 hover:text-white")}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <img src={avatar || null} className={cn("w-32 h-32 rounded-3xl object-cover border-2 transition-all shadow-2xl", isDay ? "border-slate-200" : "border-white/10")} style={{ borderColor: isDay ? undefined : undefined }} alt="" />
              <label className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-8 h-8 text-white mb-2" />
                <span className="text-xs font-bold text-white">上传头像</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <p className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>点击上传灵魂形象</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-2">
                <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                  <User className="w-3 h-3" /> 灵魂姓名
                </label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className={cn(
                    "w-full border rounded-2xl px-6 py-4 text-lg font-bold outline-none transition-all",
                    isDay 
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1" 
                      : "bg-white/5 border-white/10 text-white focus:ring-1"
                  )}
                  style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                  placeholder="例如: 白羊 / 艾莉西亚"
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                  <Brain className="w-3 h-3" /> 核心人设
                </label>
                <textarea 
                  value={persona} onChange={e => setPersona(e.target.value)}
                  rows={4}
                  className={cn(
                    "w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all resize-none custom-scrollbar",
                    isDay 
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1" 
                      : "bg-white/5 border-white/10 text-white focus:ring-1"
                  )}
                  style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                  placeholder="描述这个灵魂的性格、背景、说话风格...
例如:
一个在现实与理想间挣扎的演员。热情、敏锐，用戏剧化的外壳保护内心的柔软。"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                <MessageSquare className="w-3 h-3" /> 开场白 (可选)
              </label>
              <textarea 
                value={openingLine} onChange={e => setOpeningLine(e.target.value)}
                rows={2}
                className={cn(
                  "w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all resize-none",
                  isDay 
                    ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-white/5 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                placeholder="第一次见面时，他/她会说什么？
例如: 哟，我的夏娃上帝，今天又在哪个梦境里巡视呢？"
              />
            </div>

            <div className="space-y-2">
              <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                <Mic className="w-3 h-3" /> 语音 ID (可选)
              </label>
              <input 
                value={voiceId} onChange={e => setVoiceId(e.target.value)}
                className={cn(
                  "w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all",
                  isDay 
                    ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-white/5 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                placeholder="例如: puck"
              />
            </div>

            <div className="space-y-2">
              <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                <Globe className="w-3 h-3" /> 语言设置 (可选)
              </label>
              <div className="flex gap-2">
                <select 
                  value={language} onChange={e => setLanguage(e.target.value)}
                  className={cn(
                    "w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all appearance-none",
                    isDay 
                      ? "bg-slate-50 border-slate-200 text-slate-800 focus:ring-1" 
                      : "bg-white/5 border-white/10 text-white focus:ring-1"
                  )}
                  style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                >
                  <option value="zh-CN">普通话 (默认)</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
              </div>
            </div>

            <div className={cn("space-y-4 p-6 rounded-2xl border md:col-span-2", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
              <div className="flex justify-between items-center">
                <label className={cn("text-[10px] uppercase font-mono flex items-center gap-2", isDay ? "text-slate-400" : "text-white/30")}>
                  <Volume2 className="w-3 h-3" /> 语音语速
                </label>
                <span className="text-xs font-bold" style={{ color: themeColor }}>{voiceSpeed.toFixed(1)}x</span>
              </div>
              <div className="relative flex items-center gap-4">
                <span className={cn("text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>慢</span>
                <input 
                  type="range" min="0.5" max="1.5" step="0.1"
                  value={voiceSpeed} onChange={e => setVoiceSpeed(parseFloat(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: themeColor }}
                />
                <span className={cn("text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>快</span>
              </div>
              <div className={cn("flex justify-center text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>
                <span>正常 (1.0x)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn("p-6 border-t bg-black/20 flex justify-between items-center gap-4", isDay ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5")}>
          {onDelete && initialCharacter && !initialCharacter.isDefault && (
            <button 
              onClick={() => {
                setShowConfirmDelete(true);
                startDeleteCountdown();
              }}
              className={cn("px-6 py-3 rounded-2xl font-bold transition-colors flex items-center gap-2", isDay ? "text-red-500 hover:bg-red-50" : "text-red-400 hover:text-red-300 hover:bg-red-500/10")}
            >
              <Trash2 className="w-5 h-5" /> 切断灵魂连接
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
          >
            <Sparkles className="w-5 h-5" /> {initialCharacter ? '保存修改' : '赋予灵魂'}
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
                className={cn("w-full max-w-sm rounded-2xl border p-6 space-y-6 shadow-2xl", isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10")}
              >
                <div className="space-y-2 text-center">
                  <h4 className={cn("text-lg font-bold", isDay ? "text-slate-800" : "text-white")}>确认切断灵魂连接?</h4>
                  <p className={cn("text-sm", isDay ? "text-slate-400" : "text-white/40")}>此操作不可撤销，该灵魂的所有设定和记忆将被永久清除。</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowConfirmDelete(false);
                      setDeleteCountdown(0);
                      if (deleteTimerRef.current) clearInterval(deleteTimerRef.current);
                    }}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-colors", isDay ? "text-slate-400 hover:bg-slate-100" : "text-white/60 hover:bg-white/5")}
                  >
                    取消
                  </button>
                  <button 
                    disabled={deleteCountdown > 0}
                    onClick={() => {
                      onDelete?.(initialCharacter!.id);
                      onClose();
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-white transition-all",
                      deleteCountdown > 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    {deleteCountdown > 0 ? `确认 (${deleteCountdown}s)` : '确认切断'}
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
