import { useState } from 'react';
import {
  ClipboardList, Sparkles, Loader2, AlertCircle, Mic
} from 'lucide-react';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, DURATIONS_AR, DURATIONS_EN,
  STUDENT_LEVELS_AR, STUDENT_LEVELS_EN, INSTITUTIONS
} from '@/types';
import { getLessonSettings, saveLessonSettings } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import SourceMaterialUpload from './SourceMaterialUpload';
import VoiceToLessonModal from './VoiceToLessonModal';
import AiLoadingDhikr from './AiLoadingDhikr';

interface LessonPlanStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function LessonPlanStudio({ onOpenResult, uiLang }: LessonPlanStudioProps) {
  const isAr = uiLang === 'ar';
  const [settings, setSettings] = useState<LessonSettings>(() => getLessonSettings());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const grades = isAr ? GRADES_AR : GRADES_EN;
  const durations = isAr ? DURATIONS_AR : DURATIONS_EN;
  const studentLevels = isAr ? STUDENT_LEVELS_AR : STUDENT_LEVELS_EN;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings.subject || !settings.grade) {
      setError(isAr ? 'يرجى تحديد المادة والصف الدراسي على الأقل.' : 'Please select subject and grade.');
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
      const result = await generateContent(finalSettings, 'lesson-plan', files);
      onOpenResult(result, 'lesson-plan');
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء توليد خطة الدرس.' : 'Failed to generate lesson plan.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Studio Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 mb-3 shadow-xs">
          <ClipboardList className="w-4 h-4 text-teal-600" />
          <span>{isAr ? 'استوديو خطط الدروس المعتمدة (سهلة & الفرقان)' : 'Official Lesson Plan Studio'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAr ? 'إعداد خطة درس نموذجية متكاملة' : 'Prepare an Approved Lesson Plan'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          {isAr
            ? 'توليد خطة الدرس الرسمية المطابقة لنموذج الاعتماد الأكاديمي مع جداول الترويسة، الأساسيات، مراحل الدرس الخمس، التمايز، والتقييم مع التشكيل التام بنسبة 100%.'
            : 'Generate official lesson plans featuring header tables, 5-phase lesson flow, differentiation, and assessment matrices.'}
        </p>

        {/* Voice-to-Lesson Quick Action Banner */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-blue-950 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-md hover:shadow-xl hover:scale-105 transition-all"
          >
            <Mic className="w-5 h-5 text-blue-950" />
            <span>{isAr ? '🎤 هل لديك أفكار سريعة؟ تحدث بصوتك وسننشئ الخطة فوراً (Voice-to-Lesson)' : '🎤 Speak Your Lesson Ideas (Voice-to-Lesson)'}</span>
          </button>
        </div>
      </div>

      {/* 🌿 دعاء بداية التحضير وتجديد النية */}
      <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-emerald-900 text-xs sm:text-sm font-bold shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-base font-serif">﷽</span>
          <span>
            {isAr
              ? 'بسم الله نبدأ.. اللهم لا سهل إلا ما جعلته سهلاً، وأنت تجعل الحزن إذا شئت سهلاً.'
              : 'In the name of Allah.. O Allah, there is no ease except that which You make easy.'}
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
          {isAr ? 'نحتسب نشر العلم النافع 🌱' : 'Dedicated to beneficial knowledge'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Institution selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {isAr ? 'المؤسسة التعليمية المعتمدة:' : 'Educational Institution:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, institution: 'sahlah' })}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                settings.institution === 'sahlah'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
              }`}
            >
              <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-5 w-auto object-contain" />
              <span>أكاديمية سهلة الدولية</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, institution: 'furqan' })}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                settings.institution === 'furqan'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
              }`}
            >
              <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-6 w-auto object-contain" />
              <span>مدرسة الفرقان العالمية</span>
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, institution: 'both' })}
              className={`flex items-center justify-center gap-1.5 p-3.5 rounded-xl border text-xs font-bold transition-all ${
                settings.institution === 'both'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
              }`}
            >
              <span>سهلة &amp; الفرقان (مشترك)</span>
            </button>
          </div>
        </div>

        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'اسم المعلم / المعلمة:' : 'Teacher Name:'}
            </label>
            <input
              type="text"
              value={settings.teacherName}
              onChange={(e) => setSettings({ ...settings, teacherName: e.target.value })}
              placeholder={isAr ? 'أ/ جمال سلامة' : 'e.g. Mr. Gamal'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'عنوان الدرس:' : 'Lesson Title:'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={isAr ? 'مثال: علامات الإعراب الأصلية والفرعية' : 'e.g. Photosynthesis'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Template metadata: Week & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'الأسبوع الدراسي (الترويسة الرسمية):' : 'School Week (Official Header):'}
            </label>
            <input
              type="text"
              value={settings.weekNumber || ''}
              onChange={(e) => setSettings({ ...settings, weekNumber: e.target.value })}
              placeholder={isAr ? 'الأسبوع الأول (أو الأسبوع الثاني...)' : 'Week 1 (or Week 2...)'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'تاريخ الدرس:' : 'Lesson Date:'}
            </label>
            <input
              type="text"
              value={settings.lessonDate || ''}
              onChange={(e) => setSettings({ ...settings, lessonDate: e.target.value })}
              placeholder={isAr ? new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              {isAr ? 'زمن الحصة:' : 'Duration:'}
            </label>
            <select
              value={settings.duration}
              onChange={(e) => setSettings({ ...settings, duration: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {durations.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? 'مستوى الطلاب المستهدف:' : 'Student Level:'}
            </label>
            <select
              value={settings.studentLevel}
              onChange={(e) => setSettings({ ...settings, studentLevel: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {studentLevels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Source Material Upload & Teacher Custom Instructions */}
        <div className="pt-2 border-t border-slate-100">
          <SourceMaterialUpload
            files={files}
            onFilesChange={setFiles}
            teacherPrompt={settings.teacherPrompt || ''}
            onTeacherPromptChange={(prompt) => setSettings({ ...settings, teacherPrompt: prompt })}
            uiLang={uiLang}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري بناء خطة الدرس وضبط التشكيل التام 100%...' : 'Generating approved lesson plan...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>{isAr ? 'توليد خطة الدرس المعتمدة الآن' : 'Generate Approved Lesson Plan Now'}</span>
            </>
          )}
        </button>
      </form>

      {/* Voice-to-Lesson Modal */}
      <VoiceToLessonModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onOpenResult={onOpenResult}
        uiLang={uiLang}
      />

      {/* 🌿 شاشة انتظار الذكاء الاصطناعي مع الأذكار والصلاة على النبي ﷺ */}
      <AiLoadingDhikr
        loading={loading}
        message={isAr ? 'جاري صياغة خطة الدرس النموذجية وتطبيق معايير الاعتماد...' : 'Generating accredited lesson plan...'}
        uiLang={uiLang}
      />
    </div>
  );
}
