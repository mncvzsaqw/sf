import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Globe,
  Eye, 
  BookOpen, 
  X, 
  ChevronRight, 
  Zap, 
  Activity, 
  Send,
  Clock,
  MapPin,
  Coffee,
  Moon,
  Sun,
  History,
  ChevronLeft,
  Wand2,
  Plus,
  Heart,
  User,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  MessageSquare,
  Settings,
  Volume2,
  Image as ImageIcon,
  Users,
  Upload
} from 'lucide-react';
import { Character, LiveScene, Plot, DiaryEntry, Memory, WorldMessage, IntimateMemory, WorldBook, NPC, WorldSetting, GlobalModelConfig, Message, InteractionMode, DisplaySettings } from '../types';
import { expandLiveScene, expandPlot, generatePlotSetting, generateEncounterResponse, optimizePlotChapter } from '../services/worldMode';
import { logWorldEventToDiary } from '../services/worldLife';
import { speak } from '../services/voice';
import { IntimateEntry } from './IntimateMode/IntimateEntry';
import { IntimatePanel } from './IntimateMode/IntimatePanel';
import { WorldSettingEditor } from './WorldSettingEditor';
import { NPCEditor } from './NPCEditor';
import ReactMarkdown from 'react-markdown';

interface WorldModeProps {
  character: Character;
  world: WorldSetting;
  globalModel: GlobalModelConfig;
  displaySettings: DisplaySettings;
  allCharacters: Character[];
  liveScenes: LiveScene[];
  plots: Plot[];
  diary: DiaryEntry[];
  memories: Memory[];
  worldMessages: WorldMessage[];
  onUpdateWorldMessages: (msgs: WorldMessage[]) => void;
  onUpdateCharacter: (c: Character) => void;
  onUpdateWorld: (w: WorldSetting) => void;
  onAddLiveScene: (s: LiveScene) => void;
  onAddPlot: (p: Plot) => void;
  onUpdatePlot: (p: Plot) => void;
  onAddMemory: (m: Memory) => void;
  onAddDiaryEntry: (e: DiaryEntry) => void;
  onAddMessageToMainChat?: (msg: Message) => void;
  onClose: () => void;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function WorldMode({ 
  character, 
  world,
  globalModel,
  displaySettings,
  allCharacters = [], 
  liveScenes = [], 
  plots = [], 
  diary = [], 
  memories = [], 
  worldMessages = [], 
  onUpdateWorldMessages,
  onUpdateCharacter,
  onUpdateWorld,
  onAddLiveScene, 
  onAddPlot, 
  onUpdatePlot,
  onAddMemory,
  onAddDiaryEntry,
  onAddMessageToMainChat,
  onClose 
}: WorldModeProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;
  const [mode, setMode] = useState<'encounter' | 'plot'>('encounter');
  const [subType, setSubType] = useState<'daily' | 'intimacy'>('daily');
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 50);
  }, [worldMessages]);
  const [showIntimateEntry, setShowIntimateEntry] = useState(false);
  const [intimateSession, setIntimateSession] = useState<{ id: string, intimacyLevel: number } | null>(null);
  const [activeCharIds, setActiveCharIds] = useState<string[]>(allCharacters?.map(c => c.id) || [character.id]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [optimizingMessageId, setOptimizingMessageId] = useState<string | null>(null);
  const [optimizationPrompt, setOptimizationPrompt] = useState('');
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [showGlobalWorldManager, setShowGlobalWorldManager] = useState(false);
  const [showLocalWorldManager, setShowLocalWorldManager] = useState(false);
  const [selectedBookTag, setSelectedBookTag] = useState<string | null>(null);
  const [newBook, setNewBook] = useState<{
    name: string;
    content: string;
    injectionPosition: 'front' | 'middle' | 'back';
    tags: string;
  }>({ name: '', content: '', injectionPosition: 'front', tags: '' });
  const [showNPCPicker, setShowNPCPicker] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

  // Ensure worldSetting exists
  useEffect(() => {
    if (!character.worldSetting) {
      onUpdateCharacter({
        ...character,
        worldSetting: {
          id: `w-${character.id}`,
          name: `${character.name} 的私人世界`,
          description: `关于 ${character.name} 的私人世界设定。`,
          rules: [],
          currentLocation: '未知地点',
          time: '未知时间',
          weather: '未知天气',
          npcs: [],
          events: [],
          activeBookIds: [],
          books: []
        }
      });
    }
  }, [character.id, character.worldSetting, onUpdateCharacter]);

  const charPlots = (plots || []).filter(p => p.characterId === character.id);
  const activePlot = charPlots[0];

  const activeCharacters = (allCharacters || []).filter(c => activeCharIds.includes(c.id));

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    setIsProcessing(true);
    
    const userMsg: WorldMessage = {
      id: `wm-user-${Date.now()}`,
      characterId: character.id,
      type: mode,
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      subType: mode === 'encounter' ? subType : 'story'
    };

    const updatedMsgs = [...worldMessages, userMsg];
    onUpdateWorldMessages(updatedMsgs);
    setUserInput('');

    // Sync to main chat if enabled
    if (character.config.persistMessages !== false && onAddMessageToMainChat) {
      onAddMessageToMainChat({
        id: userMsg.id,
        role: 'user',
        content: userMsg.content,
        timestamp: userMsg.timestamp,
        mode: InteractionMode.WORLD,
        subType: userMsg.subType as any
      });
    }

    try {
      let aiResponses: { content: string; speakerId?: string; speakerName?: string; speakerAvatar?: string }[] = [];

      if (mode === 'encounter') {
        const history = updatedMsgs.slice(-5).map(m => ({ role: m.role, content: m.content }));
        const mountedNPCs = (character.worldSetting?.npcs || []).filter(n => n.isMounted) || [];
        const globalActiveBooks = (world.books || []).filter(b => world.activeBookIds?.includes(b.id)) || [];
        const charActiveBooks = (character.worldSetting?.books || []).filter(b => character.worldSetting?.activeBookIds?.includes(b.id)) || [];
        const activeBooks = [...globalActiveBooks, ...charActiveBooks];
        
        aiResponses = await generateEncounterResponse(
          character, 
          userInput, 
          history, 
          subType, 
          activeCharacters,
          mountedNPCs,
          activeBooks,
          globalModel
        );
        
        const newMsgs = aiResponses.map((r, i) => ({
          id: `wm-ai-${Date.now()}-${i}`,
          characterId: character.id,
          type: 'encounter' as const,
          role: 'model' as const,
          content: r.content,
          timestamp: new Date().toISOString(),
          subType,
          speakerId: r.speakerId,
          speakerName: r.speakerName,
          speakerAvatar: r.speakerAvatar
        }));

        // Update NPC memories
        if (character.worldSetting?.npcs) {
          const roundContent = `用户: ${userInput}\n${newMsgs.map(m => `${m.speakerName}: ${m.content}`).join('\n')}`;
          const updatedNPCs = character.worldSetting.npcs.map(npc => {
            if (npc.isMounted) {
              const newMemory: Memory = {
                id: `mem-round-${Date.now()}`,
                characterId: npc.id,
                content: roundContent,
                type: 'core',
                timestamp: new Date().toISOString(),
                tags: ['round_record'],
                importance: 10 // Default weight for round records
              };
              return {
                ...npc,
                memories: [newMemory, ...(npc.memories || [])].slice(0, 1000) // Keep last 1000 memories
              };
            }
            return npc;
          });
          onUpdateCharacter({
            ...character,
            worldSetting: { ...character.worldSetting, npcs: updatedNPCs }
          });
        }

        onUpdateWorldMessages([...updatedMsgs, ...newMsgs]);

        // Sync to main chat if enabled
        if (character.config.persistMessages !== false && onAddMessageToMainChat) {
          newMsgs.forEach(m => {
            onAddMessageToMainChat({
              id: m.id,
              role: 'model',
              content: m.content,
              timestamp: m.timestamp,
              mode: InteractionMode.WORLD,
              subType: m.subType as any,
              speakerId: m.speakerId,
              speakerName: m.speakerName,
              speakerAvatar: m.speakerAvatar
            });
          });
        }

        // Handle voice for all speakers
        newMsgs.forEach(m => {
          if (m.speakerId === character.id) {
            if (character.config.voice.enabled) {
              speak(m.content, character.config.voice);
            }
          } else {
            const npc = character.worldSetting?.npcs.find(n => n.id === m.speakerId);
            if (npc?.voiceEnabled) {
              // Use character's voice config as a baseline for NPCs if they don't have their own
              speak(m.content, character.config.voice);
            }
          }
        });
      } else if (mode === 'plot') {
        const globalActiveBooks = world.books.filter(b => world.activeBookIds?.includes(b.id)) || [];
        const charActiveBooks = character.worldSetting?.books.filter(b => character.worldSetting?.activeBookIds?.includes(b.id)) || [];
        const activeBooks = [...globalActiveBooks, ...charActiveBooks];
        // Start or continue plot
        if (!activePlot) {
          const setting = await generatePlotSetting(character, userInput, activeBooks, globalModel);
          const newPlot: Plot = {
            id: `plot-${Date.now()}`,
            characterId: character.id,
            title: setting.title,
            genre: setting.genre,
            style: setting.style,
            chapters: [{
              id: 1,
              content: userInput,
              type: 'beginning',
              timestamp: new Date().toISOString(),
              generatedBy: 'user'
            }],
            currentChapter: 1,
            status: 'ongoing',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          onAddPlot(newPlot);
          
          const aiMsg: WorldMessage = {
            id: `wm-ai-plot-${Date.now()}`,
            characterId: character.id,
            type: 'plot',
            role: 'model',
            content: `【故事已开启：${setting.title}】\n\n${userInput}`,
            timestamp: new Date().toISOString(),
            metadata: { plotId: newPlot.id, chapterId: 1 },
            subType: 'story'
          };
          onUpdateWorldMessages([...updatedMsgs, aiMsg]);
          aiResponses = [{ content: aiMsg.content }];

          // Sync to main chat if enabled
          if (character.config.persistMessages !== false && onAddMessageToMainChat) {
            onAddMessageToMainChat({
              id: aiMsg.id,
              role: 'model',
              content: aiMsg.content,
              timestamp: aiMsg.timestamp,
              mode: InteractionMode.WORLD,
              subType: 'story'
            });
          }
        } else {
          // Continue existing plot
          const nextChapter = await expandPlot(character, activePlot, 'continue', activeBooks, globalModel);
          const updatedPlot: Plot = {
            ...activePlot,
            chapters: [...activePlot.chapters, nextChapter],
            currentChapter: nextChapter.id,
            lastUpdated: new Date().toISOString()
          };
          onUpdatePlot(updatedPlot);

          const aiMsg: WorldMessage = {
            id: `wm-ai-plot-${Date.now()}`,
            characterId: character.id,
            type: 'plot',
            role: 'model',
            content: nextChapter.content,
            timestamp: new Date().toISOString(),
            metadata: { plotId: activePlot.id, chapterId: nextChapter.id },
            speakerName: character.name,
            speakerAvatar: character.avatar,
            subType: 'story'
          };
          onUpdateWorldMessages([...updatedMsgs, aiMsg]);
          aiResponses = [{ content: aiMsg.content }];

          // Sync to main chat if enabled
          if (character.config.persistMessages !== false && onAddMessageToMainChat) {
            onAddMessageToMainChat({
              id: aiMsg.id,
              role: 'model',
              content: aiMsg.content,
              timestamp: aiMsg.timestamp,
              mode: InteractionMode.WORLD,
              subType: 'story',
              speakerName: aiMsg.speakerName,
              speakerAvatar: aiMsg.speakerAvatar
            });
          }
        }
      }

      // Log to diary every 4 messages or significant events
      if (updatedMsgs.length % 4 === 0) {
        const recentMsgs = [...updatedMsgs, ...aiResponses.map(r => ({ role: 'model', content: r.content }))].slice(-6);
        const globalActiveBooks = world.books.filter(b => world.activeBookIds?.includes(b.id)) || [];
        const charActiveBooks = character.worldSetting?.books.filter(b => character.worldSetting?.activeBookIds?.includes(b.id)) || [];
        const activeBooks = [...globalActiveBooks, ...charActiveBooks];
        const diaryEntry = await logWorldEventToDiary(character, character.worldSetting!, recentMsgs, mode, activeBooks, globalModel);
        if (diaryEntry) {
          onAddDiaryEntry(diaryEntry);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = (id: string) => {
    onUpdateWorldMessages((worldMessages || []).filter(m => m.id !== id));
  };

  const handleStartEdit = (msg: WorldMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId) return;
    onUpdateWorldMessages(worldMessages.map(m => 
      m.id === editingMessageId ? { ...m, content: editContent } : m
    ));
    setEditingMessageId(null);
  };

  const handleOptimizePlot = async (msg: WorldMessage) => {
    if (!optimizationPrompt.trim() || !activePlot) return;
    setIsProcessing(true);
    try {
      const globalActiveBooks = world.books.filter(b => world.activeBookIds?.includes(b.id)) || [];
      const charActiveBooks = character.worldSetting?.books.filter(b => character.worldSetting?.activeBookIds?.includes(b.id)) || [];
      const activeBooks = [...globalActiveBooks, ...charActiveBooks];
      const optimized = await optimizePlotChapter(character, activePlot, msg.content, optimizationPrompt, activeBooks, globalModel);
      onUpdateWorldMessages(worldMessages.map(m => 
        m.id === msg.id ? { ...m, content: optimized } : m
      ));
      setOptimizingMessageId(null);
      setOptimizationPrompt('');
    } catch (e) {
      alert('优化失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) return <Sun className="w-4 h-4 text-yellow-500" />;
    return <Moon className="w-4 h-4 text-blue-400" />;
  };

  const getWallpaper = () => {
    if (mode === 'plot') return character.config.wallpapers?.story;
    if (subType === 'intimacy') return character.config.wallpapers?.intimacy;
    if (subType === 'daily') return character.config.wallpapers?.daily;
    return character.config.wallpapers?.main;
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden relative",
      isDay ? "bg-[#f8f9fa]" : "bg-[#0a0a0c]"
    )}>
      <AnimatePresence>
        {subType === 'intimacy' && !intimateSession && (
          <IntimateEntry 
            characterName={character.name}
            onEnter={(key) => setIntimateSession({ id: key, intimacyLevel: 0.5 })}
            onCancel={() => setSubType('daily')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {subType === 'intimacy' && intimateSession && (
          <IntimatePanel 
            character={character}
            session={intimateSession}
            globalModel={globalModel}
            onExit={() => {
              setIntimateSession(null);
              setSubType('daily');
            }}
            messages={(worldMessages || []).filter(m => m.subType === 'intimacy')}
            onUpdateMessages={(msgs) => {
              const otherMsgs = (worldMessages || []).filter(m => m.subType !== 'intimacy');
              onUpdateWorldMessages([...otherMsgs, ...msgs]);
            }}
            onAddMemory={(m) => {
              // Handle intimate memory storage
              onAddMemory({
                id: m.id,
                characterId: character.id,
                content: m.content,
                type: 'intimate',
                importance: 80,
                timestamp: m.timestamp,
                tags: ['intimate'],
                sourceType: 'world'
              });
            }}
            onAddMessageToMainChat={onAddMessageToMainChat}
          />
        )}
      </AnimatePresence>

      {/* Background Atmosphere / Wallpaper */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {getWallpaper() ? (
            <img 
              src={getWallpaper() || null} 
              className="w-full h-full object-cover opacity-30 blur-sm" 
              alt="background" 
              referrerPolicy="no-referrer"
            />
        ) : (
          <>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-opacity-5 blur-[120px] rounded-full" style={{ backgroundColor: themeColor }} />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-opacity-5 blur-[120px] rounded-full" style={{ backgroundColor: themeColor }} />
          </>
        )}
      </div>

      {/* Header */}
      <header className={cn(
        "h-20 border-b flex items-center justify-between px-8 z-10 backdrop-blur-xl",
        isDay ? "bg-white/80 border-black/5" : "bg-black/40 border-white/5"
      )}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={character.avatar || null} className={cn("w-12 h-12 rounded-2xl object-cover border", isDay ? "border-black/10" : "border-white/10")} alt="" />
            <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2", isDay ? "border-white" : "border-[#0a0a0c]")} style={{ backgroundColor: themeColor }} />
          </div>
          <div>
            <h3 className={cn("text-xl font-bold flex items-center gap-2", isDay ? "text-black" : "text-white")}>
              {character.name} 的世界
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest", isDay ? "bg-black/5 text-black/40" : "bg-white/5 text-white/40")}>World Mode v4.0</span>
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <div className={cn("flex items-center gap-1.5 text-[10px] font-mono", isDay ? "text-black/40" : "text-white/40")}>
                <MapPin className="w-3 h-3" /> {character.worldSetting?.currentLocation || '未知地点'}
              </div>
              <div className={cn("flex items-center gap-1.5 text-[10px] font-mono", isDay ? "text-black/40" : "text-white/40")}>
                {getTimeIcon()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: themeColor }}>
                <Activity className="w-3 h-3 animate-pulse" /> {character.state.survival.status}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTimeline(true)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              isDay ? "bg-black/5 hover:bg-black/10 text-black" : "bg-white/5 hover:bg-white/10 text-white"
            )}
          >
            <Clock className="w-4 h-4" /> 人物时间线
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className={cn(
              "p-2 rounded-xl transition-all",
              isDay ? "bg-black/5 hover:bg-black/10 text-black/40 hover:text-black" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
            )}
            title="世界设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              isDay ? "bg-black/5 hover:bg-black/10 text-black" : "bg-white/5 hover:bg-white/10 text-white"
            )}
          >
            <X className="w-4 h-4" /> 退出世界
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* Sidebar for Characters in World */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarCollapsed ? 0 : 320, opacity: isSidebarCollapsed ? 0 : 1 }}
          className={cn(
            "border-r backdrop-blur-md overflow-hidden relative flex flex-col",
            isDay ? "bg-white/50 border-black/5" : "bg-black/40 border-white/5"
          )}
        >
          <div className="p-6 gap-4 w-80 h-full flex flex-col">
            {/* World Book Section */}
            <div className="flex flex-col flex-1 min-h-0">
              {/* Local World */}
              <div className="space-y-3 flex flex-col h-full">
                <div className={cn("text-[10px] font-mono uppercase px-2 flex justify-between items-center", isDay ? "text-black/30" : "text-white/30")}>
                  <span>{character.name} 的私人世界书</span>
                  <button 
                    onClick={() => setShowLocalWorldManager(true)}
                    className="hover:opacity-80 transition-opacity"
                    style={{ color: themeColor }}
                    title="管理"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
                  {/* Local World Books */}
                  {(character.worldSetting?.books || []).filter(b => (character.worldSetting?.activeBookIds || []).includes(b.id)).map(book => (
                    <div key={`local-${book.id}`} className={cn("rounded-xl p-3 border flex items-center gap-2", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/10")}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      <span className={cn("text-xs font-bold truncate flex-1", isDay ? "text-black" : "text-white")}>{book.name}</span>
                    </div>
                  ))}
                  {(character.worldSetting?.books || []).filter(b => (character.worldSetting?.activeBookIds || []).includes(b.id)).length === 0 && (
                    <div className={cn("text-xs px-2 italic", isDay ? "text-black/20" : "text-white/20")}>未挂载世界书</div>
                  )}
                </div>
              </div>
            </div>

            {/* Characters Section */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className={cn("text-[10px] font-mono uppercase tracking-widest", isDay ? "text-black/20" : "text-white/20")}>挂载角色</h4>
                <button 
                  onClick={() => setShowCharPicker(true)}
                  className={cn("p-1.5 rounded-lg transition-all", isDay ? "bg-black/5 hover:bg-black/10 text-black/40 hover:text-black" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white")}
                  title="挂载角色"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {/* Main Character (Default mounted) */}
                <div className={cn("flex items-center gap-3 p-3 rounded-2xl border group", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
                  <img src={character.avatar || null} className="w-10 h-10 rounded-xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-xs font-bold truncate", isDay ? "text-black" : "text-white")}>{character.name}</div>
                    <div className={cn("text-[10px] truncate", isDay ? "text-black/30" : "text-white/30")}>{character.persona.personalityType}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} title="默认挂载" />
                </div>
                {/* Other Characters */}
                {activeCharacters.filter(c => c.id !== character.id).map(c => (
                  <div 
                    key={c.id} 
                    className={cn("flex items-center gap-3 p-3 rounded-2xl border group", isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}
                  >
                    <img src={c.avatar || null} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-xs font-bold truncate", isDay ? "text-black" : "text-white")}>{c.name}</div>
                      <div className={cn("text-[10px] truncate", isDay ? "text-black/30" : "text-white/30")}>{c.persona.personalityType}</div>
                    </div>
                    <button 
                      onClick={() => setActiveCharIds(prev => prev.filter(id => id !== c.id))}
                      className={cn("p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100", isDay ? "hover:bg-red-500/10 text-black/20 hover:text-red-600" : "hover:bg-red-500/20 text-white/20 hover:text-red-400")}
                      title="取消挂载"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* NPCs Section */}
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className={cn("text-[10px] font-mono uppercase tracking-widest", isDay ? "text-black/20" : "text-white/20")}>挂载 NPC</h4>
                <button 
                  onClick={() => setShowNPCPicker(true)}
                  className={cn("p-1.5 rounded-lg transition-all", isDay ? "bg-black/5 hover:bg-black/10 text-black/40 hover:text-black" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white")}
                  title="挂载 NPC"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {(character.worldSetting?.npcs || []).filter(n => n.isMounted).map(npc => (
                  <div 
                    key={npc.id} 
                    onClick={() => setEditingNPC(npc)}
                    className={cn("flex items-center gap-3 p-3 rounded-2xl border group cursor-pointer transition-all", isDay ? "bg-black/5 border-black/5 hover:bg-black/10" : "bg-white/5 border-white/5 hover:bg-white/10")}
                  >
                    <img src={npc.avatar || null} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className={cn("text-xs font-bold truncate", isDay ? "text-black" : "text-white")}>{npc.name}</div>
                      <div className={cn("text-[10px] truncate", isDay ? "text-black/30" : "text-white/30")}>{npc.persona?.slice(0, 20)}...</div>
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} title="已挂载" />
                  </div>
                ))}
                {(!(character.worldSetting?.npcs || []).some(n => n.isMounted)) && (
                  <div className={cn("text-center py-4 text-[10px] italic", isDay ? "text-black/10" : "text-white/10")}>暂无挂载 NPC</div>
                )}
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 border border-l-0 rounded-r-xl flex items-center justify-center transition-all",
            isDay ? "bg-white/80 border-black/10 text-black/20 hover:text-black hover:bg-white" : "bg-white/5 border-white/10 text-white/20 hover:text-white hover:bg-white/10"
          )}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Main Content - Unified Stream */}
        <main className={cn(
          "flex-1 flex flex-col overflow-hidden relative",
          isDay ? "bg-white/30" : "bg-black/40"
        )}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
            {worldMessages.length === 0 && (
              <div className={cn("h-full flex flex-col items-center justify-center text-center space-y-6", isDay ? "opacity-20" : "opacity-30")}>
                <Sparkles className="w-20 h-20" />
                <div className="space-y-2">
                  <h3 className={cn("text-xl font-bold", isDay ? "text-black" : "text-white")}>欢迎来到 {character.name} 的世界</h3>
                  <p className={cn("text-sm max-w-xs", isDay ? "text-black" : "text-white")}>在这里，你们的每一个瞬间、每一段人生、每一个故事都将被铭记。</p>
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto space-y-8">
              {worldMessages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex-shrink-0 border overflow-hidden",
                    msg.role === 'user' ? "" : (isDay ? "bg-black/5" : "bg-white/5"),
                    isDay ? "border-black/5" : "border-white/10",
                    msg.type === 'plot' && "hidden" // No avatar in story mode
                  )} style={msg.role === 'user' ? { backgroundColor: `${themeColor}33` } : {}}>
                    {msg.role === 'user' ? (
                      character.config.userAvatar ? (
                        <img src={character.config.userAvatar || null} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User className="w-full h-full p-1.5" style={{ color: themeColor }} />
                      )
                    ) : (
                      <img src={msg.speakerAvatar || character.avatar || null} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>

                  {/* Content Bubble */}
                  <div className={cn(
                    "flex flex-col gap-1 min-w-[60px] max-w-[80%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className="flex items-center gap-2 px-1">
                      <span className={cn("text-[10px] font-bold", isDay ? "text-black/40" : "text-white/40")}>
                        {msg.role === 'user' ? (character.config.userNickname || '我') : (msg.speakerName || character.config.characterNickname || character.name)}
                      </span>
                      {character.config.showTimestamps !== false && (
                        <span className={cn("text-[9px] font-mono", isDay ? "text-black/20" : "text-white/20")}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {msg.subType && (
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                          msg.subType === 'intimacy' ? "text-rose-400 bg-rose-400/10" : ""
                        )} style={msg.subType !== 'intimacy' ? { color: themeColor, backgroundColor: `${themeColor}1a` } : {}}>
                          {msg.subType === 'intimacy' ? '亲密' : '日常'}
                        </span>
                      )}
                      {msg.type === 'plot' && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: themeColor, backgroundColor: `${themeColor}1a` }}>
                          故事
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed relative group border transition-all",
                      msg.role === 'user' 
                        ? (isDay ? "rounded-tr-sm" : "rounded-tr-sm")
                        : (isDay ? "bg-white text-black/80 border-black/5 rounded-tl-sm shadow-sm" : "bg-white/5 text-white/90 border border-white/10 rounded-tl-sm"),
                      msg.type === 'plot' && (isDay ? "font-serif text-base leading-loose bg-transparent border-none p-0 text-black/80" : "font-serif text-base leading-loose bg-transparent border-none p-0 text-white/80"),
                      character.config.bubbleStyle === 'glass' && (isDay ? "backdrop-blur-md bg-white/60" : "backdrop-blur-md bg-white/5"),
                      character.config.bubbleStyle === 'minimal' && "bg-transparent border-none px-0",
                      character.config.bubbleStyle === 'cyber' && "rounded-none",
                      character.config.bubbleStyle === 'retro' && (isDay ? "font-mono border-2 border-black/20 rounded-none bg-white" : "font-mono border-2 border-white/20 rounded-none bg-black")
                    )}
                    style={{
                      color: msg.role === 'model' ? character.config.fontColor : (isDay ? '#1a1a1c' : '#f8fafc'),
                      backgroundColor: msg.role === 'user' ? (isDay ? `${themeColor}1a` : `${themeColor}33`) : (character.config.bubbleStyle === 'cyber' ? `${themeColor}0d` : undefined),
                      borderColor: msg.role === 'user' ? `${themeColor}33` : (character.config.bubbleStyle === 'cyber' ? `${themeColor}4d` : undefined),
                    }}>
                      {editingMessageId === msg.id ? (
                        <div className="space-y-3">
                          <textarea 
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className={cn(
                              "w-full border rounded-xl p-3 text-sm outline-none transition-colors",
                              isDay ? "bg-black/5 border-black/10 text-black" : "bg-black/40 border-white/10 text-white"
                            )}
                            style={{ outlineColor: themeColor }}
                            rows={4}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMessageId(null)} className={cn("px-3 py-1 text-xs transition-colors", isDay ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white")}>取消</button>
                            <button onClick={handleSaveEdit} className="px-3 py-1 text-white text-xs font-bold rounded-lg" style={{ backgroundColor: themeColor }}>保存</button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}

                      {/* Action Buttons */}
                      <div className={cn(
                        "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                        msg.role === 'user' ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        <button onClick={() => handleWithdraw(msg.id)} className={cn("p-1.5 rounded-lg transition-all", isDay ? "bg-black/5 hover:bg-red-500/10 hover:text-red-600" : "bg-white/5 hover:bg-red-500/20 hover:text-red-400")} title="撤回">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleStartEdit(msg)} className={cn("p-1.5 rounded-lg transition-all", isDay ? "bg-black/5 hover:bg-black/10" : "bg-white/5 hover:bg-white/10")} style={{ color: themeColor }} title="修改">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {msg.type === 'plot' && msg.role === 'model' && (
                          <button onClick={() => setOptimizingMessageId(msg.id)} className={cn("p-1.5 rounded-lg transition-all", isDay ? "bg-black/5 hover:bg-black/10" : "bg-white/5 hover:bg-white/10")} style={{ color: themeColor }} title="优化故事">
                            <Wand2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optimization Input */}
                    {optimizingMessageId === msg.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 p-4 border rounded-2xl space-y-3"
                        style={{ backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}33` }}
                      >
                        <div className="text-[10px] font-bold uppercase" style={{ color: themeColor }}>故事优化提示</div>
                        <textarea 
                          value={optimizationPrompt}
                          onChange={e => setOptimizationPrompt(e.target.value)}
                          placeholder="输入优化建议，如：增加一些心理描写，或者让语气更温柔一点..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none"
                          style={{ outlineColor: themeColor }}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setOptimizingMessageId(null)} className="px-3 py-1 text-xs text-white/40 hover:text-white">取消</button>
                          <button 
                            onClick={() => handleOptimizePlot(msg)} 
                            disabled={isProcessing}
                            className="px-3 py-1 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                            style={{ backgroundColor: themeColor }}
                          >
                            {isProcessing ? <Activity className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            优化
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

                    {/* Loading Bubble */}
                    {isProcessing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-4",
                          mode === 'encounter' ? "flex-row" : "flex-row"
                        )}
                      >
                        {/* Avatar for Daily Mode */}
                        {mode === 'encounter' && (
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex-shrink-0 border overflow-hidden",
                            isDay ? "bg-black/5 border-black/5" : "bg-white/5 border-white/10"
                          )}>
                            <img src={character.avatar || null} className="w-full h-full object-cover" alt="" />
                          </div>
                        )}

                        <div className={cn(
                          "flex flex-col gap-1 items-start",
                          mode === 'plot' && "ml-0"
                        )}>
                          {mode === 'encounter' && (
                            <div className="flex items-center gap-2 px-1">
                              <span className={cn("text-[10px] font-bold", isDay ? "text-black/40" : "text-white/40")}>
                                {character.config.characterNickname || character.name}
                              </span>
                            </div>
                          )}
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl flex items-center gap-2 border",
                            mode === 'plot' 
                              ? "bg-transparent border-none p-0" 
                              : (isDay ? "bg-white border-black/5 shadow-sm" : "bg-white/5 border-white/10")
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce", isDay ? "bg-black/20" : "bg-white/40")} />
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]", isDay ? "bg-black/20" : "bg-white/40")} />
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]", isDay ? "bg-black/20" : "bg-white/40")} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-8 pt-0">
                  <div className="max-w-4xl mx-auto relative">
                    <div className={cn(
                      "rounded-2xl border p-2 flex items-center gap-2 transition-all shadow-2xl focus-within:ring-1",
                      isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
                    )} style={{ '--tw-ring-color': themeColor } as any}>
                      <div className="relative">
                        <button 
                          onClick={() => setShowPlusMenu(!showPlusMenu)}
                          className={cn(
                            "p-3 rounded-xl transition-all",
                            showPlusMenu 
                              ? "text-white" 
                              : (isDay ? "text-black/30 hover:bg-black/5" : "text-white/30 hover:bg-white/5")
                          )}
                          style={showPlusMenu ? { backgroundColor: themeColor } : {}}
                        >
                          {mode === 'plot' ? (
                            <Wand2 className="w-5 h-5" style={{ color: themeColor }} />
                          ) : subType === 'intimacy' ? (
                            <Heart className="w-5 h-5" style={{ color: themeColor }} />
                          ) : subType === 'daily' ? (
                            <Coffee className="w-5 h-5" style={{ color: themeColor }} />
                          ) : (
                            <Plus className={cn("w-5 h-5 transition-transform", showPlusMenu && "rotate-45")} />
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {showPlusMenu && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowPlusMenu(false)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className={cn(
                                  "absolute bottom-full left-0 mb-4 w-48 border rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl",
                                  isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
                                )}
                              >
                                <div className="space-y-1">
                                  {[
                                    { id: 'daily', label: '日常模式', icon: Coffee, color: 'text-blue-400', mode: 'encounter' },
                                    { id: 'intimacy', label: '亲密模式', icon: Heart, color: 'text-rose-400', mode: 'encounter' },
                                    { id: 'plot', label: '故事模式', icon: Wand2, color: 'text-purple-400', mode: 'plot' }
                                  ].map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => {
                                        setMode(item.mode as any);
                                        if (item.mode === 'encounter') setSubType(item.id as any);
                                        setShowPlusMenu(false);
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                                        (mode === item.mode && (item.mode === 'plot' || subType === item.id))
                                          ? (isDay ? "bg-black/5 text-black" : "bg-white/10 text-white") 
                                          : (isDay ? "text-black/40 hover:bg-black/5 hover:text-black" : "text-white/40 hover:bg-white/5 hover:text-white")
                                      )}
                                    >
                                      <item.icon className={cn("w-4 h-4", item.color)} />
                                      <span className="text-xs font-bold">{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      <textarea 
                        rows={1}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={
                          mode === 'encounter' 
                            ? (subType === 'intimacy' ? "此刻，你想对她做些什么亲密的事？" : "和她聊聊日常，或者一起做点什么...") 
                            : "输入故事提示，开启一段金手指推演..."
                        }
                        className={cn(
                          "flex-1 bg-transparent border-none outline-none px-4 py-3 resize-none custom-scrollbar min-h-[48px] max-h-32",
                          isDay ? "text-black placeholder:text-black/20" : "text-white placeholder:text-white/20"
                        )}
                      />

                      <button 
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isProcessing}
                        className={cn(
                          "p-3 rounded-xl transition-all",
                          userInput.trim() && !isProcessing 
                            ? "text-white shadow-lg" 
                            : (isDay ? "bg-black/5 text-black/20" : "bg-white/5 text-white/20")
                        )}
                        style={userInput.trim() && !isProcessing ? { backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33, 0 4px 6px -4px ${themeColor}33` } : {}}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </main>
      </div>

      {/* NPC Editing Modal */}
      <AnimatePresence>
        {editingNPC && (
          <NPCEditor
            npc={editingNPC}
            displaySettings={displaySettings}
            availableBooks={[...(world.books || []), ...(character.worldSetting?.books || [])]}
            onSave={(updatedNPC) => {
              const existingNPCs = character.worldSetting?.npcs || [];
              const exists = existingNPCs.find(n => n.id === updatedNPC.id);
              const updatedNPCs = exists 
                ? existingNPCs.map(n => n.id === updatedNPC.id ? updatedNPC : n)
                : [...existingNPCs, updatedNPC];

              onUpdateCharacter({
                ...character,
                worldSetting: { ...character.worldSetting!, npcs: updatedNPCs }
              });
              setEditingNPC(null);
            }}
            onDelete={(npcId) => {
              const updatedNPCs = (character.worldSetting?.npcs || []).filter(n => n.id !== npcId);
              onUpdateCharacter({
                ...character,
                worldSetting: { ...character.worldSetting!, npcs: updatedNPCs }
              });
              setEditingNPC(null);
            }}
            onClose={() => setEditingNPC(null)}
          />
        )}
      </AnimatePresence>

      {/* World Book Manager Modal */}
      <AnimatePresence>
        {showBookPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBookPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1a1a1c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold">世界书管理</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div 
                        onClick={() => onUpdateCharacter({
                          ...character,
                          config: { ...character.config, persistMessages: character.config.persistMessages === false ? true : false }
                        })}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative",
                          character.config.persistMessages !== false ? "" : "bg-white/10"
                        )}
                        style={character.config.persistMessages !== false ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                          character.config.persistMessages !== false ? "left-4.5" : "left-0.5"
                        )} />
                      </div>
                      <span className="text-[10px] text-white/40 group-hover:text-white transition-colors">保留世界消息至主聊天框</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div 
                        onClick={() => onUpdateCharacter({
                          ...character,
                          config: { ...character.config, separateIntimateMemories: !character.config.separateIntimateMemories }
                        })}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative",
                          character.config.separateIntimateMemories ? "" : "bg-white/10"
                        )}
                        style={character.config.separateIntimateMemories ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                          character.config.separateIntimateMemories ? "left-4.5" : "left-0.5"
                        )} />
                      </div>
                      <span className="text-[10px] text-white/40 group-hover:text-white transition-colors">亲密记忆单独保存</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setNewBook({ name: '', content: '', injectionPosition: 'front', tags: '' });
                      setShowCreateBookModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Plus className="w-3.5 h-3.5" /> 新建
                  </button>
                  <button onClick={() => setShowBookPicker(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                {Array.from(new Set((character.worldSetting?.books || []).flatMap(b => b.tags || []))).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedBookTag(null)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        selectedBookTag === null ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      全部
                    </button>
                    {Array.from(new Set((character.worldSetting?.books || []).flatMap(b => b.tags || []))).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedBookTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          selectedBookTag === tag ? "text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                        )}
                        style={selectedBookTag === tag ? { backgroundColor: themeColor } : {}}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                {(character.worldSetting?.books || []).length === 0 ? (
                  <div className="text-center py-12 text-white/20 italic">暂无世界书，请点击右上角新建</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(character.worldSetting?.books || []).filter(b => selectedBookTag ? b.tags?.includes(selectedBookTag) : true).map(book => {
                      const isActive = character.worldSetting?.activeBookIds?.includes(book.id);
                      return (
                        <div 
                          key={book.id}
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex flex-col gap-3",
                            isActive ? "border" : "bg-white/5 border-white/10"
                          )}
                          style={isActive ? { backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}4d` } : {}}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{book.name}</span>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                  book.injectionPosition === 'front' ? "" :
                                  book.injectionPosition === 'middle' ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-red-500/20 text-red-400"
                                )}
                                style={book.injectionPosition === 'front' ? { color: themeColor, backgroundColor: `${themeColor}33` } : {}}>
                                  {book.injectionPosition === 'front' ? '前置 (基础)' : book.injectionPosition === 'middle' ? '中置 (情境)' : '后置 (指令)'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {book.tags?.map(tag => (
                                  <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-white/10 rounded text-white/40">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newIds = isActive 
                                    ? (character.worldSetting?.activeBookIds || []).filter(id => id !== book.id)
                                    : [...(character.worldSetting?.activeBookIds || []), book.id];
                                  
                                  onUpdateCharacter({
                                    ...character,
                                    worldSetting: { ...character.worldSetting!, activeBookIds: newIds }
                                  });
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                  isActive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "hover:bg-opacity-30"
                                )}
                                style={!isActive ? { color: themeColor, backgroundColor: `${themeColor}33` } : {}}
                              >
                                {isActive ? '取消挂载' : '挂载'}
                              </button>
                              <button
                                onClick={() => {
                                  const newBooks = character.worldSetting?.books.filter(b => b.id !== book.id);
                                  const newActiveIds = (character.worldSetting?.activeBookIds || []).filter(id => id !== book.id);
                                  onUpdateCharacter({
                                    ...character,
                                    worldSetting: { ...character.worldSetting!, books: newBooks!, activeBookIds: newActiveIds }
                                  });
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/20 hover:text-red-400 transition-all"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-3 bg-black/20 p-3 rounded-xl font-mono">{book.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create World Book Modal */}
      <AnimatePresence>
        {showCreateBookModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateBookModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold">新建世界书</h3>
                <button onClick={() => setShowCreateBookModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 uppercase font-mono">标题</label>
                  <input 
                    value={newBook.name}
                    onChange={e => setNewBook({...newBook, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ outlineColor: themeColor }}
                    placeholder="例如: 现代都市设定集"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 uppercase font-mono">内容</label>
                  <textarea 
                    value={newBook.content}
                    onChange={e => setNewBook({...newBook, content: e.target.value})}
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none resize-none custom-scrollbar"
                    style={{ outlineColor: themeColor }}
                    placeholder="输入世界书的具体内容..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 uppercase font-mono">注入位置</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'front', label: '前置 (基础)', desc: '环境与关系设定' },
                      { id: 'middle', label: '中置 (情境)', desc: '具体故事与细节' },
                      { id: 'back', label: '后置 (指令)', desc: '核心互动指令' }
                    ].map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => setNewBook({...newBook, injectionPosition: pos.id as any})}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          newBook.injectionPosition === pos.id 
                            ? "border" 
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60"
                        )}
                        style={newBook.injectionPosition === pos.id ? { color: themeColor, backgroundColor: `${themeColor}33`, borderColor: themeColor } : {}}
                      >
                        <div className="text-xs font-bold">{pos.label}</div>
                        <div className="text-[8px] opacity-60 mt-1">{pos.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/30 uppercase font-mono">分类标签 (逗号分隔)</label>
                  <input 
                    value={newBook.tags}
                    onChange={e => setNewBook({...newBook, tags: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ outlineColor: themeColor }}
                    placeholder="例如: 现代, 社交, 规则"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (!newBook.name || !newBook.content) return;
                    const book: WorldBook = {
                      id: `wb-${Date.now()}`,
                      name: newBook.name,
                      content: newBook.content,
                      injectionPosition: newBook.injectionPosition,
                      tags: newBook.tags.split(/[,，]/).map(t => t.trim()).filter(t => t)
                    };
                    
                    onUpdateCharacter({
                      ...character,
                      worldSetting: { 
                        ...character.worldSetting!, 
                        books: [...(character.worldSetting?.books || []), book] 
                      }
                    });
                    setShowCreateBookModal(false);
                    setNewBook({ name: '', content: '', injectionPosition: 'front', tags: '' });
                  }}
                  className="w-full py-3 text-white font-bold rounded-xl transition-colors mt-4"
                  style={{ backgroundColor: themeColor }}
                >
                  创建世界书
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NPC Picker Modal */}
      <AnimatePresence>
        {showNPCPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNPCPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#1a1a1c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold">挂载 NPC</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const newNPC: NPC = {
                        id: `npc-${Date.now()}`,
                        name: '',
                        relation: '',
                        persona: '',
                        avatar: `https://picsum.photos/seed/${Date.now()}/100`,
                        voiceEnabled: false,
                        bookIds: [],
                        memoryConfig: { retrievalRounds: 10 },
                        memories: [],
                        isMounted: true,
                        currentLocation: character.worldSetting?.currentLocation || world.currentLocation
                      };
                      setEditingNPC(newNPC);
                      setShowNPCPicker(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1"
                    style={{ backgroundColor: themeColor }}
                  >
                    <Plus className="w-3.5 h-3.5" /> 新建 NPC
                  </button>
                  <button onClick={() => setShowNPCPicker(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                {(character.worldSetting?.npcs || []).map(npc => (
                  <div 
                    key={npc.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <img src={npc.avatar || null} className="w-10 h-10 rounded-xl object-cover" alt="" />
                      <div>
                        <div className="font-bold text-sm">{npc.name}</div>
                        <div className="text-[10px] text-white/40 truncate max-w-[200px]">{npc.persona}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const isMounting = !npc.isMounted;
                        const updatedNPCs = (character.worldSetting?.npcs || []).map(n => 
                          n.id === npc.id 
                            ? { 
                                ...n, 
                                isMounted: isMounting,
                                currentLocation: isMounting ? (character.worldSetting?.currentLocation || world.currentLocation) : n.currentLocation
                              } 
                            : n
                        );
                        onUpdateCharacter({
                          ...character,
                          worldSetting: { ...character.worldSetting!, npcs: updatedNPCs }
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        npc.isMounted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "hover:bg-opacity-30"
                      )}
                      style={!npc.isMounted ? { color: themeColor, backgroundColor: `${themeColor}33` } : {}}
                    >
                      {npc.isMounted ? '取消挂载' : '挂载'}
                    </button>
                  </div>
                ))}
                {(!(character.worldSetting?.npcs || []).length) && (
                  <div className="text-center py-8 text-white/20 text-sm">暂无 NPC，请在设置中添加</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* World Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1a1a1c] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}1a` }}>
                    <Settings className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">世界与角色配置</h3>
                    <p className="text-xs text-white/40 mt-1">调整 {character.name} 在这个世界中的行为逻辑</p>
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Summary Settings */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> 聊天与记忆设置
                  </h4>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/30 uppercase font-mono">连接轮数</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="number"
                        value={character.config.summaryInterval || 10}
                        onChange={e => onUpdateCharacter({
                          ...character,
                          config: { ...character.config, summaryInterval: parseInt(e.target.value) }
                        })}
                        className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ outlineColor: themeColor }}
                      />
                      <p className="text-[10px] text-white/20 italic flex-1">每隔多少轮连接，AI将自动总结并存入长期记忆。</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">保留世界消息至主聊天框</div>
                        <div className="text-[10px] text-white/30 mt-1">开启后，在世界模式发送和接收的消息将同步到主界面的聊天记录中</div>
                      </div>
                      <button 
                        onClick={() => {
                          const newPersist = character.config.persistMessages === false ? true : false;
                          onUpdateCharacter({
                            ...character,
                            config: { 
                              ...character.config, 
                              persistMessages: newPersist
                            }
                          });
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          character.config.persistMessages !== false ? "" : "bg-white/10"
                        )}
                        style={character.config.persistMessages !== false ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          character.config.persistMessages !== false ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Background Life Settings */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4" /> 后台生活记录
                  </h4>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">后台生活</div>
                        <div className="text-[10px] text-white/30 mt-1">开启后，角色将在您不在时自主生活并记录日志</div>
                      </div>
                      <button 
                        onClick={() => {
                          const newActive = !character.config.backgroundActive;
                          onUpdateCharacter({
                            ...character,
                            config: { 
                              ...character.config, 
                              backgroundActive: newActive,
                              consciousnessInterval: (newActive && !character.config.consciousnessInterval) 
                                ? '15m' 
                                : character.config.consciousnessInterval
                            }
                          });
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          character.config.backgroundActive ? "" : "bg-white/10"
                        )}
                        style={character.config.backgroundActive ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          character.config.backgroundActive ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    {character.config.backgroundActive && (
                      <div className="space-y-3">
                        <label className="text-[10px] text-white/30 uppercase font-mono">记录频率</label>
                        <div className="flex gap-2">
                          {(['30s', '5m', '15m', '30m', '1h'] as const).map(interval => (
                            <button
                              key={interval}
                              onClick={() => onUpdateCharacter({
                                ...character,
                                config: { ...character.config, consciousnessInterval: interval }
                              })}
                              className={cn(
                                "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border",
                                character.config.consciousnessInterval === interval 
                                  ? "border" 
                                  : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                              )}
                              style={character.config.consciousnessInterval === interval ? { color: themeColor, backgroundColor: `${themeColor}33`, borderColor: themeColor } : {}}
                            >
                              {interval === '30s' ? '高频' : interval === '5m' ? '中高' : interval === '15m' ? '中频' : interval === '30m' ? '中低' : '低频'}
                              <span className="block opacity-40 font-normal">{interval}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Voice Configuration */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> 语音输出配置
                  </h4>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">语音回应</div>
                        <div className="text-[10px] text-white/30 mt-1">开启后，角色将使用语音进行回应</div>
                      </div>
                      <button 
                        onClick={() => onUpdateCharacter({
                          ...character,
                          config: { ...character.config, voice: { ...character.config.voice, enabled: !character.config.voice.enabled } }
                        })}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          character.config.voice.enabled ? "" : "bg-white/10"
                        )}
                        style={character.config.voice.enabled ? { backgroundColor: themeColor } : {}}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          character.config.voice.enabled ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    {character.config.voice.enabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-mono">提供商</label>
                          <select 
                            value={character.config.voice.provider}
                            onChange={e => onUpdateCharacter({
                              ...character,
                              config: { ...character.config, voice: { ...character.config.voice, provider: e.target.value as any } }
                            })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                            style={{ outlineColor: themeColor }}
                          >
                            <option value="gemini">Gemini TTS</option>
                            <option value="elevenlabs">ElevenLabs</option>
                            <option value="minimax">MiniMax</option>
                            <option value="openai">OpenAI TTS</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-mono">API 端点 (可选)</label>
                          <input 
                            type="text"
                            value={character.config.voice.endpoint || ''}
                            onChange={e => onUpdateCharacter({
                              ...character,
                              config: { ...character.config, voice: { ...character.config.voice, endpoint: e.target.value } }
                            })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                            style={{ outlineColor: themeColor }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-mono">音色 ID</label>
                          <input 
                            type="text"
                            value={character.config.voice.voiceId}
                            onChange={e => onUpdateCharacter({
                              ...character,
                              config: { ...character.config, voice: { ...character.config.voice, voiceId: e.target.value } }
                            })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                            style={{ outlineColor: themeColor }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase font-mono">API Key</label>
                          <input 
                            type="password"
                            value={character.config.voice.apiKey || ''}
                            onChange={e => onUpdateCharacter({
                              ...character,
                              config: { ...character.config, voice: { ...character.config.voice, apiKey: e.target.value } }
                            })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                            style={{ outlineColor: themeColor }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Wallpaper Configuration */}
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 壁纸设置 (高清)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'main', label: '主界面' },
                      { key: 'daily', label: '日常模式' },
                      { key: 'story', label: '故事模式' }
                    ].map(wp => (
                      <div key={wp.key} className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase font-mono">{wp.label}</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="图片 URL"
                            value={(character.config.wallpapers as any)?.[wp.key] || ''}
                            onChange={e => onUpdateCharacter({
                              ...character,
                              config: { 
                                ...character.config, 
                                wallpapers: { ...character.config.wallpapers, [wp.key]: e.target.value } 
                              }
                            })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none"
                            style={{ outlineColor: themeColor }}
                          />
                          <label className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors shrink-0">
                            <Upload className="w-4 h-4 text-white/40" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    onUpdateCharacter({
                                      ...character,
                                      config: { 
                                        ...character.config, 
                                        wallpapers: { ...character.config.wallpapers, [wp.key]: reader.result as string } 
                                      }
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-8 bg-black/20 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-3 text-white font-bold rounded-2xl transition-all shadow-lg"
                  style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33, 0 4px 6px -4px ${themeColor}33` }}
                >
                  完成设置
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timeline Modal */}
      <AnimatePresence>
        {showTimeline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTimeline(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl border rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]",
                isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <div className={cn("p-8 border-b flex items-center justify-between", isDay ? "border-black/5" : "border-white/5")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}1a` }}>
                    <Clock className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", isDay ? "text-black" : "text-white")}>人物时间线</h3>
                    <p className={cn("text-xs mt-1", isDay ? "text-black/40" : "text-white/40")}>记录 {character.name} 的成长与关键时刻</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={isConsolidating}
                    onClick={async () => {
                      setIsConsolidating(true);
                      try {
                        const { MemoryService } = await import('../services/memoryService');
                        const entries = (diary || []).filter(d => d.characterId === character.id && (d.type === 'LIFE' || d.type === 'BEHAVIOR'));
                        const newMemories = await MemoryService.getInstance().consolidateTimeline(character, entries, globalModel);
                        if (newMemories.length > 0) {
                          newMemories.forEach(m => onAddMemory(m));
                          alert(`成功整理 ${newMemories.length} 条记忆进入记忆库`);
                        } else {
                          alert('没有发现值得进入记忆库的重要信息');
                        }
                      } catch (e) {
                        console.error(e);
                        alert('整理失败');
                      } finally {
                        setIsConsolidating(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      isDay ? "hover:bg-opacity-20" : "hover:bg-opacity-20",
                      isConsolidating && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ color: themeColor, backgroundColor: `${themeColor}1a` }}
                  >
                    <Wand2 className={cn("w-3.5 h-3.5", isConsolidating && "animate-spin")} />
                    {isConsolidating ? '整理中...' : '整理并进入记忆库'}
                  </button>
                  <button onClick={() => setShowTimeline(false)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-black/5 text-black/40" : "hover:bg-white/5 text-white/40")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                {/* Behavior Summary Section - Highly Prominent */}
                <section className="space-y-6">
                  <div className={cn("flex items-center justify-between p-4 rounded-2xl border", isDay ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-500/5 border-amber-500/10")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDay ? "bg-amber-500/20" : "bg-amber-500/20")}>
                        <Sparkles className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className={cn("text-sm font-bold uppercase tracking-wider", isDay ? "text-amber-600" : "text-amber-400")}>行为总结专区</h4>
                        <p className={cn("text-[10px] mt-0.5", isDay ? "text-amber-600/60" : "text-amber-400/40")}>基于后台生活记录分析角色行为深度</p>
                      </div>
                    </div>
                    <button 
                      disabled={isGeneratingSummary}
                      onClick={async () => {
                        setIsGeneratingSummary(true);
                        try {
                          const { MemoryService } = await import('../services/memoryService');
                          const lifeEntries = (diary || []).filter(d => d.characterId === character.id && d.type === 'LIFE');
                          const summary = await MemoryService.getInstance().generateBehaviorSummaryFromTimeline(character, lifeEntries, globalModel);
                          if (summary) {
                            onAddDiaryEntry(summary);
                            alert('行为总结生成成功');
                          } else {
                            alert('生成失败，请确保有足够的生活记录');
                          }
                        } catch (e) {
                          console.error(e);
                          alert('生成失败');
                        } finally {
                          setIsGeneratingSummary(false);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg",
                        isDay ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/10" : "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20",
                        isGeneratingSummary && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Sparkles className={cn("w-3.5 h-3.5", isGeneratingSummary && "animate-spin")} />
                      {isGeneratingSummary ? '生成中...' : '生成总结'}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {(diary || []).filter(d => d.type === 'BEHAVIOR').slice().reverse().map((log) => (
                      <div key={log.id} className={cn(
                        "p-5 rounded-2xl border text-sm italic relative group shadow-xl",
                        isDay ? "bg-black/5 border-black/5 text-amber-900/80" : "bg-[#252528] border border-white/5 text-amber-200/80"
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn("text-[9px] font-mono", isDay ? "text-black/20" : "text-white/20")}>{new Date(log.timestamp).toLocaleString()}</div>
                          <div className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest", isDay ? "bg-amber-500/10 text-amber-600" : "bg-amber-500/10 text-amber-400")}>Behavior Analysis</div>
                        </div>
                        {log.metadata ? (
                          <div className="space-y-3">
                            {log.metadata.behaviorObservation && (
                              <div className="flex gap-2">
                                <div className={cn("font-bold shrink-0", isDay ? "text-amber-600/60" : "text-amber-500/40")}>观察:</div>
                                <div className="leading-relaxed">{log.metadata.behaviorObservation}</div>
                              </div>
                            )}
                            {log.metadata.behaviorDepth && (
                              <div className="flex gap-2">
                                <div className={cn("font-bold shrink-0", isDay ? "text-amber-600/60" : "text-amber-500/40")}>深度:</div>
                                <div className="leading-relaxed">{log.metadata.behaviorDepth}</div>
                              </div>
                            )}
                          </div>
                        ) : log.content}
                      </div>
                    ))}
                    {(diary || []).filter(d => d.type === 'BEHAVIOR').length === 0 && (
                      <div className={cn("text-center py-10 rounded-3xl border border-dashed text-xs italic", isDay ? "bg-black/5 border-black/10 text-black/20" : "bg-white/5 border-white/5 text-white/20")}>
                        尚无行为总结记录，请点击上方按钮生成
                      </div>
                    )}
                  </div>
                </section>

                <div className={cn("h-px", isDay ? "bg-black/5" : "bg-white/5")} />

                {/* Life Footprints Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${themeColor}1a` }}>
                      <Activity className="w-4 h-4" style={{ color: themeColor }} />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: themeColor }}>生活足迹 (后台记录)</h4>
                  </div>
                  
                  <div className="space-y-6 relative">
                    <div className={cn("absolute left-[11px] top-2 bottom-2 w-px", isDay ? "bg-black/5" : "bg-white/5")} />
                    {(diary || []).filter(d => d.type === 'LIFE').slice().reverse().map((log) => (
                      <div key={log.id} className="relative pl-10 pb-8 last:pb-0">
                        <div className={cn("absolute left-0 top-1 w-[23px] h-[23px] rounded-full border flex items-center justify-center z-10", isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10")}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                        </div>
                        <div className={cn("text-[10px] font-mono mb-2", isDay ? "text-black/20" : "text-white/20")}>{new Date(log.timestamp).toLocaleString()}</div>
                        <div className={cn("p-5 rounded-2xl border text-sm italic leading-relaxed", isDay ? "bg-black/5 border-black/5 text-black/80" : "bg-white/5 border-white/5 text-white/80")}>
                          {log.content}
                        </div>
                      </div>
                    ))}
                    {(diary || []).filter(d => d.type === 'LIFE').length === 0 && (
                      <div className={cn("text-center py-12 italic text-xs", isDay ? "text-black/20" : "text-white/20")}>尚无生活足迹记录</div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Character Picker Modal */}
      <AnimatePresence>
        {showCharPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCharPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-md border rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]",
                isDay ? "bg-white border-black/10" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <div className={cn("p-8 border-b flex items-center justify-between", isDay ? "border-black/5" : "border-white/5")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}1a` }}>
                    <Users className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", isDay ? "text-black" : "text-white")}>邀请人物</h3>
                    <p className={cn("text-xs mt-1", isDay ? "text-black/40" : "text-white/40")}>选择加入当前世界的角色</p>
                  </div>
                </div>
                <button onClick={() => setShowCharPicker(false)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-black/5 text-black/40" : "hover:bg-white/5 text-white/40")}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {(allCharacters || []).filter(c => !(activeCharIds || []).includes(c.id)).map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCharIds(prev => [...prev, c.id]);
                      setShowCharPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                      isDay ? "bg-black/5 hover:bg-black/10 border-black/5" : "bg-white/5 hover:bg-white/10 border-white/5"
                    )}
                  >
                    <img src={c.avatar || null} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div>
                      <div className={cn("text-sm font-bold", isDay ? "text-black" : "text-white")}>{c.name}</div>
                      <div className={cn("text-xs", isDay ? "text-black/30" : "text-white/30")}>{c.persona.personalityType}</div>
                    </div>
                  </button>
                ))}
                {(allCharacters || []).filter(c => !(activeCharIds || []).includes(c.id)).length === 0 && (
                  <div className={cn("text-center py-12 italic", isDay ? "text-black/20" : "text-white/20")}>没有更多可邀请的人物</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {showGlobalWorldManager && (
          <WorldSettingEditor
            title="全局世界设定"
            world={world}
            displaySettings={displaySettings}
            onSave={(updatedWorld) => {
              onUpdateWorld(updatedWorld);
              setShowGlobalWorldManager(false);
            }}
            onClose={() => setShowGlobalWorldManager(false)}
          />
        )}

        {showLocalWorldManager && character.worldSetting && (
          <WorldSettingEditor
            title={`${character.name} 的私人世界`}
            world={character.worldSetting}
            displaySettings={displaySettings}
            onSave={(updatedWorld) => {
              onUpdateCharacter({
                ...character,
                worldSetting: updatedWorld
              });
              setShowLocalWorldManager(false);
            }}
            onClose={() => setShowLocalWorldManager(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
