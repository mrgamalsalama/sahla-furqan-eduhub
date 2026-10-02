import { useState } from 'react';
import {
  Presentation, Sparkles, Loader2, AlertCircle, Sliders,
  Play, Download, Printer, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Edit3, Check, Palette, Eye, Layout, BookOpen, Layers, Share2,
  BookmarkPlus
} from 'lucide-react';
import type { LessonSettings, OutputType, GenerationResult } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN } from '@/types';
import { getLessonSettings, saveLessonSettings, saveLesson } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import {
  GAMMA_THEMES,
  parseHtmlToGammaSlides,
  exportGammaSlidesToPptx
} from '@/lib/gammaPptx';
import type { GammaSlide, GammaThemeId } from '@/lib/gammaPptx';
import GammaPresenterModal from './GammaPresenterModal';
import { saveCloudResource, getCurrentUser } from '@/lib/supabase';

interface PresentationStudioProps {
  onOpenResult?: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function PresentationStudio({ onOpenResult, uiLang }: PresentationStudioProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  // Settings
  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      lessonTitle: saved.lessonTitle || '',
      presentationSettings: saved.presentationSettings || {
        slideCount: 8,
        depthLevel: 'detailed',
        visualTheme: 'tech_blue',
      },
    };
  });

  const [selectedTheme, setSelectedTheme] = useState<GammaThemeId>('navy');
  const [presentationTone, setPresentationTone] = useState<string>('interactive');

  // Generator states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gamma Outline Step
  const [isOutlineMode, setIsOutlineMode] = useState(false);
  const [outlineCards, setOutlineCards] = useState<Array<{ id: string; title: string; category: string }>>([]);

  // Generated Deck & Canvas
  const [slides, setSlides] = useState<GammaSlide[]>([]);
  const [isDeckReady, setIsDeckReady] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPoints, setEditPoints] = useState('');

  // Presenter Modal
  const [isPresenting, setIsPresenting] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const themeConfig = GAMMA_THEMES[selectedTheme] || GAMMA_THEMES.navy;
  const ps = settings.presentationSettings || {};

  // 1. Generate Outline (Gamma-style Step 1)
  function handleGenerateOutline() {
    if (!settings.subject || !settings.grade || !settings.lessonTitle.trim()) {
      setError(isAr ? 'يرجى إدخال المادة والصف وعنوان العرض أولاً لتوليد المخطط.' : 'Please enter subject, grade, and presentation title.');
      return;
    }
    setError(null);

    const count = ps.slideCount || 8;
    const baseTitle = settings.lessonTitle.trim();

    // Default intelligent outline structure
    const generatedOutline = [
      { id: '1', title: `${baseTitle}: التهيئة والأهداف النواتج`, category: 'الافتتاحية' },
      { id: '2', title: `المفاهيم التأسيسية والقواعد الجوهرية`, category: 'البناء المعرفي' },
      { id: '3', title: `أمثلة تطبيقية ونماذج واقعية`, category: 'التحليل والتطبيق' },
      { id: '4', title: `مقارنة وفحص الحالات الشائعة`, category: 'الربط والمقارنة' },
      { id: '5', title: `نشاط صفي وتحدي تفكير ناقد`, category: 'التطبيق التفاعلي' },
      { id: '6', title: `سؤال تفاعلي واستطلاع فهم الطلاب`, category: 'التقويم التكويني' },
      { id: '7', title: `الخلاصة وأهم التوصيات الذهبية`, category: 'التلخيص' },
      { id: '8', title: `التكليف الإثرائي ومهمة البحث المنزلي`, category: 'الخاتمة' },
    ].slice(0, count);

    setOutlineCards(generatedOutline);
    setIsOutlineMode(true);
  }

  // 2. Full Deck Generation (Gemini AI with Gamma Cards Prompt)
  async function handleGenerateFullDeck() {
    if (!settings.subject || !settings.grade) {
      setError(isAr ? 'يرجى تحديد المادة والصف الدراسي.' : 'Please select subject and grade.');
      return;
    }
    setError(null);
    setLoading(true);

    const finalSettings: LessonSettings = {
      ...settings,
      contentLanguage: uiLang,
      presentationSettings: {
        ...ps,
        slideCount: outlineCards.length > 0 ? outlineCards.length : (ps.slideCount || 8),
      },
    };
    saveLessonSettings(finalSettings);

    try {
      const result = await generateContent(finalSettings, 'slides', []);
      const parsed = parseHtmlToGammaSlides(result.htmlContent);
      setSlides(parsed);
      setIsDeckReady(true);
      setIsOutlineMode(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || (isAr ? 'حدث خطأ أثناء توليد شرائح Gamma.' : 'Failed to generate Gamma deck.'));
    } finally {
      setLoading(false);
    }
  }

  // Edit in place
  function startEditSlide(slide: GammaSlide) {
    setEditingSlideId(slide.id);
    setEditTitle(slide.title);
    setEditPoints(slide.points.join('\n'));
  }

  function saveEditedSlide(slideId: string) {
    const lines = editPoints.split('\n').map((l) => l.trim()).filter(Boolean);
    setSlides((prev) =>
      prev.map((s) =>
        s.id === slideId
          ? { ...s, title: editTitle.trim() || s.title, points: lines.length > 0 ? lines : s.points }
          : s
      )
    );
    setEditingSlideId(null);
  }

  // Card order operations
  function moveSlide(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((s, idx) => ({ ...s, index: idx + 1 }));
    });
  }

  function duplicateSlide(index: number) {
    const current = slides[index];
    const newSlide: GammaSlide = {
      ...current,
      id: `slide_${Date.now()}`,
      title: `${current.title} (نسخة)`,
      index: index + 2,
    };
    setSlides((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newSlide);
      return copy.map((s, idx) => ({ ...s, index: idx + 1 }));
    });
  }

  function deleteSlide(index: number) {
    if (slides.length <= 1) return;
    setSlides((prev) =>
      prev.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, index: idx + 1 }))
    );
  }

  function addNewSlide() {
    const newSlide: GammaSlide = {
      id: `slide_${Date.now()}`,
      index: slides.length + 1,
      title: 'شريحة جديدة (مفهوم أو نشاط)',
      category: 'محتوى إضافي',
      layout: 'standard',
      contentHtml: '',
      points: ['نقطة رئيسية 1', 'نقطة رئيسية 2 مع تطبيق صفي'],
      teacherScript: 'توجيهات المعلم للشرح والمناقشة',
    };
    setSlides((prev) => [...prev, newSlide]);
  }

  // Direct PPTX export
  async function handleExportPptx() {
    if (slides.length === 0) return;
    setExportingPptx(true);
    try {
      const schoolName = settings.institution === 'furqan'
        ? 'مدارس الفرقان العالمية'
        : 'أكاديمية سهلة الدولية';
      await exportGammaSlidesToPptx(slides, selectedTheme, settings.lessonTitle || 'عرض_تقديمي_Gamma', schoolName);
    } catch (err) {
      console.error('PPTX export error:', err);
      alert('حدث خطأ أثناء تصدير ملف PowerPoint، يرجى المحاولة ثانية.');
    } finally {
      setExportingPptx(false);
    }
  }

  // Save to Library & Supabase
  async function handleSaveToLibrary() {
    const fullHtml = slides.map((s) => `
      <div class="slide" data-slide-index="${s.index}" data-layout="${s.layout}" style="border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:24px; background:#ffffff;">
        <h2>${s.title}</h2>
        <ul>${s.points.map((p) => `<li>${p}</li>`).join('')}</ul>
        ${s.teacherScript ? `<div class="teacher-notes">${s.teacherScript}</div>` : ''}
      </div>
    `).join('');

    const savedLesson = {
      id: `gamma_${Date.now()}`,
      title: settings.lessonTitle || 'عرض تقديمي Gamma',
      outputType: 'slides' as OutputType,
      settings: settings,
      contentHtml: fullHtml,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: false,
    };

    saveLesson(savedLesson);

    const user = await getCurrentUser();
    if (user) {
      await saveCloudResource(savedLesson, user, false);
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in" dir="rtl">
      {/* Gamma Header Banner */}
      <div className="relative mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border border-indigo-900/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-teal-300 text-xs font-bold mb-3 shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>نظام عروض Gamma الذكي (Gamma-Grade Presentation Studio)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              استوديو عروض البوربوينت التفاعلية
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              توليد عروض تقديمية ببطاقات ذكية عريضة (16:9) مع تخطيطات متباينة وسيناريو الشرح الصفي للمعلم، ودعم فوري للتصدير لـ PowerPoint (.pptx).
            </p>
          </div>

          {/* Quick Stats or Actions if deck ready */}
          {isDeckReady && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPresenting(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>بدء العرض المسرحي (Present)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPptx}
                disabled={exportingPptx}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold border border-white/20 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exportingPptx ? 'جارٍ التصدير...' : 'تصدير بوربوينت (.pptx)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-800 font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: CREATION WIZARD & OUTLINE BUILDER */}
      {!isDeckReady && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>تخصيص موضوع العرض ونمط الشرح</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              أدخل بيانات الدرس وسيتولى محرك الذكاء الاصطناعي بناء هيكل العرض التفاعلي على طريقة بطاقات Gamma.
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المادة الدراسية:
              </label>
              <select
                value={settings.subject}
                onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              >
                <option value="">-- اختر المادة الدراسية --</option>
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                    {isAr ? sub.ar : sub.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الصف الدراسي:
              </label>
              <select
                value={settings.grade}
                onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              >
                <option value="">-- اختر الصف الدراسي --</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان العرض التقديمي أو المفهوم المستهدف:
              </label>
              <input
                type="text"
                value={settings.lessonTitle}
                onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
                placeholder="مثال: كان وأخواتها - المعاني وعملها الإعرابي"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              >
              </input>
            </div>
          </div>

          {/* Cards Count & Themes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عدد بطاقات العرض (Slide Cards):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[6, 8, 10, 12, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        presentationSettings: { ...ps, slideCount: cnt },
                      })
                    }
                    className={`py-2 text-center rounded-xl border text-xs font-bold transition-all ${
                      (ps.slideCount || 8) === cnt
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    {cnt} بطاقات
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                طابع الألوان المفضل (Gamma Theme):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(GAMMA_THEMES) as GammaThemeId[]).map((tid) => {
                  const th = GAMMA_THEMES[tid];
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => setSelectedTheme(tid)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        selectedTheme === tid
                          ? 'border-indigo-600 ring-2 ring-indigo-500 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: `#${th.bgHex}` }}
                      />
                      <span className="text-[10px] font-bold text-slate-700 truncate w-full">
                        {th.nameEn.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Presentation Tone / Persona */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أسلوب الطرح والشرح:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'interactive', label: '🎓 أكاديمي تفاعلي', desc: 'شرح معياري وأمثلة وتطبيقات' },
                { id: 'story', label: '📖 أسلوب قصصي ملهم', desc: 'سرد مشوق يربط الدروس بالحياة' },
                { id: 'analytical', label: '🔬 تحليلي استقصائي', desc: 'مقارنات، أدلة وتفكير ناقد' },
                { id: 'visual_k12', label: '🎨 مبسط ممتع (K-12)', desc: 'للمراحل المبكرة والتأسيسية' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPresentationTone(item.id)}
                  className={`p-3 rounded-2xl border text-start transition-all ${
                    presentationTone === item.id
                      ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-500 text-indigo-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="text-xs font-bold mb-0.5">{item.label}</div>
                  <div className="text-[11px] text-slate-500">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* GAMMA OUTLINE PREVIEW (IF ACTIVE) */}
          {isOutlineMode && (
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>مخطط بطاقات العرض المقترحة (تعديل مباشر):</span>
                </span>
                <span className="text-[11px] text-indigo-700 font-semibold">
                  {outlineCards.length} بطاقات
                </span>
              </div>

              <div className="space-y-2">
                {outlineCards.map((card, idx) => (
                  <div key={card.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutlineCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, title: val } : c))
                        );
                      }}
                      className="flex-1 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold shrink-0">
                      {card.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOutlineCards((prev) => prev.filter((c) => c.id !== card.id))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setOutlineCards((prev) => [
                    ...prev,
                    { id: `${Date.now()}`, title: 'بطاقة محتوى إضافية', category: 'تطبيق' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بطاقة إلى المخطط</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {!isOutlineMode ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerateOutline}
                  className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>🪄 بناء وتخصيص المخطط أولاً</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateFullDeck}
                  className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد شرائح Gamma مع التشكيل الكامل...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-300" />
                      <span>🚀 توليد العرض بالكامل فوراً</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateFullDeck}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري توليد الشرائح بناءً على المخطط المحدد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    <span>🚀 إنشاء شرائح Gamma التفاعلية الآن ({outlineCards.length} بطاقات)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE GAMMA CARDS CANVAS */}
      {isDeckReady && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>طابع الألوان:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {(Object.keys(GAMMA_THEMES) as GammaThemeId[]).map((tid) => {
                  const th = GAMMA_THEMES[tid];
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => setSelectedTheme(tid)}
                      title={th.nameAr}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedTheme === tid
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `#${th.bgHex}` }}
                      />
                      <span>{th.nameEn.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addNewSlide}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة بطاقة</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToLibrary}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                <BookmarkPlus className="w-4 h-4 text-blue-700" />
                <span>{savedFeedback ? 'تم الحفظ في مكتبتي ✅' : 'حفظ في مكتبتي'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPptx}
                disabled={exportingPptx}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-sm transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exportingPptx ? 'جارٍ تصدير البوربوينت...' : 'تصدير بوربوينت (.pptx)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPresenting(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-md transition"
              >
                <Play className="w-4 h-4 fill-current text-teal-400" />
                <span>عرض الشرائح (Present)</span>
              </button>
            </div>
          </div>

          {/* Cards List / Canvas */}
          <div className="space-y-6">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="rounded-3xl shadow-sm border transition-all duration-200 overflow-hidden"
                style={{
                  backgroundColor: slide.layout === 'hero' ? `#${themeConfig.bgHex}` : themeConfig.isDark ? `#${themeConfig.bgHex}` : '#FFFFFF',
                  color: slide.layout === 'hero' ? '#FFFFFF' : themeConfig.isDark ? '#F8FAFC' : `#${themeConfig.textHex}`,
                  borderColor: `#${themeConfig.borderHex}`,
                }}
              >
                {/* Card Top Toolbar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-current/10 bg-black/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                      style={{
                        backgroundColor: `#${themeConfig.accentHex}20`,
                        color: `#${themeConfig.accentHex}`,
                      }}
                    >
                      بطاقة {idx + 1} من {slides.length}
                    </span>
                    <span className="text-xs opacity-70 font-semibold">
                      {slide.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlide(idx, 'up')}
                      className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={() => moveSlide(idx, 'down')}
                      className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateSlide(idx)}
                      className="p-1.5 rounded-lg hover:bg-black/10 transition"
                      title="تكرار البطاقة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditSlide(slide)}
                      className="p-1.5 rounded-lg hover:bg-black/10 transition"
                      title="تعديل المحتوى"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSlide(idx)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 transition"
                      title="حذف البطاقة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="p-6 sm:p-10">
                  {editingSlideId === slide.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold mb-1 opacity-80">عنوان الشريحة:</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 opacity-80">النقاط (كل نقطة في سطر):</label>
                        <textarea
                          rows={4}
                          value={editPoints}
                          onChange={(e) => setEditPoints(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white text-slate-900 border border-slate-300"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditedSlide(slide.id)}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>حفظ التعديلات</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSlideId(null)}
                          className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-6">
                        {slide.title}
                      </h3>

                      {slide.points.length > 0 ? (
                        <div className={`grid gap-3.5 ${slide.points.length >= 3 && slide.layout === 'grid' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                          {slide.points.map((pt, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-4 rounded-2xl transition"
                              style={{
                                backgroundColor: themeConfig.isDark ? '#1E293B60' : '#F8FAFC',
                                border: `1px solid ${themeConfig.isDark ? '#334155' : '#E2E8F0'}`,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 text-white"
                                  style={{ backgroundColor: `#${themeConfig.accentHex}` }}
                                >
                                  {pIdx + 1}
                                </span>
                                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                                  {pt}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="prose max-w-none text-xs sm:text-sm"
                          dangerouslySetInnerHTML={{ __html: slide.contentHtml }}
                        />
                      )}
                    </div>
                  )}

                  {/* Teacher Speaker Notes Drawer */}
                  {slide.teacherScript && (
                    <div className="mt-6 pt-4 border-t border-current/10">
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-bold flex items-center justify-between text-indigo-500 hover:text-indigo-400 select-none">
                          <span className="flex items-center gap-1.5">
                            <span>🎙️ دليل وسيناريو الشرح للمعلم (Teacher Script)</span>
                          </span>
                          <span className="text-[11px] opacity-70 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-2.5 p-3.5 rounded-xl bg-black/5 border border-current/10 text-xs leading-relaxed opacity-90">
                          <p>{slide.teacherScript}</p>
                          {slide.discussionPrompt && (
                            <div className="mt-2 font-bold text-amber-500">
                              سؤال تحفيزي: {slide.discussionPrompt}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN PRESENTER MODAL */}
      <GammaPresenterModal
        isOpen={isPresenting}
        onClose={() => setIsPresenting(false)}
        slides={slides}
        themeId={selectedTheme}
      />
    </div>
  );
}
