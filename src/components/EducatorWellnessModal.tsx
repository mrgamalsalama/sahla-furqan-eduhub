import { useState, useEffect } from 'react';
import { Heart, Sparkles, X, Coffee, Check } from 'lucide-react';
import type { UILang } from '@/lib/i18n';

interface EducatorWellnessModalProps {
  uiLang?: UILang;
}

export default function EducatorWellnessModal({ uiLang = 'ar' }: EducatorWellnessModalProps) {
  const isAr = uiLang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [praisesCount, setPraisesCount] = useState(0);

  // Trigger after 45 minutes of continuous session (or allow testing)
  useEffect(() => {
    // 45 minutes = 45 * 60 * 1000 ms
    const INTERVAL_MS = 45 * 60 * 1000;
    const timer = setInterval(() => {
      setIsOpen(true);
      setCountdown(30);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  // 30 seconds countdown when open
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in no-print" dir="rtl">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-emerald-100 flex flex-col items-center relative overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title={isAr ? 'إغلاق واستئناف' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg mb-4">
          <Coffee className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isAr ? 'استراحة معلم الأجيال 🌿' : 'Educator Wellness Break'}</span>
        </div>

        <h3 className="text-lg font-extrabold text-slate-900 mb-2">
          {isAr ? 'أحسنتَ صُنعاً وبُوركت جهودك المباركة!' : 'Great job! Time for a mindful break'}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
          {isAr
            ? 'لقد مضى وقت طويل وأنت تبذل جهدك في تعليم الطلاب. أرح عينيك لـ 30 ثانية وعطّر لسانك بالصلاة على رسول الله ﷺ لتجديد طاقتك وبركة وقتك.'
            : 'Rest your eyes for 30 seconds and send blessings upon Prophet Muhammad ﷺ to rejuvenate your energy and intentions.'}
        </p>

        {/* 30s Countdown Circle */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-5">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center">
            <div className="text-center">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {countdown > 0 ? countdown : '✓'}
              </span>
              <span className="block text-[10px] text-slate-400 font-bold">
                {countdown > 0 ? (isAr ? 'ثانية' : 'sec') : (isAr ? 'اكتملت' : 'Done')}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Salawat Button */}
        <button
          type="button"
          onClick={() => setPraisesCount((c) => c + 1)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
        >
          <Heart className="w-4 h-4 fill-white" />
          <span>{isAr ? 'اللهم صلِّ وسلّم على نبينا محمد ﷺ' : 'Blessings upon Prophet Muhammad ﷺ'}</span>
          {praisesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              +{praisesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
        >
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isAr ? 'متابعة العمل ومواصلة التحضير' : 'Resume work'}</span>
        </button>
      </div>
    </div>
  );
}
