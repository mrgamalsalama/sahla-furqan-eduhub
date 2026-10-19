import { useState } from 'react';
import {
  FileQuestion, Sparkles, Loader2, AlertCircle, Award, CheckCircle2,
  Layers, Edit3, HelpCircle
} from 'lucide-react';
import type {
  LessonSettings, OutputType, GenerationResult, StandardFramework, UploadedFile
} from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, INTERNATIONAL_FRAMEWORKS,
  FRAMEWORK_SUB_CRITERIA
} from '@/types';
import { getLessonSettings, saveLessonSettings } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import SourceMaterialUpload from './SourceMaterialUpload';
import AiLoadingDhikr from './AiLoadingDhikr';

interface ExamBankStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function ExamBankStudio({ onOpenResult, uiLang }: ExamBankStudioProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      lmsTarget: saved.lmsTarget || 'sahlah_cypher',
      standardFramework: saved.standardFramework || 'diagnostic_gap',
      questionFormat: saved.questionFormat || 'all-mcq',
      selectedSubCriteria: saved.selectedSubCriteria || [],
      customStandards: saved.customStandards || '',
    };
  });

  const [examType, setExamType] = useState<OutputType>('quiz');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Active framework
  const activeFrameworkId = (settings.standardFramework || 'diagnostic_gap') as StandardFramework;
  const activeFrameworkObj = INTERNATIONAL_FRAMEWORKS.find((fw) => fw.id === activeFrameworkId) || INTERNATIONAL_FRAMEWORKS[0];
  const activeSubCriteria = FRAMEWORK_SUB_CRITERIA[activeFrameworkId] || [];

  function handleToggleSubCriterion(criterionTitle: string) {
    const current = settings.selectedSubCriteria || [];
    const exists = current.includes(criterionTitle);
    const updated = exists
      ? current.filter((c) => c !== criterionTitle)
      : [...current, criterionTitle];
    setSettings({ ...settings, selectedSubCriteria: updated });
  }

  function handleSelectAllSubCriteria() {
    const allTitles = activeSubCriteria.map((c) => `${c.titleAr} (${c.code})`);
    setSettings({ ...settings, selectedSubCriteria: allTitles });
  }

  function handleClearSubCriteria() {
    setSettings({ ...settings, selectedSubCriteria: [] });
  }

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
      const result = await generateContent(finalSettings, examType, files);
      onOpenResult(result, examType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || (isAr ? 'حدث خطأ أثناء توليد الاختبار.' : 'Failed to generate assessment.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 mb-3 shadow-xs">
          <FileQuestion className="w-4 h-4 text-teal-600" />
          <span>{isAr ? 'استوديو وبنك الاختبارات الإلكترونية (QTI Engine)' : 'Exam & QTI Engine Studio'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAr ? 'بناء وتوليد الاختبارات لمنصات LMS' : 'Build & Export LMS Exams'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          {isAr
            ? 'توليد اختبارات قصيرة، وامتحانات هرم بلوم الـ 50 سؤالاً، والاختبارات المعيارية والتشخيصية مع تصدير حزمة مضغوطة رسمية (QTI ZIP) متوافقة فوراً مع سهلة والفرقان.'
            : 'Generate short quizzes, 50-MCQ Bloom exams, and benchmark tests with direct QTI ZIP packaging.'}
        </p>
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

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-7">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Exam Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {isAr ? 'نوع التقييم أو الاختبار المطلوب:' : 'Select Assessment Mode:'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setExamType('quiz')}
              className={`p-4 rounded-2xl border text-start transition-all relative ${
                examType === 'quiz'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'اختبار قصير (10 أسئلة)' : 'Short Quiz (10 MCQs)'}</span>
                {examType === 'quiz' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-600 font-normal">
                {isAr ? '10 أسئلة اختيار من متعدد مع نموذج الإجابة وكود QTI' : '10 MCQs with answer key & QTI payload'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExamType('qti-exam')}
              className={`p-4 rounded-2xl border text-start transition-all relative ${
                examType === 'qti-exam'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'امتحان بلوم الشامل (20 سؤالاً معيارياً)' : '20-MCQ Bloom Exam'}</span>
                {examType === 'qti-exam' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-600 font-normal">
                {isAr ? 'موزعة: 6 تذكر، 8 تطبيق، 6 تفكير عليا مع مصفوفة وQTI' : '6 remember, 8 apply, 6 HOTS with QTI'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExamType('standardized-test')}
              className={`p-4 rounded-2xl border text-start transition-all relative ${
                examType === 'standardized-test'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="text-sm font-bold mb-1 flex items-center justify-between">
                <span>{isAr ? 'معياري / تشخيصي الفجوات' : 'Benchmark / Diagnostic'}</span>
                {examType === 'standardized-test' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-600 font-normal">
                {isAr ? 'قياس فاقد تعليمي، ABT، أو معايير IB الدولية' : 'Diagnostic gap matrix & ABT/IB standards'}
              </p>
            </button>
          </div>
        </div>

        {/* Dynamic International Assessment Frameworks Selection */}
        {examType === 'standardized-test' && (
          <div className="bg-slate-50/90 rounded-3xl p-5 sm:p-7 border border-slate-200 space-y-6 animate-fade-in">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-700 shrink-0" />
                <span>{isAr ? 'أطر القياس والتقييم الدولية المعتمدة:' : 'Accredited International Assessment Frameworks:'}</span>
              </span>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {isAr ? '7 أطر قياس دولية معتمدة' : '7 International Frameworks'}
              </span>
            </div>

            {/* 7 Frameworks Grid with Text-Truncation Fixed & Clear Active Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {INTERNATIONAL_FRAMEWORKS.map((fw) => {
                const isSelected = activeFrameworkId === fw.id;
                return (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => {
                      setSettings({
                        ...settings,
                        standardFramework: fw.id,
                        selectedSubCriteria: [], // Reset sub-criteria when framework changes
                      });
                    }}
                    className={`p-4 rounded-2xl border text-start transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-md'
                        : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-slate-700 shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Bar with Title, Full Non-Truncated Badge, and Active Checkmark */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold leading-snug text-slate-900">
                          {isAr ? fw.titleAr : fw.titleEn}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold whitespace-nowrap">
                            {fw.badge}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 font-normal leading-relaxed mb-3">
                        {isAr ? fw.descAr : fw.descEn}
                      </p>
                    </div>

                    {/* Active Footer Ribbon */}
                    {isSelected && (
                      <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between text-[10px] font-bold text-blue-700">
                        <span>الإطار المعتمد حالياً</span>
                        <span>نشط ✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-Criteria Drilldown Panel */}
            {activeSubCriteria.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-2xs space-y-4 animate-scale-in">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-blue-950">
                        {isAr
                          ? `تخصيص المعايير والمؤشرات الفرعية لـ (${activeFrameworkObj.titleAr})`
                          : `Specialized Sub-criteria for (${activeFrameworkObj.titleEn})`}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        حدد المؤشرات الدقيقة التي ترغب في توجيه أسئلة الاختبار نحوها (يمكنك اختيار معيار أو أكثر):
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllSubCriteria}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition text-[11px]"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSubCriteria}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition text-[11px]"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSubCriteria.map((sub) => {
                    const labelWithCode = `${sub.titleAr} (${sub.code})`;
                    const isChecked = (settings.selectedSubCriteria || []).includes(labelWithCode);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubCriterion(labelWithCode)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 shrink-0"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{sub.titleAr}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                              {sub.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {sub.descAr}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Teacher Standards Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>وضع معايير أو نواتج تعلم مخصصة من المعلم (اختياري):</span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                  تضمين خاص
                </span>
              </div>
              <textarea
                rows={2}
                value={settings.customStandards || ''}
                onChange={(e) => setSettings({ ...settings, customStandards: e.target.value })}
                placeholder="أدخل هنا أي معايير إضافية أو كفايات مدرسية خاصة ترغب في إلزام النموذج ببناء أسئلة ومصفوفة عليها..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* 2. Question Format Selector: All MCQ vs Mixed */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{isAr ? 'صيغة ونوعية الأسئلة في الاختبار:' : 'Question Format Type:'}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, questionFormat: 'all-mcq' })}
              className={`p-4 rounded-2xl border text-start transition-all ${
                (settings.questionFormat || 'all-mcq') === 'all-mcq'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/60 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-bold">اختيار من متعدد فقط (All MCQ)</span>
                {(settings.questionFormat || 'all-mcq') === 'all-mcq' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                جميع أسئلة الاختبار اختيار من متعدد (4 خيارات مع تحديد وتبرير الإجابة الصحيحة)، مثالية للتصحيح الإلكتروني الفوري في LMS.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, questionFormat: 'mixed' })}
              className={`p-4 rounded-2xl border text-start transition-all ${
                settings.questionFormat === 'mixed'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/60 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm font-bold">اختبار شامل للأنواع المختلفة (Comprehensive Mixed)</span>
                {settings.questionFormat === 'mixed' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                تنوع متكامل: اختيار من متعدد، صواب وخطأ، أسئلة مقالية استيعابية قصيرة، ومهام كتابية/تحليلية مع سلالم التقدير اللفظي (Rubrics).
              </p>
            </button>
          </div>
        </div>

        {/* 3. LMS Target Platform Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {isAr ? 'منصة إدارة التعلم المستهدفة لحزمة QTI ZIP:' : 'Target LMS Engine:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, lmsTarget: 'sahlah_cypher' })}
              className={`p-3.5 rounded-2xl border text-start transition-all ${
                (settings.lmsTarget || 'sahlah_cypher') === 'sahlah_cypher'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="font-bold text-xs mb-0.5 text-blue-950">أكاديمية سهلة الدولية</div>
              <div className="text-[11px] text-slate-600">حزمة معيارية QTI v1.2 (منصة Cypher)</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, lmsTarget: 'furqan_canvas' })}
              className={`p-3.5 rounded-2xl border text-start transition-all ${
                settings.lmsTarget === 'furqan_canvas'
                  ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="font-bold text-xs mb-0.5 text-blue-950">مدرسة الفرقان العالمية</div>
              <div className="text-[11px] text-teal-700 font-bold">حزمة معيارية معتمدة QTI v2.1 ZIP</div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, lmsTarget: 'canvas_lms' })}
              className={`p-3.5 rounded-2xl border text-start transition-all ${
                settings.lmsTarget === 'canvas_lms'
                  ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="font-bold text-xs mb-0.5 text-indigo-950">منصة كانفاس التعليمية</div>
              <div className="text-[11px] text-slate-600">حزمة بنك أسئلة Canvas LMS QTI ZIP</div>
            </button>
          </div>
        </div>

        {/* 4. Subject, Grade & Title fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'المادة الدراسية:' : 'Subject:'}
            </label>
            <select
              value={settings.subject}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'الصف الدراسي:' : 'Grade Level:'}
            </label>
            <select
              value={settings.grade}
              onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            >
              <option value="">{isAr ? '-- اختر الصف --' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'عنوان الاختبار أو موضوع التقييم:' : 'Exam Title / Topics Covered:'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={isAr ? 'مثال: الاختبار الفصلي الشامل - النحو والبلاغة' : 'e.g. Midterm Examination'}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* 5. Source Material Upload & Teacher Custom Instructions */}
        <div className="pt-2 border-t border-slate-100">
          <SourceMaterialUpload
            files={files}
            onFilesChange={setFiles}
            teacherPrompt={settings.teacherPrompt || ''}
            onTeacherPromptChange={(prompt) => setSettings({ ...settings, teacherPrompt: prompt })}
            uiLang={uiLang}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري بناء بنك الأسئلة ومصفوفة مؤشرات الأداء وتوليد حزمة QTI...' : 'Generating assessment & QTI package...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-300" />
              <span>{isAr ? 'توليد الاختبار ومصفوفة مؤشرات الأداء وحزمة QTI الآن' : 'Generate Assessment & QTI Now'}</span>
            </>
          )}
        </button>
      </form>

      {/* 🌿 شاشة انتظار الذكاء الاصطناعي مع الأذكار والصلاة على النبي ﷺ */}
      <AiLoadingDhikr
        loading={loading}
        message={isAr ? 'جاري بناء بنك الأسئلة ومصفوفة مؤشرات الأداء وتوليد حزمة QTI...' : 'Generating assessment & QTI package...'}
        uiLang={uiLang}
      />
    </div>
  );
}
