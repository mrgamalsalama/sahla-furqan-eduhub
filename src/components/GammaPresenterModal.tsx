import { useState, useEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, Maximize2, Minimize2,
  Volume2, MessageSquare, Sparkles, CheckCircle2
} from 'lucide-react';
import type { GammaSlide, GammaThemeId } from '@/lib/gammaPptx';
import { GAMMA_THEMES } from '@/lib/gammaPptx';

interface GammaPresenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: GammaSlide[];
  themeId: GammaThemeId;
  initialSlideIndex?: number;
}

export default function GammaPresenterModal({
  isOpen,
  onClose,
  slides,
  themeId,
  initialSlideIndex = 0,
}: GammaPresenterModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialSlideIndex);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialSlideIndex);
  }, [initialSlideIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];
  const theme = GAMMA_THEMES[themeId] || GAMMA_THEMES.navy;
  const progressPercent = ((currentIndex + 1) / slides.length) * 100;

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between text-white select-none animate-fade-in no-print" dir="rtl">
      {/* Top Floating Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {currentSlide.title}
            </h4>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{currentSlide.category}</span>
              <span>·</span>
              <span>شريحة {currentIndex + 1} من {slides.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Notes */}
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              showNotes
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{showNotes ? 'إخفاء سيناريو المعلم' : 'سيناريو المعلم'}</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition border border-rose-500/30"
            title="إنهاء العرض (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Canvas (16:9 Stage) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
        <div
          className="w-full max-w-5xl aspect-video rounded-3xl shadow-2xl p-8 sm:p-14 flex flex-col justify-between transition-all duration-300 overflow-y-auto"
          style={{
            backgroundColor: currentSlide.layout === 'hero' ? `#${theme.bgHex}` : theme.isDark ? `#${theme.bgHex}` : '#FFFFFF',
            color: currentSlide.layout === 'hero' ? '#FFFFFF' : theme.isDark ? '#F8FAFC' : `#${theme.textHex}`,
            border: `2px solid #${theme.borderHex}`,
          }}
        >
          {/* Slide Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span
                className="px-3.5 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: `#${theme.accentHex}20`,
                  color: `#${theme.accentHex}`,
                  border: `1px solid #${theme.accentHex}40`,
                }}
              >
                {currentSlide.category}
              </span>
              <span className="text-xs opacity-60 font-semibold">
                شريحة {currentIndex + 1} / {slides.length}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug mb-4">
              {currentSlide.title}
            </h2>
          </div>

          {/* Slide Body */}
          <div className="my-auto py-2">
            {currentSlide.points.length > 0 ? (
              <div className={`grid gap-3 sm:gap-4 ${currentSlide.points.length >= 3 && currentSlide.layout === 'grid' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                {currentSlide.points.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl transition-all"
                    style={{
                      backgroundColor: theme.isDark ? '#1E293B80' : '#F8FAFC',
                      border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs mt-0.5"
                        style={{
                          backgroundColor: `#${theme.accentHex}`,
                          color: '#FFFFFF',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed font-medium">
                        {point}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="prose max-w-none text-base sm:text-lg"
                dangerouslySetInnerHTML={{ __html: currentSlide.contentHtml }}
              />
            )}
          </div>

          {/* Footer of Slide */}
          <div className="pt-4 border-t border-current/10 flex items-center justify-between text-xs opacity-60">
            <span>منصة سهلة & الفرقان التعليمية</span>
            <span>استخدم مفاتيح الأسهم للتبديل بين الشرائح</span>
          </div>
        </div>

        {/* Floating Speaker Notes Panel */}
        {showNotes && (
          <div className="absolute bottom-20 left-8 sm:left-12 max-w-md w-full bg-slate-900/95 border border-amber-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-scale-in text-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>دليل وسيناريو الشرح للمعلم</span>
              </span>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">
              {currentSlide.teacherScript || 'اشرح المفاهيم الرئيسية للطلاب مستخدماً الأمثلة التطبيقية التفاعلية، ووجّه السؤال للنقاش الصفي.'}
            </p>
            {currentSlide.discussionPrompt && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <strong>سؤال تحفيزي: </strong> {currentSlide.discussionPrompt}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-900/80 border-t border-white/10 px-6 py-3">
        {/* Progress bar */}
        <div className="w-full bg-white/10 h-1 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-teal-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 font-medium">
            شريحة <span className="font-bold text-white">{currentIndex + 1}</span> من <span className="font-bold text-white">{slides.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابقة</span>
            </button>

            <button
              type="button"
              disabled={currentIndex === slides.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))}
              className="flex items-center gap-1 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold disabled:opacity-30 transition shadow-md"
            >
              <span>التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
