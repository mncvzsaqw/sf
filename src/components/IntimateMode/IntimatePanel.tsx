import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Heart, 
  History, 
  Settings, 
  ChevronLeft, 
  Activity,
  Send,
  Plus,
  Coffee,
  Wand2,
  Trash2,
  Edit2,
  ShieldCheck
} from 'lucide-react';
import { Character, WorldMessage, IntimateMemory, GlobalModelConfig, Message, InteractionMode } from '../../types';
import { generateIntimateResponse, generateTouchResponse } from '../../services/intimateAI';
import { intimateEncryption } from '../../services/intimateEncryption';
import { TouchInterface } from './TouchInterface';
import ReactMarkdown from 'react-markdown';

interface IntimatePanelProps {
  character: Character;
  session: { id: string, intimacyLevel: number };
  globalModel: GlobalModelConfig;
  onExit: () => void;
  onAddMemory: (m: IntimateMemory) => void;
  onAddMessageToMainChat?: (msg: Message) => void;
  messages: WorldMessage[];
  onUpdateMessages: (msgs: WorldMessage[]) => void;
}

export function IntimatePanel({ 
  character, 
  session, 
  globalModel,
  onExit, 
  onAddMemory,
  onAddMessageToMainChat,
  messages,
  onUpdateMessages
}: IntimatePanelProps) {
  const [activeTab, setActiveTab] = useState<'whisper' | 'touch' | 'memory' | 'settings'>('whisper');
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intimacyLevel, setIntimacyLevel] = useState(session.intimacyLevel);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;
    setIsProcessing(true);

    const userMsg: WorldMessage = {
      id: `intimate-user-${Date.now()}`,
      characterId: character.id,
      type: 'encounter',
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      subType: 'intimacy',
      isEncrypted: true
    };

    const updatedMsgs = [...messages, userMsg];
    onUpdateMessages(updatedMsgs);
    setUserInput('');

    // Sync to main chat if enabled
    if (character.config.persistMessages && onAddMessageToMainChat) {
      onAddMessageToMainChat({
        id: userMsg.id,
        role: 'user',
        content: userMsg.content,
        timestamp: userMsg.timestamp,
        mode: InteractionMode.WORLD,
        subType: 'intimacy'
      });
    }

    try {
      const history = updatedMsgs.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await generateIntimateResponse(character, userInput, {
        intimacyLevel,
        emotionalTone: 'tender',
        history,
        globalModelConfig: globalModel
      });

      const aiMsg: WorldMessage = {
        id: `intimate-ai-${Date.now()}`,
        characterId: character.id,
        type: 'encounter',
        role: 'model',
        content: response.text,
        timestamp: new Date().toISOString(),
        subType: 'intimacy',
        isEncrypted: true
      };

      onUpdateMessages([...updatedMsgs, aiMsg]);
      setIntimacyLevel(prev => Math.min(1, prev + 0.01));

      // Sync to main chat if enabled
      if (character.config.persistMessages && onAddMessageToMainChat) {
        onAddMessageToMainChat({
          id: aiMsg.id,
          role: 'model',
          content: aiMsg.content,
          timestamp: aiMsg.timestamp,
          mode: InteractionMode.WORLD,
          subType: 'intimacy'
        });
      }

      // Save memory
      onAddMemory({
        id: `mem-${Date.now()}`,
        sessionId: session.id,
        type: 'whisper',
        content: userInput,
        emotionalIntensity: 0.5,
        timestamp: new Date().toISOString()
      });

    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTouch = async (type: 'gentle' | 'firm' | 'lingering', intensity: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const touchResponse = await generateTouchResponse(character, type, intensity, globalModel);
      
      const aiMsg: WorldMessage = {
        id: `intimate-touch-${Date.now()}`,
        characterId: character.id,
        type: 'encounter',
        role: 'model',
        content: touchResponse,
        timestamp: new Date().toISOString(),
        subType: 'intimacy',
        isEncrypted: true
      };

      onUpdateMessages([...messages, aiMsg]);
      setIntimacyLevel(prev => Math.min(1, prev + 0.02));

      onAddMemory({
        id: `mem-touch-${Date.now()}`,
        sessionId: session.id,
        type: 'touch',
        content: `${type} touch`,
        emotionalIntensity: intensity,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-br from-[#0a0505] via-[#1a0a0a] to-[#0a0505] flex flex-col overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.05)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.05)_0%,transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={character.avatar || null} className="w-10 h-10 rounded-2xl object-cover border border-rose-500/20" alt="" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#0a0505] animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {character.name} <span className="text-[10px] font-mono text-rose-400/60 uppercase tracking-widest">Intimate Mode</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
                <Activity className="w-3 h-3" /> 正在静静地陪着你
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-bold text-rose-400/60 uppercase tracking-widest">亲密度</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-rose-500 to-purple-500"
                  animate={{ width: `${intimacyLevel * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-rose-400">{Math.round(intimacyLevel * 100)}%</span>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-white/5" />
          <button className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10">
        {/* Sidebar Nav */}
        <nav className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-8">
          {[
            { id: 'whisper', icon: Mic, label: '私语' },
            { id: 'touch', icon: Heart, label: '触摸' },
            { id: 'memory', icon: History, label: '回忆' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex flex-col items-center gap-2 transition-all group",
                activeTab === item.id ? "text-rose-400" : "text-white/20 hover:text-white/40"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl transition-all",
                activeTab === item.id ? "bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "group-hover:bg-white/5"
              )}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            {activeTab === 'whisper' && (
              <motion.div 
                key="whisper"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar"
                >
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-2xl group",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className="flex-shrink-0">
                        <img 
                          src={msg.role === 'user' ? 'https://picsum.photos/seed/user/100/100' : (character.avatar || null)} 
                          className="w-8 h-8 rounded-xl object-cover border border-white/5" 
                          alt="" 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className={cn(
                          "p-4 rounded-2xl relative",
                          msg.role === 'user' 
                            ? "bg-rose-500/10 border border-rose-500/20 text-rose-100 italic" 
                            : "bg-white/5 border border-white/10 text-white/90"
                        )}>
                          <div className="text-sm leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        <div className={cn(
                          "text-[8px] font-mono text-white/20",
                          msg.role === 'user' ? "text-right" : ""
                        )}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-4 max-w-2xl">
                      <img src={character.avatar || null} className="w-8 h-8 rounded-xl object-cover" alt="" />
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <div className="w-1 h-1 bg-rose-400 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1 h-1 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-8 pt-0">
                  <div className="max-w-3xl mx-auto relative">
                    <div className="glass-panel rounded-3xl border border-white/10 p-2 flex items-center gap-2 focus-within:border-rose-500/50 transition-colors shadow-2xl">
                      <button className="p-3 text-white/20 hover:text-rose-400 transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <textarea 
                        rows={1}
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="轻声对她说点什么..."
                        className="flex-1 bg-transparent border-none outline-none text-white px-4 py-3 resize-none custom-scrollbar min-h-[48px] max-h-32 text-sm"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isProcessing}
                        className={cn(
                          "p-3 rounded-2xl transition-all",
                          userInput.trim() && !isProcessing ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-white/5 text-white/20"
                        )}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'touch' && (
              <motion.div 
                key="touch"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1"
              >
                <TouchInterface onTouch={handleTouch} />
              </motion.div>
            )}

            {activeTab === 'memory' && (
              <motion.div 
                key="memory"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex-1 p-8 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white">亲密回忆</h3>
                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">已加密存储于本地</div>
                  </div>
                  <div className="space-y-4">
                    {(messages || []).filter(m => m.role === 'user').slice().reverse().map(m => (
                      <div key={m.id} className="p-6 rounded-[32px] bg-white/5 border border-white/5 flex items-start gap-4 group hover:bg-white/[0.07] transition-all">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-mono text-white/20">{new Date(m.timestamp).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-rose-400/60 uppercase tracking-widest">Whisper</span>
                          </div>
                          <p className="text-sm text-white/80 italic">“{m.content}”</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Info */}
      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/10 uppercase tracking-[0.2em] z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Encrypted Session</span>
          <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Hi-Fi Audio Enabled</span>
        </div>
        <div>SoulForge Private Space v1.0</div>
      </footer>
    </div>
  );
}
