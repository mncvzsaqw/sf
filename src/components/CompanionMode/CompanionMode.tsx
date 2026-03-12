import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Settings, 
  Plus, 
  Music, 
  MessageSquare, 
  Volume2, 
  Bell, 
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Target,
  History,
  Trash2,
  Edit2,
  Save,
  Check,
  X,
  Image as ImageIcon,
  Video,
  Mic,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  AlertCircle,
  Upload,
  Calendar,
  Flame
} from 'lucide-react';
import { Character, CompanionSession, CompanionTimelineEvent, InteractionMode, CompanionTask, CompanionGoal, GlobalModelConfig, Message, DisplaySettings } from '../../types';
import { generateCompanionEncouragement } from '../../services/companionAI';
import { speak } from '../../services/voice';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompanionModeProps {
  character: Character;
  globalModel: GlobalModelConfig;
  onAddMessageToMainChat?: (msg: Message) => void;
  displaySettings: DisplaySettings;
  onExit: () => void;
}

export function CompanionMode({ character, globalModel, onAddMessageToMainChat, displaySettings, onExit }: CompanionModeProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;

  const [sessions, setSessions] = useState<CompanionSession[]>([
    {
      id: 'default-1',
      characterId: character.id,
      name: '深度专注',
      description: '经典的番茄钟，适合沉浸式学习或工作',
      mode: 'pomodoro',
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      cycles: 4,
      status: 'idle',
      completedCycles: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'default-2',
      characterId: character.id,
      name: '轻量阅读',
      description: '短时间专注，适合阅读或整理',
      mode: 'pomodoro',
      workDuration: 15,
      breakDuration: 3,
      longBreakDuration: 10,
      cycles: 3,
      status: 'idle',
      completedCycles: 0,
      createdAt: new Date().toISOString()
    }
  ]);

  const [activeSession, setActiveSession] = useState<CompanionSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentState, setCurrentState] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const [showGoalDetail, setShowGoalDetail] = useState(false);
  
  // New Plan State
  const [newPlan, setNewPlan] = useState<{
    name: string;
    type: 'normal' | 'habit' | 'goal';
    workDuration: number;
    breakDuration: number;
    cycles: number;
    todoItems: string[];
    deadline: string;
    targetMinutes: number;
  }>({
    name: '',
    type: 'normal',
    workDuration: 25,
    breakDuration: 5,
    cycles: 4,
    todoItems: [],
    deadline: '',
    targetMinutes: 0
  });

  // Calculate Progress based on habit and normal sessions
  const habitAndNormalSessions = sessions.filter(s => s.type === 'habit' || s.type === 'normal');
  const completedSessions = habitAndNormalSessions.filter(s => {
    if (s.type === 'habit') {
      return s.todoItems?.length && s.todoItems.every(t => t.completed);
    }
    return s.completedCycles && s.completedCycles >= s.cycles;
  });
  const completedTasks = completedSessions.length;
  const totalTasks = habitAndNormalSessions.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const [goal, setGoal] = useState<CompanionGoal>({
    id: 'goal-1',
    characterId: character.id,
    dailyTargetMinutes: 120,
    currentStreak: 0,
    totalFocusedMinutes: 0,
    lastActiveDate: new Date().toISOString(),
    completedDates: []
  });

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    setGoal(prev => {
      const completedDates = prev.completedDates || [];
      let newCompletedDates = [...completedDates];
      let shouldUpdate = false;

      if (taskProgress === 100 && totalTasks > 0) {
        if (!completedDates.includes(todayStr)) {
          newCompletedDates.push(todayStr);
          shouldUpdate = true;
        }
      } else {
        if (completedDates.includes(todayStr)) {
          newCompletedDates = completedDates.filter(d => d !== todayStr);
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        // Calculate streak
        let streak = 0;
        let currentDate = new Date();
        // If today is not completed, start checking from yesterday
        if (!newCompletedDates.includes(todayStr)) {
          currentDate.setDate(currentDate.getDate() - 1);
        }
        
        while (true) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (newCompletedDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        return {
          ...prev,
          completedDates: newCompletedDates,
          currentStreak: streak,
          lastActiveDate: new Date().toISOString()
        };
      }
      return prev;
    });
  }, [taskProgress, totalTasks]);

  // Settings
  const [config, setConfig] = useState({
    autoStartNext: true,
    showNotifications: true,
    playSounds: true,
    voiceEnabled: true,
    speechFrequency: 5, // minutes
    imageRotationInterval: 30, // seconds
    bgMusic: 'none',
    customPrompt: '',
    loopEnabled: false,
    wallpapers: [character.avatar]
  });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [encouragement, setEncouragement] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (session: CompanionSession) => {
    setActiveSession(session);
    setTimeLeft(session.workDuration * 60);
    setCurrentState('work');
    setCurrentCycle(0);
    setIsRunning(true);
    setEncouragement('');
    setIsTimerMinimized(false); // Auto expand on start
    
    if (config.showNotifications && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleAddPlan = () => {
    if (!newPlan.name.trim()) return;
    const session: CompanionSession = {
      id: crypto.randomUUID(),
      characterId: character.id,
      name: newPlan.name,
      description: newPlan.type === 'normal' ? `普通专注计划: ${newPlan.workDuration}分钟专注` : 
                   newPlan.type === 'habit' ? `养习惯: 每日专注` : 
                   `定目标: 目标${newPlan.targetMinutes}分钟`,
      mode: 'pomodoro',
      type: newPlan.type,
      workDuration: newPlan.workDuration,
      breakDuration: newPlan.breakDuration,
      longBreakDuration: newPlan.breakDuration * 3,
      cycles: newPlan.cycles,
      status: 'idle',
      completedCycles: 0,
      createdAt: new Date().toISOString(),
      todoItems: newPlan.type === 'habit' ? newPlan.todoItems.map(t => ({ id: crypto.randomUUID(), text: t, completed: false })) : undefined,
      deadline: newPlan.type === 'goal' ? newPlan.deadline : undefined,
      targetMinutes: newPlan.type === 'goal' ? newPlan.targetMinutes : undefined,
      accumulatedMinutes: newPlan.type === 'goal' ? 0 : undefined
    };
    setSessions([...sessions, session]);
    setShowAddSession(false);
    setNewPlan({ name: '', type: 'normal', workDuration: 25, breakDuration: 5, cycles: 4, todoItems: [], deadline: '', targetMinutes: 0 });
  };

  const handleTimerEnd = async () => {
    if (!activeSession) return;

    if (currentState === 'work') {
      const nextCycle = currentCycle + 1;
      setCurrentCycle(nextCycle);
      
      // Update session progress
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            completedCycles: (s.completedCycles || 0) + 1,
            accumulatedMinutes: (s.accumulatedMinutes || 0) + activeSession.workDuration
          };
        }
        return s;
      }));
      
      // Update goal
      setGoal(prev => ({
        ...prev,
        totalFocusedMinutes: prev.totalFocusedMinutes + activeSession.workDuration
      }));

      if (nextCycle % activeSession.cycles === 0) {
        setCurrentState('long_break');
        setTimeLeft(activeSession.longBreakDuration * 60);
      } else {
        setCurrentState('short_break');
        setTimeLeft(activeSession.breakDuration * 60);
      }
      
      if (config.showNotifications) {
        new Notification('专注结束', { body: '该休息一下了', icon: character.avatar });
      }
    } else {
      if (config.loopEnabled || currentCycle < activeSession.cycles * 2) {
        setCurrentState('work');
        setTimeLeft(activeSession.workDuration * 60);
        if (config.showNotifications) {
          new Notification('休息结束', { body: '开始新一轮专注吧', icon: character.avatar });
        }
      } else {
        setIsRunning(false);
        setActiveSession(null);
      }
    }

    const msg = await generateCompanionEncouragement(character, currentState, "阶段转换", config.customPrompt, globalModel);
    setEncouragement(msg);
    if (onAddMessageToMainChat) {
      onAddMessageToMainChat({
        id: crypto.randomUUID(),
        role: 'model',
        content: msg,
        timestamp: new Date().toISOString(),
        mode: InteractionMode.COMPANION,
        subType: 'companion'
      });
    }
    if (config.voiceEnabled && character.config.voice.enabled) {
      speak(msg, character.config.voice);
    }
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        
        const totalElapsed = (activeSession?.workDuration || 0) * 60 - timeLeft;
        if (totalElapsed > 0 && totalElapsed % (config.speechFrequency * 60) === 0) {
           triggerPeriodicSpeech();
        }

        if (totalElapsed > 0 && totalElapsed % config.imageRotationInterval === 0) {
           rotateImage();
        }

      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerEnd();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const triggerPeriodicSpeech = async () => {
    const msg = await generateCompanionEncouragement(character, currentState, "周期性鼓励", config.customPrompt, globalModel);
    setEncouragement(msg);
    if (onAddMessageToMainChat) {
      onAddMessageToMainChat({
        id: crypto.randomUUID(),
        role: 'model',
        content: msg,
        timestamp: new Date().toISOString(),
        mode: InteractionMode.COMPANION,
        subType: 'companion'
      });
    }
    if (config.voiceEnabled && character.config.voice.enabled) {
      speak(msg, character.config.voice);
    }
  };

  const rotateImage = () => {
    if (config.wallpapers.length > 1) {
      setCurrentImageIndex(prev => (prev + 1) % config.wallpapers.length);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setConfig(prev => ({
          ...prev,
          wallpapers: [...prev.wallpapers, result]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExitClick = () => {
    if (isRunning) {
      setShowExitConfirm(true);
    } else {
      onExit();
    }
  };

  const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

  return (
    <div className={cn("fixed inset-0 z-[80] flex overflow-hidden", isDay ? "bg-slate-50" : "bg-[#0a0a0c]")}>
      {/* Sidebar - Session Management */}
      <AnimatePresence initial={false}>
        {!isSidebarCollapsed && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "border-r flex flex-col backdrop-blur-xl z-20 overflow-hidden",
              isDay ? "bg-white/80 border-slate-100" : "bg-black/20 border-white/5"
            )}
          >
            <div className={cn("p-8 border-b flex items-center justify-between", isDay ? "border-slate-100" : "border-white/5")}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
                  <Clock className="w-6 h-6" style={{ color: themeColor }} />
                </div>
                <div>
                  <h2 className={cn("text-xl font-bold", isDay ? "text-slate-800" : "text-white")}>陪伴模式</h2>
                  <p className={cn("text-[10px] font-mono uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/20")}>Focus & Companion</p>
                </div>
              </div>
              <button onClick={() => setIsSidebarCollapsed(true)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/5 text-white/40")}>
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Daily Goal Card */}
              <button 
                onClick={() => setShowGoalDetail(true)}
                className={cn(
                  "w-full p-4 rounded-3xl text-left hover:scale-[1.02] transition-all active:scale-95",
                  isDay ? "border-slate-100" : "border-white/5"
                )}
                style={{ background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className={cn("text-xs font-bold", isDay ? "text-slate-600" : "text-white/60")}>连续专注 {goal.currentStreak} 天</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4", isDay ? "text-slate-300" : "text-white/20")} />
                </div>
                <div className="space-y-2">
                  <div className={cn("flex justify-between text-[10px] font-mono uppercase tracking-widest", isDay ? "text-slate-500" : "text-white/40")}>
                    <span>目标完成度</span>
                    <span>{taskProgress}%</span>
                  </div>
                  <div className={cn("h-1.5 rounded-full overflow-hidden", isDay ? "bg-slate-100" : "bg-white/5")}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${taskProgress}%` }}
                      className="h-full shadow-lg"
                      style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}80` }}
                    />
                  </div>
                  <p className={cn("text-[10px] text-right", isDay ? "text-slate-400" : "text-white/20")}>已完成 {completedTasks}/{totalTasks} 个目标</p>
                </div>
              </button>

              {/* Focus Plans */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={cn("text-xs font-bold uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/40")}>专注计划</h3>
                  <button 
                    onClick={() => setShowAddSession(true)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className={cn("text-center py-8 text-xs italic", isDay ? "text-slate-400" : "text-white/30")}>
                      暂无专注计划，请点击右上角添加
                    </div>
                  ) : (
                    sessions.map(session => (
                      <div
                        key={session.id}
                        className={cn(
                          "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                          activeSession?.id === session.id 
                            ? "shadow-lg" 
                            : (isDay ? "bg-slate-50 border-slate-100 hover:border-slate-300" : "bg-white/5 border-white/5 hover:border-white/10")
                        )}
                        style={activeSession?.id === session.id ? { 
                          backgroundColor: `${themeColor}15`, 
                          borderColor: `${themeColor}50`,
                          boxShadow: `0 10px 15px -3px ${themeColor}20`
                        } : {}}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <button onClick={() => startSession(session)} className="flex-1 text-left">
                            <span className={cn("font-bold text-sm transition-colors", isDay ? "text-slate-700" : "text-white")} style={activeSession?.id === session.id ? { color: themeColor } : {}}>{session.name}</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-mono", isDay ? "text-slate-400" : "text-white/20")}>{session.workDuration}m / {session.breakDuration}m</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessions(sessions.filter(s => s.id !== session.id));
                              }}
                              className={cn("p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity", isDay ? "hover:bg-red-100 text-red-500" : "hover:bg-red-500/20 text-red-400")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className={cn("text-xs line-clamp-2 mb-2", isDay ? "text-slate-500" : "text-white/40")}>{session.description}</p>
                        
                        {session.type === 'habit' && session.todoItems && session.todoItems.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {session.todoItems.map(item => (
                              <div key={item.id} className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessions(sessions.map(s => s.id === session.id ? {
                                      ...s,
                                      todoItems: s.todoItems?.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t)
                                    } : s));
                                  }}
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors",
                                    item.completed 
                                      ? "border-transparent" 
                                      : (isDay ? "border-slate-300" : "border-white/20")
                                  )}
                                  style={item.completed ? { backgroundColor: themeColor } : {}}
                                >
                                  {item.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                </button>
                                <span className={cn("text-xs", item.completed ? (isDay ? "text-slate-400 line-through" : "text-white/30 line-through") : (isDay ? "text-slate-600" : "text-white/70"))}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {session.type === 'goal' && session.deadline && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className={cn("text-[10px] px-2 py-1 rounded-md font-mono", isDay ? "bg-slate-200 text-slate-600" : "bg-white/10 text-white/60")}>
                              倒计时: {Math.max(0, Math.ceil((new Date(session.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} 天
                            </div>
                            <div className={cn("text-[10px] px-2 py-1 rounded-md font-mono", isDay ? "bg-slate-200 text-slate-600" : "bg-white/10 text-white/60")}>
                              进度: {session.accumulatedMinutes || 0} / {session.targetMinutes} 分钟
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className={cn("p-6 border-t", isDay ? "border-slate-100" : "border-white/5")}>
              <button 
                onClick={() => setShowSettings(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-3 rounded-2xl border transition-all text-sm font-bold",
                  isDay 
                    ? "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100" 
                    : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10"
                )}
              >
                <Settings className="w-4 h-4" /> 偏好设置
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.img 
              key={config.wallpapers[currentImageIndex]}
              src={config.wallpapers[currentImageIndex] || null}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: isTimerMinimized ? 1 : 0.4, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 2 }}
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                !isTimerMinimized && "blur-[2px]"
              )}
              alt="companion"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            isDay 
              ? "bg-gradient-to-b from-slate-50/60 via-transparent to-slate-50" 
              : "bg-gradient-to-b from-[#0a0a0c]/60 via-transparent to-[#0a0a0c]",
            isTimerMinimized ? "opacity-0" : "opacity-100"
          )} />
        </div>

        {/* Top Header Controls */}
        <header className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            {isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(false)}
                className={cn(
                  "p-3 backdrop-blur-xl border rounded-2xl transition-all",
                  isDay 
                    ? "bg-white/80 border-slate-200 text-slate-400 hover:text-slate-600" 
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                )}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            <div className={cn(
              "px-4 py-2 backdrop-blur-xl border rounded-2xl flex items-center gap-3",
              isDay ? "bg-white/80 border-slate-200" : "bg-white/5 border-white/10"
            )}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              <span className={cn("text-xs font-bold", isDay ? "text-slate-600" : "text-white/60")}>正在陪伴: {character.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsTimerMinimized(!isTimerMinimized)}
              className={cn(
                "p-3 backdrop-blur-xl border rounded-2xl transition-all",
                isDay 
                  ? "bg-white/80 border-slate-200 text-slate-400 hover:text-slate-600" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white"
              )}
              title={isTimerMinimized ? "展开计时器" : "缩小计时器"}
            >
              {isTimerMinimized ? <PanelLeftOpen className="w-5 h-5 rotate-90" /> : <PanelLeftClose className="w-5 h-5 rotate-90" />}
            </button>
            <button 
              onClick={handleExitClick}
              className={cn(
                "p-3 backdrop-blur-xl border rounded-2xl transition-all group",
                isDay 
                  ? "bg-white/80 border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10"
              )}
              title="退出陪伴"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Timer Display */}
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center z-10 p-8 transition-all duration-1000",
          isTimerMinimized ? "scale-50 translate-y-32 opacity-40 pointer-events-none" : "scale-100 opacity-100"
        )}>
          <div className="relative">
            {/* Progress Ring */}
            <svg className="w-[400px] h-[400px] transform -rotate-90">
              <circle
                cx="200"
                cy="200"
                r="180"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className={cn(isDay ? "text-slate-200" : "text-white/5")}
              />
              <motion.circle
                cx="200"
                cy="200"
                r="180"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 180}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 180 * (1 - timeLeft / ((currentState === 'work' ? activeSession?.workDuration : (currentState === 'short_break' ? activeSession?.breakDuration : activeSession?.longBreakDuration)) || 25 * 60))
                }}
                className="transition-all duration-1000"
                style={{ color: currentState === 'work' ? themeColor : '#3b82f6' }}
              />
            </svg>

            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center",
              currentState === 'work' ? (isDay ? "" : "pomodoro-shadow") : (isDay ? "" : "break-shadow")
            )} style={isDay ? { filter: `drop-shadow(0 0 20px ${themeColor}20)` } : {}}>
              <motion.div 
                key={currentState}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-6"
                style={{ 
                  backgroundColor: currentState === 'work' ? `${themeColor}33` : '#3b82f633',
                  color: currentState === 'work' ? themeColor : '#60a5fa'
                }}
              >
                {currentState === 'work' ? 'Focusing' : 'Resting'}
              </motion.div>
              <div className={cn(
                "text-8xl font-mono font-bold tracking-tighter",
                isDay ? "text-slate-800" : "text-white",
                currentState === 'work' ? (isDay ? "" : "text-glow-emerald") : (isDay ? "" : "text-glow-blue")
              )} style={{ color: currentState === 'work' ? themeColor : undefined }}>
                {formatTime(timeLeft)}
              </div>
              <div className={cn("mt-6 flex items-center gap-2 text-xs font-mono", isDay ? "text-slate-400" : "text-white/40")}>
                <Target className="w-3 h-3" /> Cycle {currentCycle + 1} / {activeSession?.cycles || 4}
              </div>
            </div>
          </div>

          {/* AI Encouragement Bubble */}
          <AnimatePresence>
            {encouragement && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mt-12 max-w-md"
              >
                <div className={cn(
                  "relative p-8 rounded-[40px] backdrop-blur-3xl border shadow-2xl",
                  isDay ? "bg-white/80 border-slate-200" : "bg-white/5 border-white/10"
                )}>
                   <div className={cn(
                     "absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t",
                     isDay ? "bg-white/80 border-slate-200" : "bg-white/5 border-white/10"
                   )} />
                   <p className={cn("text-sm text-center italic leading-relaxed", isDay ? "text-slate-600" : "text-white/80")}>
                     “{encouragement}”
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-16 flex items-center gap-12">
            <button 
              onClick={() => {
                setTimeLeft((currentState === 'work' ? activeSession?.workDuration : activeSession?.breakDuration || 25) * 60);
                setIsRunning(false);
              }}
              className={cn(
                "p-5 rounded-3xl border transition-all",
                isDay ? "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50" : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95",
                isRunning ? (isDay ? "bg-slate-800 text-white" : "bg-white text-black") : "text-white"
              )}
              style={!isRunning ? { backgroundColor: themeColor, boxShadow: `0 20px 25px -5px ${themeColor}40` } : {}}
            >
              {isRunning ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>

            <button 
              onClick={handleTimerEnd}
              className={cn(
                "p-5 rounded-3xl border transition-all",
                isDay ? "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50" : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <footer className="p-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className={cn("flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/20")}>
              <Music className="w-3 h-3" /> BG Music: {config.bgMusic}
            </div>
            <div className={cn("flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/20")}>
              <Volume2 className="w-3 h-3" /> Voice: {config.voiceEnabled ? 'On' : 'Off'}
            </div>
          </div>
          <div className={cn("text-[10px] font-mono uppercase tracking-[0.3em]", isDay ? "text-slate-300" : "text-white/10")}>
            SoulForge Companion Engine v1.3
          </div>
        </footer>
      </main>

      {/* Add Plan Modal */}
      <AnimatePresence>
        {showAddSession && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddSession(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-md border rounded-[40px] p-8 shadow-2xl",
                isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <h3 className={cn("text-xl font-bold mb-6", isDay ? "text-slate-800" : "text-white")}>新增专注计划</h3>
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  {(['normal', 'habit', 'goal'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewPlan({ ...newPlan, type })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                        newPlan.type === type 
                          ? "text-white shadow-lg" 
                          : (isDay ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10")
                      )}
                      style={newPlan.type === type ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                    >
                      {type === 'normal' && '普通专注'}
                      {type === 'habit' && '养习惯'}
                      {type === 'goal' && '定目标'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>计划名称</label>
                  <input 
                    value={newPlan.name}
                    onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                    placeholder="例如：深度学习、代码重构..."
                    className={cn(
                      "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                  />
                </div>

                {newPlan.type === 'habit' && (
                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>每日待办项 (用逗号分隔)</label>
                    <input 
                      value={newPlan.todoItems.join(', ')}
                      onChange={e => setNewPlan({...newPlan, todoItems: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      placeholder="例如：背单词, 练字, 运动..."
                      className={cn(
                        "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>
                )}

                {newPlan.type === 'goal' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>截止日期</label>
                      <input 
                        type="date"
                        value={newPlan.deadline}
                        onChange={e => setNewPlan({...newPlan, deadline: e.target.value})}
                        className={cn(
                          "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                          isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                        )}
                        style={{ outlineColor: themeColor } as any}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>目标总时长 (分)</label>
                      <input 
                        type="number"
                        value={newPlan.targetMinutes}
                        onChange={e => setNewPlan({...newPlan, targetMinutes: parseInt(e.target.value) || 0})}
                        className={cn(
                          "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                          isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                        )}
                        style={{ outlineColor: themeColor } as any}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>单次专注时长 (分)</label>
                    <input 
                      type="number"
                      value={newPlan.workDuration}
                      onChange={e => setNewPlan({...newPlan, workDuration: parseInt(e.target.value) || 0})}
                      className={cn(
                        "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>休息时长 (分)</label>
                    <input 
                      type="number"
                      value={newPlan.breakDuration}
                      onChange={e => setNewPlan({...newPlan, breakDuration: parseInt(e.target.value) || 0})}
                      className={cn(
                        "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs", isDay ? "text-slate-400" : "text-white/40")}>循环次数</label>
                  <input 
                    type="number"
                    value={newPlan.cycles}
                    onChange={e => setNewPlan({...newPlan, cycles: parseInt(e.target.value) || 0})}
                    className={cn(
                      "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowAddSession(false)}
                  className={cn(
                    "flex-1 py-4 border rounded-2xl text-sm font-bold transition-all",
                    isDay ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  取消
                </button>
                <button 
                  onClick={handleAddPlan}
                  className="flex-1 py-4 text-white rounded-2xl text-sm font-bold shadow-xl"
                  style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
                >
                  确认添加
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {showGoalDetail && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowGoalDetail(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
                <div className={cn(
                  "relative w-full max-w-lg border rounded-[40px] p-8 shadow-2xl",
                  isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
                )}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className={cn("text-xl font-bold", isDay ? "text-slate-800" : "text-white")}>专注成就</h3>
                    <button onClick={() => setShowGoalDetail(false)} className={cn("p-2 rounded-full", isDay ? "hover:bg-slate-100" : "hover:bg-white/5")}>
                      <X className={cn("w-5 h-5", isDay ? "text-slate-400" : "text-white/40")} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={cn("p-6 rounded-3xl border", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                      <p className={cn("text-[10px] uppercase tracking-widest mb-2", isDay ? "text-slate-400" : "text-white/20")}>累计专注</p>
                      <p className="text-3xl font-bold" style={{ color: themeColor }}>{goal.totalFocusedMinutes} <span className={cn("text-xs font-normal", isDay ? "text-slate-400" : "text-white/40")}>min</span></p>
                    </div>
                    <div className={cn("p-6 rounded-3xl border", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                      <p className={cn("text-[10px] uppercase tracking-widest mb-2", isDay ? "text-slate-400" : "text-white/20")}>连续天数</p>
                      <p className="text-3xl font-bold text-orange-400">{goal.currentStreak} <span className={cn("text-xs font-normal", isDay ? "text-slate-400" : "text-white/40")}>days</span></p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className={cn("text-xs font-bold uppercase tracking-widest", isDay ? "text-slate-400" : "text-white/40")}>专注日历</h4>
                    <div className={cn("p-6 rounded-3xl border", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                      <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                          <div key={day} className={cn("text-[10px] font-bold", isDay ? "text-slate-400" : "text-white/40")}>{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }).map((_, i) => {
                          const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const isCompleted = goal.completedDates?.includes(dateStr);
                          const isToday = dateStr === new Date().toISOString().split('T')[0];
                          
                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "aspect-square rounded-xl flex items-center justify-center text-xs font-mono transition-all",
                                isCompleted 
                                  ? "text-white shadow-md" 
                                  : (isDay 
                                      ? (isToday ? "bg-slate-200 text-slate-800" : "bg-white text-slate-400") 
                                      : (isToday ? "bg-white/20 text-white" : "bg-white/5 text-white/40"))
                              )}
                              style={isCompleted ? { backgroundColor: themeColor } : {}}
                            >
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowGoalDetail(false)}
                    className={cn(
                      "w-full mt-8 py-4 border rounded-2xl text-sm font-bold transition-all",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    返回
                  </button>
                </div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "relative w-full max-w-sm border rounded-[40px] p-8 text-center shadow-2xl",
                isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDay ? "text-slate-800" : "text-white")}>计划失败？</h3>
              <p className={cn("text-sm mb-8", isDay ? "text-slate-400" : "text-white/40")}>当前专注尚未完成，退出将导致本次计划失败。确定要离开吗？</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className={cn(
                    "flex-1 py-4 border rounded-2xl text-sm font-bold transition-all",
                    isDay ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  继续专注
                </button>
                <button 
                  onClick={() => onExit()}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all"
                >
                  确认退出
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-xl border rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]",
                isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <div className={cn("p-8 border-b flex items-center justify-between", isDay ? "border-slate-100" : "border-white/5")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${themeColor}20` }}>
                    <Settings className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", isDay ? "text-slate-800" : "text-white")}>陪伴设置</h3>
                    <p className={cn("text-xs mt-1", isDay ? "text-slate-400" : "text-white/40")}>个性化你的专注体验</p>
                  </div>
                </div>
                <button onClick={() => setShowSettings(false)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100" : "hover:bg-white/5")}>
                  <X className={cn("w-5 h-5", isDay ? "text-slate-400" : "text-white/40")} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Wallpaper Settings */}
                <div className="space-y-6">
                  <h4 className={cn("text-[10px] font-bold uppercase tracking-widest border-b pb-2", isDay ? "text-slate-400 border-slate-100" : "text-white/20 border-white/5")}>背景设置</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {config.wallpapers.map((wp, idx) => (
                      <div key={idx} className={cn("relative aspect-video rounded-xl overflow-hidden border group", isDay ? "border-slate-200" : "border-white/10")}>
                        <img src={wp || null} className="w-full h-full object-cover" alt="" />
                        <button 
                          onClick={() => setConfig(prev => ({ ...prev, wallpapers: prev.wallpapers.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "aspect-video rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                        isDay ? "border-slate-200 text-slate-300 hover:text-slate-600 hover:border-slate-400" : "border-white/10 text-white/20 hover:text-white hover:border-white/30"
                      )}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px]">上传壁纸</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-500" : "text-white/60")}>形象轮换间隔 (秒)</label>
                    <input 
                      type="number" 
                      value={config.imageRotationInterval}
                      onChange={e => setConfig({...config, imageRotationInterval: parseInt(e.target.value)})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-2 text-sm outline-none transition-colors",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>
                </div>

                {/* Interaction Settings */}
                <div className="space-y-6">
                  <h4 className={cn("text-[10px] font-bold uppercase tracking-widest border-b pb-2", isDay ? "text-slate-400 border-slate-100" : "text-white/20 border-white/5")}>互动设置</h4>
                  
                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-500" : "text-white/60")}>发言频率 (分钟)</label>
                    <input 
                      type="number" 
                      value={config.speechFrequency}
                      onChange={e => setConfig({...config, speechFrequency: parseInt(e.target.value)})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-2 text-sm outline-none transition-colors",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={cn("text-xs", isDay ? "text-slate-500" : "text-white/60")}>补充提示词 (引导角色发言风格)</label>
                    <textarea 
                      value={config.customPrompt}
                      onChange={e => setConfig({...config, customPrompt: e.target.value})}
                      placeholder="例如：语气要严厉一点，或者多撒娇..."
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none h-24 transition-colors",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    />
                  </div>
                </div>

                {/* System Settings */}
                <div className="space-y-6">
                  <h4 className={cn("text-[10px] font-bold uppercase tracking-widest border-b pb-2", isDay ? "text-slate-400 border-slate-100" : "text-white/20 border-white/5")}>系统设置</h4>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'autoStartNext', label: '自动开始下一轮', icon: RotateCcw },
                      { id: 'showNotifications', label: '启用系统通知', icon: Bell },
                      { id: 'voiceEnabled', label: '启用语音陪伴', icon: Mic },
                      { id: 'loopEnabled', label: '无限循环模式', icon: RotateCcw }
                    ].map(item => (
                      <div key={item.id} className={cn("flex items-center justify-between p-4 rounded-2xl border", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("w-4 h-4", isDay ? "text-slate-400" : "text-white/40")} />
                          <span className={cn("text-sm", isDay ? "text-slate-700" : "text-white/80")}>{item.label}</span>
                        </div>
                        <button 
                          onClick={() => setConfig({...config, [item.id]: !((config as any)[item.id])})}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative"
                          )}
                          style={{ backgroundColor: (config as any)[item.id] ? themeColor : (isDay ? "#e2e8f0" : "#ffffff1a") }}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                            (config as any)[item.id] ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={cn("p-8 border-t", isDay ? "border-slate-100" : "border-white/5")}>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 text-white rounded-2xl font-bold shadow-xl transition-all"
                  style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
                >
                  保存并返回
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
