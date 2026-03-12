import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mic, Fingerprint, ShieldCheck, X } from 'lucide-react';

interface IntimateEntryProps {
  characterName: string;
  onEnter: (sessionKey: string) => void;
  onCancel: () => void;
}

export function IntimateEntry({ characterName, onEnter, onCancel }: IntimateEntryProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [method, setMethod] = useState<'password' | 'voice' | 'biometric'>('password');
  const [passcode, setPasscode] = useState(['', '', '', '']);

  const handleEnter = async () => {
    setIsAuthenticating(true);
    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    onEnter(`session-${Date.now()}`);
    setIsAuthenticating(false);
  };

  const updatePasscode = (val: string, index: number) => {
    const newCode = [...passcode];
    newCode[index] = val;
    setPasscode(newCode);
    
    // Auto focus next
    if (val && index < 3) {
      const next = document.getElementById(`pin-${index + 1}`);
      next?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        onClick={onCancel}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[#1a1a1c] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden p-8"
      >
        <button onClick={onCancel} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5 text-white/20" />
        </button>

        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-rose-500 to-purple-600 mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-rose-500/20">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">私人亲密空间</h2>
          <p className="text-sm text-white/40">这是你与 {characterName} 的专属领地，所有记录均已加密</p>
        </div>

        <div className="space-y-8">
          {/* Method Selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'password', label: '密码', icon: Lock },
              { id: 'voice', label: '声纹', icon: Mic },
              { id: 'biometric', label: '生物识别', icon: Fingerprint }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id as any)}
                className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${
                  method === m.id 
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' 
                    : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'
                }`}
              >
                <m.icon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Verification Area */}
          <div className="py-4">
            {method === 'password' && (
              <div className="flex justify-center gap-4">
                {[0, 1, 2, 3].map(i => (
                  <input
                    key={i}
                    id={`pin-${i}`}
                    type="password"
                    maxLength={1}
                    value={passcode[i]}
                    onChange={(e) => updatePasscode(e.target.value, i)}
                    className="w-16 h-20 text-center text-3xl font-bold bg-white/5 border-2 border-white/10 rounded-2xl focus:border-rose-500 focus:bg-rose-500/5 outline-none transition-all"
                  />
                ))}
              </div>
            )}
            
            {method === 'voice' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto animate-pulse">
                  <Mic className="w-8 h-8 text-rose-400" />
                </div>
                <p className="text-xs text-white/40">请说出：“我回来了”</p>
              </div>
            )}

            {method === 'biometric' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                  <Fingerprint className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-xs text-white/40">正在调用系统生物识别...</p>
              </div>
            )}
          </div>

          <button
            onClick={handleEnter}
            disabled={isAuthenticating || (method === 'password' && passcode.some(c => !c))}
            className="w-full py-5 bg-gradient-to-r from-rose-500 to-purple-600 rounded-3xl font-bold text-white shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isAuthenticating ? '正在验证...' : '进入亲密空间'}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-3 text-white/20">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">端到端加密保护已开启</span>
        </div>
      </motion.div>
    </div>
  );
}
