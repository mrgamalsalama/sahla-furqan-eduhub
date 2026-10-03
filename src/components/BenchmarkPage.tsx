import { useState } from 'react';
import {
  Award, ArrowRight, ArrowLeft, Sparkles, AlertCircle, Loader2,
  BookOpen, CheckCircle2,
  Stethoscope, CheckSquare, Layers, Calendar, Hash,
} from 'lucide-react';
import type {
  LessonSettings, OutputType, GenerationResult,
  ContentLang, InstitutionId, StandardFramework, AbtTrack, UploadedFile,
  QuestionFormat, TermType,
} from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN,
  INSTITUTIONS,
} from '@/types';
import { getLessonSettings, saveLessonSettings, uid } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import SourceMaterialUpload from './SourceMaterialUpload';

interface BenchmarkPageProps {
  onBack: () => void;
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function BenchmarkPage({ onBack, onOpenResult, uiLang }: BenchmarkPageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [files, setFiles] = useState<UploadedFile[]>([]);

  const [settings, setSettings] = useState<LessonSettings>(() => {
    try {
      const saved = getLessonSettings();
      return {
        ...saved,
        standardFramework: saved?.standardFramework || 'abt',
        abtTrack: saved?.abtTrack || 'arabic-a',
        sourceText: saved?.sourceText || '',
        customStandards: saved?.customStandards || '',
        questionFormat: saved?.questionFormat || 'mixed',
        term: saved?.term || 'term-1',
        questionCount: saved?.questionCount || 10,
      };
    } catch {
      return {
        subject: '',
        grade: '',
        duration: '60 دقيقة',
        studentLevel: 'متوسط',
        teacherName: '',
        lessonTitle: '',
        contentLanguage: 'ar',
        institution: 'sahlah',
        standardFramework: 'abt',
        abtTrack: 'arabic-a',
        sourceText: '',
        customStandards: '',
        questionFormat: 'mixed',
        term: 'term-1',
        questionCount: 10,
      };
    }
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDiagnostic = settings.standardFramework === 'diagnostic';

  function handleGenerate() {
    setGenerating(true);
    setError(null);
    const finalSettings: LessonSettings = {
      ...settings,
      contentLanguage: uiLang,
    };
    saveLessonSettings(finalSettings);

    generateContent(finalSettings, 'standardized-test', files)
      .then((result) => {
        onOpenResult(result, 'standardized-test');
      })
      .catch((err) => {
        setError(err.message || 'حدث خطأ أثناء توليد الاختبار');
      })
      .finally(() => {
        setGenerating(false);
      });
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900 mb-6 transition-colors"
      >
        <BackIcon className="w-4 h-4" />
        {isAr ? 'العودة للرئيسية' : 'Back to Home'}
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-xs font-bold mb-3 shadow-xs">
          {isDiagnostic ? (
            <>
              <Stethoscope className="w-4 h-4 text-teal-600" />
              {isAr ? 'أداة القياس والتشخيص الأكاديمي' : 'Diagnostic Assessment Platform'}
            </>
          ) : (
            <>
              <Award className="w-4 h-4 text-teal-600" />
              {isAr ? 'منصة التقييم والقياس المعياري الدولي' : 'International Benchmark Assessment'}
            </>
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {isDiagnostic
            ? isAr ? 'بناء اختبار تشخيصي ورصد فجوات' : 'Design Diagnostic Assessment'
            : isAr ? 'بناء اختبار معياري مخصص' : 'Design Standardized Benchmark Test'}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm font-medium">
          {isDiagnostic
            ? isAr
              ? 'توليد تقييم قبلي تشخيصي لكشف الفجوات التعليمية التراكمية، ومصفوفة نواتج التعلم، مع خطة علاجية مخصصة وتصدير QTI.'
              : 'Identify cumulative learning gaps and prerequisites with remediation plan and QTI export.'
            : isAr
              ? 'صياغة اختبارات معيارية دقيقة مرتبطة بنواتج التعلم مع دعم التصدير لمنصات LMS (CYPHER سهلة والفرقان).'
              : 'Generate criterion-referenced exams aligned with benchmark frameworks and exportable to LMS.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* منطقة رفع المستندات وتوجيهات المعلم */}
      <div className="card p-6 mb-6 bg-white border border-gray-100 shadow-sm">
        <SourceMaterialUpload
          files={files}
          onFilesChange={setFiles}
          teacherPrompt={settings.teacherPrompt || ''}
          onTeacherPromptChange={(prompt) => setSettings({ ...settings, teacherPrompt: prompt })}
          uiLang={uiLang}
          title={isAr ? 'رفع ملف مصدري (Word / PDF / PowerPoint) وبناء الاختبار عليه' : 'Upload Source Document & Build Assessment'}
          description={isAr ? 'ارفع ملف الاختبار أو نص القراءة وسيعتمد عليه الذكاء الاصطناعي حصرياً.' : 'Upload file or reading passage to base test on.'}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border border-gray-100">
        {/* معلومات الاختبار الأساسية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAr ? 'اسم المعلم / الممتحن' : 'Teacher Name'}
            </label>
            <input
              type="text"
              value={settings.teacherName}
              onChange={(e) => setSettings({ ...settings, teacherName: e.target.value })}
              placeholder={isAr ? 'أ/ جمال سلامة' : 'Teacher Name'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAr ? 'عنوان الاختبار أو الموضوع' : 'Exam Title'}
            </label>
            <input
              type="text"
              value={settings.lessonTitle}
              onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
              placeholder={
                isDiagnostic
                  ? isAr ? 'مثال: اختبار تشخيص المهارات القبلية والفاقد التعليمي' : 'Diagnostic & Prerequisite Assessment'
                  : isAr ? 'مثال: اختبار الفهم والتحليل المعياري' : 'e.g., Reading Analysis Benchmark'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAr ? 'المادة الدراسية' : 'Subject'}
            </label>
            <select
              value={settings.subject}
              onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
            >
              <option value="">{isAr ? 'اختر المادة' : 'Select Subject'}</option>
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                  {isAr ? sub.ar : sub.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isDiagnostic
                ? isAr ? 'الصف الحالي المستهدف تشخيصه' : 'Target Student Grade'
                : isAr ? 'الصف الدراسي' : 'Grade'}
            </label>
            <select
              value={settings.grade}
              onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
            >
              <option value="">{isAr ? 'اختر الصف' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* تحديد الفصل الدراسي وعدد الأسئلة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-primary-50/50 rounded-2xl border border-primary-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-600" />
              {isAr ? 'الفصل الدراسي المستهدف' : 'Academic Term'}
            </label>
            <select
              value={settings.term || 'term-1'}
              onChange={(e) => setSettings({ ...settings, term: e.target.value as TermType })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white font-medium"
            >
              <option value="term-1">{isAr ? 'الفصل الدراسي الأول (Term 1)' : 'Term 1 / Semester 1'}</option>
              <option value="term-2">{isAr ? 'الفصل الدراسي الثاني (Term 2)' : 'Term 2 / Semester 2'}</option>
              <option value="term-3">{isAr ? 'الفصل الدراسي الثالث (Term 3)' : 'Term 3'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-primary-600" />
              {isAr ? 'عدد الأسئلة المطلوب' : 'Number of Questions'}
            </label>
            <select
              value={settings.questionCount || 10}
              onChange={(e) => setSettings({ ...settings, questionCount: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white font-medium"
            >
              <option value={5}>5 {isAr ? 'أسئلة' : 'Questions'}</option>
              <option value={10}>10 {isAr ? 'أسئلة (الافتراضي القياسي)' : 'Questions (Default)'}</option>
              <option value={15}>15 {isAr ? 'سؤالاً' : 'Questions'}</option>
              <option value={20}>20 {isAr ? 'سؤالاً' : 'Questions'}</option>
              <option value={25}>25 {isAr ? 'سؤالاً' : 'Questions'}</option>
              <option value={30}>30 {isAr ? 'سؤالاً' : 'Questions'}</option>
              <option value={40}>40 {isAr ? 'سؤالاً' : 'Questions'}</option>
              <option value={50}>50 {isAr ? 'سؤالاً (اختبار شامل)' : 'Questions (Full Exam)'}</option>
            </select>
          </div>
        </div>

        {/* تحديد الإطار المعياري */}
        <div className="p-5 bg-gradient-to-br from-primary-50/60 to-white rounded-2xl border border-primary-100 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-gray-800 text-base">
              {isAr ? 'تحديد الإطار ونظام القياس' : 'Assessment Framework'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={settings.standardFramework === 'abt' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? 'نوع القياس أو الإطار المستهدف' : 'Framework / Assessment Type'}
              </label>
              <select
                value={settings.standardFramework || 'abt'}
                onChange={(e) => setSettings({ ...settings, standardFramework: e.target.value as StandardFramework })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
              >
                <option value="abt">معايير ABT (Arabic Benchmark Test)</option>
                <option value="diagnostic">🔍 اختبار تشخيصي وتحديد فجوات تعليمية (Diagnostic)</option>
                <option value="ib">معايير البكالوريا الدولية (IB MYP / DP)</option>
                <option value="cefr">الإطار الأوروبي لتحديد المستوى (CEFR A1-C2)</option>
                <option value="bloom">هرم بلوم المعرفي (Bloom Taxonomy)</option>
                <option value="custom">معايير ومؤشرات خاصة بي (Custom)</option>
              </select>
            </div>

            {settings.standardFramework === 'abt' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isAr ? 'مسار اختبار ABT' : 'ABT Track'}
                </label>
                <select
                  value={settings.abtTrack || 'arabic-a'}
                  onChange={(e) => setSettings({ ...settings, abtTrack: e.target.value as AbtTrack })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                >
                  <option value="arabic-a">{isAr ? 'Arabic A (للناطقين باللغة العربية)' : 'Arabic A (Native)'}</option>
                  <option value="arabic-b">{isAr ? 'Arabic B (لغير الناطقين بها)' : 'Arabic B (Non-Native)'}</option>
                </select>
              </div>
            )}
          </div>

          {isDiagnostic && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              💡 {isAr
                ? 'سيقوم النظام بصياغة أسئلة تشخيصية تراكمية تبدأ من المهارات القبلية للصف السابق لقياس جاهزية الطالب، مع رصد الفجوة المحتملة لكل خطأ وتوليد خطة علاجية مخصصة للمعلم.'
                : 'The system will generate diagnostic questions testing prerequisite concepts from prior grades, identify misconceptions, and build a targeted remediation plan.'}
            </div>
          )}

          {settings.standardFramework === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAr ? 'المعايير والمؤشرات الخاصة' : 'Custom Indicators'}
              </label>
              <textarea
                rows={3}
                value={settings.customStandards || ''}
                onChange={(e) => setSettings({ ...settings, customStandards: e.target.value })}
                placeholder={isAr ? 'اكتب المؤشرات التي تريد قياسها في هذا الاختبار...' : 'Enter your specific performance indicators...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
              />
            </div>
          )}
        </div>

        {/* تحديد نمط وصيغة الأسئلة */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {isAr ? 'صيغة ونمط الأسئلة المطلوبة:' : 'Question Format / Style:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, questionFormat: 'all-mcq' as QuestionFormat })}
              className={`p-3 rounded-xl text-right border transition flex items-start gap-3 ${
                settings.questionFormat === 'all-mcq'
                  ? 'bg-primary-50 border-primary-500 text-primary-900 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`p-2 rounded-lg ${settings.questionFormat === 'all-mcq' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs">{isAr ? 'اختيار من متعدد فقط (MCQ)' : 'Multiple Choice Only (MCQ)'}</h5>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isAr ? 'جميع الأسئلة موضوعية بأربعة خيارات (مثالي للتصحيح الإلكتروني وQTI)' : 'All questions are 4-choice objective items for LMS'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, questionFormat: 'mixed' as QuestionFormat })}
              className={`p-3 rounded-xl text-right border transition flex items-start gap-3 ${
                settings.questionFormat === 'mixed'
                  ? 'bg-primary-50 border-primary-500 text-primary-900 shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`p-2 rounded-lg ${settings.questionFormat === 'mixed' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-xs">{isAr ? 'متنوع وشامل (المعياري المعتمد)' : 'Mixed Format (Standard)'}</h5>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isAr ? 'يجمع بين الاختيار من متعدد، والأسئلة المقالية، والإنتاج التعبيري' : 'Objective MCQs + analytical essay & written expression'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* المادة العلمية أو النص المرجعي المكتوب */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary-600" />
            <label className="text-sm font-semibold text-gray-700">
              {isAr ? 'النص القرائي أو المادة المرجعية المكتوبة (اختياري)' : 'Source Passage / Text (Optional)'}
            </label>
          </div>
          <textarea
            rows={4}
            value={settings.sourceText || ''}
            onChange={(e) => setSettings({ ...settings, sourceText: e.target.value })}
            placeholder={isAr ? 'يمكنك كتابة/لصق النص هنا، أو الاكتفاء بالملف المرفوع بالأعلى...' : 'You can paste text here or rely on the uploaded file above...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>

        {/* المؤسسة واللغة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAr ? 'الهوية والشعار' : 'Institution'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, institution: 'sahlah' as InstitutionId })}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition ${
                  settings.institution === 'sahlah' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-4 w-auto max-w-[50px] object-contain" />
                سهلة
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, institution: 'furqan' as InstitutionId })}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition ${
                  settings.institution === 'furqan' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-4 w-auto object-contain" />
                الفرقان
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, institution: 'both' as InstitutionId })}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition ${
                  settings.institution === 'both' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                كلاهما
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isAr ? 'لغة الاختبار' : 'Language'}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, contentLanguage: 'ar' as ContentLang })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${
                  settings.contentLanguage === 'ar' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, contentLanguage: 'en' as ContentLang })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${
                  settings.contentLanguage === 'en' ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* زر التوليد النهائي */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isDiagnostic
                ? isAr ? 'جاري تحليل المهارات وبناء الاختبار التشخيصي ورصد الفجوات...' : 'Generating Diagnostic Exam & Gap Analysis...'
                : isAr ? 'جاري تحليل الملف وبناء الاختبار المعياري...' : 'Analyzing & Generating Exam...'}
            </>
          ) : (
            <>
              {isDiagnostic ? <Stethoscope className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {isDiagnostic
                ? isAr ? 'توليد الاختبار التشخيصي وخطة الفجوات الآن' : 'Generate Diagnostic Assessment'
                : isAr ? 'توليد الاختبار المعياري الآن' : 'Generate Standardized Exam'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
