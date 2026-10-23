import { useState, useMemo, useRef } from 'react';
import {
  Briefcase, Search, Upload, FileText, FileCode2,
  Image as ImageIcon, Trash2, Download,
  Globe, Lock, CheckCircle2,
  Plus, Sparkles, Edit3,
  BookOpen, AlertCircle
} from 'lucide-react';
import type { TeacherResource, View } from '@/types';
import {
  getTeacherResources,
  deleteTeacherResource,
  toggleTeacherResourcePublic,
  autoSaveUploadedResource
} from '@/lib/storage';
import { parseDocumentFile } from '@/lib/documentParser';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UILang } from '@/lib/i18n';

interface MyResourcesPageProps {
  uiLang: UILang;
  user: SupabaseUser | null;
  onSignIn: () => void;
  onNavigate: (view: View) => void;
  onOpenInPdfEditor: (resource: TeacherResource) => void;
  onUseInStudio: (resource: TeacherResource, target: 'lesson-plan' | 'worksheet' | 'quiz-exam') => void;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MyResourcesPage({
  uiLang,
  user,
  onSignIn,
  onNavigate,
  onOpenInPdfEditor,
  onUseInStudio,
}: MyResourcesPageProps) {
  const isAr = uiLang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<TeacherResource[]>(() => getTeacherResources());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function refreshList() {
    setResources(getTeacherResources());
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handle uploading new file directly into locker
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const parsed = await parseDocumentFile(file);
        autoSaveUploadedResource(parsed, { user });
      }
      refreshList();
      showToast(isAr ? 'تمت إضافة الملفات لحقيبتك السحابية بنجاح!' : 'Files added to your locker successfully!');
    } catch (err) {
      console.error(err);
      showToast(isAr ? 'حدث خطأ أثناء معالجة الملف' : 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDelete(id: string, name: string) {
    if (confirm(isAr ? `هل أنت متأكد من حذف "${name}" من حقيبتك؟` : `Delete "${name}"?`)) {
      deleteTeacherResource(id);
      refreshList();
      showToast(isAr ? 'تم حذف الملف من الحقيبة' : 'File deleted from locker');
    }
  }

  function handleToggleShare(res: TeacherResource) {
    const nextState = !res.isPublic;
    toggleTeacherResourcePublic(res.id, nextState);
    refreshList();
    if (nextState) {
      showToast(isAr ? 'تمت مشاركة الملف مع المكتبة العامة والمجتمع بنجاح!' : 'Shared with Community Hub!');
    } else {
      showToast(isAr ? 'تم إلغاء المشاركة (أصبح الملف خاصاً بك فقط)' : 'Unshared (Private to you)');
    }
  }

  function handleDownload(res: TeacherResource) {
    if (res.dataUrl) {
      const a = document.createElement('a');
      a.href = res.dataUrl;
      a.download = res.name;
      a.click();
    } else if (res.textContent) {
      const blob = new Blob([res.textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${res.title}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(isAr ? 'الملف غير متوفر للتحميل المباشر' : 'Download not available');
    }
  }

  // Filtered resources
  const filtered = useMemo(() => {
    return resources.filter((res) => {
      if (selectedType !== 'all' && res.type !== selectedType) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = res.name.toLowerCase().includes(q);
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesSubject = res.subject?.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSubject) return false;
      }
      return true;
    });
  }, [resources, selectedType, search]);

  // Stats calculation
  const totalBytes = useMemo(() => resources.reduce((acc, r) => acc + (r.size || 0), 0), [resources]);
  const pdfCount = useMemo(() => resources.filter((r) => r.type === 'pdf').length, [resources]);
  const sharedCount = useMemo(() => resources.filter((r) => r.isPublic).length, [resources]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isAr ? 'حقيبتي ومصادري التعليمية السحابية' : 'My Cloud Resources Locker'}
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {isAr ? 'سحابي ومحلي' : 'Cloud Locker'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'مستودعك الشامل لكافة الكتب المدرسية والمستندات وأوراق العمل التي ترفعها في المنصة. تحفظ هنا تلقائياً لتسترجعها وتعدلها في أي وقت دون إعادة رفعها.'
                  : 'Your centralized hub for all uploaded textbooks, curriculum documents, and teaching materials.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.txt,image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{uploading ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع ملف أو كتاب جديد' : 'Upload Resource')}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('pdf-editor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'محرر الـ PDF الذكي' : 'PDF Studio'}</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <p className="text-[11px] font-semibold text-slate-500">{isAr ? 'إجمالي الملفات' : 'Total Resources'}</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{resources.length}</p>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
            <p className="text-[11px] font-semibold text-rose-700">{isAr ? 'كتب ومستندات PDF' : 'PDF Textbooks'}</p>
            <p className="text-lg font-black text-rose-900 mt-0.5">{pdfCount}</p>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
            <p className="text-[11px] font-semibold text-blue-700">{isAr ? 'إجمالي الحجم' : 'Total Size'}</p>
            <p className="text-lg font-black text-blue-900 mt-0.5">{formatSize(totalBytes)}</p>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <p className="text-[11px] font-semibold text-emerald-700">{isAr ? 'مشتركة مع المجتمع' : 'Shared to Hub'}</p>
            <p className="text-lg font-black text-emerald-900 mt-0.5">{sharedCount}</p>
          </div>
        </div>
      </div>

      {/* Auth Banner if not logged in */}
      {!user && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">{isAr ? 'أنت تتصفح المصادر كزائر (تخزين محلي مؤقت)' : 'Viewing as guest'}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {isAr
                  ? 'سجّل دخولك لحفظ ومزامنة حقيبتك ومصادرك سحابياً، لتفتحها من أي جهاز ومشاركتها مع مجتمع المعلمين.'
                  : 'Sign in to sync your locker across devices and share with fellow educators.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0 self-start sm:self-auto"
          >
            {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Register'}
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في ملفاتي، الكتب، المواد...' : 'Search my files...'}
            className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: isAr ? 'الكل' : 'All' },
            { id: 'pdf', label: isAr ? 'كتب PDF' : 'PDFs' },
            { id: 'word', label: isAr ? 'Word' : 'Word' },
            { id: 'powerpoint', label: isAr ? 'PowerPoint' : 'Slides' },
            { id: 'image', label: isAr ? 'صور' : 'Images' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedType === cat.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Resources */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isAr ? 'حقيبتك التعليمية بانتظار مصادرك!' : 'Your locker is empty'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'ارفع كتب المنهج، مستندات Word، أو أوراق العمل هنا، أو ارفعها في أي استوديو تحضير وستُحفظ في حقيبتك تلقائياً.'
                : 'Upload your curriculum books or teaching files to manage and reuse them effortlessly.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Upload className="w-4 h-4" />
            <span>{isAr ? 'رفع ملف الآن' : 'Upload File Now'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-md transition p-4 flex flex-col justify-between group relative"
            >
              <div>
                {/* Type Badge & Community Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    res.type === 'pdf'
                      ? 'bg-rose-100 text-rose-800'
                      : res.type === 'word'
                      ? 'bg-blue-100 text-blue-800'
                      : res.type === 'powerpoint'
                      ? 'bg-amber-100 text-amber-800'
                      : res.type === 'image'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {res.type === 'pdf' && <FileText className="w-3 h-3" />}
                    {res.type === 'word' && <FileCode2 className="w-3 h-3" />}
                    {res.type === 'image' && <ImageIcon className="w-3 h-3" />}
                    <span>{res.type.toUpperCase()}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleShare(res)}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border transition ${
                      res.isPublic
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
                    }`}
                    title={isAr ? (res.isPublic ? 'مشترك مع المجتمع (اضغط لإلغاء)' : 'خاص بي فقط (اضغط للمشاركة)') : 'Toggle Community Sharing'}
                  >
                    {res.isPublic ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3" />}
                    <span>{res.isPublic ? (isAr ? 'عام بالمجتمع' : 'Public') : (isAr ? 'خاص بي' : 'Private')}</span>
                  </button>
                </div>

                {/* Title & Info */}
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 transition line-clamp-2 leading-snug">
                  {res.name}
                </h3>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span className="font-semibold">{formatSize(res.size)}</span>
                  {res.pageCount && (
                    <>
                      <span>•</span>
                      <span>{res.pageCount} {isAr ? 'صفحة' : 'pages'}</span>
                    </>
                  )}
                  {res.subject && (
                    <>
                      <span>•</span>
                      <span className="text-slate-700 font-bold">{res.subject}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(res.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>

              {/* Action Buttons Strip */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  {res.type === 'pdf' ? (
                    <button
                      type="button"
                      onClick={() => onOpenInPdfEditor(res)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition"
                      title={isAr ? 'فتح وتعديل في محرر الـ PDF الذكي' : 'Edit in PDF Studio'}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isAr ? 'تعديل كـ Word' : 'Edit as Word'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUseInStudio(res, 'lesson-plan')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition"
                      title={isAr ? 'استخدام في تحضير درس' : 'Use in Lesson Plan'}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isAr ? 'تحضير درس' : 'Lesson Plan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onUseInStudio(res, 'worksheet')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition"
                    title={isAr ? 'توليد ورقة عمل من هذا الملف' : 'Make Worksheet'}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(res)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    title={isAr ? 'تحميل الملف' : 'Download file'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(res.id, res.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  title={isAr ? 'حذف من الحقيبة' : 'Delete resource'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
