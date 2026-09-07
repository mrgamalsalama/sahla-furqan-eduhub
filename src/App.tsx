import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import HomePage from '@/components/HomePage';
import EditorPage from '@/components/EditorPage';
import LibraryPage from '@/components/LibraryPage';
import type { View, OutputType, GenerationResult, SavedLesson } from '@/types';
import { getUILang, saveUILang } from '@/lib/i18n';
import type { UILang } from '@/lib/i18n';

interface EditorState {
  html: string;
  title: string;
  outputType: OutputType;
  editingLesson: SavedLesson | null;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [uiLang, setUiLang] = useState<UILang>(() => getUILang());

  const direction = uiLang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = uiLang;
  }, [direction, uiLang]);

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
    <div className="min-h-screen bg-gray-50">
      <Header currentView={view} onNavigate={(v) => { setEditorState(null); setView(v); }} uiLang={uiLang} onToggleLang={handleToggleLang} />

      <main>
        {view === 'home' && (
          <HomePage onOpenResult={handleOpenResult} uiLang={uiLang} />
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
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          {uiLang === 'ar' ? 'سَهلة & الفُرقان إديو هَب | Sahla-Furqan EduHub' : 'Sahla & Furqan EduHub | سَهلة & الفُرقان إديو هَب'}
        </div>
      </footer>
    </div>
  );
}
