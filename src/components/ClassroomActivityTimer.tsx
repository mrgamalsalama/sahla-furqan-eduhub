import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, X, ChevronUp, ChevronDown, Clock, Bell } from 'lucide-react';

interface ClassroomActivityTimerProps {
  onClose?: () => void;
  isFloating?: boolean;
}

// Gentle classroom chime using Web Audio API (Zero external assets required)
function playGentleChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Bright cheerful chord)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 1.3);
    });
  } catch (err) {
    console.warn('Web Audio chime not permitted or supported:', err);
  }
}

export default function ClassroomActivityTimer({ onClose, isFloating = true }: ClassroomActivityTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(120); // 2 minutes default
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            setIsFinished(true);
            playGentleChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingSeconds]);

  function setPreset(seconds: number) {
    setIsRunning(false);
    setIsFinished(false);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
  }

  function handleReset() {
    setIsRunning(false);
    setIsFinished(false);
    setRemainingSeconds(totalSeconds);
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-6 z-40 bg-slate-900/95 border border-teal-500/50 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 text-white cursor-pointer select-none animate-bounce-subtle"
        onClick={() => setIsMinimized(false)}
        dir="rtl"
        title="انقر لتكبير مؤقت النشاط الصفي"
      >
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-teal-400 animate-ping' : 'bg-amber-400'}`} />
        <span className="font-mono text-base font-bold text-teal-300">{formattedTime}</span>
        <span className="text-xs text-slate-300">مؤقت النشاط</span>
        <ChevronUp className="w-4 h-4 text-slate-400" />
      </div>
    );
  }

  return (
    <div
      className={`${
        isFloating
          ? 'fixed top-16 right-6 z-40 max-w-xs w-full'
          : 'w-full'
      } bg-slate-900/95 border border-teal-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-white select-none animate-scale-in`}
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">مؤقت الأنشطة الصفية</h4>
            <p className="text-[10px] text-slate-400">إدارة وقت الأنشطة والتحديات</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="تصغير"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition"
              title="إغلاق المؤقت"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Countdown Display */}
      <div
        className={`relative py-4 px-6 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
          isFinished
            ? 'bg-rose-600/30 border border-rose-500 animate-pulse'
            : isRunning
            ? 'bg-teal-950/40 border border-teal-500/30'
            : 'bg-slate-800/60 border border-white/5'
        }`}
      >
        {/* Progress Background bar */}
        <div
          className="absolute inset-y-0 right-0 bg-teal-500/15 transition-all duration-1000 pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="relative z-10 flex items-baseline gap-2">
          <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            {formattedTime}
          </span>
        </div>

        {isFinished ? (
          <div className="relative z-10 mt-2 flex items-center gap-1.5 text-xs font-bold text-rose-300">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>انتهى وقت النشاط! أحسنتم يا أبطال 👏</span>
          </div>
        ) : (
          <span className="relative z-10 text-[10px] font-medium text-slate-400 mt-1">
            {isRunning ? 'النشاط جارٍ الآن...' : 'المؤقت متوقف مؤقتاً'}
          </span>
        )}
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-1.5 my-3">
        {[
          { label: '1 د', sec: 60, desc: 'عصف سريع' },
          { label: '2 د', sec: 120, desc: 'نقاش ثنائي' },
          { label: '3 د', sec: 180, desc: 'تفكير تشاركي' },
          { label: '5 د', sec: 300, desc: 'نشاط جماعي' },
        ].map((p) => (
          <button
            key={p.sec}
            type="button"
            onClick={() => setPreset(p.sec)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center ${
              totalSeconds === p.sec
                ? 'bg-teal-500 text-slate-950 shadow-md ring-1 ring-teal-300'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title={p.desc}
          >
            <span>{p.label}</span>
            <span className="text-[9px] opacity-75 font-normal">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (isFinished) handleReset();
            setIsRunning(!isRunning);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>إيقاف مؤقت</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{isFinished ? 'إعادة البدء' : 'ابدأ النشاط'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          title="إعادة ضبط المؤقت"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={playGentleChime}
          className="p-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white transition border border-indigo-500/30"
          title="تجربة رنين التنبيه"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
