import { useState } from 'react';
import {
  Sparkles, Accessibility, BookOpen, Flame, LayoutGrid,
  Loader2, Check, Copy, AlertCircle, X, ArrowLeft, ArrowRight,
  Replace, PlusCircle
} from 'lucide-react';
import { differentiateContent } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface DifferentiatedLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  uiLang: UILang;
  onApplyAdaptedContent: (newHtml: string, mode: 'replace' | 'append') => void;
}

export default function DifferentiatedLearningModal({
  isOpen,
  onClose,
  htmlContent,
  uiLang,
  onApplyAdaptedContent,
}: DifferentiatedLearningModalProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [selectedPathway, setSelectedPathway] = useState<'easy-read' | 'gifted' | 'visual-organizer'>('easy-read');
  const [loading, setLoading] = useState(false);
  const [adaptedHtml, setAdaptedHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pathways = [
    {
      id: 'easy-read' as const,
      icon: BookOpen,
      titleAr: 'مسار تبسيط القراءة ودعم صعوبات التعلم (Easy-Read & SEN)',
      titleEn: 'Easy-Read & Dyslexia / SEN Pathway',
      descAr:
        'تفكيك الجمل المعقدة إلى خطوات مرقمة، إضافة تلميحات مساعدة للحل (💡 Hints)، تمييز الكلمات المفتاحية بالخط العريض، وصندوق مفردات مصغر لتقليل العبء المعرفي.',
      descEn:
        'Simplifies syntax, scaffolds tasks with helpful hints, provides vocabulary boxes, and reduces decoding barriers.',
      color: 'from-emerald-600 to-teal-700',
      badgeAr: 'دعم وتمكين',
      badgeEn: 'Support & Scaffolding',
    },
    {
      id: 'gifted' as const,
      icon: Flame,
      titleAr: 'مسار الإثراء والتحدي للموهوبين والمتفوقين (Gifted & Talented)',
      titleEn: 'Gifted & Talented Enrichment Pathway',
      descAr:
        'رفع سقف التحدي المعرفي إلى مستويات DOK 3-4، تحويل الأسئلة النمطية إلى معضلات استقصائية معاصرة، وإضافة قسم تحدي المبتكرين الصغار.',
      descEn:
        'Elevates cognitive rigor to DOK 3-4, open-ended problem solving, hypothesis generation, and interdisciplinary dilemmas.',
      color: 'from-amber-600 to-rose-700',
      badgeAr: 'إثراء وعمق',
      badgeEn: 'Higher Rigor',
    },
    {
      id: 'visual-organizer' as const,
      icon: LayoutGrid,
      titleAr: 'مسار المنظمات البيانية والمخططات البصرية (Visual Scaffolds)',
      titleEn: 'Graphic Organizers & Visual Matrix Pathway',
      descAr:
        'تحويل النصوص السردية إلى جداول مقارنة، ومخططات فين للمفاهيم المتقاطعة، ومصفوفات KWL (ماذا أعرف/ماذا أريد أن أعرف/ماذا تعلمت).',
      descEn:
        'Transforms dense textual descriptions into structured visual matrices, comparison tables, and KWL organizers.',
      color: 'from-blue-600 to-indigo-700',
      badgeAr: 'بصري وتفاعلي',
      badgeEn: 'Visual Thinking',
    },
  ];

  async function handleGenerateDifferentiation() {
    if (!htmlContent || !htmlContent.trim()) {
      setError(isAr ? 'المحتوى الحالي فارغ ولا يوجد نص لتكييفه.' : 'Current content is empty.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await differentiateContent({
        htmlContent,
        mode: selectedPathway,
        targetLang: isAr ? 'ar' : 'en',
      });

      if (!result) throw new Error('لم يتم استلام محتوى مكيف صالح.');
      setAdaptedHtml(result);
    } catch (err: any) {
      console.error('Differentiation error:', err);
      setError(err?.message || 'حدث خطأ أثناء تكييف المحتوى للتمايز.');
    } finally {
      setLoading(false);
    }
  }

  function handleApply(mode: 'replace' | 'append') {
    if (!adaptedHtml) return;
    onApplyAdaptedContent(adaptedHtml, mode);
    onClose();
  }

  function handleCopy() {
    if (!adaptedHtml) return;
    navigator.clipboard.writeText(adaptedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in no-print">
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-950 via-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-teal-950 flex items-center justify-center font-bold shadow-md">
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{isAr ? 'تكييف المحتوى لتمايز التعليم ومواءمة الطلاب' : 'Differentiated Learning & SEN Adaptor'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-blue-950">
                  Universal Design for Learning (UDL)
                </span>
              </h3>
              <p className="text-xs text-teal-200">
                {isAr
                  ? 'اختر مسار التمايز المناسب لتكييف الدرس أو ورقة العمل وفق احتياجات فئات الطلاب المختلفة'
                  : 'Select an instructional adaptation pathway tailored to specific learner profiles'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Pathway Selection Cards */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              {isAr ? '1. اختر مسار التمايز المطلوب:' : '1. Choose an Adaptation Pathway:'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pathways.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPathway === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPathway(p.id);
                      setAdaptedHtml(null); // Reset preview on mode change
                    }}
                    className={`p-4 rounded-2xl text-start border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 shadow-md ring-2 ring-teal-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-xs`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                          {isAr ? p.badgeAr : p.badgeEn}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 mb-1.5 leading-snug">
                        {isAr ? p.titleAr : p.titleEn}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {isAr ? p.descAr : p.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action to Generate Adapted Version */}
          {!adaptedHtml && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-teal-600 mx-auto" />
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-sm text-slate-900">
                  {isAr ? 'جاهز لتوليد النسخة المكيفة بالذكاء الاصطناعي' : 'Ready to adapt current educational content'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr
                    ? 'سيتم تكييف المحتوى مع الحفاظ على الجداول والتنسيقات الأكاديمية الرسمية'
                    : 'The model will preserve tables and formatting while adapting linguistic & cognitive load.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateDifferentiation}
                disabled={loading}
                className="btn-primary py-2.5 px-6 rounded-xl text-xs font-bold inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارٍ التكييف الذكي للتمايز...' : 'Adapting content...'}</span>
                  </>
                ) : (
                  <>
                    <Accessibility className="w-4 h-4 text-emerald-300" />
                    <span>{isAr ? 'بدء تكييف المحتوى الآن' : 'Start Adaptation'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview of Adapted Content */}
          {adaptedHtml && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تم تجهيز النسخة المكيفة بنجاح! معاينة المحتوى:' : 'Adapted content ready! Preview below:'}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ كود' : 'Copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateDifferentiation}
                    disabled={loading}
                    className="text-xs text-teal-700 hover:underline font-bold"
                  >
                    {isAr ? 'إعادة التوليد 🔄' : 'Regenerate 🔄'}
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 max-h-80 overflow-y-auto text-xs leading-relaxed shadow-inner">
                <div
                  className="rte-content"
                  dir={isAr ? 'rtl' : 'ltr'}
                  dangerouslySetInnerHTML={{ __html: adaptedHtml }}
                />
              </div>

              {/* Choices of Application: Replace or Append */}
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-bold text-teal-950">
                  {isAr ? 'كيف ترغب بتطبيق النسخة المكيفة على المحرر؟' : 'How would you like to apply this adaptation?'}
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleApply('append')}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white border border-teal-300 hover:bg-teal-100/60 text-teal-900 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    title={isAr ? 'إضافة النسخة المكيفة في نهاية الدرس كملحق تمايز' : 'Append as a differentiated appendix at the end'}
                  >
                    <PlusCircle className="w-4 h-4 text-teal-600" />
                    <span>{isAr ? 'إضافة كملحق في النهاية' : 'Append as Appendix'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApply('replace')}
                    className="flex-1 sm:flex-none btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800"
                    title={isAr ? 'استبدال محتوى المحرر كاملاً بالنسخة المكيفة' : 'Replace entire editor content'}
                  >
                    <Replace className="w-4 h-4" />
                    <span>{isAr ? 'استبدال المحتوى كاملاً' : 'Replace Content'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
