import {
  Home, CalendarDays, ClipboardList, Layers, Presentation, FileQuestion, FileCode2,
  FileCheck2, Library, Globe, Compass, Edit3, Target, ChevronRight, ChevronLeft,
  Sparkles, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X
} from 'lucide-react';
import type { View } from '@/types';
import type { UILang } from '@/lib/i18n';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  uiLang: UILang;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  view: View;
  labelAr: string;
  labelEn: string;
  icon: typeof Home;
  badge?: { ar: string; en: string; color: string };
}

interface NavGroupDef {
  id: string;
  titleAr: string;
  titleEn: string;
  items: NavItemDef[];
}

export default function Sidebar({
  currentView,
  onNavigate,
  uiLang,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const isAr = uiLang === 'ar';

  const navGroups: NavGroupDef[] = [
    {
      id: 'main',
      titleAr: 'الرئيسية والمتابعة',
      titleEn: 'Main & Monitoring',
      items: [
        {
          view: 'home',
          labelAr: 'لوحة التحكم',
          labelEn: 'Dashboard',
          icon: Home,
        },
        {
          view: 'weekly-statement',
          labelAr: 'التقرير الأسبوعي',
          labelEn: 'Weekly Statement',
          icon: CalendarDays,
          badge: { ar: 'معتمد', en: 'Official', color: 'bg-emerald-500/20 text-emerald-700 border-emerald-300' },
        },
        {
          view: 'benchmark',
          labelAr: 'الاختبارات المعيارية',
          labelEn: 'Benchmark Tests',
          icon: Target,
          badge: { ar: 'MAP', en: 'MAP', color: 'bg-blue-500/20 text-blue-700 border-blue-300' },
        },
      ],
    },
    {
      id: 'authoring',
      titleAr: 'أدوات التوليد والتقييم',
      titleEn: 'Authoring & Assessment',
      items: [
        {
          view: 'lesson-plan',
          labelAr: 'خطط الدروس',
          labelEn: 'Lesson Plans',
          icon: ClipboardList,
        },
        {
          view: 'worksheet',
          labelAr: 'أوراق العمل',
          labelEn: 'Worksheets',
          icon: Layers,
        },
        {
          view: 'slides',
          labelAr: 'العروض التقديمية',
          labelEn: 'Slides Deck',
          icon: Presentation,
        },
        {
          view: 'quiz-exam',
          labelAr: 'بنك الاختبارات والأسئلة',
          labelEn: 'Exam & Quiz Bank',
          icon: FileQuestion,
        },
        {
          view: 'qti-converter',
          labelAr: 'محول كويزات QTI',
          labelEn: 'QTI Converter',
          icon: FileCode2,
          badge: { ar: 'Canvas', en: 'Canvas', color: 'bg-purple-500/20 text-purple-700 border-purple-300' },
        },
        {
          view: 'performance-task',
          labelAr: 'المهمة الأدائية (PBL)',
          labelEn: 'PBL Project Tasks',
          icon: Compass,
          badge: { ar: 'PBL', en: 'PBL', color: 'bg-amber-500/20 text-amber-800 border-amber-300' },
        },
        {
          view: 'grader-advisor',
          labelAr: 'الفاحص والمستشار الأكاديمي',
          labelEn: 'Grader & Advisor',
          icon: FileCheck2,
          badge: { ar: 'AI', en: 'AI', color: 'bg-teal-500/20 text-teal-700 border-teal-300' },
        },
      ],
    },
    {
      id: 'resources',
      titleAr: 'المكتبة والمصادر',
      titleEn: 'Library & Community',
      items: [
        {
          view: 'library',
          labelAr: 'مكتبتي التعليمية',
          labelEn: 'My Library',
          icon: Library,
        },
        {
          view: 'community',
          labelAr: 'المكتبة العامة والمجتمع',
          labelEn: 'Community Hub',
          icon: Globe,
        },
        {
          view: 'editor',
          labelAr: 'المحرر الإبداعي',
          labelEn: 'Content Editor',
          icon: Edit3,
        },
      ],
    },
  ];

  function handleSelect(view: View) {
    onNavigate(view);
    if (isMobileOpen) {
      onCloseMobile();
    }
  }

  // Sidebar content markup
  const sidebarBody = (
    <div className="flex flex-col h-full select-none">
      
      {/* Mobile Drawer Top Banner */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-teal-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
            S
          </div>
          <span className="font-extrabold text-sm text-slate-800">
            {isAr ? 'قائمة التنقل' : 'Navigation Menu'}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1.5">
            
            {/* Group Title (Visible when expanded) */}
            {!isCollapsed ? (
              <div className="px-3 pb-1 text-[11px] font-black tracking-wider text-slate-600 uppercase flex items-center justify-between">
                <span>{isAr ? group.titleAr : group.titleEn}</span>
                <span className="w-8 h-px bg-slate-200/80" />
              </div>
            ) : (
              <div className="w-8 h-px bg-slate-200 mx-auto my-2" />
            )}

            {/* Group Navigation Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                const label = isAr ? item.labelAr : item.labelEn;

                return (
                  <div key={item.view} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelect(item.view)}
                      className={`w-full flex items-center gap-3 rounded-2xl transition-all duration-200 relative ${
                        isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 text-start'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-700 via-teal-800 to-blue-900 text-white font-black shadow-md shadow-teal-900/10 border border-teal-500/30'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-bold'
                      }`}
                      title={isCollapsed ? label : undefined}
                    >
                      {/* Active Indicator Glow Pip */}
                      {isActive && (
                        <span
                          className={`absolute w-1.5 h-6 rounded-full bg-amber-400 ${
                            isAr ? 'right-0' : 'left-0'
                          }`}
                        />
                      )}

                      {/* Icon */}
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'text-teal-300 scale-105'
                            : 'text-slate-500 group-hover:text-teal-700 group-hover:scale-110'
                        }`}
                      />

                      {/* Label & Badge (Expanded Mode) */}
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="text-xs sm:text-[13px] truncate">
                            {label}
                          </span>

                          {item.badge && (
                            <span
                              className={`ms-2 text-[10px] font-black px-1.5 py-0.5 rounded-md border ${item.badge.color} shrink-0`}
                            >
                              {isAr ? item.badge.ar : item.badge.en}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Tooltip for Collapsed Mode */}
                    {isCollapsed && (
                      <div
                        className={`absolute z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap border border-slate-700 flex items-center gap-1.5 ${
                          isAr ? 'right-full mr-3.5' : 'left-full ml-3.5'
                        }`}
                      >
                        <span>{label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-extrabold text-teal-300">
                            ({isAr ? item.badge.ar : item.badge.en})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

      {/* Footer Strip with Quick Collapse Button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 font-bold text-xs transition ${
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          }`}
          title={isCollapsed ? (isAr ? 'توسيع الشريط الجانبي' : 'Expand Sidebar') : (isAr ? 'طي الشريط الجانبي' : 'Collapse Sidebar')}
        >
          {!isCollapsed && (
            <span className="text-slate-600 font-extrabold text-xs">
              {isAr ? 'طي الشريط الجانبي' : 'Collapse Menu'}
            </span>
          )}

          {isCollapsed ? (
            isAr ? <PanelRightOpen className="w-5 h-5 text-teal-600" /> : <PanelLeftOpen className="w-5 h-5 text-teal-600" />
          ) : (
            isAr ? <PanelRightClose className="w-5 h-5 text-slate-500" /> : <PanelLeftClose className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* ── Desktop Inline Sidebar ── */}
      <aside
        className={`hidden md:block shrink-0 bg-white border-slate-200 shadow-2xs h-[calc(100vh-4rem)] sticky top-16 z-30 transition-all duration-300 ease-in-out no-print ${
          isAr ? 'border-l' : 'border-r'
        } ${isCollapsed ? 'w-[74px]' : 'w-64 lg:w-72'}`}
      >
        {sidebarBody}
      </aside>

      {/* ── Mobile Drawer Backdrop & Overlay ── */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <aside
            className={`relative w-72 max-w-[85vw] h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
              isAr ? 'mr-auto border-l border-slate-200' : 'ml-auto border-r border-slate-200'
            }`}
          >
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
