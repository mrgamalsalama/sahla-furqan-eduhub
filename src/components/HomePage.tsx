import { useState } from 'react';
import {
  ClipboardList, Layers, Presentation, FileQuestion, FileCode2,
  FileCheck2, Sparkles, ArrowLeft, ArrowRight, Globe, Mic, Compass, Wand2,
  CalendarDays, FileText, Briefcase
} from 'lucide-react';
import type { View, GenerationResult, OutputType } from '@/types';
import { INSTITUTIONS } from '@/types';
import type { UILang } from '@/lib/i18n';
import { getTeacherResources } from '@/lib/storage';
import VoiceToLessonModal from '@/components/VoiceToLessonModal';

interface HomePageProps {
  onOpenResult?: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
  onNavigate?: (view: View) => void;
}

export default function HomePage({ onOpenResult, uiLang, onNavigate }: HomePageProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const studios: {
    id: View;
    title: string;
    subtitle: string;
    description: string;
    icon: typeof ClipboardList;
    color: string;
    badge?: string;
  }[] = [
    {
      id: 'weekly-statement',
      title: isAr ? 'استوديو التقرير الأسبوعي المعتمد' : 'Weekly Statements Studio',
      subtitle: isAr ? 'الخطة الأسبوعية وجداول PrimeTimetable' : 'Academic Projection & Timetable Sync',
      description: isAr
        ? 'إدخال الخطة الأسبوعية والواجبات لكل مادة، والتوزيع التلقائي المتوافق مع جداول الحصص (فترتي Mena و US)، مع التصدير الرسمي المطابق لـ Word و PDF بنسبة 100%.'
        : 'Enter weekly plans, homework, and quizzes synced with PrimeTimetable with 100% official DOCX & PDF templates.',
      icon: CalendarDays,
      color: 'from-teal-700 via-teal-800 to-slate-900',
      badge: isAr ? 'جديد رسمي 📑' : 'Official 📑',
    },
    {
      id: 'lesson-plan',
      title: isAr ? 'استوديو خطط الدروس المعتمدة' : 'Lesson Plan Studio',
      subtitle: isAr ? 'نموذج سهلة والفرقان الرسمي' : 'Official Approved Template',
      description: isAr
        ? 'بناء خطة درس نموذجية معتمدة بجداول الترويسة، الأساسيات، المراحل الخمس، التمايز، والتقييم مع التشكيل التام بنسبة 100%.'
        : 'Generate comprehensive official lesson plans with 5-phase structure and differentiation.',
      icon: ClipboardList,
      color: 'from-blue-600 to-indigo-700',
    },
    {
      id: 'performance-task',
      title: isAr ? 'استوديو المهام الأدائية ومشاريع الطلاب (PBL)' : 'Performance Tasks & PBL Studio',
      subtitle: isAr ? 'إطار GRASPS وسلالم التقييم Rubrics' : 'GRASPS Framework & 4-Level Rubrics',
      description: isAr
        ? 'تصميم مشاريع التعلم القائم على المشاريع بسيناريو واقعي محفز (GRASPS)، مراحل وخارطة تسليم، ومصفوفة تقييم شاملة للمنتج والعرض والعمل الجماعي.'
        : 'Design authentic project-based learning with real-world scenarios, milestones, and 4-level analytical rubrics.',
      icon: Compass,
      color: 'from-indigo-600 to-purple-800',
      badge: isAr ? 'جديد PBL 🧩' : 'New PBL 🧩',
    },
    {
      id: 'worksheet',
      title: isAr ? 'استوديو أوراق العمل (هرم بلوم)' : 'Bloom Worksheet Studio',
      subtitle: isAr ? 'أنشطة متدرجة وفواصل طباعة' : 'Multi-page with Print Breaks',
      description: isAr
        ? 'تصميم أوراق عمل تفاعلية متدرجة معرفياً من التذكر حتى الابتكار مع تحديد عدد الصفحات والنمط البصري والطيار الآلي.'
        : 'Design multi-page worksheets categorized by Bloom cognitive levels ready for printing.',
      icon: Layers,
      color: 'from-teal-600 to-emerald-700',
      badge: isAr ? 'مطور' : 'Enhanced',
    },
    {
      id: 'slides',
      title: isAr ? 'استوديو العروض التقديمية' : 'Slide Deck Studio',
      subtitle: isAr ? 'شرائح تفصيلية ودليل المعلم' : 'Slides + Speaker Notes',
      description: isAr
        ? 'توليد شرائح تعليمية تفصيلية مع سيناريو شرح المعلم وأسئلة النقاش الصفي، مع إمكانية التصدير المباشر لـ PowerPoint.'
        : 'Build rich presentation decks with teacher scripts and instant PPTX export support.',
      icon: Presentation,
      color: 'from-sky-600 to-blue-700',
    },
    {
      id: 'quiz-exam',
      title: isAr ? 'بنك الاختبارات الإلكترونية (QTI)' : 'Exam & QTI Engine',
      subtitle: isAr ? '10 أسئلة أو 50 سؤالاً أو معياري' : '10-MCQ, 50-MCQ & Benchmark',
      description: isAr
        ? 'إنشاء اختبارات قصيرة وامتحانات شاملة أو تشخيصية، مع ميزة التصدير المباشر لحزم (QTI ZIP) لمنصات سهلة والفرقان.'
        : 'Build automated assessments and export complete QTI ZIP packages for Cypher and Canvas.',
      icon: FileQuestion,
      color: 'from-amber-600 to-orange-700',
      badge: isAr ? 'QTI ZIP' : 'QTI ZIP',
    },
    {
      id: 'qti-converter',
      title: isAr ? 'استوديو ومحول الأسئلة إلى QTI' : 'Raw Questions to QTI',
      subtitle: isAr ? 'تحويل الأسئلة العشوائية المنسوخة' : 'Paste & Convert to LMS',
      description: isAr
        ? 'الصق أسئلتك غير المنظمة من مستندات Word أو PDF لتحويلها وتشكيلها وتصدير حزمة مضغوطة صالحة فوراً للاستيراد في LMS.'
        : 'Paste raw questions to parse, diacritize 100%, and pack into standard LMS zip packages.',
      icon: FileCode2,
      color: 'from-emerald-600 to-teal-800',
      badge: isAr ? 'جديد' : 'New',
    },
    {
      id: 'grader-advisor',
      title: isAr ? 'المُصحح الذكي & المستشار التربوي' : 'Grader & Pedagogical Advisor',
      subtitle: isAr ? 'تصحيح الخط اليدوي والاستشارات' : 'Handwriting OCR & Advisory',
      description: isAr
        ? 'تصحيح أوراق إجابات الطلاب المكتوبة بخط اليد بالذكاء الاصطناعي مع بطاقة التغذية الراجعة، ومستشار لحل معضلات إدارة الصف.'
        : 'AI OCR grading for handwritten student work, rubric creation, and classroom advice.',
      icon: FileCheck2,
      color: 'from-purple-600 to-violet-800',
    },
    {
      id: 'pdf-editor',
      title: isAr ? 'محرر ومحول PDF وكتب المناهج الذكي' : 'Smart Arabic PDF Studio',
      subtitle: isAr ? 'تحرير وتعديل كأنك في Word' : 'Edit PDFs like Word',
      description: isAr
        ? 'فتح وتعديل كتب المنهج المدرسية الكبيرة بنطاق الصفحات، واستخراج النصوص العربية بدقة كاملة، وتحويل الصفحات بنقرة زر إلى خطط دروس أو أوراق عمل أو اختبارات.'
        : 'Edit large textbooks with page chunking, flawless Arabic text OCR, and 1-click transformation to lesson plans or exams.',
      icon: FileText,
      color: 'from-indigo-600 to-blue-900',
      badge: isAr ? 'جديد ومبهر ✨' : 'Innovative ✨',
    },
    {
      id: 'resources',
      title: isAr ? 'حقيبتي ومصادري التعليمية' : 'My Cloud Resources Locker',
      subtitle: isAr ? 'مستودع الكتب والملفات السحابي' : 'Centralized Textbook Hub',
      description: isAr
        ? 'مستودعك الشامل لكافة الملفات والكتب المرفوعة في المنصة، مع إمكانية استرجاعها واستخدامها في أي وقت ومشاركتها مع مجتمع المعلمين.'
        : 'Your personal cloud vault for all uploaded textbooks, documents, and teaching assets.',
      icon: Briefcase,
      color: 'from-emerald-700 to-teal-900',
      badge: isAr ? 'سحابي 🎒' : 'Locker 🎒',
    },
    {
      id: 'community',
      title: isAr ? 'المكتبة العامة ومجتمع المعلمين' : 'Public Community Hub',
      subtitle: isAr ? 'مشاركة وتداول الدروس والاختبارات' : 'Shared Hub & Discussions',
      description: isAr
        ? 'استكشف الدروس وأوراق العمل وبنوك الاختبارات المنشورة من قبل الزملاء، مع إمكانية نسخها والتعديل عليها والتفاعل معها.'
        : 'Explore quality resources shared by accredited teachers, clone them into your private workspace, and exchange feedback.',
      icon: Globe,
      color: 'from-blue-700 to-teal-800',
      badge: isAr ? 'سحابي 🌐' : 'Cloud 🌐',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Official Hub Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-6 sm:p-10 mb-8 shadow-xl border border-blue-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl text-center md:text-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold mb-4">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'المنصة التعليمية الشاملة - أكاديمية سهلة & مدرسة الفرقان' : 'Sahlah & Al-Furqan EduHub'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
              {isAr ? 'مرحباً بك في مركز إعداد الدروس والاختبارات الذكية' : 'Teacher Innovation & Preparation Hub'}
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed font-medium mb-6">
              {isAr
                ? 'استوديوهات مستقلة ومخصصة لمساعدة المعلم في إعداد خطط الدروس، والمهام الأدائية (PBL)، وتصميم أوراق العمل بهرم بلوم، والعروض التقديمية، وتوليد حزم الاختبارات القياسية (QTI ZIP) مع شعارات المدارس الرسمية والتشكيل التام 100%.'
                : 'Dedicated standalone teacher workspaces for lesson plans, performance tasks, worksheets, presentations, exam banks, and LMS QTI packaging.'}
            </p>

            {/* Quick Action: Voice-to-Lesson Button */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-blue-950 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <Mic className="w-5 h-5 text-blue-950" />
                <span>{isAr ? '🎤 تحويل فكرتك الصوتية لخطة درس فوراً (Voice-to-Lesson)' : '🎤 Voice-to-Lesson Plan (Fast AI)'}</span>
              </button>
            </div>
          </div>

          {/* School Logos Emblem */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
            <img src={INSTITUTIONS.furqan.logo} alt="Furqan" className="h-14 w-auto object-contain" />
            <div className="h-10 w-px bg-white/30" />
            <img src={INSTITUTIONS.sahlah.logo} alt="Sahlah" className="h-9 w-auto max-w-[120px] object-contain" />
          </div>
        </div>
      </div>

      {/* 🎒 أحدث الكتب والمصادر في حقيبتك السحابية */}
      {(() => {
        const recentResources = getTeacherResources().slice(0, 3);
        if (recentResources.length === 0) return null;
        return (
          <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 rounded-3xl border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-700" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {isAr ? '🎒 أحدث الكتب والمصادر في حقيبتك السحابية:' : '🎒 Recent Resources in Your Locker:'}
                </h3>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('resources')}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1"
                >
                  <span>{isAr ? 'استعراض كامل الحقيبة' : 'View Full Locker'}</span>
                  <Arrow className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentResources.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-2xs transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate" title={res.name}>{res.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{res.type.toUpperCase()} • {new Date(res.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                  </div>
                  {onNavigate && res.type === 'pdf' ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('pdf-editor')}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition shrink-0"
                      title={isAr ? 'تعديل في محرر PDF' : 'Edit'}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate?.('lesson-plan')}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition shrink-0"
                      title={isAr ? 'تحضير درس' : 'Plan'}
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Studios Grid */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isAr ? 'اختر استوديو العمل المتخصص:' : 'Choose a Dedicated Studio:'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
              {isAr ? 'مساحات عمل مركزة توفر لك الأدوات المحددة فقط دون تعقيد' : 'Streamlined workspaces tailored specifically for your target educational task.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studios.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onNavigate?.(st.id)}
                className="group relative flex flex-col justify-between text-start p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-600 hover:-translate-y-1 transition-all duration-200 overflow-hidden"
              >
                <div>
                  {/* Icon & Badge Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${st.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {st.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {st.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors mb-1">
                    {st.title}
                  </h3>
                  <div className="text-xs font-semibold text-teal-700 mb-2.5">
                    {st.subtitle}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {st.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-900 group-hover:text-blue-700">
                  <span>{isAr ? 'الدخول إلى الاستوديو' : 'Open Studio'}</span>
                  <Arrow className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🎤 Voice-to-Lesson Modal */}
      <VoiceToLessonModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onOpenResult={onOpenResult}
        uiLang={uiLang}
      />
    </div>
  );
}
