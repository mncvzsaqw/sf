import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles,
  Clock,
  Globe,
  Zap
} from 'lucide-react';
import { Character } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SessionSidebarProps {
  characters: Character[];
  onStartConnection: (charId: string) => void;
  onStartWorld: (charId: string) => void;
}

export function SessionSidebar({ 
  characters, 
  onStartConnection,
  onStartWorld
}: SessionSidebarProps) {
  const [activeTab, setActiveTab] = useState<'helper' | 'topic'>('helper');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/5 px-4">
        <button
          onClick={() => setActiveTab('helper')}
          className={cn(
            "flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-all relative",
            activeTab === 'helper' ? "text-white" : "text-white/30 hover:text-white/60"
          )}
        >
          助手 (HELPER)
          {activeTab === 'helper' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('topic')}
          className={cn(
            "flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-all relative",
            activeTab === 'topic' ? "text-white" : "text-white/30 hover:text-white/60"
          )}
        >
          话题 (TOPIC)
          {activeTab === 'topic' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
          <input 
            type="text"
            placeholder={activeTab === 'helper' ? "搜索灵魂助手..." : "搜索历史话题..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {activeTab === 'helper' ? (
          filteredCharacters.map(char => (
            <div key={char.id} className="space-y-2">
              <div className="flex items-center gap-3 p-3">
                <img 
                  src={char.avatar || undefined} 
                  className="w-10 h-10 rounded-xl object-cover border border-white/10" 
                  alt={char.name} 
                />
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold flex items-center gap-2">
                    {char.name}
                    {char.isDefault && <Sparkles className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <div className="text-[10px] text-white/40 truncate w-32">{char.persona.personalityType}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                <button
                  onClick={() => onStartConnection(char.id)}
                  className="flex items-center justify-center gap-2 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-[10px] font-bold transition-all border border-purple-500/20"
                >
                  <Zap className="w-3 h-3" /> 连接模式
                </button>
                <button
                  onClick={() => onStartWorld(char.id)}
                  className="flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-bold transition-all border border-blue-500/20"
                >
                  <Globe className="w-3 h-3" /> 世界模式
                </button>
              </div>
              <div className="h-px bg-white/5 mx-3" />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white/20" />
            </div>
            <div>
              <div className="text-sm font-bold text-white/40">暂无历史话题</div>
              <p className="text-[10px] text-white/20 mt-1">开始一个新的会话来记录你的故事。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
