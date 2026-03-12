import React, { useState } from 'react';
import { 
  Server, 
  Zap, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Brain,
  MessageSquare,
  Globe,
  Volume2,
  Activity
} from 'lucide-react';
import { GlobalModelConfig, ModelConfig } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AIServiceManagerProps {
  globalModel: GlobalModelConfig;
  onUpdateGlobalModel: (config: GlobalModelConfig) => void;
  displaySettings: { colorMode: 'day' | 'night' };
}

export function AIServiceManager({ globalModel, onUpdateGlobalModel, displaySettings }: AIServiceManagerProps) {
  const [activeSection, setActiveSection] = useState<'core' | 'voice' | 'background' | 'story'>('core');

  const sections = [
    { id: 'core', name: '核心对话逻辑', icon: MessageSquare, config: globalModel.core },
    { id: 'voice', name: '语音生成逻辑', icon: Volume2, config: globalModel.voice.model },
    { id: 'background', name: '后台生活逻辑', icon: Activity, config: globalModel.background },
    { id: 'story', name: '世界故事逻辑', icon: Globe, config: globalModel.story },
  ];

  const updateModelConfig = (section: string, updates: Partial<ModelConfig>) => {
    const newConfig = { ...globalModel };
    if (section === 'core') newConfig.core = { ...newConfig.core, ...updates };
    if (section === 'voice') newConfig.voice.model = { ...newConfig.voice.model, ...updates };
    if (section === 'background') newConfig.background = { ...newConfig.background, ...updates };
    if (section === 'story') newConfig.story = { ...newConfig.story, ...updates };
    onUpdateGlobalModel(newConfig);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Master List */}
      <div className={cn(
        "w-80 border-r flex flex-col",
        displaySettings.colorMode === 'day' ? "bg-white border-slate-200" : "bg-black/20 border-white/5"
      )}>
        <div className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-6">生成项目</h3>
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left",
                  activeSection === section.id
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                    : "hover:bg-white/5 text-white/60 hover:text-white"
                )}
              >
                <section.icon className="w-5 h-5" />
                <div className="flex-1">
                  <div className="text-sm font-bold">{section.name}</div>
                  <div className="text-[10px] opacity-70 truncate">{section.config.modelName}</div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">系统运行正常</span>
            </div>
            <p className="text-[10px] text-emerald-500/60 leading-relaxed">
              所有AI生成逻辑已就绪，正在根据全局规则和角色设定进行实时推理。
            </p>
          </div>
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{sections.find(s => s.id === activeSection)?.name}</h2>
              <p className="text-sm text-white/40 mt-1">配置该项目的AI生成模型、参数及全局生成规则。</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] text-white/30 uppercase font-mono">模型选择</label>
              <select 
                value={sections.find(s => s.id === activeSection)?.config.modelName}
                onChange={(e) => updateModelConfig(activeSection, { modelName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-all"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (推荐)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (高智商)</option>
                <option value="qwen2.5:3b">Ollama: Qwen 2.5 3B</option>
                <option value="llama3:8b">Ollama: Llama 3 8B</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] text-white/30 uppercase font-mono">生成温度 (Temperature)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="0" max="2" step="0.1"
                  value={sections.find(s => s.id === activeSection)?.config.temperature || 0.7}
                  onChange={(e) => updateModelConfig(activeSection, { temperature: parseFloat(e.target.value) })}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-xs font-mono text-purple-400 w-8 text-right">
                  {(sections.find(s => s.id === activeSection)?.config.temperature || 0.7).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-white/30 uppercase font-mono">全局生成规则 (System Instruction Override)</label>
            <textarea 
              value={sections.find(s => s.id === activeSection)?.config.systemInstruction || ''}
              onChange={(e) => updateModelConfig(activeSection, { systemInstruction: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-purple-500 transition-all min-h-[200px] resize-none custom-scrollbar"
              placeholder="输入全局指令，这将影响所有相关生成的底层逻辑..."
            />
          </div>

          <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold">高级规则引擎</h4>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              当该项目被触发时，系统将优先合并此处的全局规则与角色的个性化设定。
              你可以通过调整规则来改变AI的思考深度、回复风格或逻辑严密性。
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all">
                重置为默认规则
              </button>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all">
                导入规则模板
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
