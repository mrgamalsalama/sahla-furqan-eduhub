import { useState } from 'react';
import {
  ClipboardList, Sparkles, Loader2, AlertCircle, Upload, X,
  FileText
} from 'lucide-react';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, DURATIONS_AR, DURATIONS_EN,
  STUDENT_LEVELS_AR, STUDENT_LEVELS_EN, INSTITUTIONS
} from '@/types';
import { getLessonSettings, saveLessonSettings, uid } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

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

  const grades = isAr ? GRADES_AR : GRADES_EN;
  const durations = isAr ? DURATIONS_AR : DURATIONS_EN;
  const studentLevels = isAr ? STUDENT_LEVELS_AR : STUDENT_LEVELS_EN;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFiles((prev) => [
          ...prev,
          {
            id: uid(),
            name: file.name,
            type: isImg ? 'image' : 'pdf',
            dataUrl: isImg ? (reader.result as string) : '',
            base64,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }

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

        {/* Custom standards and focus */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isAr ? 'أهداف خاصة أو معايير محددة يطلبها المعلم (اختياري):' : 'Specific Objectives or Standards:'}
          </label>
          <textarea
            rows={3}
            value={settings.customStandards || ''}
            onChange={(e) => setSettings({ ...settings, customStandards: e.target.value })}
            placeholder={isAr ? 'اكتب أي نواتج تعلم أو أنشطة تريد التركيز عليها في خطة هذا الدرس...' : 'Add any custom outcomes or special activities...'}
            className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            {isAr ? 'إرفاق نصوص أو صور مساندة من المقرر (اختياري):' : 'Attach Lesson Materials (Optional):'}
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>{isAr ? 'رفع ملفات' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
            <span className="text-xs text-gray-500">
              {files.length > 0 ? `${files.length} ملفات مرفقة` : 'صور أو ملفات PDF للدرس'}
            </span>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter(x => x.id !== f.id))}>
                    <X className="w-3 h-3 text-red-500" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
    </div>
  );
}
