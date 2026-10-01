import { useState } from 'react';
import {
  FileText, Sparkles, Loader2, AlertCircle, Layers, Sliders, Palette, CheckCircle2
} from 'lucide-react';
import type { LessonSettings, OutputType, GenerationResult, WorksheetTheme } from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, STUDENT_LEVELS_AR, STUDENT_LEVELS_EN
} from '@/types';
import { getLessonSettings, saveLessonSettings } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface WorksheetStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function WorksheetStudio({ onOpenResult, uiLang }: WorksheetStudioProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;
  const studentLevels = isAr ? STUDENT_LEVELS_AR : STUDENT_LEVELS_EN;

  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      worksheetSettings: saved.worksheetSettings || {
        pageCount: 2,
        themeStyle: 'classic',
        aiAutoPilot: true,
        teacherCustomPrompt: '',
        standardsSelection: '',
      },
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings.subject || !settings.grade) {
      setError(isAr ? 'يرجى اختيار المادة والصف الدراسي.' : 'Please choose subject and grade.');
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
      const result = await generateContent(finalSettings, 'worksheet', []);
      onOpenResult(result, 'worksheet');
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء توليد ورقة العمل.' : 'Failed to generate worksheet.'));
    } finally {
      setLoading(false);
    }
  }

  const ws = settings.worksheetSettings || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-50 text-secondary-700 text-xs font-bold border border-secondary-200 mb-3">
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'استوديو أوراق العمل التفاعلية (هرم بلوم)' : 'Interactive Bloom Worksheet Studio'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          {isAr ? 'تصميم ورقة عمل متدرجة وجاهزة للطباعة' : 'Design a Bloom-Aligned Worksheet'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
          {isAr
            ? 'بناء أنشطة وتمارين متدرجة طبقاً لمستويات هرم بلوم (تذكر وفهم، تطبيق وتحليل، تقويم وابتكار) موزعة على صفحات محددة مع فواصل طباعة معتمدة وتشكيل تام 100%.'
            : 'Progressive exercises following Bloom taxonomy with customizable page counts, printable page breaks, and full diacritics.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Core Lesson Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'المادة الدراسية:' : 'Subject:'}
            </label>
            <select
              value={settings.subject}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-secondary-500"
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
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'الصف الدراسي:' : 'Grade Level:'}
            </label>
            <select
              value={settings.grade}
              onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-secondary-500"
            >
              <option value="">{isAr ? '-- اختر الصف --' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'عنوان الدرس أو الموضوع:' : 'Lesson Topic / Title:'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={isAr ? 'مثال: كان وأخواتها وتطبيقاتها الإعرابية' : 'e.g. Fractions and Decimals'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-secondary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'مستوى الطلاب المستهدف:' : 'Student Level:'}
            </label>
            <select
              value={settings.studentLevel}
              onChange={(e) => setSettings({ ...settings, studentLevel: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-secondary-500"
            >
              {studentLevels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customization Controls Box */}
        <div className="bg-secondary-50/40 rounded-xl p-5 border border-secondary-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-secondary-600" />
              <span>{isAr ? 'تخصيص هيكل ورقة العمل والتصميم' : 'Worksheet Structure & Layout'}</span>
            </span>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-800 bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-300">
              <input
                type="checkbox"
                checked={ws.aiAutoPilot !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    worksheetSettings: { ...ws, aiAutoPilot: e.target.checked },
                  })
                }
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{isAr ? 'تفعيل الطيار الآلي لهرم بلوم (AutoPilot)' : 'AI Bloom AutoPilot'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {isAr ? 'عدد الصفحات المطلوب توزيع المحتوى عليها:' : 'Target Page Count:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        worksheetSettings: { ...ws, pageCount: count },
                      })
                    }
                    className={`py-2 text-center rounded-xl border text-xs font-bold transition-all ${
                      (ws.pageCount || 2) === count
                        ? 'bg-secondary-600 text-white border-secondary-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {count} {isAr ? 'صفحات' : 'p.'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {isAr ? 'النمط البصري للتصميم:' : 'Visual Style Theme:'}
              </label>
              <select
                value={ws.themeStyle || 'classic'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    worksheetSettings: { ...ws, themeStyle: e.target.value as WorksheetTheme },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white"
              >
                <option value="classic">{isAr ? 'كلاسيكي أكاديمي رصين (جداول وإطارات)' : 'Classic Academic'}</option>
                <option value="modern">{isAr ? 'عصري وحيوي (بطاقات وأيقونات ناعمة)' : 'Modern Vibrant'}</option>
                <option value="minimal">{isAr ? 'بسيط أحادي موفر للحبر (أبيض وأسود)' : 'Minimal Monochrome'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'توجيهات وأنشطة مخصصة يطلبها المعلم في الورقة (اختياري):' : 'Custom Exercises or Instructions:'}
            </label>
            <textarea
              rows={2}
              value={ws.teacherCustomPrompt || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  worksheetSettings: { ...ws, teacherCustomPrompt: e.target.value },
                })
              }
              placeholder={isAr ? 'مثال: ضع تمريناً لاستخراج الأفعال الناسخة في جدول، وسؤالاً مفتوحاً لإبداء الرأي...' : 'e.g. Focus on contextual vocabulary matching in page 1...'}
              className="w-full text-xs p-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-secondary-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-secondary-600 to-teal-600 hover:from-secondary-700 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري صياغة ورقة العمل وفق هرم بلوم مع التشكيل التام...' : 'Crafting Bloom-aligned worksheet...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{isAr ? 'توليد ورقة العمل التفاعلية الآن' : 'Generate Interactive Worksheet Now'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
