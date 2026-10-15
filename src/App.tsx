import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import HomePage from '@/components/HomePage';
import EditorPage from '@/components/EditorPage';
import LibraryPage from '@/components/LibraryPage';
import CommunityPage from '@/components/CommunityPage';
import AuthModal from '@/components/AuthModal';
import LessonPlanStudio from '@/components/LessonPlanStudio';
import WorksheetStudio from '@/components/WorksheetStudio';
import PresentationStudio from '@/components/PresentationStudio';
import ExamBankStudio from '@/components/ExamBankStudio';
import QtiConverterPage from '@/components/QtiConverterPage';
import GraderAdvisorStudio from '@/components/GraderAdvisorStudio';
import BenchmarkPage from '@/components/BenchmarkPage';
import PerformanceTaskStudio from '@/components/PerformanceTaskStudio';
import WeeklyStatementStudio from '@/components/WeeklyStatementStudio';
import type { View, OutputType, GenerationResult, SavedLesson } from '@/types';
import { getUILang, saveUILang } from '@/lib/i18n';
import type { UILang } from '@/lib/i18n';
import { getCurrentUser, signOut, supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface EditorState {
  html: string;
  title: string;
  outputType: OutputType;
  editingLesson: SavedLesson | null;
}

const VIEW_STORAGE_KEY = 'sahlah_furqan_current_view';
const SIDEBAR_COLLAPSED_KEY = 'sahlah_sidebar_collapsed';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // Sidebar collapse & mobile drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenAuthModal = (tab: 'signin' | 'signup' = 'signin') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const [view, setView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (
        saved &&
        [
          'home',
          'weekly-statement',
          'lesson-plan',
          'worksheet',
          'slides',
          'quiz-exam',
          'qti-converter',
          'grader-advisor',
          'performance-task',
          'editor',
          'library',
          'community',
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

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [uiLang, setUiLang] = useState<UILang>(getUILang);

  const handleToggleLang = () => {
    const next: UILang = uiLang === 'ar' ? 'en' : 'ar';
    setUiLang(next);
    saveUILang(next);
  };

  function handleOpenResult(result: GenerationResult, outputType: OutputType) {
    setEditorState({
      html: result.html,
      title: result.title,
      outputType,
      editingLesson: null,
    });
    setView('editor');
  }

  function handleOpenLesson(lesson: SavedLesson) {
    setEditorState({
      html: lesson.html,
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
    <div
      className="min-h-screen bg-slate-50 flex flex-col font-sans"
      dir={uiLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ── Top Header (Logo, Language Switcher, User Auth only) ── */}
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
        user={user}
        onSignIn={() => handleOpenAuthModal('signin')}
        onSignOut={handleSignOut}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebarCollapse}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* ── Main App Layout: Vertical Sidebar + Scrollable Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical Sidebar Navigation (Right in RTL / Left in LTR) */}
        <Sidebar
          currentView={view}
          onNavigate={(v) => {
            if (v !== 'editor') {
              setEditorState(null);
            }
            setView(v);
          }}
          uiLang={uiLang}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content View Container */}
        <main className="flex-1 overflow-y-auto min-w-0 transition-all duration-300 flex flex-col justify-between">
          <div className="flex-1">
            {view === 'home' && (
              <HomePage
                onOpenResult={handleOpenResult}
                uiLang={uiLang}
                onNavigate={setView}
              />
            )}

            {view === 'weekly-statement' && (
              <WeeklyStatementStudio
                onClose={() => setView('home')}
                onOpenResult={handleOpenResult}
                uiLang={uiLang}
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

            {view === 'performance-task' && (
              <PerformanceTaskStudio
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

            {view === 'editor' && (
              <EditorPage
                initialHtml={
                  editorState?.html ||
                  (uiLang === 'ar'
                    ? '<h1 style="color: #0f766e; text-align: center; font-family: Cairo, sans-serif;">مستند إبداعي جديد</h1><p style="text-align: center; color: #64748b; font-size: 14px;">أهلاً بك في المحرر الإبداعي الشامل. يمكنك هنا كتابة وتنسيق محتواك التعليمي، تنسيق الجداول، وتطبيق الخطوط العربية والأكاديمية، والاستفادة من أدوات الذكاء الاصطناعي (الترجمة، تصنيف بلوم و DoK، الأنشطة التفاعلية، والتمايز)، والتصدير إلى Word و PDF و PowerPoint.</p><hr/><p>ابدأ بكتابة الدرس أو المستند التعليمي هنا...</p>'
                    : '<h1 style="color: #0f766e; text-align: center; font-family: Poppins, sans-serif;">New Creative Document</h1><p style="text-align: center; color: #64748b; font-size: 14px;">Welcome to the Creative Document Editor. Type and format your educational content, insert tables, apply premium fonts, leverage AI pedagogical tools, and export to Word, PDF, and PowerPoint.</p><hr/><p>Start drafting your educational content here...</p>')
                }
                title={editorState?.title || (uiLang === 'ar' ? 'مستند إبداعي جديد' : 'New Creative Document')}
                outputType={editorState?.outputType || 'lesson-plan'}
                onBack={handleBack}
                editingLesson={editorState?.editingLesson || null}
                uiLang={uiLang}
                user={user}
                onSignIn={() => handleOpenAuthModal('signin')}
              />
            )}

            {view === 'library' && (
              <LibraryPage
                onOpenLesson={handleOpenLesson}
                uiLang={uiLang}
                user={user}
                onSignIn={() => handleOpenAuthModal('signin')}
              />
            )}

            {view === 'community' && (
              <CommunityPage
                onOpenLesson={handleOpenLesson}
                uiLang={uiLang}
                user={user}
                onSignIn={() => handleOpenAuthModal('signin')}
              />
            )}
          </div>

          {/* Clean App Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 no-print mt-12">
            <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                {uiLang === 'ar'
                  ? 'تم إعداد وإهداء هذه المنصة من أ/ جمال سلامة إلى الزملاء الأعزاء معلمي أكاديمية سهلة الدولية ومدرسة الفرقان العالمية'
                  : 'Sahlah Academy & Al-Furqan International School AI Platform'}
              </p>
              <p className="text-xs text-slate-400">
                {uiLang === 'ar'
                  ? 'المنصة الرسمية المعتمدة - جميع الحقوق محفوظة © 2026'
                  : 'Official Certified System • All Rights Reserved © 2026'}
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Direct Email/Password Authentication & Registration Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setAuthModalOpen(false);
        }}
        defaultTab={authModalTab}
      />
    </div>
  );
}
