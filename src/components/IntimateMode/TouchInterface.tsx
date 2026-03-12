import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface TouchInterfaceProps {
  onTouch: (type: 'gentle' | 'firm' | 'lingering', intensity: number) => void;
}

export function TouchInterface({ onTouch }: TouchInterfaceProps) {
  const [touchPoints, setTouchPoints] = useState<{ id: number, x: number, y: number, intensity: number }[]>([]);
  const [touchIntensity, setTouchIntensity] = useState(0);
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const touchStartTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    touchStartTime.current = Date.now();
    
    const newTouch = {
      id: Date.now(),
      x,
      y,
      intensity: 0.1
    };
    
    setTouchPoints([newTouch]);
    setTouchIntensity(0.1);
    
    // Initial feedback
    onTouch('gentle', 0.1);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    if (touchPoints.length === 0) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = touchAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    const lastTouch = touchPoints[0];
    const distance = Math.sqrt(Math.pow(x - lastTouch.x, 2) + Math.pow(y - lastTouch.y, 2));
    const timeDiff = Date.now() - touchStartTime.current;
    const speed = distance / (timeDiff / 1000 || 1);
    
    let intensity = Math.min(1, speed * 0.2 + touchIntensity);
    if ('touches' in e && (e.touches[0] as any).force) {
      intensity = (e.touches[0] as any).force;
    }
    
    setTouchIntensity(intensity);
    
    setTouchPoints([{
      ...lastTouch,
      x,
      y,
      intensity
    }]);

    // Throttled or logic-based feedback
    if (Date.now() % 5 === 0) {
      let touchType: 'gentle' | 'firm' | 'lingering' = 'gentle';
      if (intensity > 0.7) touchType = 'firm';
      if (intensity > 0.4 && speed < 0.05) touchType = 'lingering';
      onTouch(touchType, intensity);
    }
  };

  const handleTouchEnd = () => {
    if (touchPoints.length === 0) return;
    
    const duration = Date.now() - touchStartTime.current;
    if (duration > 1500) {
      onTouch('lingering', touchIntensity);
    }
    
    setTouchPoints([]);
    setTouchIntensity(0);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-rose-100">虚拟触摸</h2>
        <p className="text-rose-300/60 text-sm">在下方区域滑动手指，模拟触摸互动</p>
      </div>
      
      {/* Touch Area */}
      <div
        ref={touchAreaRef}
        className="relative w-64 h-96 bg-gradient-to-b from-rose-900/10 to-purple-900/10 rounded-[40px] border-2 border-rose-500/20 overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.1)] cursor-crosshair"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Touch Visualization */}
        {touchPoints.map(touch => (
          <motion.div
            key={touch.id}
            className="absolute w-24 h-24 -ml-12 -mt-12 rounded-full pointer-events-none"
            style={{
              left: `${touch.x * 100}%`,
              top: `${touch.y * 100}%`,
              background: `radial-gradient(circle, rgba(244,63,94,${touch.intensity * 0.4}) 0%, transparent 70%)`,
              boxShadow: `0 0 ${touch.intensity * 40}px rgba(244,63,94,${touch.intensity * 0.2})`
            }}
          >
            <div className="absolute inset-0 rounded-full border border-rose-400/30 animate-ping opacity-50" />
          </motion.div>
        ))}
        
        {/* Hint */}
        {touchPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 space-y-4">
              <div className="text-5xl animate-bounce">👆</div>
              <p className="text-rose-200/40 text-sm">用手指在这里触摸</p>
              <p className="text-[10px] text-rose-200/20 uppercase tracking-widest">轻触、滑动、长按</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Intensity Indicator */}
      <div className="mt-12 w-64 space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-rose-300/40 uppercase tracking-widest">
          <span>Soft</span>
          <span>Intensity: {Math.round(touchIntensity * 100)}%</span>
          <span>Firm</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-purple-500"
            animate={{ width: `${touchIntensity * 100}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
          />
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-sm">
        {[
          { type: 'gentle', icon: '🤲', label: '轻抚' },
          { type: 'firm', icon: '👐', label: '拥抱' },
          { type: 'lingering', icon: '🤗', label: '依偎' }
        ].map(action => (
          <button
            key={action.type}
            onClick={() => onTouch(action.type as any, 0.5)}
            className="flex flex-col items-center gap-2 p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
            <span className="text-[10px] font-bold text-rose-200/40 uppercase tracking-widest group-hover:text-rose-200">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
