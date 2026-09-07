import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, Image as ImageIcon, FileType2, X, Loader2,
  ClipboardList, FileQuestion, Presentation, BookOpenCheck,
  Sparkles, AlertCircle, Settings2, ChevronLeft,
} from 'lucide-react';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult, ContentLang, InstitutionId } from '@/types';
import {
  SUBJECT_OPTIONS, GRADES_AR, GRADES_EN,
  DURATIONS_AR, DURATIONS_EN, STUDENT_LEVELS_AR, STUDENT_LEVELS_EN,
  OUTPUT_LABELS_AR, OUTPUT_LABELS_EN, INSTITUTIONS,
} from '@/types';
import { getLessonSettings, saveLessonSettings, uid } from '@/lib/storage';
import { generateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface HomePageProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

export default function HomePage({ onOpenResult, uiLang }: HomePageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';

  const grades = isAr ? GRADES_AR : GRADES_EN;
  const durations = isAr ? DURATIONS_AR : DURATIONS_EN;
  const studentLevels = isAr ? STUDENT_LEVELS_AR : STUDENT_LEVELS_EN;
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<LessonSettings>(() => getLessonSettings());
  const [generating, setGenerating] = useState<OutputType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    for (const file of Array.from(fileList)) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isWord = file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isImage && !isPdf && !isWord) {
        setError(s.unsupportedFile);
        continue;
      }

      const base64 = await fileToBase64(file);
      const uploaded: UploadedFile = {
        id: uid(),
        name: file.name,
        type: isImage ? 'image' : isPdf ? 'pdf' : 'word',
        dataUrl: isImage ? `data:${file.type};base64,${base64}` : '',
        base64,
        mimeType: file.type,
      };
      setFiles((prev) => [...prev, uploaded]);
    }
  }, [s.unsupportedFile]);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleGenerate(outputType: OutputType) {
    setGenerating(outputType);
    setError(null);

    saveLessonSettings(settings);

    generateContent(settings, outputType, files)
      .then((result) => {
        onOpenResult(result, outputType);
      })
      .catch((err) => {
        setError(err.message || s.genError);
      })
      .finally(() => {
        setGenerating(null);
      });
  }

  const generateButtons: { type: OutputType; label: string; desc: string; icon: typeof BookOpenCheck; color: string }[] = [
    { type: 'lesson-plan', label: outputLabels['lesson-plan'], desc: s.genLessonPlanDesc, icon: ClipboardList, color: 'primary' },
    { type: 'worksheet', label: outputLabels['worksheet'], desc: s.genWorksheetDesc, icon: FileText, color: 'secondary' },
    { type: 'quiz', label: outputLabels['quiz'], desc: s.genQuizDesc, icon: FileQuestion, color: 'accent' },
    { type: 'slides', label: outputLabels['slides'], desc: s.genSlidesDesc, icon: Presentation, color: 'primary' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-semibold mb-4">
          <Sparkles className="w-4 h-4" />
          {s.aiBadge}
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
          {s.heroTitle}
        </h2>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          {s.heroDesc}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-start gap-3 animate-slide-up">
          <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
          <p className="text-error-700 text-sm">{error}</p>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`card p-8 mb-6 transition-all duration-200 ${
          dragActive ? 'border-primary-400 bg-primary-50/50 scale-[1.01]' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{s.uploadTitle}</h3>
          <p className="text-gray-500 text-sm mb-4">
            {s.uploadDesc}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            <Upload className="w-4 h-4" />
            {s.uploadBtn}
          </button>
        </div>
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="card p-4 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">{s.uploadedFiles(files.length)}</h3>
            <button
              onClick={() => setFiles([])}
              className="text-error-500 hover:text-error-600 text-sm font-medium"
            >
              {s.clearAll}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((file) => (
              <div key={file.id} className="relative group bg-gray-50 rounded-xl p-3 border border-gray-100">
                <button
                  onClick={() => removeFile(file.id)}
                  className={`absolute -top-2 ${isAr ? '-left-2' : '-right-2'} w-6 h-6 bg-error-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="w-full aspect-square rounded-lg bg-white flex items-center justify-center mb-2 overflow-hidden">
                  {file.type === 'image' ? (
                    <img src={file.dataUrl} alt={file.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-400">
                      {file.type === 'pdf' ? <FileType2 className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate font-medium">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings toggle */}
      <div className="card mb-6 overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-accent-500" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h3 className="font-bold text-gray-800">{s.lessonSettings}</h3>
              <p className="text-sm text-gray-500">{s.lessonSettingsDesc}</p>
            </div>
          </div>
          <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform ${showSettings ? (isAr ? '-rotate-90' : 'rotate-90') : ''}`} />
        </button>

        {showSettings && (
          <div className="px-5 pb-5 border-t border-gray-100 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label-field">{s.teacherName}</label>
                <input
                  type="text"
                  value={settings.teacherName}
                  onChange={(e) => setSettings({ ...settings, teacherName: e.target.value })}
                  placeholder={s.teacherNamePlaceholder}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">{s.lessonTitleLabel}</label>
                <input
                  type="text"
                  value={settings.lessonTitle}
                  onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
                  placeholder={s.lessonTitlePlaceholder}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">{s.subject}</label>
                <select
                  value={settings.subject}
                  onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                  className="input-field"
                >
                  <option value="">{s.selectSubject}</option>
                  {SUBJECT_OPTIONS.map((sub) => <option key={sub.id} value={isAr ? sub.ar : sub.en}>{isAr ? sub.ar : sub.en}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">{s.grade}</label>
                <select
                  value={settings.grade}
                  onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
                  className="input-field"
                >
                  <option value="">{s.selectGrade}</option>
                  {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">{s.duration}</label>
                <select
                  value={settings.duration}
                  onChange={(e) => setSettings({ ...settings, duration: e.target.value })}
                  className="input-field"
                >
                  {durations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">{s.studentLevel}</label>
                <select
                  value={settings.studentLevel}
                  onChange={(e) => setSettings({ ...settings, studentLevel: e.target.value })}
                  className="input-field"
                >
                  {studentLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">{s.institution}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, institution: 'sahlah' as InstitutionId })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      settings.institution === 'sahlah'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-6 w-6 object-contain" />
                    {s.sahlahAcademy}
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, institution: 'furqan' as InstitutionId })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      settings.institution === 'furqan'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-6 w-6 object-contain" />
                    {s.furqanSchool}
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, institution: 'both' as InstitutionId })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      settings.institution === 'both'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex -space-x-1">
                      <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-6 w-6 object-contain" />
                      <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-6 w-6 object-contain" />
                    </div>
                    {s.bothInstitutions}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">{s.contentLanguage}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, contentLanguage: 'ar' as ContentLang })}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      settings.contentLanguage === 'ar'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {s.arabic}
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, contentLanguage: 'en' as ContentLang })}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      settings.contentLanguage === 'en'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {s.english}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate buttons */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">{s.chooseOutput}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {generateButtons.map(({ type, label, desc, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleGenerate(type)}
              disabled={generating !== null}
              className={`card p-5 ${isAr ? 'text-right' : 'text-left'} hover:shadow-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 group`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  color === 'primary' ? 'bg-primary-50 text-primary-600' :
                  color === 'secondary' ? 'bg-secondary-50 text-secondary-600' :
                  'bg-accent-50 text-accent-500'
                }`}>
                  {generating === type ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-1">{label}</h4>
                  <p className="text-sm text-gray-500">{desc}</p>
                  {generating === type && (
                    <p className="text-xs text-primary-600 mt-1 animate-pulse-soft">{s.generating}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
