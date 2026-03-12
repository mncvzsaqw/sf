import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Settings, Clock, BookOpen, Plus, X, Trash2, Tag, Edit2 } from 'lucide-react';
import { WorldSetting, WorldBook, DisplaySettings } from '../types';

// Simple cn utility if not available
function classNames(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface WorldSettingEditorProps {
  title: string;
  onTitleChange?: (newTitle: string) => void;
  world: WorldSetting;
  onSave: (w: WorldSetting) => void;
  onClose: () => void;
  displaySettings: DisplaySettings;
}

export function WorldSettingEditor({ title, onTitleChange, world, onSave, onClose, displaySettings }: WorldSettingEditorProps) {
  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;

  // World Book Management State
  const [books, setBooks] = useState<WorldBook[]>(world.books || []);
  const [activeBookIds, setActiveBookIds] = useState<string[]>(world.activeBookIds || []);
  const [availableTags, setAvailableTags] = useState<string[]>(world.availableTags || []);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // New Book State
  const [newBook, setNewBook] = useState<{
    name: string;
    content: string;
    injectionPosition: 'front' | 'middle' | 'back';
    tags: string[];
  }>({ name: '', content: '', injectionPosition: 'front', tags: [] });

  const handleSave = () => {
    onSave({
      ...world,
      books,
      activeBookIds,
      availableTags
    });
    onClose();
  };

  const handleAddTag = () => {
    if (newTag && !availableTags.includes(newTag)) {
      setAvailableTags([...availableTags, newTag]);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tag: string) => {
    setAvailableTags(availableTags.filter(t => t !== tag));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className={classNames(
          "w-full max-w-4xl rounded-3xl border p-8 space-y-6 max-h-[90vh] flex flex-col shadow-2xl",
          isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
        )}
      >
        <div className={classNames("flex justify-between items-center border-b pb-4", isDay ? "border-slate-200" : "border-white/5")}>
          <div className="flex items-center gap-3 flex-1">
            <Globe className="w-6 h-6" style={{ color: themeColor }} />
            {onTitleChange ? (
              <div className="flex items-center gap-2 flex-1">
                <input 
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className={classNames(
                    "bg-transparent text-xl font-bold outline-none border-b transition-colors w-full",
                    isDay ? "text-slate-800 border-transparent focus:border-slate-200" : "text-white border-transparent focus:border-white/20"
                  )}
                  placeholder="输入世界名称..."
                  autoFocus
                />
                <Edit2 className={classNames("w-4 h-4", isDay ? "text-slate-300" : "text-white/20")} />
              </div>
            ) : (
              <h3 className={classNames("text-xl font-bold", isDay ? "text-slate-800" : "text-white")}>{title}</h3>
            )}
          </div>
          <button onClick={onClose} className={classNames("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-white/40 hover:text-white")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {/* Tag Management Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h4 className={classNames("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-slate-400" : "text-white/60")}>
                  <Tag className="w-4 h-4" /> 分类标签管理
                </h4>
             </div>
             <div className={classNames("flex flex-wrap gap-2 p-4 rounded-2xl border", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
                {availableTags.map(tag => (
                  <span key={tag} className={classNames("px-2 py-1 rounded-lg text-xs flex items-center gap-2 group", isDay ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white")}>
                    {tag}
                    <button onClick={() => handleDeleteTag(tag)} className={classNames("hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all", isDay ? "text-slate-400" : "text-white/20")}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-2">
                  <input 
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    className={classNames("bg-transparent border-b text-xs px-2 py-1 outline-none w-24", isDay ? "border-slate-200 text-slate-800" : "border-white/10 text-white")}
                    style={{ borderBottomColor: themeColor } as any}
                    placeholder="新标签..."
                  />
                  <button onClick={handleAddTag} className="p-1 hover:bg-white/10 rounded" style={{ color: themeColor }}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
             </div>
          </div>

          {/* World Books Management */}
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h4 className={classNames("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDay ? "text-slate-400" : "text-white/60")}>
                <BookOpen className="w-4 h-4" /> 世界书管理
              </h4>
              <button 
                onClick={() => setShowCreateBook(true)}
                className="px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-lg"
                style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}40` }}
              >
                <Plus className="w-3.5 h-3.5" /> 新建
              </button>
            </div>

            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={classNames(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    selectedTag === null 
                      ? (isDay ? "bg-slate-800 text-white" : "bg-white text-black") 
                      : (isDay ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white/60 hover:bg-white/20")
                  )}
                >
                  全部
                </button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={classNames(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      selectedTag === tag 
                        ? "text-white" 
                        : (isDay ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/10 text-white/60 hover:bg-white/20")
                    )}
                    style={selectedTag === tag ? { backgroundColor: themeColor } : {}}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className={classNames("flex-1 overflow-y-auto custom-scrollbar space-y-3 rounded-2xl p-4 border min-h-[400px]", isDay ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/5")}>
              {books.length === 0 ? (
                <div className={classNames("flex flex-col items-center justify-center h-full space-y-2", isDay ? "text-slate-300" : "text-white/20")}>
                  <BookOpen className="w-8 h-8 opacity-50" />
                  <span className="text-xs italic">暂无世界书</span>
                </div>
              ) : (
                books.filter(b => selectedTag ? b.tags?.includes(selectedTag) : true).map(book => {
                  const isActive = activeBookIds.includes(book.id);
                  return (
                    <div 
                      key={book.id}
                      className={classNames(
                        "p-4 rounded-xl border transition-all flex flex-col gap-2",
                        isActive 
                          ? (isDay ? "bg-white" : "bg-opacity-10") 
                          : (isDay ? "bg-white border-slate-200 hover:border-slate-300" : "bg-white/5 border-white/10 hover:border-white/20")
                      )}
                      style={isActive ? { borderColor: `${themeColor}40`, backgroundColor: !isDay ? `${themeColor}1a` : undefined } : {}}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={classNames("font-bold text-sm", isDay ? "text-slate-800" : "text-white")}>{book.name}</span>
                            <span className={classNames(
                              "text-[8px] px-1.5 py-0.5 rounded uppercase font-bold",
                              book.injectionPosition === 'front' ? "bg-opacity-20" :
                              book.injectionPosition === 'middle' ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            )} style={book.injectionPosition === 'front' ? { backgroundColor: `${themeColor}33`, color: themeColor } : {}}>
                              {book.injectionPosition === 'front' ? '前置' : book.injectionPosition === 'middle' ? '中置' : '后置'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {book.tags?.length > 0 ? book.tags.map(tag => (
                              <span key={tag} className={classNames("text-[8px] px-1.5 py-0.5 rounded", isDay ? "bg-slate-100 text-slate-500" : "bg-white/10 text-white/40")}>{tag}</span>
                            )) : (
                              <span className={classNames("text-[8px] px-1.5 py-0.5 rounded italic", isDay ? "bg-slate-100 text-slate-300" : "bg-white/5 text-white/20")}>待归类</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveBookIds(prev => 
                                isActive ? prev.filter(id => id !== book.id) : [...prev, book.id]
                              );
                            }}
                            className={classNames(
                              "px-2 py-1 rounded text-[10px] font-bold transition-all",
                              isActive ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-opacity-20 hover:bg-opacity-30"
                            )}
                            style={!isActive ? { backgroundColor: `${themeColor}33`, color: themeColor } : {}}
                          >
                            {isActive ? '卸载' : '挂载'}
                          </button>
                          <button
                            onClick={() => {
                              setBooks(prev => prev.filter(b => b.id !== book.id));
                              setActiveBookIds(prev => prev.filter(id => id !== book.id));
                            }}
                            className={classNames("p-1 rounded transition-colors", isDay ? "hover:bg-slate-100 text-slate-300 hover:text-red-500" : "hover:bg-white/10 text-white/20 hover:text-red-400")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className={classNames("text-xs line-clamp-2 font-mono p-2 rounded-lg", isDay ? "bg-slate-100 text-slate-600" : "bg-black/20 text-white/50")}>{book.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={classNames("flex justify-end pt-4 border-t", isDay ? "border-slate-200" : "border-white/5")}>
          <button 
            onClick={handleSave}
            className="px-8 py-3 text-white font-bold rounded-xl transition-colors shadow-lg"
            style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}40` }}
          >
            保存所有更改
          </button>
        </div>
      </motion.div>

      {/* Create Book Modal (Nested) */}
      <AnimatePresence>
        {showCreateBook && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateBook(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={classNames(
                "relative w-full max-w-lg border rounded-3xl shadow-2xl p-6 space-y-4",
                isDay ? "bg-white border-slate-200" : "bg-[#1a1a1c] border-white/10"
              )}
            >
              <div className={classNames("flex justify-between items-center border-b pb-4", isDay ? "border-slate-200" : "border-white/5")}>
                <h3 className={classNames("text-lg font-bold", isDay ? "text-slate-800" : "text-white")}>新建世界书</h3>
                <button onClick={() => setShowCreateBook(false)} className={classNames("p-2 rounded-full transition-colors", isDay ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600" : "hover:bg-white/5 text-white/40 hover:text-white")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={classNames("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>标题</label>
                  <input 
                    value={newBook.name}
                    onChange={e => setNewBook({...newBook, name: e.target.value})}
                    className={classNames(
                      "w-full border rounded-xl px-4 py-2 text-sm outline-none transition-colors",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                    placeholder="例如: 魔法体系设定"
                  />
                </div>
                <div className="space-y-2">
                  <label className={classNames("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>内容</label>
                  <textarea 
                    value={newBook.content}
                    onChange={e => setNewBook({...newBook, content: e.target.value})}
                    rows={5}
                    className={classNames(
                      "w-full border rounded-xl px-4 py-2 text-sm outline-none resize-none custom-scrollbar transition-colors",
                      isDay ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-white/5 border-white/10 text-white"
                    )}
                    style={{ outlineColor: themeColor } as any}
                    placeholder="输入详细设定内容..."
                  />
                </div>
                <div className="space-y-2">
                  <label className={classNames("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>注入位置</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'front', label: '前置', desc: '基础设定' },
                      { id: 'middle', label: '中置', desc: '情境细节' },
                      { id: 'back', label: '后置', desc: '核心指令' }
                    ].map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => setNewBook({...newBook, injectionPosition: pos.id as any})}
                        className={classNames(
                          "p-2 rounded-xl border text-left transition-all",
                          newBook.injectionPosition === pos.id 
                            ? (isDay ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-opacity-20 border-opacity-100") 
                            : (isDay ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-400" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/60")
                        )}
                        style={newBook.injectionPosition === pos.id ? { borderColor: themeColor, color: !isDay ? themeColor : undefined, backgroundColor: !isDay ? `${themeColor}33` : undefined } : {}}
                      >
                        <div className="text-xs font-bold">{pos.label}</div>
                        <div className="text-[8px] opacity-60">{pos.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={classNames("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/30")}>标签</label>
                  <div className={classNames("flex flex-wrap gap-2 p-2 rounded-xl border min-h-[40px]", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                    {availableTags.length > 0 ? availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (newBook.tags.includes(tag)) {
                            setNewBook({...newBook, tags: newBook.tags.filter(t => t !== tag)});
                          } else {
                            setNewBook({...newBook, tags: [...newBook.tags, tag]});
                          }
                        }}
                        className={classNames(
                          "px-2 py-1 rounded-lg text-xs transition-all",
                          newBook.tags.includes(tag) 
                            ? "text-white" 
                            : (isDay ? "bg-slate-200 text-slate-500 hover:bg-slate-300" : "bg-white/10 text-white/40 hover:bg-white/20")
                        )}
                        style={newBook.tags.includes(tag) ? { backgroundColor: themeColor } : {}}
                      >
                        {tag}
                      </button>
                    )) : (
                      <span className={classNames("text-xs italic p-1", isDay ? "text-slate-300" : "text-white/20")}>暂无可用标签，请先在上方添加</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (!newBook.name || !newBook.content) return;
                    const book: WorldBook = {
                      id: `wb-${Date.now()}`,
                      name: newBook.name,
                      content: newBook.content,
                      injectionPosition: newBook.injectionPosition,
                      tags: newBook.tags
                    };
                    setBooks(prev => [...prev, book]);
                    setShowCreateBook(false);
                    setNewBook({ name: '', content: '', injectionPosition: 'front', tags: [] });
                  }}
                  className="w-full py-3 text-white font-bold rounded-xl transition-colors mt-2 shadow-lg"
                  style={{ backgroundColor: themeColor, boxShadow: `0 4px 6px -1px ${themeColor}40` }}
                >
                  创建
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
