import { useState, useRef } from 'react';
import {
  Upload, X, FileText, Presentation, File, Image as ImageIcon,
  Sparkles, Check, Eye, Loader2, Info
} from 'lucide-react';
import type { UploadedFile } from '@/types';
import { parseDocumentFile } from '@/lib/documentParser';
import type { UILang } from '@/lib/i18n';

interface SourceMaterialUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  teacherPrompt?: string;
  onTeacherPromptChange?: (prompt: string) => void;
  uiLang?: UILang;
  title?: string;
  description?: string;
  showTeacherPrompt?: boolean;
}

const QUICK_SUGGESTIONS_AR = [
  '🎯 التركيز على مهارات التفكير العليا وحل المشكلات',
  '💡 ضرب أمثلة تطبيقية واقعية من حياة الطلاب',
  '🌟 تضمين أسئلة تحدٍّ وتمايز للمتفوقين',
  '🤝 تصميم نشاط صفي تعاوني في مجموعات',
  '📖 تبسيط المفردات اللغوية وإدراج معجم مصطلحات',
  '🕌 ربط المفاهيم بالقيم الإسلامية والأخلاقية الرفيعة',
  '⏳ مراعاة زمن الحصة المخصص بدقة',
];

const QUICK_SUGGESTIONS_EN = [
  '🎯 Focus on Higher-Order Thinking Skills & Problem Solving',
  '💡 Include Real-World Authentic Applications',
  '🌟 Include Challenge Tasks for Advanced Learners',
  '🤝 Include Collaborative Group Activities',
  '📖 Provide Vocabulary Glossary & Scaffolded Text',
  '🕌 Align with Islamic Values and Ethical Principles',
  '⏳ Calibrate Strictly for Class Duration',
];

export default function SourceMaterialUpload({
  files,
  onFilesChange,
  teacherPrompt = '',
  onTeacherPromptChange,
  uiLang = 'ar',
  title,
  description,
  showTeacherPrompt = true,
}: SourceMaterialUploadProps) {
  const isAr = uiLang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<UploadedFile | null>(null);

  const quickSuggestions = isAr ? QUICK_SUGGESTIONS_AR : QUICK_SUGGESTIONS_EN;

  async function handleFileInput(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsParsing(true);
    try {
      const parsedFiles: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        const parsed = await parseDocumentFile(file);
        parsedFiles.push(parsed);
      }
      onFilesChange([...files, ...parsedFiles]);
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileInput(e.dataTransfer.files);
  }

  function handleRemoveFile(id: string) {
    onFilesChange(files.filter((f) => f.id !== id));
  }

  function handleAddSuggestion(suggestion: string) {
    if (!onTeacherPromptChange) return;
    const cleanText = suggestion.replace(/^[^\s]+\s*/, ''); // strip emoji
    if (teacherPrompt.trim()) {
      if (!teacherPrompt.includes(cleanText)) {
        onTeacherPromptChange(`${teacherPrompt.trim()} - ${cleanText}`);
      }
    } else {
      onTeacherPromptChange(cleanText);
    }
  }

  function getFileIcon(type: UploadedFile['type']) {
    switch (type) {
      case 'word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'powerpoint':
        return <Presentation className="w-5 h-5 text-amber-600" />;
      case 'pdf':
        return <File className="w-5 h-5 text-rose-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>
              {title || (isAr ? 'رفع ملف مصدري (Word / PDF / PowerPoint) وتوجيهات المعلم' : 'Upload Source Material & Teacher Instructions')}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {description ||
              (isAr
                ? 'ارفع كتاباً، درساً، أو عرضاً تقديمياً وسيقوم الذكاء الاصطناعي بالاعتماد عليه مباشرة في توليد المحتوى.'
                : 'Upload a textbook chapter, Word doc, or slides to base generation directly upon.')}
          </p>
        </div>

        {files.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            <span>{isAr ? `${files.length} ملفات مرفوعة` : `${files.length} files attached`}</span>
          </span>
        )}
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-indigo-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".docx,.doc,.pptx,.ppt,.pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => handleFileInput(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-indigo-600">
            {isParsing ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              {isParsing
                ? (isAr ? 'جارٍ قراءة واستخراج محتوى الملفات...' : 'Parsing files...')
                : (isAr ? 'اضغط لرفع ملف أو اسحبه إلى هنا' : 'Click to upload or drag & drop')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isAr
                ? 'يدعم مستندات Word (.docx) • عروض PowerPoint (.pptx) • ملفات PDF • نصوص ومستندات وصور'
                : 'Supports Word (.docx), PowerPoint (.pptx), PDF, Text (.txt), and Images'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 text-[10px] font-bold">Word (.docx)</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800 text-[10px] font-bold">PowerPoint (.pptx)</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-800 text-[10px] font-bold">PDF (.pdf)</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold">Images & Text</span>
          </div>
        </div>
      </div>

      {/* 3. Uploaded Files Badges */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-sm transition hover:border-indigo-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 p-2 rounded-lg bg-slate-100">
                  {getFileIcon(file.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    {file.size && <span>{formatSize(file.size)}</span>}
                    {file.textContent && file.textContent.length > 50 && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        {isAr ? 'تم استخراج النص' : 'Text parsed'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {file.textContent && file.textContent.length > 50 && (
                  <button
                    type="button"
                    onClick={() => setPreviewingFile(file)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    title={isAr ? 'معاينة النص المستخرج' : 'Preview parsed text'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title={isAr ? 'حذف الملف' : 'Remove file'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Optional Teacher Custom Prompt (Strictly Adhered to by AI) */}
      {showTeacherPrompt && onTeacherPromptChange && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isAr
                  ? 'توجيهات أو متطلبات خاصة بالمعلم (اختياري - يلتزم بها الذكاء الاصطناعي بدقة):'
                  : 'Special Teacher Instructions (Optional - Strictly Enforced):'}
              </span>
            </label>
            <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {isAr ? 'أولوية قصوى في التوليد' : 'High Priority'}
            </span>
          </div>

          <textarea
            rows={3}
            value={teacherPrompt}
            onChange={(e) => onTeacherPromptChange(e.target.value)}
            placeholder={
              isAr
                ? 'اكتب هنا ما تريده بدقة من الذكاء الاصطناعي (مثال: ركّز على تصريف الأفعال، أو اجعل الأسئلة 4 خيارات فقط، أو أضف سؤال تحدٍّ، أو ركّز على ناتج تعلم محدد... إذا كُتب شيء هنا سيلتزم به الذكاء الاصطناعي كأولوية قصوى).'
                : 'Write your specific requirements here (e.g. emphasize a specific concept, add challenge questions, simplify language...). The AI will strictly follow these instructions.'
            }
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400 font-medium"
          />

          {/* Quick Suggestions Chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-500" />
              <span>{isAr ? 'اقتراحات سريعة:' : 'Quick suggestions:'}</span>
            </span>
            {quickSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSuggestion(suggestion)}
                className="text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition font-medium border border-slate-200 hover:border-indigo-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Text Preview Modal */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                {getFileIcon(previewingFile.type)}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 truncate max-w-md">
                    {previewingFile.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isAr ? 'النص المستخرج الذي سيعتمد عليه الذكاء الاصطناعي' : 'Parsed text extracted for AI'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50">
              {previewingFile.textContent || (isAr ? 'لا يوجد نص مستخرج.' : 'No text content.')}
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end bg-white">
              <button
                type="button"
                onClick={() => setPreviewingFile(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
