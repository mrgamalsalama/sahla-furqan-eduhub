import { useState, useEffect } from 'react';
import {
  Library as LibraryIcon, Trash2, FileEdit, Clock,
  ClipboardList, FileText, FileQuestion, Presentation, FolderOpen,
  Cloud, CloudOff, Globe, Printer, FileType2, Package,
  LogIn, Sparkles, ToggleLeft, ToggleRight, X, AlertTriangle
} from 'lucide-react';
import type { SavedLesson } from '@/types';
import { OUTPUT_LABELS_AR, OUTPUT_LABELS_EN } from '@/types';
import { getSavedLessons, deleteLesson, saveLesson } from '@/lib/storage';
import {
  getCloudResources,
  deleteCloudResource,
  togglePublicResource,
  saveCloudResource,
  isSupabaseConfigured
} from '@/lib/supabase';
import { exportToWord, printContent } from '@/lib/export';
import { createAndDownloadQtiZip } from '@/lib/qtiPackager';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import type { User } from '@supabase/supabase-js';

interface LibraryPageProps {
  onOpenLesson: (lesson: SavedLesson) => void;
  uiLang: UILang;
  user: User | null;
  onSignIn?: () => void;
}

const outputIcons: Record<string, typeof ClipboardList> = {
  'lesson-plan': ClipboardList,
  'worksheet': FileText,
  'quiz': FileQuestion,
  'qti-exam': FileQuestion,
  'slides': Presentation,
  'standardized-test': FileQuestion,
};

export default function LibraryPage({
  onOpenLesson,
  uiLang,
  user,
  onSignIn,
}: LibraryPageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, [user]);

  async function loadLibrary() {
    setLoading(true);
    try {
      // 1. Load local lessons
      const localLessons = getSavedLessons();
      const validLocal = Array.isArray(localLessons)
        ? localLessons.filter((item) => item && typeof item === 'object' && item.id)
        : [];

      // 2. If user is signed in, load cloud resources and merge
      if (user && isSupabaseConfigured()) {
        const cloudLessons = await getCloudResources(user.id);
        const map = new Map<string, SavedLesson>();

        // Put cloud lessons first
        cloudLessons.forEach((cl) => map.set(cl.id, cl));
        // Overlay / include local lessons
        validLocal.forEach((ll) => {
          if (!map.has(ll.id)) {
            map.set(ll.id, ll);
          }
        });

        setLessons(Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      } else {
        setLessons(validLocal);
      }
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  // Delete lesson
  function handleDeleteClick(lesson: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();
    setLessonToDelete(lesson);
  }

  async function handleConfirmDelete() {
    if (!lessonToDelete) return;
    const lesson = lessonToDelete;
    try {
      // Delete locally
      deleteLesson(lesson.id);

      // Delete from cloud if user signed in
      if (user) {
        await deleteCloudResource(lesson.id);
      }

      setLessons((prev) => prev.filter((item) => item.id !== lesson.id));
    } catch (err) {
      console.warn('Delete error:', err);
    } finally {
      setLessonToDelete(null);
    }
  }

  // Toggle publish in public community
  async function handleTogglePublish(lesson: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();

    if (!user) {
      onSignIn?.();
      return;
    }

    setPublishingId(lesson.id);
    const newStatus = !lesson.isPublic;

    // 1. Save locally
    const updatedLesson: SavedLesson = {
      ...lesson,
      isPublic: newStatus,
      updatedAt: Date.now(),
    };
    saveLesson(updatedLesson);

    // 2. Sync to Supabase
    await saveCloudResource(updatedLesson, user, newStatus);
    await togglePublicResource(lesson.id, newStatus);

    setLessons((prev) =>
      prev.map((item) => (item.id === lesson.id ? { ...item, isPublic: newStatus } : item))
    );
    setPublishingId(null);
  }

  // Export to Word docx
  async function handleExportDocx(lesson: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();
    setExportingId(`word_${lesson.id}`);
    try {
      await exportToWord(
        {
          title: lesson.title,
          htmlContent: lesson.contentHtml,
          fileName: lesson.title || 'Lesson_Document',
          settings: lesson.settings,
        },
        lesson.settings?.contentLanguage === 'en' ? 'en' : 'ar'
      );
    } finally {
      setExportingId(null);
    }
  }

  // Print / Save as PDF
  function handlePrintPDF(lesson: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();
    printContent(
      lesson.title,
      lesson.contentHtml,
      lesson.settings?.contentLanguage === 'en' ? 'en' : 'ar',
      lesson.settings
    );
  }

  // Download QTI ZIP
  async function handleDownloadQti(lesson: SavedLesson, e: React.MouseEvent) {
    e.stopPropagation();
    setExportingId(`qti_${lesson.id}`);
    try {
      const rawHtml = lesson.contentHtml || '';
      const target = lesson.settings?.institution === 'furqan' ? 'furqan_canvas' : 'sahlah_cypher';
      await createAndDownloadQtiZip({
        title: lesson.title || 'Assessment_QTI',
        xmlPayload: rawHtml,
        target,
        subject: lesson.settings?.subject,
        grade: lesson.settings?.grade,
      });
    } finally {
      setExportingId(null);
    }
  }

  function formatDate(ts?: number): string {
    if (!ts || isNaN(ts)) return '';
    try {
      return new Date(ts).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
            <LibraryIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">{s.libraryTitle}</h2>
            <p className="text-sm text-slate-600 font-medium">{s.libraryDesc}</p>
          </div>
        </div>

        {/* Cloud Status Pill */}
        {user ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'المزامنة السحابية نشطة (Supabase)' : 'Cloud Sync Active (Supabase)'}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
            <CloudOff className="w-4 h-4 text-slate-400" />
            <span>{isAr ? 'حفظ محلي فقط في هذا المتصفح' : 'Local Browser Storage'}</span>
          </div>
        )}
      </div>

      {/* Guest Notice Card */}
      {!user && (
        <div className="p-4 sm:p-5 mb-8 rounded-2xl bg-gradient-to-r from-blue-50 via-teal-50/40 to-slate-50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-blue-950">
                {isAr ? '💡 مزامنة أعمالك عبر السحابة والوصول من أي جهاز' : '💡 Sync Work to the Cloud'}
              </h4>
              <p className="text-xs text-slate-600 font-medium">
                {isAr
                  ? 'يمكنك تسجيل الدخول أو إنشاء حسابك لحفظ أعمالك سحابياً والوصول إليها من أي متصفح، ومشاركتها مع زملائك في المكتبة العامة.'
                  : 'Sign in or register to sync across browsers and share quality resources with fellow educators.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="shrink-0 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <LogIn className="w-4 h-4 text-teal-300" />
            <span>{isAr ? 'تسجيل الدخول / حساب جديد' : 'Sign In / Register'}</span>
          </button>
        </div>
      )}

      {/* Resource Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600">
            {isAr ? 'جارٍ تحميل مكتبتك التعليمية...' : 'Loading your library...'}
          </p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2 border-slate-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{s.noLessons}</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {s.noLessonsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lessons.map((lesson) => {
            const Icon = (lesson.outputType && outputIcons[lesson.outputType]) || FileText;
            const label = (lesson.outputType && (outputLabels as Record<string, string>)[lesson.outputType]) || (isAr ? 'مستند تعليمي' : 'Lesson Document');
            const isQuizType = lesson.outputType === 'quiz' || lesson.outputType === 'qti-exam' || lesson.outputType === 'standardized-test' || lesson.title?.includes('اختبار');
            const isPublishing = publishingId === lesson.id;

            return (
              <div
                key={lesson.id}
                onClick={() => onOpenLesson(lesson)}
                className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-500 transition-all duration-150 cursor-pointer"
              >
                <div>
                  {/* Top Bar: Icon, Badges, Delete */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 group-hover:bg-blue-900 group-hover:text-white transition-colors shadow-2xs">
                      <Icon className="w-5 h-5 text-teal-600 group-hover:text-white transition-colors" />
                    </div>

                    <div className="flex items-center gap-1">
                      {lesson.isPublic && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <Globe className="w-3 h-3 text-teal-600" />
                          <span>{isAr ? 'منشور عام' : 'Public'}</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteClick(lesson, e)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                        title={isAr ? 'حذف من المكتبة' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 mb-1 group-hover:text-blue-900 transition-colors line-clamp-2">
                    {lesson.title || (isAr ? 'بدون عنوان' : 'Untitled')}
                  </h3>
                  <div className="text-xs font-semibold text-teal-700 mb-2">
                    {label}
                  </div>

                  {lesson.settings?.subject && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {lesson.settings.subject}
                      </span>
                      {lesson.settings?.grade && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {lesson.settings.grade}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(lesson.updatedAt)}</span>
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {/* Public Toggle */}
                  <div
                    onClick={(e) => handleTogglePublish(lesson, e)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      lesson.isPublic
                        ? 'bg-teal-50/70 border-teal-200 text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isAr ? 'تبديل النشر في المكتبة العامة لمجتمع المعلمين' : 'Toggle Publish to Community Hub'}
                  >
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-[11px]">
                        {lesson.isPublic
                          ? isAr ? 'منشور في مجتمع المعلمين' : 'Shared in Community'
                          : isAr ? 'نشر في مجتمع المعلمين 🌐' : 'Publish to Community 🌐'}
                      </span>
                    </div>
                    {isPublishing ? (
                      <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    ) : lesson.isPublic ? (
                      <ToggleRight className="w-5 h-5 text-teal-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Export & Actions Row */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {/* Word export */}
                      <button
                        type="button"
                        onClick={(e) => handleExportDocx(lesson, e)}
                        disabled={exportingId === `word_${lesson.id}`}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition border border-slate-200 disabled:opacity-50"
                        title={isAr ? 'تصدير Word (.docx)' : 'Export Word (.docx)'}
                      >
                        {exportingId === `word_${lesson.id}` ? (
                          <div className="w-3.5 h-3.5 border border-blue-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileType2 className="w-3.5 h-3.5 text-blue-900" />
                        )}
                      </button>

                      {/* Print PDF */}
                      <button
                        type="button"
                        onClick={(e) => handlePrintPDF(lesson, e)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition border border-slate-200"
                        title={isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-600" />
                      </button>

                      {/* QTI ZIP download if quiz */}
                      {isQuizType && (
                        <button
                          type="button"
                          onClick={(e) => handleDownloadQti(lesson, e)}
                          disabled={exportingId === `qti_${lesson.id}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-blue-50 transition border border-slate-200 disabled:opacity-50"
                          title={isAr ? 'تحميل حزمة QTI ZIP' : 'Download QTI ZIP'}
                        >
                          {exportingId === `qti_${lesson.id}` ? (
                            <div className="w-3.5 h-3.5 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-amber-600" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Open / Preview */}
                    <button
                      type="button"
                      onClick={() => onOpenLesson(lesson)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-950 hover:bg-blue-900 hover:text-white border border-blue-200 transition"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معاينة وعرض' : 'Open'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal (Sandboxed iframe safe) */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAr ? 'حذف هذا المستند؟' : 'Delete Resource?'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lessonToDelete.title || (isAr ? 'مستند بدون عنوان' : 'Untitled')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLessonToDelete(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isAr
                ? 'هل أنت متأكد من رغبتك في حذف هذا المستند من مكتبتك الخاصة؟ لا يمكن التراجع عن هذه العملية.'
                : 'Are you sure you want to delete this resource from your library? This action cannot be undone.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLessonToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
              >
                {isAr ? 'نعم، حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
