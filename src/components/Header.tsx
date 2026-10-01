import { Home, Library, Languages, MessageSquareText, Award, FileCheck2, FileCode2 } from 'lucide-react';
import type { View } from '@/types';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
  uiLang: UILang;
  onToggleLang: () => void;
}

export default function Header({ currentView, onNavigate, uiLang, onToggleLang }: HeaderProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';

  const navItems: { view: View; label: string; icon: typeof Home }[] = [
    { view: 'home', label: s.navHome, icon: Home },
    {
      view: 'benchmark',
      label: isAr ? 'الاختبارات المعيارية' : 'Benchmark Tests',
      icon: Award,
    },
    {
      view: 'qti-converter',
      label: isAr ? 'محول QTI' : 'QTI Studio',
      icon: FileCode2,
    },
    {
      view: 'grader',
      label: isAr ? 'المُصحح الذكي' : 'Smart Grader',
      icon: FileCheck2,
    },
    { view: 'library', label: s.navLibrary, icon: Library },
    {
      view: 'advisor',
      label: isAr ? 'المستشار التربوي' : 'Pedagogical Advisor',
      icon: MessageSquareText,
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group"
          >
            {/* أيقونة المعلم الذكي */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform p-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full text-white"
              >
                {/* شرارة الفكرة والذكاء الاصطناعي فوق رأس المعلم */}
                <path
                  d="M17.5 2.5L18.2 4.2L20 5L18.2 5.8L17.5 7.5L16.8 5.8L15 5L16.8 4.2L17.5 2.5Z"
                  fill="currentColor"
                />

                {/* رأس المعلم وتسريحة الشعر */}
                <path
                  d="M6 7.5C6 4.5 8.5 2.5 12 2.5C13.5 2.5 14.5 2.8 15 3.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M7 8C6 9 6 11 6 12C6 15.3 8.7 17.5 12 17.5C15.3 17.5 18 15.3 18 12C18 11 18 9 17 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                {/* نظارات المعلم الذكية */}
                <rect
                  x="7"
                  y="9.5"
                  width="4"
                  height="3"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <rect
                  x="13"
                  y="9.5"
                  width="4"
                  height="3"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <line
                  x1="11"
                  y1="11"
                  x2="13"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />

                {/* ابتسامة المعلم */}
                <path
                  d="M10.5 14.2C11 14.7 11.5 14.9 12 14.9C12.5 14.9 13 14.7 13.5 14.2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />

                {/* ياقة القميص ورداء المعلم الأنيق */}
                <path
                  d="M5 21.5C5.5 19 8 18 10 18L12 19.5L14 18C16 18 18.5 19 19 21.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className={uiLang === 'ar' ? 'text-right' : 'text-left'}>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">{s.brandName}</h1>
              <p className="text-xs text-gray-500 leading-tight">{s.brandSub}</p>
            </div>
          </button>

          {/* Navigation + Language */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map(({ view, label, icon: Icon }) => (
                <button
                  key={view}
                  onClick={() => onNavigate(view)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    currentView === view
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={onToggleLang}
              title={s.langSwitchLabel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 border border-gray-200"
            >
              <Languages className="w-4 h-4" />
              <span>{s.langSwitchLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
