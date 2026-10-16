import { useState, useRef, useEffect } from 'react';
import {
  Languages, LogOut, ChevronDown, LogIn, Menu, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen
} from 'lucide-react';
import type { View } from '@/types';
import { INSTITUTIONS } from '@/types';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import type { User } from '@supabase/supabase-js';
import { extractProfileFromUser } from '@/lib/supabase';

interface HeaderProps {
  currentView?: View;
  onNavigate: (view: View) => void;
  uiLang: UILang;
  onToggleLang: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  onOpenMobileSidebar?: () => void;
}

export default function Header({
  onNavigate,
  uiLang,
  onToggleLang,
  user,
  onSignIn,
  onSignOut,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
}: HeaderProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const profile = user ? extractProfileFromUser(user) : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Left section (Right in RTL): Sidebar Toggles + Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            {onOpenMobileSidebar && (
              <button
                type="button"
                onClick={onOpenMobileSidebar}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                title={isAr ? 'فتح قائمة التنقل' : 'Open Navigation Menu'}
              >
                <Menu className="w-5 h-5 text-teal-800" />
              </button>
            )}

            {/* Desktop Sidebar Quick Collapse Toggle */}
            {onToggleSidebarCollapse && (
              <button
                type="button"
                onClick={onToggleSidebarCollapse}
                className="hidden md:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                title={
                  isSidebarCollapsed
                    ? (isAr ? 'توسيع الشريط الجانبي' : 'Expand Sidebar')
                    : (isAr ? 'طي الشريط الجانبي' : 'Collapse Sidebar')
                }
              >
                {isSidebarCollapsed ? (
                  isAr ? <PanelRightOpen className="w-5 h-5 text-teal-700" /> : <PanelLeftOpen className="w-5 h-5 text-teal-700" />
                ) : (
                  isAr ? <PanelRightClose className="w-5 h-5 text-slate-600" /> : <PanelLeftClose className="w-5 h-5 text-slate-600" />
                )}
              </button>
            )}

            {/* Brand Logos (Sahlah & Furqan) & Title */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 sm:gap-3.5 group focus:outline-none"
              title={isAr ? 'الرئيسية - سَهلة & الفُرقان إديو هَب' : 'Home - Sahlah & Al-Furqan EduHub'}
            >
              {/* Dual Official Institution Logos */}
              <div className="flex items-center gap-2 bg-slate-50/90 hover:bg-slate-100 p-1.5 sm:p-2 rounded-xl border border-slate-200/90 transition shadow-2xs group-hover:border-teal-400">
                <img
                  src={INSTITUTIONS.sahlah.logo}
                  alt="أكاديمية سهلة الدولية"
                  className="h-6 sm:h-7 w-auto max-w-[85px] sm:max-w-[105px] object-contain"
                />
                <div className="h-5 w-px bg-slate-300" />
                <img
                  src={INSTITUTIONS.furqan.logo}
                  alt="مدارس الفرقان العالمية"
                  className="h-6 sm:h-7 w-auto object-contain"
                />
              </div>

              <div className={isAr ? 'text-right' : 'text-left'}>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  {s.brandName}
                </h1>
                <p className="text-[9px] sm:text-[10px] text-teal-800 font-bold leading-tight hidden xs:block">
                  {s.brandSub}
                </p>
              </div>
            </button>
          </div>

          {/* Right section (Left in RTL): Language Switcher + User Profile / Sign In */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              title={s.langSwitchLabel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all border border-slate-200 bg-white shadow-2xs"
            >
              <Languages className="w-4 h-4 text-teal-600" />
              <span>{s.langSwitchLabel}</span>
            </button>

            {/* Google Auth / Teacher Profile Widget */}
            {user && profile ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-white hover:bg-teal-50/30 transition-all shadow-2xs"
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                  <div className="hidden sm:block text-start leading-tight max-w-[130px]">
                    <div className="text-xs font-bold text-slate-800 truncate">{profile.name}</div>
                    <div className="text-[10px] font-semibold text-teal-700">
                      {profile.institution === 'furqan'
                        ? isAr ? 'مدارس الفرقان' : 'Al-Furqan'
                        : isAr ? 'أكاديمية سهلة' : 'Sahlah'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute end-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scale-in">
                    <div className="p-2.5 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{profile.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{profile.email}</p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {profile.institution === 'furqan'
                          ? isAr ? 'مدارس الفرقان العالمية' : 'Al-Furqan Schools'
                          : isAr ? 'أكاديمية سهلة الدولية' : 'Sahlah Academy'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-blue-900 hover:bg-blue-800 transition-all duration-150 shadow-xs shrink-0"
                title={isAr ? 'تسجيل الدخول أو إنشاء حساب جديد' : 'Sign In / Register'}
              >
                <LogIn className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden xs:inline">{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
