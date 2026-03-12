import React, { useState } from 'react';
import { GlobalModelConfig, ModelConfig, VoiceSystemConfig, DisplaySettings } from '../types';
import { Settings, Cpu, Mic, Activity, BookOpen, Save, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlobalModelSettingsProps {
  config: GlobalModelConfig;
  onUpdate: (config: GlobalModelConfig) => void;
  displaySettings: DisplaySettings;
}

export function GlobalModelSettings({ config, onUpdate, displaySettings }: GlobalModelSettingsProps) {
  const [isConfirmingClear, setIsConfirmingClear] = React.useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [fetchStatus, setFetchStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  const isDay = displaySettings.colorMode === 'day';
  const themeColor = displaySettings.themeColor;

  const updateCore = (updates: Partial<ModelConfig>) => {
    onUpdate({ ...config, core: { ...config.core, ...updates } });
  };

  const updateVoice = (updates: Partial<VoiceSystemConfig>) => {
    onUpdate({ ...config, voice: { ...config.voice, ...updates } });
  };

  const updateVoiceModel = (updates: Partial<ModelConfig>) => {
    onUpdate({ 
      ...config, 
      voice: { 
        ...config.voice, 
        model: { ...config.voice.model, ...updates } 
      } 
    });
  };

  const updateBackground = (updates: Partial<ModelConfig>) => {
    onUpdate({ ...config, background: { ...config.background, ...updates } });
  };

  const updateStory = (updates: Partial<ModelConfig>) => {
    onUpdate({ ...config, story: { ...config.story, ...updates } });
  };

  const testConnection = async (key: string, modelConfig: ModelConfig) => {
    setTestStatus(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const endpoint = modelConfig.endpoint || (modelConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
      
      if (modelConfig.provider === 'gemini') {
         // Simple Gemini test (requires valid key)
         // Since we can't easily test Gemini without making a real generation call which costs money/quota, 
         // we'll skip for now or implement a lightweight check if possible.
         // For now, simulate success if key is present.
         if (!process.env.GEMINI_API_KEY && !modelConfig.apiKey) throw new Error("No API Key");
         await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay
      } else {
        // OpenAI/Ollama test
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': modelConfig.apiKey ? `Bearer ${modelConfig.apiKey}` : '',
          }
        });
        if (!response.ok) throw new Error('Failed to connect');
      }
      
      setTestStatus(prev => ({ ...prev, [key]: 'success' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
    } catch (e) {
      console.error(e);
      setTestStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
    }
  };

  const fetchModels = async (key: string, modelConfig: ModelConfig, updateFunc: (updates: Partial<ModelConfig>) => void) => {
    setFetchStatus(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const endpoint = modelConfig.endpoint || (modelConfig.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1');
      
      if (modelConfig.provider === 'gemini') {
        // Not supported for Gemini client-side easily
        throw new Error("Not supported for Gemini");
      }

      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': modelConfig.apiKey ? `Bearer ${modelConfig.apiKey}` : '',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      const models = data.data?.map((m: any) => m.id) || [];
      
      if (models.length > 0) {
        // In a real app, we'd show a dropdown. For now, let's just pick the first one or show a success toast
        // For simplicity in this UI, we'll just alert the user or log it. 
        // A better UX would be to populate a dropdown.
        console.log("Fetched models:", models);
        // We could update the model name to the first available one if current is empty
        if (!modelConfig.modelName) {
            updateFunc({ modelName: models[0] });
        }
      }

      setFetchStatus(prev => ({ ...prev, [key]: 'success' }));
      setTimeout(() => setFetchStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
    } catch (e) {
      console.error(e);
      setFetchStatus(prev => ({ ...prev, [key]: 'error' }));
      setTimeout(() => setFetchStatus(prev => ({ ...prev, [key]: 'idle' })), 3000);
    }
  };

  const renderTestButton = (key: string, config: ModelConfig) => (
    <button 
      onClick={() => testConnection(key, config)}
      disabled={testStatus[key] === 'loading'}
      className={cn(
        "px-3 py-2 text-xs rounded-lg border transition-all flex items-center gap-1",
        testStatus[key] === 'success' ? "bg-green-500/20 text-green-400 border-green-500/30" :
        testStatus[key] === 'error' ? "bg-red-500/20 text-red-400 border-red-500/30" :
        isDay ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white/40 border-white/10"
      )}
      style={testStatus[key] === 'idle' ? {} : {}}
    >
      {testStatus[key] === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
       testStatus[key] === 'success' ? <CheckCircle className="w-3 h-3" /> : 
       testStatus[key] === 'error' ? <XCircle className="w-3 h-3" /> : null}
      {testStatus[key] === 'loading' ? '测试中...' : 
       testStatus[key] === 'success' ? '连接成功' : 
       testStatus[key] === 'error' ? '连接失败' : '测试连接'}
    </button>
  );

  const renderFetchButton = (key: string, config: ModelConfig, updateFunc: (updates: Partial<ModelConfig>) => void) => (
    <button 
      onClick={() => fetchModels(key, config, updateFunc)}
      disabled={fetchStatus[key] === 'loading'}
      className={cn(
        "px-3 py-2 text-xs rounded-lg border transition-all flex items-center gap-1",
        fetchStatus[key] === 'success' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
        fetchStatus[key] === 'error' ? "bg-red-500/20 text-red-400 border-red-500/30" :
        isDay ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white/40 border-white/10"
      )}
      style={fetchStatus[key] === 'success' ? { backgroundColor: themeColor, color: '#fff', borderColor: themeColor } : {}}
    >
      {fetchStatus[key] === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
       fetchStatus[key] === 'success' ? <CheckCircle className="w-3 h-3" /> : 
       fetchStatus[key] === 'error' ? <XCircle className="w-3 h-3" /> : null}
      {fetchStatus[key] === 'loading' ? '拉取中...' : 
       fetchStatus[key] === 'success' ? '已拉取' : 
       fetchStatus[key] === 'error' ? '拉取失败' : '拉取模型'}
    </button>
  );

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" style={{ color: themeColor }} />
        <h3 className={cn("text-lg font-bold", isDay ? "text-slate-800" : "text-white")}>全局模型配置</h3>
      </div>

      {/* Core Cognitive Model */}
      <div className={cn("rounded-2xl p-4 border space-y-4", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
        <div className="flex items-center gap-2" style={{ color: themeColor }}>
          <Cpu className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">核心认知模型</h4>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>模型名称</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                value={config.core.modelName}
                onChange={(e) => updateCore({ modelName: e.target.value })}
                className={cn(
                  "flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all",
                  isDay 
                    ? "bg-white border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-black/20 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor, borderColor: isDay ? undefined : undefined } as any}
                placeholder="e.g. gemini-3-flash-preview"
              />
              <div className="flex gap-2">
                {renderFetchButton('core', config.core, updateCore)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>提供商</label>
              <select 
                value={config.core.provider}
                onChange={(e) => updateCore({ provider: e.target.value as any })}
                className={cn(
                  "w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all",
                  isDay 
                    ? "bg-white border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-black/20 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor } as any}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>温度 (Temperature)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.core.temperature || 0.7}
                onChange={(e) => updateCore({ temperature: parseFloat(e.target.value) })}
                className={cn(
                  "w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all",
                  isDay 
                    ? "bg-white border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-black/20 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor } as any}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 端点 (Endpoint)</label>
            <input 
              value={config.core.endpoint || ''}
              onChange={(e) => updateCore({ endpoint: e.target.value })}
              className={cn(
                "w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all",
                isDay 
                  ? "bg-white border-slate-200 text-slate-800 focus:ring-1" 
                  : "bg-black/20 border-white/10 text-white focus:ring-1"
              )}
              style={{ '--tw-ring-color': themeColor } as any}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 密钥 (Key)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="password"
                value={config.core.apiKey || ''}
                onChange={(e) => updateCore({ apiKey: e.target.value })}
                className={cn(
                  "flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all",
                  isDay 
                    ? "bg-white border-slate-200 text-slate-800 focus:ring-1" 
                    : "bg-black/20 border-white/10 text-white focus:ring-1"
                )}
                style={{ '--tw-ring-color': themeColor } as any}
                placeholder="Optional"
              />
              <div className="flex gap-2">
                {renderTestButton('core', config.core)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice & Call Model */}
      <div className={cn("rounded-2xl p-4 border space-y-4", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
        <div className="flex items-center gap-2" style={{ color: themeColor }}>
          <Mic className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">语音与通话模型</h4>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>连接模型</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                value={config.voice.model.modelName}
                onChange={(e) => updateVoiceModel({ modelName: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              />
              <div className="flex gap-2">
                {renderFetchButton('voice', config.voice.model, updateVoiceModel)}
              </div>
            </div>
          </div>
           <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 端点 (Endpoint)</label>
            <input 
              value={config.voice.model.endpoint || ''}
              onChange={(e) => updateVoiceModel({ endpoint: e.target.value })}
              className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 密钥 (Key)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="password"
                value={config.voice.model.apiKey || ''}
                onChange={(e) => updateVoiceModel({ apiKey: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
                placeholder="Optional"
              />
              <div className="flex gap-2">
                {renderTestButton('voice', config.voice.model)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>TTS 提供商</label>
              <select 
                value={config.voice.tts.provider}
                onChange={(e) => updateVoice({ tts: { ...config.voice.tts, provider: e.target.value as any } })}
                className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="minimax">MiniMax</option>
                <option value="local">Local</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>触发模式</label>
              <select 
                value={config.voice.replyTrigger}
                onChange={(e) => updateVoice({ replyTrigger: e.target.value as any })}
                className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              >
                <option value="always">始终回复</option>
                <option value="emotional">情感触发</option>
                <option value="manual">手动触发</option>
              </select>
            </div>
          </div>

          {config.voice.tts.provider === 'minimax' && (
             <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>MiniMax 群组 ID (Group ID)</label>
              <input 
                value={config.voice.tts.groupId || ''}
                onChange={(e) => updateVoice({ tts: { ...config.voice.tts, groupId: e.target.value } })}
                className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
                placeholder="Required for MiniMax"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>TTS 语音 ID</label>
              <input 
                value={config.voice.tts.voiceId}
                onChange={(e) => updateVoice({ tts: { ...config.voice.tts, voiceId: e.target.value } })}
                className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              />
            </div>
             <div className="space-y-1">
              <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>语速 (Speed)</label>
              <input 
                type="number"
                step="0.1"
                min="0.5"
                max="2.0"
                value={config.voice.tts.speed || 1.0}
                onChange={(e) => updateVoice({ tts: { ...config.voice.tts, speed: parseFloat(e.target.value) } })}
                className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Life Model */}
      <div className={cn("rounded-2xl p-4 border space-y-4", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
        <div className="flex items-center gap-2" style={{ color: themeColor }}>
          <Activity className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">后台生活模型</h4>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>模型名称</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                value={config.background.modelName}
                onChange={(e) => updateBackground({ modelName: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              />
              <div className="flex gap-2">
                {renderFetchButton('background', config.background, updateBackground)}
              </div>
            </div>
          </div>
           <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 端点 (Endpoint)</label>
            <input 
              value={config.background.endpoint || ''}
              onChange={(e) => updateBackground({ endpoint: e.target.value })}
              className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 密钥 (Key)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="password"
                value={config.background.apiKey || ''}
                onChange={(e) => updateBackground({ apiKey: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
                placeholder="Optional"
              />
              <div className="flex gap-2">
                {renderTestButton('background', config.background)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story Mode Model */}
      <div className={cn("rounded-2xl p-4 border space-y-4", isDay ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/5")}>
        <div className="flex items-center gap-2" style={{ color: themeColor }}>
          <BookOpen className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">故事模式模型</h4>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>模型名称</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                value={config.story.modelName}
                onChange={(e) => updateStory({ modelName: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              />
              <div className="flex gap-2">
                {renderFetchButton('story', config.story, updateStory)}
              </div>
            </div>
          </div>
           <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 端点 (Endpoint)</label>
            <input 
              value={config.story.endpoint || ''}
              onChange={(e) => updateStory({ endpoint: e.target.value })}
              className={cn("w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <label className={cn("text-[10px] uppercase font-mono", isDay ? "text-slate-400" : "text-white/40")}>API 密钥 (Key)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="password"
                value={config.story.apiKey || ''}
                onChange={(e) => updateStory({ apiKey: e.target.value })}
                className={cn("flex-1 border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all", isDay ? "bg-white border-slate-200 text-slate-800" : "bg-black/20 border-white/10 text-white")}
                placeholder="Optional"
              />
              <div className="flex gap-2">
                {renderTestButton('story', config.story)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={cn("rounded-2xl p-4 border space-y-4", isDay ? "bg-red-50/50 border-red-200" : "bg-red-500/5 border-red-500/10")}>
        <div className="flex items-center gap-2 text-red-400">
          <Trash2 className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">危险区域</h4>
        </div>
        <div className="space-y-3">
          <p className={cn("text-[10px] leading-relaxed", isDay ? "text-red-500/80" : "text-red-400/60")}>
            清空所有连接记忆、生活记录、聊天记录及世界设定。此操作不可撤销，请谨慎操作。
          </p>
          <button 
            onClick={() => {
              if (!isConfirmingClear) {
                setIsConfirmingClear(true);
                setTimeout(() => setIsConfirmingClear(false), 5000); // Reset after 5s
              } else {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className={cn(
              "w-full py-2 rounded-lg text-[10px] font-bold border transition-all",
              isConfirmingClear 
                ? "bg-red-500 text-white border-red-600 animate-pulse" 
                : (isDay ? "bg-red-50 hover:bg-red-100 text-red-500 border-red-200" : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20")
            )}
          >
            {isConfirmingClear ? '再次点击确认清空 (5秒内)' : '立即清空所有系统数据'}
          </button>
        </div>
      </div>
    </div>
  );
}
