import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, Brain, Plus, Trash2, Upload, Volume2, BookOpen, Download, Globe } from 'lucide-react';
import { NPC, Memory, WorldBook } from '../types';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface NPCEditorProps {
  npc: NPC;
  availableBooks?: WorldBook[];
  onSave: (npc: NPC) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
  displaySettings: {
    colorMode: 'day' | 'night';
    themeColor: string;
  };
}

export function NPCEditor({ npc, availableBooks = [], onSave, onClose, onDelete, displaySettings }: NPCEditorProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;
  const [editedNPC, setEditedNPC] = useState<NPC>({
    ...npc,
    voiceEnabled: npc.voiceEnabled ?? false,
    bookIds: npc.bookIds ?? [],
    memoryConfig: {
      retrievalRounds: npc.memoryConfig?.retrievalRounds ?? (npc.memoryConfig as any)?.contextRounds ?? 10
    }
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'memory'>('basic');
  const [newMemory, setNewMemory] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
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
  const [editingBook, setEditingBook] = useState<WorldBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const memory: Memory = {
      id: `mem-${Date.now()}`,
      characterId: npc.id,
      content: newMemory,
      type: 'core',
      timestamp: new Date().toISOString(),
      tags: ['manual'],
      importance: 5
    };
    setEditedNPC({
      ...editedNPC,
      memories: [...editedNPC.memories, memory]
    });
    setNewMemory('');
  };

  const handleDeleteMemory = (id: string) => {
    setEditedNPC({
      ...editedNPC,
      memories: editedNPC.memories.filter(m => m.id !== id)
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedNPC({ ...editedNPC, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBook = (bookId: string) => {
    const currentIds = editedNPC.bookIds || [];
    if (currentIds.includes(bookId)) {
      setEditedNPC({ ...editedNPC, bookIds: currentIds.filter(id => id !== bookId) });
    } else {
      setEditedNPC({ ...editedNPC, bookIds: [...currentIds, bookId] });
    }
  };

  const handleExportMemories = () => {
    const text = editedNPC.memories.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.content}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedNPC.name}_记忆导出.txt`;
    a.click();
  };

  const handleImportMemories = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(l => l.trim());
        const newMemories: Memory[] = lines.map((line, i) => {
          // Try to extract timestamp if present
          const match = line.match(/^\[(.*?)\] (.*)$/);
          const timestamp = match ? new Date(match[1]).toISOString() : new Date().toISOString();
          const text = match ? match[2] : line;
          
          return {
            id: `mem-import-${Date.now()}-${i}`,
            characterId: editedNPC.id,
            content: text,
            type: 'core',
            timestamp,
            tags: ['imported'],
            importance: 5
          };
        });
        setEditedNPC({
          ...editedNPC,
          memories: [...editedNPC.memories, ...newMemories]
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className={cn(
          "w-full max-w-4xl rounded-3xl border p-8 space-y-6 max-h-[90vh] flex flex-col shadow-2xl",
          isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
        )}
      >
        <div className={cn("flex justify-between items-center border-b pb-4", isDay ? "border-slate-100" : "border-white/5")}>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img src={editedNPC.avatar || 'https://picsum.photos/seed/npc/100'} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h3 className={cn("text-xl font-bold", isDay ? "text-slate-800" : "text-white")}>{editedNPC.name} 设置</h3>
              <p className={cn("text-xs mt-1", isDay ? "text-slate-400" : "text-white/40")}>管理该角色的设定与记忆</p>
            </div>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-white/40 hover:text-white")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={cn("flex gap-4 border-b pb-2", isDay ? "border-slate-100" : "border-white/5")}>
          <button
            onClick={() => setActiveTab('basic')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'basic' 
                ? (isDay ? "bg-slate-100 text-slate-900" : "bg-white/10 text-white") 
                : (isDay ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50" : "text-white/40 hover:text-white/80 hover:bg-white/5")
            )}
            style={activeTab === 'basic' ? { color: themeColor } : {}}
          >
            <User className="w-4 h-4" /> 基础设定
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'memory' 
                ? (isDay ? "bg-slate-100 text-slate-900" : "bg-white/10 text-white") 
                : (isDay ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50" : "text-white/40 hover:text-white/80 hover:bg-white/5")
            )}
            style={activeTab === 'memory' ? { color: themeColor } : {}}
          >
            <Brain className="w-4 h-4" /> 记忆管理
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-6 p-2">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>姓名</label>
                  <input 
                    value={editedNPC.name}
                    onChange={e => setEditedNPC({...editedNPC, name: e.target.value})}
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ borderColor: activeTab === 'basic' ? (isDay ? undefined : themeColor + '40') : undefined, outlineColor: themeColor } as any}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>角色关系</label>
                  <input 
                    value={editedNPC.relation || ''}
                    onChange={e => setEditedNPC({...editedNPC, relation: e.target.value})}
                    className={cn(
                      "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                    placeholder="例如：朋友、敌人、导师"
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>挂载状态</label>
                  <button 
                    onClick={() => setEditedNPC({...editedNPC, isMounted: !editedNPC.isMounted})}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all",
                      editedNPC.isMounted 
                        ? (isDay ? "bg-opacity-10 border-opacity-30" : "bg-opacity-10 border-opacity-30") 
                        : (isDay ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-white/5 border-white/10 text-white/40")
                    )}
                    style={editedNPC.isMounted ? { backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30`, color: themeColor } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span className="text-sm font-bold">已挂载</span>
                    </div>
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-all",
                      editedNPC.isMounted ? "" : (isDay ? "bg-slate-200" : "bg-white/10")
                    )} style={editedNPC.isMounted ? { backgroundColor: themeColor } : {}}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                        editedNPC.isMounted ? "left-4.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>语音设置</label>
                  <button 
                    onClick={() => setEditedNPC({
                      ...editedNPC, 
                      voiceEnabled: !editedNPC.voiceEnabled,
                      voiceConfig: !editedNPC.voiceEnabled ? {
                        voiceId: editedNPC.voiceConfig?.voiceId || '',
                        language: editedNPC.voiceConfig?.language || 'zh-CN',
                        speed: editedNPC.voiceConfig?.speed || 1.0
                      } : editedNPC.voiceConfig
                    })}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all",
                      editedNPC.voiceEnabled 
                        ? (isDay ? "bg-opacity-10 border-opacity-30" : "bg-opacity-10 border-opacity-30") 
                        : (isDay ? "bg-slate-50 border-slate-200 text-slate-400" : "bg-white/5 border-white/10 text-white/40")
                    )}
                    style={editedNPC.voiceEnabled ? { backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30`, color: themeColor } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-sm font-bold">语音开启</span>
                    </div>
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-all",
                      editedNPC.voiceEnabled ? "" : (isDay ? "bg-slate-200" : "bg-white/10")
                    )} style={editedNPC.voiceEnabled ? { backgroundColor: themeColor } : {}}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                        editedNPC.voiceEnabled ? "left-4.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                </div>
              </div>
              
              {editedNPC.voiceEnabled && (
                <div className={cn("p-4 rounded-2xl border space-y-4", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>语音 ID</label>
                      <input 
                        value={editedNPC.voiceConfig?.voiceId || ''}
                        onChange={e => setEditedNPC({
                          ...editedNPC,
                          voiceConfig: { ...editedNPC.voiceConfig!, voiceId: e.target.value }
                        })}
                        className={cn(
                          "w-full border rounded-xl px-3 py-2 text-xs outline-none transition-colors",
                          isDay ? "bg-white border-slate-200 text-slate-800 focus:border-slate-400" : "bg-white/5 border-white/10 text-white"
                        )}
                        style={{ outlineColor: themeColor } as any}
                        placeholder="输入语音 ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>语言设置</label>
                      <select 
                        value={editedNPC.voiceConfig?.language || 'zh-CN'}
                        onChange={e => setEditedNPC({
                          ...editedNPC,
                          voiceConfig: { ...editedNPC.voiceConfig!, language: e.target.value }
                        })}
                        className={cn(
                          "w-full border rounded-xl px-3 py-2 text-xs outline-none appearance-none transition-colors",
                          isDay ? "bg-white border-slate-200 text-slate-800 focus:border-slate-400" : "bg-white/5 border-white/10 text-white"
                        )}
                        style={{ outlineColor: themeColor } as any}
                      >
                        <option value="zh-CN">普通话 (默认)</option>
                        <option value="en-US">English</option>
                        <option value="ja-JP">日本語</option>
                        <option value="ko-KR">한국어</option>
                        <option value="zh-HK">粤语 (繁体)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>语速: {editedNPC.voiceConfig?.speed?.toFixed(1) || 1.0}</label>
                    </div>
                    <div className="relative flex items-center gap-4">
                      <span className={cn("text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>慢</span>
                      <input 
                        type="range" min="0.5" max="1.5" step="0.1"
                        value={editedNPC.voiceConfig?.speed || 1.0}
                        onChange={e => setEditedNPC({
                          ...editedNPC,
                          voiceConfig: { ...editedNPC.voiceConfig!, speed: parseFloat(e.target.value) }
                        })}
                        className="flex-1"
                        style={{ accentColor: themeColor } as any}
                      />
                      <span className={cn("text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>快</span>
                    </div>
                    <div className={cn("flex justify-center text-[8px] uppercase font-mono", isDay ? "text-slate-300" : "text-white/20")}>
                      <span>正常 (1.0x)</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>人设 (Persona)</label>
                <textarea 
                  value={editedNPC.persona}
                  onChange={e => setEditedNPC({...editedNPC, persona: e.target.value})}
                  rows={4}
                  className={cn(
                    "w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors",
                    isDay ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400" : "bg-white/5 border-white/10 text-white"
                  )}
                  style={{ outlineColor: themeColor } as any}
                  placeholder="详细描述NPC的性格、背景、说话方式等..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>NPC 专属角色书</label>
                  <button 
                    onClick={() => {
                      setEditingBook({
                        id: `npc-book-${Date.now()}`,
                        name: '',
                        content: '',
                        injectionPosition: 'front',
                        tags: []
                      });
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      isDay ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-opacity-20 hover:bg-opacity-30"
                    )}
                    style={!isDay ? { color: themeColor, backgroundColor: `${themeColor}33` } : {}}
                  >
                    <Plus className="w-3 h-3" /> 塑造新角色书
                  </button>
                </div>
                <div className="space-y-2">
                  {(editedNPC.characterBooks || []).map(book => (
                    <div key={book.id} className={cn("p-4 rounded-2xl border flex items-center justify-between", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                      <div className="flex-1">
                        <div className={cn("text-sm font-bold", isDay ? "text-slate-800" : "text-white")}>{book.name || '未命名角色书'}</div>
                        <div className={cn("text-[10px] truncate max-w-[200px]", isDay ? "text-slate-400" : "text-white/40")}>{book.content}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const currentActive = editedNPC.activeCharacterBookIds || [];
                            const newActive = currentActive.includes(book.id)
                              ? currentActive.filter(id => id !== book.id)
                              : [...currentActive, book.id];
                            setEditedNPC({ ...editedNPC, activeCharacterBookIds: newActive });
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                            (editedNPC.activeCharacterBookIds || []).includes(book.id)
                              ? (isDay ? "bg-opacity-20" : "bg-opacity-20")
                              : (isDay ? "bg-slate-200 text-slate-400" : "bg-white/10 text-white/40")
                          )}
                          style={(editedNPC.activeCharacterBookIds || []).includes(book.id) ? { backgroundColor: `${themeColor}33`, color: themeColor } : {}}
                        >
                          {(editedNPC.activeCharacterBookIds || []).includes(book.id) ? '已激活' : '未激活'}
                        </button>
                        <button 
                          onClick={() => setEditingBook(book)}
                          className={cn("p-1.5 rounded-lg transition-colors", isDay ? "hover:bg-slate-200 text-slate-400 hover:text-slate-600" : "hover:bg-white/10 text-white/40 hover:text-white")}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => {
                            const updatedBooks = editedNPC.characterBooks?.filter(b => b.id !== book.id);
                            const updatedActive = editedNPC.activeCharacterBookIds?.filter(id => id !== book.id);
                            setEditedNPC({ ...editedNPC, characterBooks: updatedBooks, activeCharacterBookIds: updatedActive });
                          }}
                          className={cn("p-1.5 rounded-lg transition-colors", isDay ? "hover:bg-red-50 text-slate-300 hover:text-red-500" : "hover:bg-red-500/20 text-white/20 hover:text-red-400")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(editedNPC.characterBooks || []).length === 0 && (
                    <div className={cn("text-center py-6 text-xs border border-dashed rounded-2xl italic", isDay ? "text-slate-300 border-slate-200" : "text-white/20 border-white/10")}>
                      暂无专属角色书
                    </div>
                  )}
                </div>
              </div>

              <div className={cn("p-4 rounded-2xl border space-y-4", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                <h4 className={cn("text-sm font-bold", isDay ? "text-slate-800" : "text-white")}>记忆设置</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>记忆检索配置 (回合设置)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range"
                        min="1"
                        max="50"
                        value={editedNPC.memoryConfig.retrievalRounds}
                        onChange={e => setEditedNPC({...editedNPC, memoryConfig: {...editedNPC.memoryConfig, retrievalRounds: parseInt(e.target.value)}})}
                        className="flex-1"
                        style={{ accentColor: themeColor } as any}
                      />
                      <span className="text-sm font-mono w-8 text-right" style={{ color: themeColor }}>{editedNPC.memoryConfig.retrievalRounds}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-6 p-2 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => document.getElementById('memory-import')?.click()}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all", isDay ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/5 hover:bg-white/10 text-white")}
                  >
                    <Upload className="w-3 h-3" /> 导入记忆
                  </button>
                  <input 
                    id="memory-import"
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handleImportMemories}
                  />
                  <button 
                    onClick={handleExportMemories}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all", isDay ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/5 hover:bg-white/10 text-white")}
                  >
                    <Download className="w-3 h-3" /> 导出记忆
                  </button>
                </div>
                <div className={cn("text-[10px] font-mono", isDay ? "text-slate-300" : "text-white/20")}>共 {editedNPC.memories.length} 条记忆</div>
              </div>

              <div className="flex items-center gap-2">
                  <input 
                    value={newMemory}
                    onChange={e => setNewMemory(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMemory()}
                    placeholder="添加新的记忆..."
                    className={cn(
                      "flex-1 border rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                  />
                <button 
                  onClick={handleAddMemory}
                  disabled={!newMemory.trim()}
                  className="px-4 py-3 rounded-xl text-white font-bold transition-all flex items-center gap-2 shadow-lg"
                  style={{ backgroundColor: themeColor, opacity: !newMemory.trim() ? 0.5 : 1 }}
                >
                  <Plus className="w-4 h-4" /> 添加
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {editedNPC.memories.length === 0 ? (
                  <div className={cn("text-center py-12 italic", isDay ? "text-slate-300" : "text-white/20")}>暂无记忆</div>
                ) : (
                  [...editedNPC.memories].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(memory => (
                    <div key={memory.id} className={cn("p-4 rounded-xl border flex items-start justify-between group", isDay ? "bg-slate-50 border-slate-100" : "bg-white/5 border-white/5")}>
                      <div className="space-y-2 flex-1 pr-4">
                        <p className={cn("text-sm leading-relaxed", isDay ? "text-slate-700" : "text-white/80")}>{memory.content}</p>
                        <div className={cn("flex items-center gap-2 text-[10px] font-mono", isDay ? "text-slate-400" : "text-white/30")}>
                          <span>{new Date(memory.timestamp).toLocaleString()}</span>
                          {memory.importance && (
                            <span className={cn("px-1.5 py-0.5 rounded", isDay ? "bg-slate-200" : "bg-white/10")}>权重: {memory.importance}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteMemory(memory.id)}
                        className={cn("p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100", isDay ? "hover:bg-red-50 text-slate-300 hover:text-red-500" : "hover:bg-red-500/20 text-white/20 hover:text-red-400")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className={cn("pt-4 border-t flex justify-between items-center gap-3", isDay ? "border-slate-100" : "border-white/5")}>
          {onDelete && (
            <button 
              onClick={() => {
                setShowConfirmDelete(true);
                startDeleteCountdown();
              }}
              className={cn("px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2", isDay ? "text-red-500 hover:bg-red-50" : "text-red-400 hover:text-red-300 hover:bg-red-500/10")}
            >
              <Trash2 className="w-4 h-4" /> 删除 NPC
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button 
              onClick={onClose}
              className={cn("px-6 py-2.5 rounded-xl font-bold transition-colors", isDay ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100" : "text-white/60 hover:text-white hover:bg-white/5")}
            >
              取消
            </button>
            <button 
              onClick={() => onSave(editedNPC)}
              className="px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg flex items-center gap-2"
              style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}40` }}
            >
              <Save className="w-4 h-4" /> 保存修改
            </button>
          </div>
        </div>

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
                  isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
                )}
              >
                <div className="flex justify-between items-center">
                  <h4 className={cn("text-lg font-bold", isDay ? "text-slate-800" : "text-white")}>塑造角色书</h4>
                  <button onClick={() => setEditingBook(null)} className={cn("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-white/40 hover:text-white")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>标题</label>
                    <input 
                      value={editingBook.name}
                      onChange={e => setEditingBook({...editingBook, name: e.target.value})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                      placeholder="输入角色书标题..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>内容</label>
                    <textarea 
                      value={editingBook.content}
                      onChange={e => setEditingBook({...editingBook, content: e.target.value})}
                      rows={6}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors custom-scrollbar",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                      placeholder="输入角色书内容..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>注入位置</label>
                    <select 
                      value={editingBook.injectionPosition}
                      onChange={e => setEditingBook({...editingBook, injectionPosition: e.target.value as any})}
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm outline-none appearance-none transition-colors",
                        isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                      )}
                      style={{ outlineColor: themeColor } as any}
                    >
                      <option value="front">Front (前置)</option>
                      <option value="back">Back (后置)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingBook(null)}
                    className={cn("flex-1 py-3 rounded-xl font-bold transition-colors", isDay ? "text-slate-400 hover:bg-slate-100" : "text-white/60 hover:bg-white/5")}
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      if (!editingBook.name || !editingBook.content) {
                        alert('请填写标题和内容');
                        return;
                      }
                      const updatedBooks = editedNPC.characterBooks || [];
                      const exists = updatedBooks.find(b => b.id === editingBook.id);
                      let newBooks;
                      if (exists) {
                        newBooks = updatedBooks.map(b => b.id === editingBook.id ? editingBook : b);
                      } else {
                        newBooks = [...updatedBooks, editingBook];
                      }
                      
                      const newActive = [...(editedNPC.activeCharacterBookIds || [])];
                      if (!exists && !newActive.includes(editingBook.id)) {
                        newActive.push(editingBook.id);
                      }

                      setEditedNPC({ 
                        ...editedNPC, 
                        characterBooks: newBooks,
                        activeCharacterBookIds: newActive
                      });
                      setEditingBook(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg"
                    style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}40` }}
                  >
                    确认
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
                )}
              >
                <div className="space-y-2 text-center">
                  <h4 className={cn("text-lg font-bold", isDay ? "text-slate-800" : "text-white")}>确认删除?</h4>
                  <p className={cn("text-sm", isDay ? "text-slate-400" : "text-white/40")}>此操作不可撤销，该NPC的所有设定和记忆将被永久清除。</p>
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
                      onDelete?.(npc.id);
                      onClose();
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-white transition-all",
                      deleteCountdown > 0 
                        ? (isDay ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-white/5 text-white/20 cursor-not-allowed") 
                        : "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    {deleteCountdown > 0 ? `确认 (${deleteCountdown}s)` : '确认删除'}
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
