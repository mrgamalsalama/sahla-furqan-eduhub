import { useState, useMemo } from 'react';
import {
  X, Briefcase, Search, FileText, Check, Calendar, HardDrive,
  FileCode2, Image as ImageIcon, BookOpen
} from 'lucide-react';
import type { TeacherResource, UploadedFile } from '@/types';
import { getTeacherResources } from '@/lib/storage';
import type { UILang } from '@/lib/i18n';

interface ResourcePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: UploadedFile) => void;
  uiLang?: UILang;
  filterType?: 'all' | 'pdf' | 'word' | 'image';
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcePickerModal({
  isOpen,
  onClose,
  onSelect,
  uiLang = 'ar',
  filterType = 'all',
}: ResourcePickerModalProps) {
  const isAr = uiLang === 'ar';
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(filterType);

  const allResources = useMemo(() => {
    if (!isOpen) return [];
    return getTeacherResources();
  }, [isOpen]);

  const filtered = useMemo(() => {
    return allResources.filter((res) => {
      if (selectedCategory !== 'all' && res.type !== selectedCategory) {
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
  }, [allResources, selectedCategory, search]);

  if (!isOpen) return null;

  function handlePick(res: TeacherResource) {
    const uploadedFile: UploadedFile = {
      id: res.id,
      name: res.name,
      type: res.type === 'pdf' ? 'pdf' : res.type === 'word' ? 'word' : res.type === 'powerpoint' ? 'powerpoint' : res.type === 'image' ? 'image' : 'text',
      dataUrl: res.dataUrl || '',
      base64: res.base64 || '',
      mimeType: res.mimeType || (res.type === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      textContent: res.textContent || '',
      size: res.size,
    };
    onSelect(uploadedFile);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isAr ? 'اختيار من حقيبتي ومصادري السحابية' : 'Select from My Cloud Resources'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'اختر أي كتاب مدرسي أو ملف رفعته مسبقاً لاستخدامه فوراً دون إعادة رفعه'
                  : 'Pick any previously uploaded textbook or document instantly'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث في ملفاتي المرفوعة والكتب...' : 'Search my resources...'}
              className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: isAr ? 'الكل' : 'All' },
              { id: 'pdf', label: isAr ? 'كتب PDF' : 'PDFs' },
              { id: 'word', label: isAr ? 'Word' : 'Word' },
              { id: 'image', label: isAr ? 'صور' : 'Images' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Resources */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium">
                {isAr
                  ? 'لا توجد ملفات مطابقة في حقيبتك حالياً.'
                  : 'No matching files in your resources locker.'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'أي ملف ترفعه في أي مكان بالمنصة يُحفظ هنا تلقائياً لتعيد استخدامه بنقرة واحدة.'
                  : 'Files uploaded anywhere in EduHub will be automatically stored here.'}
              </p>
            </div>
          ) : (
            filtered.map((res) => (
              <div
                key={res.id}
                onClick={() => handlePick(res)}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition flex items-center justify-between gap-3 cursor-pointer group bg-white shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    res.type === 'pdf'
                      ? 'bg-rose-100 text-rose-700'
                      : res.type === 'word'
                      ? 'bg-blue-100 text-blue-700'
                      : res.type === 'image'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {res.type === 'pdf' && <FileText className="w-5 h-5" />}
                    {res.type === 'word' && <FileCode2 className="w-5 h-5" />}
                    {res.type === 'image' && <ImageIcon className="w-5 h-5" />}
                    {res.type !== 'pdf' && res.type !== 'word' && res.type !== 'image' && (
                      <HardDrive className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                      {res.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>{formatSize(res.size)}</span>
                      {res.pageCount && (
                        <>
                          <span>•</span>
                          <span>{res.pageCount} {isAr ? 'صفحة' : 'pages'}</span>
                        </>
                      )}
                      {res.subject && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{res.subject}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(res.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAr ? 'اختيار' : 'Select'}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {isAr ? `إجمالي المصادر في حقيبتك: ${allResources.length} ملف` : `Total in locker: ${allResources.length}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
