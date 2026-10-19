import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Gamepad2, Layers, Download, Copy, Check, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, Shuffle, RotateCcw, Sparkles, HelpCircle,
  FileSpreadsheet, ArrowLeft, ArrowRight, X, ExternalLink
} from 'lucide-react';
import type { UILang } from '@/lib/i18n';
import { downloadKahootXlsx } from '@/lib/kahootExporter';

interface InteractiveActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  uiLang: UILang;
  lessonTitle?: string;
}

interface ParsedCard {
  id: number;
  question: string;
  choices?: string[];
  correctAnswer?: string;
  explanation?: string;
  concept?: string;
  level?: string;
}

export default function InteractiveActivitiesModal({
  isOpen,
  onClose,
  htmlContent,
  uiLang,
  lessonTitle = 'الأنشطة التفاعلية والبطاقات',
}: InteractiveActivitiesModalProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [activeTab, setActiveTab] = useState<'flashcards' | 'kahoot' | 'quizizz' | 'google-forms'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Student Mastery tracking
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());
  const [reviewIds, setReviewIds] = useState<Set<number>>(new Set());

  const modalRef = useRef<HTMLDivElement>(null);

  // Extract questions / flashcards from HTML
  const cards: ParsedCard[] = useMemo(() => {
    if (!htmlContent) return [];

    const extracted: ParsedCard[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 1. Try finding table rows with questions (Standard Sahlah/Furqan Exam tables)
    const rows = Array.from(doc.querySelectorAll('table tr'));
    let qCount = 0;

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
      // Check if row has question structure: [#, Question, A, B, C, D]
      if (cells.length >= 6 && /^\d+$/.test(cells[0])) {
        qCount++;
        extracted.push({
          id: qCount,
          question: cells[1],
          choices: [cells[2], cells[3], cells[4], cells[5]],
          correctAnswer: cells[2], // Default or will match from answer key
          explanation: `خيار أ: ${cells[2]} | خيار ب: ${cells[3]} | خيار ج: ${cells[4]} | خيار د: ${cells[5]}`,
          level: `سؤال تقويمي #${qCount}`,
        });
      }
    }

    // 2. If table search yielded items, check for answer key section
    if (extracted.length > 0) {
      // Look for answer key text to correlate correct answers
      const text = doc.body.textContent || '';
      extracted.forEach((c) => {
        const regex = new RegExp(`(?:السؤال|Q)?\\s*${c.id}[:.-]?\\s*(?:الإجابة|الخيار)?\\s*([أ-دA-Da-d1-4]|\\([^)]+\\))`, 'i');
        const match = text.match(regex);
        if (match && c.choices && c.choices.length >= 4) {
          const letter = match[1].toLowerCase().replace(/[()]/g, '').trim();
          if (letter === 'أ' || letter === 'a' || letter === '1') c.correctAnswer = c.choices[0];
          else if (letter === 'ب' || letter === 'b' || letter === '2') c.correctAnswer = c.choices[1];
          else if (letter === 'ج' || letter === 'c' || letter === '3') c.correctAnswer = c.choices[2];
          else if (letter === 'د' || letter === 'd' || letter === '4') c.correctAnswer = c.choices[3];
        }
      });
      return extracted;
    }

    // 3. Fallback: Parse paragraphs, list items, definitions, or table cells
    const listItems = Array.from(doc.querySelectorAll('li, p, h3, h4'));
    let fallbackCount = 0;

    for (const el of listItems) {
      const txt = (el.textContent || '').trim();
      if (txt.length > 25 && (txt.includes('؟') || txt.includes('?') || txt.includes(':') || txt.includes('-'))) {
        fallbackCount++;
        if (fallbackCount > 20) break;

        const parts = txt.includes(':') ? txt.split(':') : txt.split('؟');
        extracted.push({
          id: fallbackCount,
          question: parts[0]?.trim() + (parts[0]?.endsWith('؟') ? '' : '؟'),
          correctAnswer: parts[1]?.trim() || (isAr ? 'الإجابة مشروحة بالتفصيل في سياق الدرس.' : 'Refer to lesson context.'),
          explanation: txt,
          level: `بطاقة معرفية #${fallbackCount}`,
        });
      }
    }

    // If still empty, provide sample cards from topic
    if (extracted.length === 0) {
      extracted.push({
        id: 1,
        question: isAr ? 'ما هو المفهوم الأساسي للدرس؟' : 'What is the primary concept of the lesson?',
        correctAnswer: lessonTitle,
        explanation: isAr ? 'المفهوم المحوري المستهدف في خطة الدرس.' : 'The focal learning objective.',
        level: 'المستوى 1: تذكر وفهم',
      });
    }

    return extracted;
  }, [htmlContent, lessonTitle, isAr]);

  const [activeCards, setActiveCards] = useState<ParsedCard[]>(cards);

  useEffect(() => {
    setActiveCards(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [cards]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || activeTab !== 'flashcards') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleNextCard();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        handlePrevCard();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, currentCardIndex, activeCards.length]);

  function handleNextCard() {
    setIsFlipped(false);
    setCurrentCardIndex((i) => (i + 1) % activeCards.length);
  }

  function handlePrevCard() {
    setIsFlipped(false);
    setCurrentCardIndex((i) => (i - 1 + activeCards.length) % activeCards.length);
  }

  function handleShuffleCards() {
    setIsFlipped(false);
    const shuffled = [...activeCards].sort(() => Math.random() - 0.5);
    setActiveCards(shuffled);
    setCurrentCardIndex(0);
  }

  function markMastered(id: number) {
    setMasteredIds((prev) => new Set(prev).add(id));
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    handleNextCard();
  }

  function markReview(id: number) {
    setReviewIds((prev) => new Set(prev).add(id));
    setMasteredIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    handleNextCard();
  }

  // --- Kahoot CSV Exporter ---
  function generateKahootCsv(): string {
    // Standard Kahoot CSV format:
    // Question - max 120 chars, Answer 1 - max 75 chars, Answer 2 - max 75 chars, Answer 3 - max 75 chars, Answer 4 - max 75 chars, Time limit (sec), Correct answer(s)
    const header = 'Question - max 120 chars,Answer 1 - max 75 chars,Answer 2 - max 75 chars,Answer 3 - max 75 chars,Answer 4 - max 75 chars,Time limit (sec),Correct answer(s)\n';
    const rows = activeCards.map((c) => {
      const cleanQ = `"${(c.question || '').slice(0, 120).replace(/"/g, '""')}"`;
      const choices = c.choices || [c.correctAnswer || 'صح', 'خطأ', 'غير ذلك', 'جميع ما سبق'];
      const a1 = `"${(choices[0] || 'أ').slice(0, 75).replace(/"/g, '""')}"`;
      const a2 = `"${(choices[1] || 'ب').slice(0, 75).replace(/"/g, '""')}"`;
      const a3 = `"${(choices[2] || 'ج').slice(0, 75).replace(/"/g, '""')}"`;
      const a4 = `"${(choices[3] || 'د').slice(0, 75).replace(/"/g, '""')}"`;
      const timeLimit = '30';
      // Find correct index
      let correctIdx = '1';
      if (c.correctAnswer) {
        const found = choices.findIndex((ch) => ch === c.correctAnswer);
        if (found !== -1) correctIdx = String(found + 1);
      }
      return `${cleanQ},${a1},${a2},${a3},${a4},${timeLimit},${correctIdx}`;
    });
    return '\uFEFF' + header + rows.join('\n');
  }

  // --- Quizizz CSV Exporter ---
  function generateQuizizzCsv(): string {
    // Quizizz CSV Format:
    // Question Text,Question Type,Option 1,Option 2,Option 3,Option 4,Correct Answer,Time in seconds,Image Link
    const header = 'Question Text,Question Type,Option 1,Option 2,Option 3,Option 4,Correct Answer,Time in seconds,Image Link\n';
    const rows = activeCards.map((c) => {
      const cleanQ = `"${(c.question || '').replace(/"/g, '""')}"`;
      const choices = c.choices || [c.correctAnswer || 'صح', 'خطأ', 'غير ذلك', 'جميع ما سبق'];
      const a1 = `"${(choices[0] || '').replace(/"/g, '""')}"`;
      const a2 = `"${(choices[1] || '').replace(/"/g, '""')}"`;
      const a3 = `"${(choices[2] || '').replace(/"/g, '""')}"`;
      const a4 = `"${(choices[3] || '').replace(/"/g, '""')}"`;
      let correctIdx = '1';
      if (c.correctAnswer) {
        const found = choices.findIndex((ch) => ch === c.correctAnswer);
        if (found !== -1) correctIdx = String(found + 1);
      }
      return `${cleanQ},Multiple Choice,${a1},${a2},${a3},${a4},${correctIdx},30,`;
    });
    return '\uFEFF' + header + rows.join('\n');
  }

  // --- Google Forms Formatted Text ---
  function generateGoogleFormsText(): string {
    return activeCards
      .map((c, idx) => {
        const qHeader = `${idx + 1}. ${c.question}`;
        const choices = c.choices || [c.correctAnswer || 'صح', 'خطأ'];
        const optionsText = choices
          .map((ch) => (ch === c.correctAnswer ? `* ${ch}` : `  ${ch}`))
          .join('\n');
        return `${qHeader}\n${optionsText}\n`;
      })
      .join('\n');
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text: string, formatName: string) {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 2500);
  }

  if (!isOpen) return null;

  const currentCard = activeCards[currentCardIndex] || {
    id: 1,
    question: 'لا توجد بطاقات متاحة',
    correctAnswer: '—',
  };

  const masteryPercentage = Math.round(
    (masteredIds.size / (activeCards.length || 1)) * 100
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in no-print ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        ref={modalRef}
        dir={isAr ? 'rtl' : 'ltr'}
        className={`bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full max-h-[92vh]'
        }`}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-blue-950 flex items-center justify-center font-bold shadow-md">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{isAr ? 'الأنشطة التفاعلية والبطاقات والمسابقات' : 'Interactive Flashcards & Quiz Exporter'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-blue-950">
                  Kahoot / Quizizz / Cards
                </span>
              </h3>
              <p className="text-xs text-blue-200 truncate max-w-md">{lessonTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title={isFullscreen ? (isAr ? 'تصغير' : 'Exit Fullscreen') : (isAr ? 'عرض السبورة الذكية (ملء الشاشة)' : 'Fullscreen Smartboard')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'flashcards'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{isAr ? '🎴 البطاقات التعليمية للسبورة الذكية' : '🎴 Smartboard Flashcards'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {activeCards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kahoot')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'kahoot'
                ? 'border-purple-700 text-purple-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span>{isAr ? '🚀 تصدير إلى كاهوت (Kahoot)' : '🚀 Export to Kahoot'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quizizz')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'quizizz'
                ? 'border-teal-700 text-teal-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-teal-600" />
            <span>{isAr ? '🎯 تصدير إلى كويزيز (Quizizz)' : '🎯 Export to Quizizz'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google-forms')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'google-forms'
                ? 'border-amber-600 text-amber-700 bg-white shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{isAr ? '📝 نماذج جوجل (Google Forms)' : '📝 Google Forms'}</span>
          </button>
        </div>

        {/* Tab 1: Smartboard Flashcards */}
        {activeTab === 'flashcards' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-between space-y-6">
            {/* Top Toolbar: Counter, Shuffle, Progress */}
            <div className="w-full flex items-center justify-between text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                  {isAr ? `بطاقة ${currentCardIndex + 1} من ${activeCards.length}` : `Card ${currentCardIndex + 1} of ${activeCards.length}`}
                </span>
                <button
                  type="button"
                  onClick={handleShuffleCards}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition"
                  title={isAr ? 'خلط البطاقات عشوائياً' : 'Shuffle cards'}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'خلط' : 'Shuffle'}</span>
                </button>
              </div>

              {/* Mastery Progress Bar */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-700 font-bold">
                  {isAr ? `تم إتقان: ${masteredIds.size}` : `Mastered: ${masteredIds.size}`} ({masteryPercentage}%)
                </span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${masteryPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3D Interactive Flip Card */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full max-w-2xl min-h-[300px] sm:min-h-[360px] cursor-pointer perspective-1000 group select-none"
            >
              <div
                className={`w-full h-full min-h-[300px] sm:min-h-[360px] rounded-3xl p-8 border-2 transition-all duration-500 transform shadow-xl flex flex-col justify-between relative ${
                  isFlipped
                    ? 'bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white border-teal-500/50'
                    : 'bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white border-blue-500/40 hover:border-amber-400/80'
                }`}
              >
                {/* Card Top Label */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-blue-200">
                    {isFlipped
                      ? (isAr ? '💡 الإجابة والشرح النموذجي' : '💡 Answer & Explanation')
                      : (isAr ? `❓ ${currentCard.level || 'السؤال'}` : `❓ ${currentCard.level || 'Question'}`)}
                  </span>
                  <span className="text-xs text-white/60">
                    {isAr ? '(اضغط على البطاقة أو مسافة للقلب)' : '(Click card or Space to flip)'}
                  </span>
                </div>

                {/* Card Center Content */}
                <div className="my-auto py-4 text-center">
                  {!isFlipped ? (
                    <div>
                      <h4 className="text-xl sm:text-2xl font-extrabold leading-relaxed text-white">
                        {currentCard.question}
                      </h4>
                      {currentCard.choices && currentCard.choices.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 text-start max-w-lg mx-auto">
                          {currentCard.choices.map((choice, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100"
                            >
                              <span className="font-bold text-amber-300 ml-1.5">
                                {['أ', 'ب', 'ج', 'د'][cIdx] || cIdx + 1}.
                              </span>
                              {choice}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="inline-block px-4 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-extrabold mb-1">
                        {isAr ? '✅ الإجابة الصحيحة:' : '✅ Correct Answer:'}
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                        {currentCard.correctAnswer}
                      </div>
                      {currentCard.explanation && (
                        <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed max-w-lg mx-auto mt-3">
                          {currentCard.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Bottom Indicator */}
                <div className="flex items-center justify-between text-xs text-white/50 pt-3 border-t border-white/10">
                  <span>{lessonTitle}</span>
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isFlipped ? (isAr ? 'عرض السؤال' : 'Show Question') : (isAr ? 'كشف الإجابة' : 'Reveal Answer')}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Controls: Prev, Mastery Buttons, Next */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 max-w-2xl">
              <button
                type="button"
                onClick={handlePrevCard}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
                <span>{isAr ? 'السابق' : 'Previous'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markReview(currentCard.id)}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>🔁</span>
                  <span>{isAr ? 'بحاجة لمراجعة' : 'Need Review'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => markMastered(currentCard.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>✅</span>
                  <span>{isAr ? 'أتقنتها بنجاح' : 'Mastered'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleNextCard}
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <span>{isAr ? 'التالي' : 'Next'}</span>
                <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Kahoot Exporter */}
        {activeTab === 'kahoot' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border border-purple-200 text-purple-900 flex items-start gap-3 shadow-xs">
              <FileSpreadsheet className="w-6 h-6 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm mb-1 text-purple-950 flex items-center gap-2">
                  <span>{isAr ? 'تصدير الأسئلة إلى قالب إكسل الرسمي لمنصة كاهوت (.xlsx)' : 'Official Kahoot Excel Template (.xlsx)'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white">
                    Official .xlsx
                  </span>
                </h4>
                <p className="text-xs text-purple-900 leading-relaxed">
                  {isAr
                    ? 'يتم تصدير الأسئلة مباشرة كملف إكسل معتمد بصيغة (.xlsx) مطابق 100% لقالب كاهوت الرسمي (KahootQuizTemplate). يمكنك رفعه مباشرة إلى منصة Kahoot عبر خيار "Import spreadsheet" دون الحاجة لفتحه أو إعادة حفظه!'
                    : 'Exports quiz questions directly into the official Kahoot Excel (.xlsx) template format. Ready to upload directly to Kahoot creator without manual adjustments.'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => downloadKahootXlsx(activeCards, lessonTitle)}
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>{isAr ? 'تحميل ملف كاهوت الرسمي (.xlsx)' : 'Download Kahoot Excel (.xlsx)'}</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(generateKahootCsv(), 'kahoot')}
                className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {copiedFormat === 'kahoot' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFormat === 'kahoot' ? (isAr ? 'تم نسخ النص!' : 'Copied!') : (isAr ? 'نسخ كنص CSV' : 'Copy CSV Text')}</span>
              </button>

              <a
                href="https://create.kahoot.it"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1 ms-auto"
              >
                <span>{isAr ? 'فتح موقع كاهوت للاستيراد' : 'Open Kahoot Creator'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-900">
                {isAr ? '📌 خطوات رفع الملف على منصة Kahoot:' : '📌 How to import to Kahoot:'}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] sm:text-xs">
                <li>{isAr ? 'اضغط على زر "تحميل ملف كاهوت الرسمي (.xlsx)" بالأعلى لحفظ الملف على جهازك.' : 'Click "Download Kahoot Excel (.xlsx)" above to save the file.'}</li>
                <li>{isAr ? 'سجل دخولك في حسابك على كاهوت ثم أنشئ مسابقة جديدة (Create New Kahoot).' : 'Log in to create.kahoot.it and start a new Kahoot quiz.'}</li>
                <li>{isAr ? 'في القائمة الجانبية اليسرى اضغط "Add question" ثم اختر "Import spreadsheet".' : 'In the left panel, click "Add question" then select "Import spreadsheet".'}</li>
                <li>{isAr ? 'اسحب ملف (.xlsx) المحمّل وأفلته ليتم بناء أسئلة الكويز في ثوانٍ!' : 'Drag & drop the downloaded (.xlsx) file to instantly populate your quiz.'}</li>
              </ol>
            </div>

            {/* Preview Spreadsheet Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {isAr ? 'معاينة أعمدة قالب الإكسل (مطابقة لقالب كاهوت الرسمي):' : 'Kahoot Spreadsheet Template Preview:'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isAr ? `إجمالي الأسئلة: ${activeCards.length}` : `Total Questions: ${activeCards.length}`}
                </span>
              </div>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-[11px] text-right border-collapse">
                    <thead className="bg-purple-900 text-white font-bold sticky top-0">
                      <tr>
                        <th className="p-2 border border-purple-800 text-center w-8">#</th>
                        <th className="p-2 border border-purple-800 min-w-[180px]">{isAr ? 'السؤال (أقصى 120 حرف)' : 'Question (Max 120)'}</th>
                        <th className="p-2 border border-purple-800 min-w-[100px]">{isAr ? 'الخيار 1 (أقصى 75)' : 'Answer 1 (Max 75)'}</th>
                        <th className="p-2 border border-purple-800 min-w-[100px]">{isAr ? 'الخيار 2 (أقصى 75)' : 'Answer 2 (Max 75)'}</th>
                        <th className="p-2 border border-purple-800 min-w-[100px]">{isAr ? 'الخيار 3' : 'Answer 3'}</th>
                        <th className="p-2 border border-purple-800 min-w-[100px]">{isAr ? 'الخيار 4' : 'Answer 4'}</th>
                        <th className="p-2 border border-purple-800 text-center w-14">{isAr ? 'الوقت' : 'Time'}</th>
                        <th className="p-2 border border-purple-800 text-center w-16">{isAr ? 'الصحيحة' : 'Correct'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeCards.slice(0, 10).map((card, idx) => {
                        const choices = card.choices || [card.correctAnswer || 'صح', 'خطأ'];
                        let correctIdx = 1;
                        if (card.correctAnswer) {
                          const found = choices.findIndex((ch) => ch === card.correctAnswer);
                          if (found !== -1) correctIdx = found + 1;
                        }
                        return (
                          <tr key={card.id} className="hover:bg-purple-50/40 transition">
                            <td className="p-2 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-2 border border-slate-200 font-semibold text-slate-900 truncate max-w-[200px]" title={card.question}>
                              {card.question}
                            </td>
                            <td className="p-2 border border-slate-200 text-slate-700 truncate max-w-[120px]">{choices[0] || '—'}</td>
                            <td className="p-2 border border-slate-200 text-slate-700 truncate max-w-[120px]">{choices[1] || '—'}</td>
                            <td className="p-2 border border-slate-200 text-slate-700 truncate max-w-[120px]">{choices[2] || '—'}</td>
                            <td className="p-2 border border-slate-200 text-slate-700 truncate max-w-[120px]">{choices[3] || '—'}</td>
                            <td className="p-2 border border-slate-200 text-center text-purple-700 font-bold">30s</td>
                            <td className="p-2 border border-slate-200 text-center font-extrabold text-emerald-700 bg-emerald-50/50">
                              #{correctIdx}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Quizizz Exporter */}
        {activeTab === 'quizizz' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-start gap-3">
              <Gamepad2 className="w-6 h-6 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm mb-1">
                  {isAr ? 'تصدير الأسئلة إلى منصة Quizizz التفاعلية' : 'Official Quizizz Importer Format'}
                </h4>
                <p className="text-xs text-teal-800 leading-relaxed">
                  {isAr
                    ? 'قالب CSV مطابق لمواصفات استيراد كويزيز (Quizizz Spreadsheet Template). يتيح للطلاب التنافس في الوقت الفعلي أو إرسال الاختبار كواجب منزلي ذكي ممتع.'
                    : 'Download CSV file structured for direct spreadsheet import on Quizizz.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    generateQuizizzCsv(),
                    `Quizizz_${lessonTitle.replace(/\s+/g, '_')}.csv`,
                    'text/csv;charset=utf-8;'
                  )
                }
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-teal-700 hover:bg-teal-800"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل ملف كويزيز (.csv)' : 'Download Quizizz (.csv)'}</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(generateQuizizzCsv(), 'quizizz')}
                className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {copiedFormat === 'quizizz' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFormat === 'quizizz' ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كود CSV' : 'Copy CSV')}</span>
              </button>

              <a
                href="https://quizizz.com/admin"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1 ms-auto"
              >
                <span>{isAr ? 'فتح منصة Quizizz' : 'Open Quizizz'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Preview Box */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">
                {isAr ? 'معاينة هيكل ملف كويزيز:' : 'Quizizz CSV Preview:'}
              </span>
              <pre className="p-4 rounded-2xl bg-slate-900 text-teal-200 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
                {generateQuizizzCsv().split('\n').slice(0, 4).join('\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Google Forms */}
        {activeTab === 'google-forms' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm mb-1">
                  {isAr ? 'تصدير لنماذج جوجل (Google Forms)' : 'Google Forms Formatted Importer'}
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {isAr
                    ? 'نصوص منسقة جاهزة للنسخ المباشر في نماذج جوجل أو استيرادها عبر إضافة Form Builder بنقرة واحدة مع تحديد الإجابات الصحيحة بعلامة النجمة (*).'
                    : 'Structured text formatted for Google Forms quizzes and Form Builder add-ons.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(generateGoogleFormsText(), 'gforms')}
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
              >
                {copiedFormat === 'gforms' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFormat === 'gforms' ? (isAr ? 'تم النسخ بنجاح!' : 'Copied!') : (isAr ? 'نسخ لـ Google Forms' : 'Copy for Google Forms')}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    generateGoogleFormsText(),
                    `Google_Forms_${lessonTitle.replace(/\s+/g, '_')}.txt`,
                    'text/plain;charset=utf-8;'
                  )
                }
                className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل كملف نصي (.txt)' : 'Download (.txt)'}</span>
              </button>
            </div>

            {/* Preview Box */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">
                {isAr ? 'معاينة نص نماذج جوجل:' : 'Google Forms Text Preview:'}
              </span>
              <pre className="p-4 rounded-2xl bg-slate-900 text-amber-100 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
                {generateGoogleFormsText().slice(0, 500)}...
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
