import React, { useState } from 'react';
import { Character, WorldSetting, NPC, DisplaySettings } from '../types';
import { BookOpen, Users, Plus, Globe, ChevronRight, Search, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WorldSettingEditor } from './WorldSettingEditor';
import { NPCEditor } from './NPCEditor';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WorldBookManagerProps {
  worldSetting: WorldSetting;
  onUpdateWorldSetting: (setting: WorldSetting) => void;
  onClose: () => void;
  displaySettings: DisplaySettings;
}

export const WorldBookManager: React.FC<WorldBookManagerProps> = ({
  worldSetting,
  onUpdateWorldSetting,
  onClose,
  displaySettings
}) => {
  const [activeTab, setActiveTab] = useState<'world' | 'npc'>('world');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNPCs = (worldSetting.npcs || []).filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedNPC = worldSetting.npcs?.find(n => n.id === selectedId);

  return (
    <div className="flex h-full bg-[#0f0f11] overflow-hidden flex-1">
      {/* Left Sidebar - List */}
      <div className="w-80 border-r border-white/5 flex flex-col">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">全局设定</h2>
          </div>

          <div className="flex p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => { setActiveTab('world'); setSelectedId(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === 'world' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
              )}
            >
              <Globe className="w-3.5 h-3.5" /> 世界书
            </button>
            <button
              onClick={() => { setActiveTab('npc'); setSelectedId(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === 'npc' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
              )}
            >
              <Users className="w-3.5 h-3.5" /> NPC
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-2">
          {activeTab === 'world' ? (
            <button
              onClick={() => setSelectedId('global-world')}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all group",
                selectedId === 'global-world' 
                  ? "bg-blue-500/10 border-blue-500/30" 
                  : "bg-white/5 border-white/5 hover:border-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-bold text-sm",
                  selectedId === 'global-world' ? "text-blue-400" : "text-white/80"
                )}>{worldSetting.name || '全局世界书'}</span>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform",
                  selectedId === 'global-world' ? "text-blue-400 translate-x-1" : "text-white/10 group-hover:text-white/20"
                )} />
              </div>
            </button>
          ) : (
            filteredNPCs.map(npc => (
              <button
                key={npc.id}
                onClick={() => setSelectedId(npc.id)}
                className={cn(
                  "w-full p-4 rounded-2xl border text-left transition-all group",
                  selectedId === npc.id 
                    ? "bg-purple-500/10 border-purple-500/30" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs overflow-hidden">
                      {npc.avatar ? <img src={npc.avatar} className="w-full h-full object-cover" /> : npc.name[0]}
                    </div>
                    <span className={cn(
                      "font-bold text-sm",
                      selectedId === npc.id ? "text-purple-400" : "text-white/80"
                    )}>{npc.name}</span>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    selectedId === npc.id ? "text-purple-400 translate-x-1" : "text-white/10 group-hover:text-white/20"
                  )} />
                </div>
                <p className="mt-2 text-[10px] text-white/30 line-clamp-1 italic">{npc.persona}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Content - Editor */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedId ? (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              {activeTab === 'world' && selectedId === 'global-world' ? (
                <div className="h-full flex flex-col">
                  <div className="p-8 pb-0 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Globe className="text-blue-500" /> {worldSetting.name || '全局世界书'}
                      </h3>
                      <p className="text-sm text-white/40 mt-1">管理世界书条目与分类标签</p>
                    </div>
                    <button 
                      onClick={onClose}
                      className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-white/20" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <WorldSettingEditor
                      title={worldSetting.name || '全局世界书'}
                      onTitleChange={(newTitle) => onUpdateWorldSetting({ ...worldSetting, name: newTitle })}
                      world={worldSetting}
                      onSave={onUpdateWorldSetting}
                      onClose={() => setSelectedId(null)}
                      displaySettings={displaySettings}
                    />
                  </div>
                </div>
              ) : activeTab === 'npc' && selectedNPC ? (
                <div className="h-full flex flex-col">
                   <div className="p-8 pb-0 flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Users className="text-purple-500" /> {selectedNPC.name}
                      </h3>
                      <p className="text-sm text-white/40 mt-1">塑造非玩家角色（NPC）的灵魂与设定</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <NPCEditor
                      npc={selectedNPC}
                      onSave={(updated) => {
                        onUpdateWorldSetting({
                          ...worldSetting,
                          npcs: worldSetting.npcs.map(n => n.id === updated.id ? updated : n)
                        });
                      }}
                      onClose={() => setSelectedId(null)}
                      onDelete={(id) => {
                        onUpdateWorldSetting({
                          ...worldSetting,
                          npcs: worldSetting.npcs.filter(n => n.id !== id)
                        });
                        setSelectedId(null);
                      }}
                      displaySettings={displaySettings}
                    />
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-4">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/5 flex items-center justify-center">
                {activeTab === 'world' ? <Globe className="w-10 h-10" /> : <Users className="w-10 h-10" />}
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">请选择一个项目进行编辑</p>
                <p className="text-sm">点击左侧列表中的项目，或点击右上角新建</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorldBookManager;
