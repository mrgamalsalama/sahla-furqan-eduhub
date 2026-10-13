import { useState, useMemo } from 'react';
import {
  Brain, Sparkles, BarChart3, TrendingUp, CheckCircle2,
  AlertTriangle, Lightbulb, Loader2, Plus, X, ArrowLeft, ArrowRight
} from 'lucide-react';
import { addDokQuestion } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface DokBloomAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  uiLang: UILang;
  onInjectQuestion?: (questionHtml: string) => void;
}

interface BloomLevelMetric {
  nameAr: string;
  nameEn: string;
  dokLevel: number;
  count: number;
  percentage: number;
  color: string;
  verbsAr: string[];
  verbsEn: string[];
}

export default function DokBloomAnalyzerModal({
  isOpen,
  onClose,
  htmlContent,
  uiLang,
  onInjectQuestion,
}: DokBloomAnalyzerModalProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [injectingLevel, setInjectingLevel] = useState<number | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Real-time NLP Analysis of Bloom & Webb's DOK
  const analysis = useMemo(() => {
    const text = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();

    // Verbs & Keywords for Bloom Tiers
    const bloomDefs = [
      {
        id: 'remember',
        nameAr: '1. التذكر والاسترجاع',
        nameEn: '1. Remembering',
        dokLevel: 1,
        color: 'bg-emerald-500',
        verbsAr: ['اذكر', 'عرّف', 'حدد', 'عَدّد', 'اختر', 'سمّ', 'ما هو', 'متى', 'أين', 'صح أم خطأ'],
        verbsEn: ['define', 'list', 'recall', 'name', 'identify', 'state', 'match'],
      },
      {
        id: 'understand',
        nameAr: '2. الفهم والاستيعاب',
        nameEn: '2. Understanding',
        dokLevel: 2,
        color: 'bg-blue-500',
        verbsAr: ['اشرح', 'فسّر', 'لخّص', 'وضّح', 'قارن', 'ما معنى', 'استنتج الدلالة', 'صنّف'],
        verbsEn: ['explain', 'summarize', 'describe', 'interpret', 'classify', 'illustrate'],
      },
      {
        id: 'apply',
        nameAr: '3. التطبيق الإجرائي',
        nameEn: '3. Applying',
        dokLevel: 2,
        color: 'bg-teal-500',
        verbsAr: ['طبّق', 'احسب', 'استخدم', 'حلّ مسألة', 'نفّذ', 'وظّف', 'أوجد ناتج'],
        verbsEn: ['apply', 'calculate', 'solve', 'execute', 'demonstrate', 'compute'],
      },
      {
        id: 'analyze',
        nameAr: '4. التحليل والاستدلال',
        nameEn: '4. Analyzing',
        dokLevel: 3,
        color: 'bg-amber-500',
        verbsAr: ['حلّل', 'ميّز بين', 'قارن بين', 'فحص', 'ما العلاقة', 'استنبط', 'فكك عناصر'],
        verbsEn: ['analyze', 'differentiate', 'distinguish', 'examine', 'contrast', 'investigate'],
      },
      {
        id: 'evaluate',
        nameAr: '5. التقييم والنقد',
        nameEn: '5. Evaluating',
        dokLevel: 3,
        color: 'bg-purple-500',
        verbsAr: ['قيّم', 'احكم على', 'انقد', 'برّر إجابتك', 'علل رأيك', 'دافع عن', 'ما مدى صحة'],
        verbsEn: ['evaluate', 'critique', 'justify', 'judge', 'defend', 'assess', 'argue'],
      },
      {
        id: 'create',
        nameAr: '6. الابتكار والتصميم',
        nameEn: '6. Creating / Designing',
        dokLevel: 4,
        color: 'bg-rose-500',
        verbsAr: ['ابتكر', 'صمّم', 'اقترح حلاً', 'خطّط لـ', 'ابنِ فرضية', 'ألّف', 'طوّر نموذجاً'],
        verbsEn: ['create', 'design', 'propose', 'formulate', 'construct', 'synthesize', 'plan'],
      },
    ];

    let totalHits = 0;
    const levelCounts: Record<string, number> = {};

    bloomDefs.forEach((tier) => {
      let count = 0;
      tier.verbsAr.forEach((v) => {
        const matches = text.split(v.toLowerCase()).length - 1;
        count += matches;
      });
      tier.verbsEn.forEach((v) => {
        const matches = text.split(v.toLowerCase()).length - 1;
        count += matches;
      });
      // Baseline weight
      count = Math.max(count, tier.dokLevel === 1 || tier.dokLevel === 2 ? 2 : 1);
      levelCounts[tier.id] = count;
      totalHits += count;
    });

    const metrics: BloomLevelMetric[] = bloomDefs.map((tier) => {
      const c = levelCounts[tier.id] || 0;
      const pct = Math.round((c / (totalHits || 1)) * 100);
      return {
        nameAr: tier.nameAr,
        nameEn: tier.nameEn,
        dokLevel: tier.dokLevel,
        count: c,
        percentage: pct,
        color: tier.color,
        verbsAr: tier.verbsAr,
        verbsEn: tier.verbsEn,
      };
    });

    // DOK Grouping
    const dok1 = metrics[0].percentage;
    const dok2 = metrics[1].percentage + metrics[2].percentage;
    const dok3 = metrics[3].percentage + metrics[4].percentage;
    const dok4 = metrics[5].percentage;

    // Rigor Index
    const higherOrderPct = dok3 + dok4;
    let balanceStatus = isAr ? 'متوازن ومثالي' : 'Well Balanced';
    let balanceColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (higherOrderPct < 25) {
      balanceStatus = isAr ? 'يميل للاسترجاع (بحاجة لأسئلة تفكير ناقد)' : 'Heavy on Recall (Needs higher rigor)';
      balanceColor = 'text-amber-700 bg-amber-50 border-amber-300';
    } else if (higherOrderPct > 55) {
      balanceStatus = isAr ? 'تحدٍ معرفي متقدم ورفيع' : 'High Cognitive Challenge';
      balanceColor = 'text-indigo-700 bg-indigo-50 border-indigo-300';
    }

    return {
      metrics,
      dokSummary: {
        dok1,
        dok2,
        dok3,
        dok4,
        higherOrderPct,
      },
      balanceStatus,
      balanceColor,
    };
  }, [htmlContent, isAr]);

  async function handleInjectHigherOrderQuestion(level: 3 | 4) {
    setInjectingLevel(level);
    try {
      const res = await addDokQuestion({
        currentHtml: htmlContent,
        dokLevel: level,
        lang: isAr ? 'ar' : 'en',
      });

      if (res?.questionHtml && onInjectQuestion) {
        onInjectQuestion(res.questionHtml);
        setSuccessToast(
          isAr
            ? `تمت إضافة سؤال التفكير الناقد (DOK ${level}) بنجاح إلى المحرر!`
            : `Critical thinking question (DOK ${level}) injected into editor!`
        );
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to add DOK question:', err);
    } finally {
      setInjectingLevel(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-print">
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span>{isAr ? 'محلل هرم بلوم ومستويات عمق المعرفة (Webb DOK)' : 'Bloom & Webb DOK Cognitive Analyzer'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-blue-950">
                  AI Rigor Engine
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                {isAr
                  ? 'تحليل فوري لنسب أسئلة التذكر مقابل مهارات التفكير العليا مع مقترحات تعزيز فورية'
                  : 'Real-time analysis of cognitive balance, Bloom tiers, and Webb DOK distribution'}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Success Toast */}
          {successToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Cognitive Balance Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {isAr ? 'مؤشر التوازن المعرفي لمحتوى الدرس:' : 'Cognitive Rigor & Balance Status:'}
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${analysis.balanceColor}`}>
                  {analysis.balanceStatus}
                </span>
                <span className="text-xs font-bold text-slate-600">
                  {isAr
                    ? `(نسبة التفكير الناقد والتحليل: ${analysis.dokSummary.higherOrderPct}%)`
                    : `(Higher-order tasks: ${analysis.dokSummary.higherOrderPct}%)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center px-3 py-2 bg-white rounded-xl border border-slate-200">
                <div className="text-lg font-extrabold text-blue-900">{analysis.dokSummary.dok1 + analysis.dokSummary.dok2}%</div>
                <div className="text-[10px] font-bold text-slate-500">{isAr ? 'تأسيس ومفاهيم' : 'Recall & Concepts'}</div>
              </div>
              <div className="text-center px-3 py-2 bg-white rounded-xl border border-slate-200">
                <div className="text-lg font-extrabold text-purple-700">{analysis.dokSummary.higherOrderPct}%</div>
                <div className="text-[10px] font-bold text-slate-500">{isAr ? 'تحليل وابتكار' : 'Higher Order'}</div>
              </div>
            </div>
          </div>

          {/* DOK Levels 4-Pillar Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span>{isAr ? 'مستويات عمق المعرفة الأربعة (Webb\'s Depth of Knowledge - DOK):' : 'Webb\'s DOK 4-Level Breakdown:'}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-800 block">DOK 1: استرجاع وتذكر</span>
                <span className="text-2xl font-black text-emerald-700 block my-1">{analysis.dokSummary.dok1}%</span>
                <span className="text-[10px] text-emerald-600">تعريف وحقائق أولية</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-[11px] font-bold text-blue-800 block">DOK 2: مفاهيم وتطبيق</span>
                <span className="text-2xl font-black text-blue-700 block my-1">{analysis.dokSummary.dok2}%</span>
                <span className="text-[10px] text-blue-600">تفسير وإجراءات</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[11px] font-bold text-amber-800 block">DOK 3: تفكير استراتيجي</span>
                <span className="text-2xl font-black text-amber-700 block my-1">{analysis.dokSummary.dok3}%</span>
                <span className="text-[10px] text-amber-600">نقد وتحليل وتبرير</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-[11px] font-bold text-purple-800 block">DOK 4: تفكير ممتد وابتكار</span>
                <span className="text-2xl font-black text-purple-700 block my-1">{analysis.dokSummary.dok4}%</span>
                <span className="text-[10px] text-purple-600">تصميم وبحث استقصائي</span>
              </div>
            </div>
          </div>

          {/* Bloom Levels Progress Bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-700" />
              <span>{isAr ? 'توزيع مستويات هرم بلوم المعرفي الستة:' : 'Bloom\'s Taxonomy 6 Cognitive Levels:'}</span>
            </h4>
            <div className="space-y-2.5">
              {analysis.metrics.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{isAr ? m.nameAr : m.nameEn}</span>
                    <span className="font-extrabold text-slate-700 font-mono">{m.percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className={`h-full ${m.color} transition-all duration-500`}
                      style={{ width: `${Math.max(m.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart 1-Click Action Proposals */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'اقتراحات ذكية بنقرة زر لموازنة مستويات الأسئلة:' : 'Smart 1-Click Rigor Recommendations:'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleInjectHigherOrderQuestion(3)}
                disabled={injectingLevel !== null}
                className="p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-start shadow-xs transition group"
              >
                <div className="flex items-center justify-between font-extrabold text-xs text-blue-900 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-700 group-hover:scale-125 transition-transform" />
                    <span>{isAr ? 'أضف سؤال تفكير ناقد (DOK 3)' : 'Add Critical Thinking Question'}</span>
                  </span>
                  {injectingLevel === 3 && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {isAr
                    ? 'يولد سؤال تحليل وتقييم يتطلب من الطالب تقديم أدلة وتبرير منطقي'
                    : 'Generates an analytical inquiry prompt requiring student justification'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleInjectHigherOrderQuestion(4)}
                disabled={injectingLevel !== null}
                className="p-3 rounded-xl bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50/50 text-start shadow-xs transition group"
              >
                <div className="flex items-center justify-between font-extrabold text-xs text-purple-900 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700 group-hover:scale-125 transition-transform" />
                    <span>{isAr ? 'أضف مهمة ابتكار وتصميم (DOK 4)' : 'Add Innovation & Design Task'}</span>
                  </span>
                  {injectingLevel === 4 && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700" />}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {isAr
                    ? 'يولد مهمة حل مشكلات واقعية واقتراح حلول إبداعية ونماذج جديدة'
                    : 'Generates an authentic real-world problem-solving design challenge'}
                </p>
              </button>
            </div>
          </div>
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
