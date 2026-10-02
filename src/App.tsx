import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import HomePage from '@/components/HomePage';
import EditorPage from '@/components/EditorPage';
import LibraryPage from '@/components/LibraryPage';
import LessonPlanStudio from '@/components/LessonPlanStudio';
import WorksheetStudio from '@/components/WorksheetStudio';
import PresentationStudio from '@/components/PresentationStudio';
import ExamBankStudio from '@/components/ExamBankStudio';
import QtiConverterPage from '@/components/QtiConverterPage';
import GraderAdvisorStudio from '@/components/GraderAdvisorStudio';
import BenchmarkPage from '@/components/BenchmarkPage';
import type { View, OutputType, GenerationResult, SavedLesson } from '@/types';
import { getUILang, saveUILang } from '@/lib/i18n';
import type { UILang } from '@/lib/i18n';

interface EditorState {
  html: string;
  title: string;
  outputType: OutputType;
  editingLesson: SavedLesson | null;
}

const VIEW_STORAGE_KEY = 'sahlah_furqan_current_view';

export default function App() {
  const [view, setView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (
        saved &&
        [
          'home',
          'lesson-plan',
          'worksheet',
          'slides',
          'quiz-exam',
          'qti-converter',
          'grader-advisor',
          'editor',
          'library',
          'benchmark',
        ].includes(saved)
      ) {
        return saved as View;
      }
    } catch {
      // ignore
    }
    return 'home';
  });

  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [uiLang, setUiLang] = useState<UILang>(() => getUILang());

  const direction = uiLang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = uiLang;
  }, [direction, uiLang]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  function handleToggleLang() {
    const next = uiLang === 'ar' ? 'en' : 'ar';
    setUiLang(next);
    saveUILang(next);
  }

  function handleOpenResult(result: GenerationResult, outputType: OutputType) {
    setEditorState({
      html: result.contentHtml,
      title: result.title,
      outputType,
      editingLesson: null,
    });
    setView('editor');
  }

  function handleOpenLesson(lesson: SavedLesson) {
    setEditorState({
      html: lesson.contentHtml,
      title: lesson.title,
      outputType: lesson.outputType,
      editingLesson: lesson,
    });
    setView('editor');
  }

  function handleBack() {
    setEditorState(null);
    setView('home');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header
        currentView={view}
        onNavigate={(v) => {
          if (v !== 'editor') {
            setEditorState(null);
          }
          setView(v);
        }}
        uiLang={uiLang}
        onToggleLang={handleToggleLang}
      />

      <main className="flex-1">
        {view === 'home' && (
          <HomePage
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
            onNavigate={setView}
          />
        )}

        {view === 'lesson-plan' && (
          <LessonPlanStudio
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'worksheet' && (
          <WorksheetStudio
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'slides' && (
          <PresentationStudio
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'quiz-exam' && (
          <ExamBankStudio
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'qti-converter' && (
          <QtiConverterPage uiLang={uiLang} />
        )}

        {view === 'grader-advisor' && (
          <GraderAdvisorStudio
            onBack={handleBack}
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'benchmark' && (
          <BenchmarkPage
            onBack={handleBack}
            onOpenResult={handleOpenResult}
            uiLang={uiLang}
          />
        )}

        {view === 'editor' && editorState && (
          <EditorPage
            initialHtml={editorState.html}
            title={editorState.title}
            outputType={editorState.outputType}
            onBack={handleBack}
            editingLesson={editorState.editingLesson}
            uiLang={uiLang}
          />
        )}

        {view === 'library' && (
          <LibraryPage onOpenLesson={handleOpenLesson} uiLang={uiLang} />
        )}
      </main>

      <footer className="border-t border-gray-100 bg-white py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="text-sm font-medium text-gray-700">
            تم إعداد وإهداء هذه المنصة من أ/ جمال سلامة إلى الزملاء الأعزاء معلمي أكاديمية سهلة الدولية ومدرسة الفرقان العالمية
          </p>
          <p className="text-xs text-gray-400">
            المنصة الرسمية المعتمدة - جميع الحقوق محفوظة © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
