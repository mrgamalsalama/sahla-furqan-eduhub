import { useState } from 'react';
import {
  FileQuestion, Sparkles, Loader2, AlertCircle, School, Award, CheckCircle2,
  Package, Download, FileCode2
} from 'lucide-react';
import type {
  LessonSettings, OutputType, GenerationResult, LmsTarget, StandardFramework
} from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR } from '@/types';
import { getLessonSettings, saveLessonSettings } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import { createAndDownloadQtiZip } from '@/lib/qtiPackager';
import type { UILang } from '@/lib/i18n';

interface ExamBankStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function ExamBankStudio({ onOpenResult, uiLang }: ExamBankStudioProps) {
  const isAr = uiLang === 'ar';
  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      lmsTarget: saved.lmsTarget || 'sahlah_cypher',
      standardFramework: saved.standardFramework || 'abt',
      questionFormat: 'all-mcq',
    };
  });

  const [examType, setExamType] = useState<OutputType>('quiz');
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
    saveLessonSettings(settings);

    try {
      const result = await generateContent(settings, examType, []);
      onOpenResult(result, examType);
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء توليد الاختبار.' : 'Failed to generate assessment.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-3">
          <FileQuestion className="w-4 h-4" />
          <span>{isAr ? 'استوديو وبنك الاختبارات الإلكترونية (QTI Engine)' : 'Exam & QTI Engine Studio'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          {isAr ? 'بناء وتوليد الاختبارات لمنصات LMS' : 'Build & Export LMS Exams'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
          {isAr
            ? 'توليد اختبارات قصيرة، وامتحانات هرم بلوم الـ 50 سؤالاً، والاختبارات المعيارية والتشخيصية مع تصدير حزمة مضغوطة رسمية (QTI ZIP) متوافقة فوراً مع سهلة والفرقان.'
            : 'Generate short quizzes, 50-MCQ Bloom exams, and benchmark tests with direct QTI ZIP packaging.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Exam Type Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            {isAr ? 'نوع التقييم أو الاختبار المطلوب:' : 'Select Assessment Mode:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setExamType('quiz')}
              className={`p-4 rounded-xl border text-start transition-all ${
                examType === 'quiz'
                  ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'اختبار قصير (10 أسئلة)' : 'Short Quiz (10 MCQs)'}</span>
                {examType === 'quiz' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </div>
              <p className="text-xs text-gray-500 font-normal">
                {isAr ? '10 أسئلة اختيار من متعدد مع نموذج الإجابة وكود QTI' : '10 MCQs with answer key & QTI payload'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExamType('qti-exam')}
              className={`p-4 rounded-xl border text-start transition-all ${
                examType === 'qti-exam'
                  ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'امتحان بلوم الشامل (50 سؤالاً)' : '50-MCQ Bloom Exam'}</span>
                {examType === 'qti-exam' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </div>
              <p className="text-xs text-gray-500 font-normal">
                {isAr ? 'موزعة: 15 تذكر، 20 تطبيق، 15 تفكير عليا مع مصفوفة' : '15 remember, 20 apply, 15 HOTS'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExamType('standardized-test')}
              className={`p-4 rounded-xl border text-start transition-all ${
                examType === 'standardized-test'
                  ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'معياري / تشخيصي الفجوات' : 'Benchmark / Diagnostic'}</span>
                {examType === 'standardized-test' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </div>
              <p className="text-xs text-gray-500 font-normal">
                {isAr ? 'قياس فاقد تعليمي، ABT، أو معايير IB الدولية' : 'Diagnostic gap matrix & ABT/IB standards'}
              </p>
            </button>
          </div>
        </div>

        {/* 2. LMS Target Platform Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            {isAr ? 'منصة إدارة التعلم المستهدفة لحزمة QTI ZIP:' : 'Target LMS Engine:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, lmsTarget: 'sahlah_cypher' })}
              className={`p-3.5 rounded-xl border text-start transition-all ${
                (settings.lmsTarget || 'sahlah_cypher') === 'sahlah_cypher'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="font-bold text-xs mb-0.5">أكاديمية سهلة الدولية</div>
              <div className="text-[11px] text-gray-500">حزمة QTI v2.1 مع ملف imsmanifest.xml القياسي لمنصة Cypher/NEO</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, lmsTarget: 'furqan_canvas' })}
              className={`p-3.5 rounded-xl border text-start transition-all ${
                settings.lmsTarget === 'furqan_canvas'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="font-bold text-xs mb-0.5">مدارس الفرقان العالمية</div>
              <div className="text-[11px] text-gray-500">حزمة Canvas QTI 1.2/2.1 القياسية المتوافقة مع Canvas و Classera</div>
            </button>
          </div>
        </div>

        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'المادة الدراسية:' : 'Subject:'}
            </label>
            <select
              value={settings.subject}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-amber-500"
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
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="">{isAr ? '-- اختر الصف --' : 'Select Grade'}</option>
              {GRADES_AR.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isAr ? 'عنوان الاختبار أو موضوع التقييم:' : 'Exam Title / Topics Covered:'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={isAr ? 'مثال: الاختبار الفصلي الشامل - النحو والبلاغة' : 'e.g. Midterm Examination'}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Source Text for reading comprehension or passage-based items */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isAr ? 'النص القرائي أو المادة العلمية المرجعية لبناء الأسئلة عليها (اختياري):' : 'Source Passage or Reading Text (Optional):'}
          </label>
          <textarea
            rows={4}
            value={settings.sourceText || ''}
            onChange={(e) => setSettings({ ...settings, sourceText: e.target.value })}
            placeholder={isAr ? 'الصق هنا نص القراءة أو المقال أو المسألة العلمية إذا كنت تريد بناء أسئلة الاختبار عليها حصراً...' : 'Paste passage text if questions should be derived from it...'}
            className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري بناء بنك الأسئلة وتوليد حزمة QTI مع التشكيل التام...' : 'Generating assessment & QTI package...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{isAr ? 'توليد الاختبار وحزمة QTI الآن' : 'Generate Assessment & QTI Now'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
