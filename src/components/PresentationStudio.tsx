import { useState } from 'react';
import {
  Presentation, Sparkles, Loader2, AlertCircle, Sliders
} from 'lucide-react';
import type { LessonSettings, OutputType, GenerationResult, PresentationTheme } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN } from '@/types';
import { getLessonSettings, saveLessonSettings } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface PresentationStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function PresentationStudio({ onOpenResult, uiLang }: PresentationStudioProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      presentationSettings: saved.presentationSettings || {
        slideCount: 10,
        depthLevel: 'detailed',
        visualTheme: 'tech_blue',
      },
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings.subject || !settings.grade) {
      setError(isAr ? 'يرجى تحديد المادة والصف الدراسي.' : 'Please select subject and grade.');
      return;
    }
    setError(null);
    setLoading(true);
    const finalSettings: LessonSettings = {
      ...settings,
      contentLanguage: uiLang,
    };
    saveLessonSettings(finalSettings);

    try {
      const result = await generateContent(finalSettings, 'slides', []);
      onOpenResult(result, 'slides');
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء توليد العرض التقديمي.' : 'Failed to generate presentation.'));
    } finally {
      setLoading(false);
    }
  }

  const ps = settings.presentationSettings || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 mb-3 shadow-xs">
          <Presentation className="w-4 h-4 text-teal-600" />
          <span>{isAr ? 'استوديو العروض التقديمية التفصيلية' : 'Slide Deck & Presentation Studio'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAr ? 'إنشاء عرض تقديمي تفاعلي مع سيناريو الشرح' : 'Create an Engaging Presentation Deck'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          {isAr
            ? 'شرائح تعليمية احترافية مقسمة بعناية مع إمكانية تضمين دليل المعلم وسيناريو الشرح الصفي وأسئلة النقاش، مع دعم التصدير المباشر لملفات PowerPoint (PPTX).'
            : 'Structured slides featuring core content, examples, discussion prompts, and teacher scripts ready for PPTX export.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'المادة الدراسية:' : 'Subject:'}
            </label>
            <select
              value={settings.subject}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isAr ? '-- اختر المادة --' : 'Select Subject'}</option>
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                  {isAr ? sub.ar : sub.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'الصف الدراسي:' : 'Grade Level:'}
            </label>
            <select
              value={settings.grade}
              onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isAr ? '-- اختر الصف --' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'عنوان العرض التقديمي:' : 'Presentation Title / Topic:'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={isAr ? 'مثال: مدخل إلى علم البلاغة - التشبيه وأركانه' : 'e.g. Introduction to Renewable Energy'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Slide customization options */}
        <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-5">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-700" />
            <span>{isAr ? 'تخصيص هيكل الشرائح وعمق المحتوى' : 'Deck Layout & Depth Options'}</span>
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'عدد الشرائح المستهدفة:' : 'Slide Count:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[6, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        presentationSettings: { ...ps, slideCount: count },
                      })
                    }
                    className={`py-2.5 text-center rounded-xl border text-xs font-bold transition-all ${
                      (ps.slideCount || 10) === count
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    {count} {isAr ? 'شرائح' : 'slides'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'الثيم والألوان المقترحة:' : 'Visual Color Theme:'}
              </label>
              <select
                value={ps.visualTheme || 'tech_blue'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    presentationSettings: { ...ps, visualTheme: e.target.value as PresentationTheme },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="tech_blue">{isAr ? 'أزرق أكاديمي تقني (Tech Blue)' : 'Tech Blue'}</option>
                <option value="warm_edu">{isAr ? 'تعليمي دافئ وأنيق (Warm Edu)' : 'Warm Edu'}</option>
                <option value="minimal">{isAr ? 'بسيط أكاديمي (Minimal Academic)' : 'Minimal Academic'}</option>
                <option value="creative_k12">{isAr ? 'حيوي للمراحل المبكرة (Creative K-12)' : 'Creative K-12'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'مستوى عمق المحتوى وسيناريو الشرح:' : 'Content Depth & Teacher Notes:'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    presentationSettings: { ...ps, depthLevel: 'concise' },
                  })
                }
                className={`p-3.5 rounded-xl border text-start transition-all ${
                  ps.depthLevel === 'concise'
                    ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600 text-blue-950 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 shadow-sm'
                }`}
              >
                <div className="font-bold text-xs mb-0.5">{isAr ? 'موجز ورئيسي' : 'Concise'}</div>
                <div className="text-[11px] text-slate-500">{isAr ? 'رؤوس أقلام وأفكار رئيسة مركزة' : 'Core bullets and key ideas'}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    presentationSettings: { ...ps, depthLevel: 'detailed' },
                  })
                }
                className={`p-3.5 rounded-xl border text-start transition-all ${
                  (ps.depthLevel || 'detailed') === 'detailed'
                    ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600 text-blue-950 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 shadow-sm'
                }`}
              >
                <div className="font-bold text-xs mb-0.5">{isAr ? 'تفصيلي تطبيقي' : 'Detailed'}</div>
                <div className="text-[11px] text-slate-500">{isAr ? 'شروحات وافية وأمثلة مرافقة' : 'In-depth notes & examples'}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    presentationSettings: { ...ps, depthLevel: 'comprehensive_script' },
                  })
                }
                className={`p-3.5 rounded-xl border text-start transition-all ${
                  ps.depthLevel === 'comprehensive_script'
                    ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600 text-blue-950 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/30 shadow-sm'
                }`}
              >
                <div className="font-bold text-xs mb-0.5">{isAr ? 'شامل + سيناريو الشرح' : 'With Teacher Script'}</div>
                <div className="text-[11px] text-slate-500">{isAr ? 'صندوق دليل المعلم وسيناريو الإلقاء وأسئلة النقاش' : 'Full speaker notes & prompts'}</div>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري بناء شرائح العرض ودليل المعلم مع التشكيل التام...' : 'Generating presentation deck...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>{isAr ? 'توليد العرض التقديمي الآن' : 'Generate Presentation Deck Now'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
