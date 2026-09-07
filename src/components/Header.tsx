import { Home, Library, GraduationCap, Languages } from 'lucide-react';
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

  const navItems: { view: View; label: string; icon: typeof Home }[] = [
    { view: 'home', label: s.navHome, icon: Home },
    { view: 'library', label: s.navLibrary, icon: Library },
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
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
                      ? 'bg-primary-50 text-primary-700'
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
