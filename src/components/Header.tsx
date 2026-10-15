import { useState, useRef, useEffect } from 'react';
import {
  Languages, LogOut, ChevronDown, LogIn, Menu, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen
} from 'lucide-react';
import type { View } from '@/types';
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

            {/* Brand Logo & Name */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none"
            >
              {/* أيقونة المعلم الذكي */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-900 via-teal-800 to-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform p-1.5 shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full text-white"
                >
                  <path
                    d="M17.5 2.5L18.2 4.2L20 5L18.2 5.8L17.5 7.5L16.8 5.8L15 5L16.8 4.2L17.5 2.5Z"
                    fill="currentColor"
                  />
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
                  <path
                    d="M10.5 14.2C11 14.7 11.5 14.9 12 14.9C12.5 14.9 13 14.7 13.5 14.2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 21.5C5.5 19 8 18 10 18L12 19.5L14 18C16 18 18.5 19 19 21.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className={isAr ? 'text-right' : 'text-left'}>
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {s.brandName}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-teal-800 font-bold leading-tight hidden xs:block">
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
