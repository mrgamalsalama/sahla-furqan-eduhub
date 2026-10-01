import { useState, useRef } from 'react';
import {
  FileCheck2, ArrowRight, ArrowLeft, Upload, X, Loader2,
  AlertCircle, Sparkles, BookOpen, CheckCircle, Wand2, User,
} from 'lucide-react';
import type { UploadedFile, OutputType, GenerationResult, InstitutionId } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, INSTITUTIONS } from '@/types';
import { uid } from '@/lib/storage';
import { gradeHandwrittenSubmission, generateRubricForAssignment } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface GraderPageProps {
  onBack: () => void;
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function GraderPage({ onBack, onOpenResult, uiLang }: GraderPageProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [image, setImage] = useState<UploadedFile | null>(null);
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [institution, setInstitution] = useState<InstitutionId>('sahlah');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [rubric, setRubric] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [loading, setLoading] = useState(false);
  const [generatingRubric, setGeneratingRubric] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith('image/')) {
      setError(isAr ? 'يرجى رفع ملف صورة (JPG, PNG, WebP) لخط اليد' : 'Please upload an image file (JPG, PNG)');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage({
        id: uid(),
        name: file.name,
        type: 'image',
        dataUrl: reader.result as string,
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleAutoGenerateRubric() {
    if (!assignmentTitle.trim() && !subject) {
      setError(isAr ? 'يرجى كتابة عنوان السؤال أو تحديد المادة أولاً ليستنبط الذكاء الاصطناعي الـ Rubric المناسب' : 'Please enter question title or select subject first');
      return;
    }

    setGeneratingRubric(true);
    setError(null);

    try {
      const generated = await generateRubricForAssignment({
        subject,
        grade,
        assignmentTitle,
        maxScore: Number(maxScore) || 20,
        lang: isAr ? 'ar' : 'en',
      });
      setRubric(generated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'فشل استنباط سلم التقدير، يرجى المحاولة ثانية' : 'Failed to generate rubric'));
    } finally {
      setGeneratingRubric(false);
    }
  }

  async function handleGrade() {
    if (!image) {
      setError(isAr ? 'يرجى إرفاق صورة ورقة الإجابة أولاً' : 'Please upload the student submission image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const html = await gradeHandwrittenSubmission(image, {
        subject,
        grade,
        assignmentTitle: studentName.trim()
          ? `${assignmentTitle || (isAr ? 'واجب' : 'Task')} (الطالب: ${studentName.trim()})`
          : assignmentTitle,
        rubricOrModelAnswer: rubric,
        maxScore: Number(maxScore) || 20,
        lang: isAr ? 'ar' : 'en',
      });

      // إضافة ترويسة الشعار الخاصة بالمؤسسة المحددة
      const logoImg = (logo: string, alt: string) =>
        `<img src="${logo}" alt="${alt}" style="max-height:55px; width:auto; object-fit:contain; vertical-align:middle;" />`;

      let instHeader = '';
      if (institution === 'sahlah') {
        instHeader = `<div style="text-align:center; margin-bottom:16px;">${logoImg(INSTITUTIONS.sahlah.logo, 'سهلة')}<p style="font-weight:bold; font-size:1rem; margin-top:4px;">${isAr ? INSTITUTIONS.sahlah.ar : INSTITUTIONS.sahlah.en}</p></div>`;
      } else if (institution === 'furqan') {
        instHeader = `<div style="text-align:center; margin-bottom:16px;">${logoImg(INSTITUTIONS.furqan.logo, 'الفرقان')}<p style="font-weight:bold; font-size:1rem; margin-top:4px;">${isAr ? INSTITUTIONS.furqan.ar : INSTITUTIONS.furqan.en}</p></div>`;
      } else {
        instHeader = `<div style="text-align:center; margin-bottom:16px; display:flex; gap:16px; justify-content:center; align-items:center;">${logoImg(INSTITUTIONS.sahlah.logo, 'سهلة')}${logoImg(INSTITUTIONS.furqan.logo, 'الفرقان')}</div>`;
      }

      const fullHtml = `<div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family: inherit;">${instHeader}${html}</div>`;

      onOpenResult(
        {
          contentHtml: fullHtml,
          title: studentName.trim()
            ? `${isAr ? 'تقرير تصحيح' : 'Grading Report'} - ${studentName.trim()}`
            : (assignmentTitle || (isAr ? 'تقرير تصحيح خط اليد' : 'Handwriting Grading Report')),
        },
        'worksheet'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'حدث خطأ أثناء فحص وتصحيح الصورة' : 'Error grading submission'));
    } finally {
      setLoading(false);
    }
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <BackIcon className="w-4 h-4" />
        {isAr ? 'العودة للرئيسية' : 'Back to Home'}
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold mb-3">
          <FileCheck2 className="w-4 h-4 text-emerald-600" />
          {isAr ? 'المُصحح الذكي لخط اليد والأوراق الامتحانية' : 'Smart Handwritten Assessment & OCR Grader'}
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {isAr ? 'تصحيح إجابات ومقالات الطلاب آلياً' : 'Automated Student Submission Grading'}
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto text-sm">
          {isAr
            ? 'ارفع صورة ورقة إجابة الطالب بخط اليد؛ مع إمكانية استنباط سلم التقدير (Rubric) تلقائياً، وتفريغ الخط وحساب الدرجة وتقديم التغذية الراجعة.'
            : 'Upload handwritten work, auto-generate analytical rubrics, transcribe handwriting, and generate actionable student feedback.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border border-gray-100">
        {/* منطقة رفع الصورة */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {isAr ? 'صورة ورقة إجابة الطالب (بخط اليد) *' : 'Student Handwritten Response Photo *'}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />

          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-gray-800 mb-1">
                {isAr ? 'اضغط لاختيار أو التقاط صورة الورقة' : 'Click to upload or take a photo'}
              </h4>
              <p className="text-xs text-gray-400">JPG, PNG, WebP (تأكد من وضوح الخط والإضاءة)</p>
            </div>
          ) : (
            <div className="relative rounded-2xl border border-gray-200 p-3 bg-gray-50 flex items-center gap-4">
              <img
                src={image.dataUrl}
                alt="Student Submission"
                className="w-24 h-24 object-cover rounded-xl border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{image.name}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {isAr ? 'تم تحميل الصورة بنجاح' : 'Image ready for grading'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* بيانات الواجهة والمادة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'اسم الطالب (اختياري)' : 'Student Name (Optional)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g., Ahmed Mohamed'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'عنوان السؤال أو موضوع التعبير' : 'Topic / Question Title'}
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={isAr ? 'مثال: كتابة فقرة إقناعية عن أهمية الوقت' : 'e.g., Persuasive writing on reading'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'المادة الدراسية' : 'Subject'}
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'الصف الدراسي' : 'Grade'}
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
            >
              <option value="">{isAr ? 'اختر الصف' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'الدرجة الكلية المستحقة' : 'Max Score'}
            </label>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {isAr ? 'شعار التقرير (المؤسسة)' : 'Institution'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInstitution('sahlah')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'sahlah' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                سهلة
              </button>
              <button
                type="button"
                onClick={() => setInstitution('furqan')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'furqan' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                الفرقان
              </button>
              <button
                type="button"
                onClick={() => setInstitution('both')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'both' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                كلاهما
              </button>
            </div>
          </div>
        </div>

        {/* نموذج الإجابة أو معايير التصحيح مع زر الاستنباط الذكي */}
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-bold text-gray-800">
                {isAr ? 'سلم التقدير ونموذج الإجابة (Rubric)' : 'Rubric & Model Answer'}
              </label>
            </div>

            {/* زر استنباط الـ Rubric */}
            <button
              type="button"
              onClick={handleAutoGenerateRubric}
              disabled={generatingRubric}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-60"
            >
              {generatingRubric ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  {isAr ? 'جاري الاستنباط...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                  {isAr ? 'استنباط الـ Rubric بالذكاء الاصطناعي' : 'Auto-Generate Rubric'}
                </>
              )}
            </button>
          </div>

          <textarea
            rows={5}
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            placeholder={
              isAr
                ? 'اضغط زر "استنباط الـ Rubric" أعلاه لصياغة معايير التقييم وتوزيع الدرجات آلياً، أو اكتب نموذج الإجابة ومعاييرك يدوياً هنا...'
                : 'Click "Auto-Generate Rubric" above or type your evaluation criteria manually here...'
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white leading-relaxed"
          />
        </div>

        {/* زر بدء التصحيح النهائي */}
        <button
          type="button"
          onClick={handleGrade}
          disabled={loading || !image}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isAr ? 'جاري قراءة خط اليد وتدقيق الإجابة واحتساب الدرجة...' : 'Reading Handwriting & Grading...'}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {isAr ? 'بدء التصحيح الذكي وإصدار التقرير' : 'Grade Submission Now'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
