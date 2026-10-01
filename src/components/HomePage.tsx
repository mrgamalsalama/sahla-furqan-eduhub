import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, FileType2, X, Loader2,
  ClipboardList, FileQuestion, Presentation, BookOpenCheck,
  Sparkles, AlertCircle, Settings2, ChevronLeft, Award, FileCode2,
  Sliders, Layout, Eye, BookOpen, Layers
} from 'lucide-react';
import type {
  LessonSettings, OutputType, UploadedFile, GenerationResult, ContentLang,
  InstitutionId, View, WorksheetSettings, PresentationSettings, LmsTarget,
  WorksheetTheme, PresentationDepth, PresentationTheme
} from '@/types';
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
  onNavigate?: (view: View) => void;
}

export default function HomePage({ onOpenResult, uiLang, onNavigate }: HomePageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';

  const grades = isAr ? GRADES_AR : GRADES_EN;
  const durations = isAr ? DURATIONS_AR : DURATIONS_EN;
  const studentLevels = isAr ? STUDENT_LEVELS_AR : STUDENT_LEVELS_EN;
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      lmsTarget: saved.lmsTarget || 'sahlah_cypher',
      worksheetSettings: saved.worksheetSettings || {
        pageCount: 2,
        themeStyle: 'classic',
        aiAutoPilot: true,
        teacherCustomPrompt: '',
      },
      presentationSettings: saved.presentationSettings || {
        slideCount: 10,
        depthLevel: 'detailed',
        visualTheme: 'tech_blue',
      },
    };
  });

  const [generating, setGenerating] = useState<OutputType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [activeTabSetting, setActiveTabSetting] = useState<'general' | 'worksheet' | 'presentation' | 'lms'>('general');
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
    { type: 'worksheet', label: outputLabels['worksheet'], desc: isAr ? 'أوراق عمل تفاعلية متدرجة بهرم بلوم' : 'Bloom-structured worksheets', icon: FileText, color: 'secondary' },
    { type: 'quiz', label: outputLabels['quiz'], desc: isAr ? '10 أسئلة MCQ مع حزمة QTI للمنصة' : '10 MCQs with QTI package', icon: FileQuestion, color: 'accent' },
    { type: 'slides', label: outputLabels['slides'], desc: isAr ? 'عروض شرائح تفصيلية مع دليل المعلم' : 'Slide deck with teacher script', icon: Presentation, color: 'primary' },
    { type: 'qti-exam', label: isAr ? 'امتحان بلوم الشامل (50 سؤال QTI)' : '50-MCQ Bloom Exam (QTI)', desc: isAr ? '50 سؤالاً متدرجة هرمياً لمنصات LMS' : '50 Bloom questions for LMS', icon: FileQuestion, color: 'accent' },
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

      {/* Upload Zone */}
      <div className="card p-6 mb-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
              : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <p className="font-bold text-gray-700 text-lg mb-1">{s.dropFilesTitle}</p>
          <p className="text-gray-400 text-sm mb-4">{s.dropFilesSub}</p>
          <button
            type="button"
            className="btn-primary text-sm px-6 py-2.5 rounded-xl pointer-events-none"
          >
            {s.browseFiles}
          </button>
        </div>
      </div>

      {/* Uploaded Files preview */}
      {files.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">{s.uploadedFiles} ({files.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {files.map((file) => (
              <div key={file.id} className="relative group bg-gray-50 rounded-xl p-3 border border-gray-100">
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-error-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                  {file.type === 'image' && file.dataUrl ? (
                    <img src={file.dataUrl} alt={file.name} className="w-full h-full object-cover" />
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

      {/* Settings & Customization Hub */}
      <div className="card mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-accent-500" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h3 className="font-bold text-gray-800">{s.lessonSettings}</h3>
              <p className="text-sm text-gray-500">{isAr ? 'بيانات الدرس، استوديو أوراق العمل، العروض التقديمية، ومنصة QTI' : 'Lesson metadata, Worksheet studio, Slide deck & QTI LMS setup'}</p>
            </div>
          </div>
          <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform ${showSettings ? (isAr ? '-rotate-90' : 'rotate-90') : ''}`} />
        </button>

        {showSettings && (
          <div className="px-5 pb-5 border-t border-gray-100 animate-slide-up">
            {/* Setting Sub-Tabs */}
            <div className="flex gap-2 my-4 border-b border-gray-100 pb-2 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTabSetting('general')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTabSetting === 'general' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAr ? 'البيانات الأساسية للدرس' : 'General Lesson Data'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSetting('worksheet')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTabSetting === 'worksheet' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isAr ? 'تخصيص ورقة العمل (بلوم)' : 'Worksheet Studio'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSetting('presentation')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTabSetting === 'presentation' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>{isAr ? 'تخصيص العرض التقديمي' : 'Slide Deck Studio'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSetting('lms')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTabSetting === 'lms' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'منصة LMS المستهدفة (QTI)' : 'QTI LMS Engine'}</span>
              </button>
            </div>

            {/* Tab: General */}
            {activeTabSetting === 'general' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
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
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                        {isAr ? sub.ar : sub.en}
                      </option>
                    ))}
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
                      type="button"
                      onClick={() => setSettings({ ...settings, institution: 'sahlah' as InstitutionId })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        settings.institution === 'sahlah'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-6 w-auto max-w-[72px] object-contain" />
                      {s.sahlahAcademy}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, institution: 'furqan' as InstitutionId })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        settings.institution === 'furqan'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-6 w-auto object-contain" />
                      {s.furqanSchool}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, institution: 'both' as InstitutionId })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        settings.institution === 'both'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-6 w-auto max-w-[64px] object-contain" />
                        <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-6 w-auto object-contain" />
                      </div>
                      {s.bothInstitutions}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label-field">{s.contentLanguage}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, contentLanguage: 'ar' as ContentLang })}
                      className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        settings.contentLanguage === 'ar'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {s.arabic} (تشكيل تام 100%)
                    </button>
                    <button
                      type="button"
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
            )}

            {/* Tab: Worksheet Studio Customizer */}
            {activeTabSetting === 'worksheet' && (
              <div className="space-y-4 mt-2 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-secondary-600" />
                    <span>{isAr ? 'إعدادات استوديو أوراق العمل التفاعلية (هرم بلوم)' : 'Bloom Worksheet Studio Settings'}</span>
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={settings.worksheetSettings?.aiAutoPilot !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          worksheetSettings: {
                            ...settings.worksheetSettings,
                            aiAutoPilot: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{isAr ? 'الطيار الآلي الذكي (AutoPilot)' : 'AI AutoPilot Preset'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'عدد الصفحات المستهدفة:' : 'Target Page Count:'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((pages) => (
                        <button
                          key={pages}
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              worksheetSettings: {
                                ...settings.worksheetSettings,
                                pageCount: pages,
                              },
                            })
                          }
                          className={`py-2 text-center rounded-lg border font-bold transition-all ${
                            (settings.worksheetSettings?.pageCount || 2) === pages
                              ? 'bg-secondary-600 text-white border-secondary-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {pages} {isAr ? 'صفحات' : 'p.'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'النمط والتنسيق المرئي:' : 'Visual Theme:'}
                    </label>
                    <select
                      value={settings.worksheetSettings?.themeStyle || 'classic'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          worksheetSettings: {
                            ...settings.worksheetSettings,
                            themeStyle: e.target.value as WorksheetTheme,
                          },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value="classic">{isAr ? 'كلاسيكي أكاديمي رصين (جداول وإطارات)' : 'Classic Academic'}</option>
                      <option value="modern">{isAr ? 'عصري وحيوي (بطاقات وأيقونات ناعمة)' : 'Modern Vibrant'}</option>
                      <option value="minimal">{isAr ? 'بسيط أحادي موفر للحبر (أبيض وأسود)' : 'Minimal Monochrome'}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'المعايير المحددة للورقة (اختياري):' : 'Target Standards / Outcomes:'}
                    </label>
                    <input
                      type="text"
                      value={settings.worksheetSettings?.standardsSelection || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          worksheetSettings: {
                            ...settings.worksheetSettings,
                            standardsSelection: e.target.value,
                          },
                        })
                      }
                      placeholder={isAr ? 'مثال: نواتج تعلم معايير وزارة التعليم أو معايير ABT أو IB' : 'e.g. Common Core or Ministry Standards'}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'توجيهات وأنشطة مخصصة يطلبها المعلم في الورقة:' : 'Custom Teacher Prompts & Focus Areas:'}
                    </label>
                    <textarea
                      rows={2}
                      value={settings.worksheetSettings?.teacherCustomPrompt || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          worksheetSettings: {
                            ...settings.worksheetSettings,
                            teacherCustomPrompt: e.target.value,
                          },
                        })
                      }
                      placeholder={isAr ? 'مثال: ركّز في الصفحة الثانية على استخراج الصور البيانية، وضع جدولاً للمفردات وضدها...' : 'e.g. Emphasize analytical text exercises on page 2...'}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Presentation Studio Customizer */}
            {activeTabSetting === 'presentation' && (
              <div className="space-y-4 mt-2 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Presentation className="w-4 h-4 text-primary-600" />
                  <span>{isAr ? 'إعدادات استوديو العروض التقديمية التفصيلية' : 'Slide Deck Studio Settings'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'عدد الشرائح المطلوبة:' : 'Number of Slides:'}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[6, 10, 15, 20].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              presentationSettings: {
                                ...settings.presentationSettings,
                                slideCount: count,
                              },
                            })
                          }
                          className={`py-2 text-center rounded-lg border font-bold transition-all ${
                            (settings.presentationSettings?.slideCount || 10) === count
                              ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {count} {isAr ? 'شرائح' : 'slides'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'الثيم والألوان:' : 'Visual Palette:'}
                    </label>
                    <select
                      value={settings.presentationSettings?.visualTheme || 'tech_blue'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          presentationSettings: {
                            ...settings.presentationSettings,
                            visualTheme: e.target.value as PresentationTheme,
                          },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value="tech_blue">{isAr ? 'أزرق أكاديمي ذكي (Tech Blue)' : 'Tech Blue'}</option>
                      <option value="warm_edu">{isAr ? 'تعليمي دافئ وأنيق (Warm Edu)' : 'Warm Edu'}</option>
                      <option value="minimal">{isAr ? 'أكاديمي بسيط (Minimal Academic)' : 'Minimal Academic'}</option>
                      <option value="creative_k12">{isAr ? 'حيوي للمراحل الابتدائية (Creative K-12)' : 'Creative K-12'}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1.5">
                      {isAr ? 'عمق المحتوى ودليل المعلم:' : 'Content Depth & Teacher Notes:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            presentationSettings: {
                              ...settings.presentationSettings,
                              depthLevel: 'concise',
                            },
                          })
                        }
                        className={`p-2.5 rounded-lg border text-start transition-all ${
                          settings.presentationSettings?.depthLevel === 'concise'
                            ? 'bg-primary-50 border-primary-600 text-primary-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-bold mb-0.5">{isAr ? 'موجز ورئيسي' : 'Concise'}</div>
                        <div className="text-[11px] text-gray-500">{isAr ? 'رؤوس أقلام وأفكار رئيسة سريعة' : 'Bullet points & core concepts'}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            presentationSettings: {
                              ...settings.presentationSettings,
                              depthLevel: 'detailed',
                            },
                          })
                        }
                        className={`p-2.5 rounded-lg border text-start transition-all ${
                          settings.presentationSettings?.depthLevel === 'detailed'
                            ? 'bg-primary-50 border-primary-600 text-primary-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-bold mb-0.5">{isAr ? 'تفصيلي تطبيقي' : 'Detailed'}</div>
                        <div className="text-[11px] text-gray-500">{isAr ? 'شروحات وافية وأمثلة مرافقة' : 'In-depth explanations & examples'}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            presentationSettings: {
                              ...settings.presentationSettings,
                              depthLevel: 'comprehensive_script',
                            },
                          })
                        }
                        className={`p-2.5 rounded-lg border text-start transition-all ${
                          settings.presentationSettings?.depthLevel === 'comprehensive_script'
                            ? 'bg-primary-50 border-primary-600 text-primary-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-bold mb-0.5">{isAr ? 'شامل + سيناريو الشرح' : 'Comprehensive + Script'}</div>
                        <div className="text-[11px] text-gray-500">{isAr ? 'يتضمن دليل المعلم وسيناريو الشرح وأسئلة النقاش' : 'Includes teacher script & discussion prompts'}</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: LMS Target Configuration */}
            {activeTabSetting === 'lms' && (
              <div className="space-y-4 mt-2 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تحديد منصة إدارة التعلم المستهدفة لحزم QTI' : 'Target LMS Engine for QTI Exports'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, lmsTarget: 'sahlah_cypher' })}
                    className={`p-3.5 rounded-xl border text-start transition-all ${
                      (settings.lmsTarget || 'sahlah_cypher') === 'sahlah_cypher'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">أكاديمية سهلة الدولية</div>
                    <div className="text-gray-600">Cypher / NEO LMS Engine (معيار IMS QTI v2.1 القياسي مع حزمة XML مضمنة)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, lmsTarget: 'furqan_canvas' })}
                    className={`p-3.5 rounded-xl border text-start transition-all ${
                      settings.lmsTarget === 'furqan_canvas'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">مدرسة الفرقان العالمية</div>
                    <div className="text-gray-600">Canvas LMS / Classera (معيار QTI 1.2/2.1 المتوافق مع بنوك الأسئلة المباشرة)</div>
                  </button>
                </div>
              </div>
            )}
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
              type="button"
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

          {/* New Question-to-QTI Studio Hero Banner */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('qti-converter')}
              className="card p-5 sm:col-span-2 text-right bg-gradient-to-r from-emerald-500/10 via-teal-50 to-white border-emerald-300 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                  <FileCode2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 mb-1 text-base">
                      {isAr ? 'استوديو ومحول الأسئلة إلى QTI (سهلة Cypher & الفرقان Canvas)' : 'Raw Questions to QTI Studio'}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-600 text-white rounded-full">جديد ومطور</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {isAr
                      ? 'الصق أسئلتك غير المنظمة من مستندات Word أو PDF، واستخرج الخيارات ونماذج الإجابة مع التشكيل التام بنسبة 100%، وحمّل حزمة XML صالحة فوراً للاستيراد في منصة المدرسة.'
                      : 'Paste unstructured questions from text files or Word to generate formatted reviews and standard QTI XML ready for LMS upload.'}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Benchmark Tests Banner */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('benchmark')}
              className="card p-5 sm:col-span-2 text-right bg-gradient-to-r from-primary-50/60 via-white to-primary-50/30 border-primary-200 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800 mb-1">
                      {isAr ? 'الاختبارات المعيارية وقياس الأداء ورصد الفجوات' : 'Standardized Benchmark & Diagnostic Tests'}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-bold bg-primary-600 text-white rounded-full">شامل</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {isAr
                      ? 'بناء تقييم معياري بنواتج تعلم ومصفوفات مهارات (ABT / البكالوريا الدولية IB / الإطار الأوروبي CEFR)، مع خطة علاجية تشخيصية.'
                      : 'Create criterion-referenced benchmark tests aligned with ABT, IB, and CEFR standards.'}
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
