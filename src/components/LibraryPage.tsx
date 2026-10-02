import { useState, useEffect } from 'react';
import {
  Library as LibraryIcon, Trash2, FileEdit, Clock,
  ClipboardList, FileText, FileQuestion, Presentation, FolderOpen,
} from 'lucide-react';
import type { SavedLesson } from '@/types';
import { OUTPUT_LABELS_AR, OUTPUT_LABELS_EN } from '@/types';
import { getSavedLessons, deleteLesson } from '@/lib/storage';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface LibraryPageProps {
  onOpenLesson: (lesson: SavedLesson) => void;
  uiLang: UILang;
}

const outputIcons: Record<string, typeof ClipboardList> = {
  'lesson-plan': ClipboardList,
  'worksheet': FileText,
  'quiz': FileQuestion,
  'slides': Presentation,
};

const outputColors: Record<string, string> = {
  'lesson-plan': 'bg-primary-50 text-primary-600',
  'worksheet': 'bg-secondary-50 text-secondary-600',
  'quiz': 'bg-accent-50 text-accent-500',
  'slides': 'bg-primary-50 text-primary-600',
};

export default function LibraryPage({ onOpenLesson, uiLang }: LibraryPageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const [lessons, setLessons] = useState<SavedLesson[]>([]);

  useEffect(() => {
    try {
      const data = getSavedLessons();
      if (Array.isArray(data)) {
        // فلترة أي عنصر تالف أو غير مكتمل لتجنب انهيار الصفحة
        setLessons(data.filter((item) => item && typeof item === 'object' && item.id));
      } else {
        setLessons([]);
      }
    } catch {
      setLessons([]);
    }
  }, []);

  function handleDelete(id: string) {
    try {
      deleteLesson(id);
      const data = getSavedLessons();
      setLessons(Array.isArray(data) ? data.filter((item) => item && item.id) : []);
    } catch {
      setLessons((prev) => prev.filter((item) => item.id !== id));
    }
  }

  function formatDate(ts?: number): string {
    if (!ts || isNaN(ts)) return '';
    try {
      return new Date(ts).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
          <LibraryIcon className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{s.libraryTitle}</h2>
          <p className="text-sm text-slate-600 font-medium">{s.libraryDesc}</p>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">{s.noLessons}</h3>
          <p className="text-gray-500 text-sm">
            {s.noLessonsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessons.map((lesson) => {
            // حماية تلقائية: إذا لم تتطابق القيمة يتم استخدام أيقونة ولون افتراضيين
            const Icon = (lesson.outputType && outputIcons[lesson.outputType]) || FileText;
            const colorClass = (lesson.outputType && outputColors[lesson.outputType]) || 'bg-gray-50 text-gray-600';
            const label = (lesson.outputType && (outputLabels as Record<string, string>)[lesson.outputType]) || (isAr ? 'مستند تعليمي' : 'Lesson Document');

            return (
              <div
                key={lesson.id}
                className="card p-5 hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => onOpenLesson(lesson)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(lesson.id); }}
                    className="text-gray-300 hover:text-error-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">{lesson.title || (isAr ? 'بدون عنوان' : 'Untitled')}</h3>
                <p className="text-xs text-gray-500 mb-3">{label}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(lesson.updatedAt)}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <FileEdit className="w-4 h-4" />
                  {s.openEdit}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
