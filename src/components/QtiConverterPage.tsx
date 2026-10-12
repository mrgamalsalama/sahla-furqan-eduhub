import { useState, useRef, useMemo } from 'react';
import {
  FileCode2, Sparkles, Copy, Check, Download, AlertCircle, Loader2,
  School, Eye, Code, BookOpen, Package, Maximize2, Minimize2,
  Clipboard, Upload, Trash2, CheckCircle2
} from 'lucide-react';
import type { UILang } from '@/lib/i18n';
import type { LmsTarget } from '@/types';
import { convertRawTextToQti } from '@/lib/gemini';
import {
  createAndDownloadQtiZip,
  extractAndNormalizeQuestions,
  generateStandardQtiXml,
  renderQuestionsPreviewHtml
} from '@/lib/qtiPackager';

interface QtiConverterPageProps {
  uiLang: UILang;
}

const SAMPLE_QUESTIONS = `1. ما هي عاصمة الدولة العباسية الأولى قبل بغداد؟
أ) دمشق
ب) الكوفة
ج) الأنبار
د) سامراء
الإجابة الصحيحة: ج) الأنبار

2. أي من الغازات التالية يعد المسبب الرئيس لظاهرة الاحتباس الحراري؟
أ) الأكسجين
ب) ثاني أكسيد الكربون
ج) النيتروجين
د) الهيليوم
الإجابة الصحيحة: ب

3. ما نوع المحسن البديعي في جملة: (يَقِينِي بِاللَّهِ يَقِينِي)؟
أ) طباق
ب) جناس تام
ج) مقابلة
د) سجع
الإجابة: ب`;

// 100-Question full batch generator for testing and demonstration
const SAMPLE_BATCH_100 = Array.from({ length: 100 }, (_, i) => {
  const num = i + 1;
  return `${num}. ما هو ناتج العملية الحسابية: (${num} × 4) + 12؟\nأ) ${num * 4 + 8}\nب) ${num * 4 + 12}\nج) ${num * 4 + 16}\nد) ${num * 4 + 20}\nالإجابة الصحيحة: ب`;
}).join('\n\n');

export default function QtiConverterPage({ uiLang }: QtiConverterPageProps) {
  const isAr = uiLang === 'ar';
  const [rawText, setRawText] = useState('');
  const [lmsTarget, setLmsTarget] = useState<LmsTarget>('furqan_canvas');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ previewHtml: string; qtiXml: string; title: string; count?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'xml'>('preview');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorHeightMode, setEditorHeightMode] = useState<'normal' | 'tall' | 'fullscreen'>('tall');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live text metrics
  const lineCount = useMemo(() => {
    return rawText.split('\n').filter((l) => l.trim().length > 0).length;
  }, [rawText]);

  const wordCount = useMemo(() => {
    return rawText.trim().split(/\s+/).filter(Boolean).length;
  }, [rawText]);

  const estimatedQuestions = useMemo(() => {
    if (!rawText.trim()) return 0;
    const questions = extractAndNormalizeQuestions(rawText);
    return questions.length > 0 ? questions.length : 0;
  }, [rawText]);

  function handleSelectLms(target: LmsTarget) {
    setLmsTarget(target);
    if (result) {
      const combinedPayload = `${result.previewHtml || ''}\n<div id="qti-xml-payload" style="display:none;"><![CDATA[${result.qtiXml || ''}]]></div>\n<div id="raw-source-text" style="display:none;">${rawText}</div>`;
      const questions = extractAndNormalizeQuestions(combinedPayload, result.title || title);
      if (questions.length > 0) {
        const updatedXml = generateStandardQtiXml(questions, result.title || title || 'Assessment_QTI', target);
        setResult((prev) => (prev ? { ...prev, qtiXml: updatedXml } : null));
      }
    }
  }

  async function handlePasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText((prev) => (prev ? prev + '\n\n' + text : text));
      }
    } catch {
      setError(isAr ? 'يرجى استخدام Ctrl+V للصق النص مباشرة في المربع.' : 'Please use Ctrl+V to paste into the box.');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title && file.name) {
      const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
      setTitle(autoTitle);
    }

    // Support Word .docx directly
    if (file.name.endsWith('.docx')) {
      try {
        const JSZip = (await import('jszip')).default;
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const docXml = await zip.file('word/document.xml')?.async('string');
        if (docXml) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(docXml, 'application/xml');
          const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
          const lines = paragraphs
            .map((p) => {
              const texts = Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '');
              return texts.join('');
            })
            .filter(Boolean);
          if (lines.length > 0) {
            setRawText(lines.join('\n'));
            e.target.value = '';
            return;
          }
        }
      } catch (err) {
        console.warn('Docx read fallback:', err);
      }
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      if (content) {
        setRawText(content);
      }
    };
    reader.onerror = () => {
      setError(isAr ? 'فشل قراءة الملف النصي.' : 'Failed to read text file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleConvert() {
    if (!rawText.trim()) {
      setError(isAr ? 'يرجى كتابة أو لصق نص الأسئلة أولاً.' : 'Please paste question text first.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const currentTitle = title.trim() || (isAr ? 'اخْتِبَارٌ قَصِيرٌ شَامِلٌ' : 'Comprehensive Assessment');

      // 1. Process questions directly with high-speed deterministic normalizer
      // Guarantees 100% of questions are preserved (supports 10, 50, 100+ questions with ZERO truncation!)
      const localQuestions = extractAndNormalizeQuestions(rawText, currentTitle);

      if (localQuestions.length > 0) {
        const previewHtml = renderQuestionsPreviewHtml(localQuestions, currentTitle);
        const qtiXml = generateStandardQtiXml(localQuestions, currentTitle, lmsTarget);

        setResult({
          previewHtml,
          qtiXml,
          title: currentTitle,
          count: localQuestions.length,
        });
        setActiveTab('preview');
        return;
      }

      // If local engine found 0 questions, attempt AI fallback
      try {
        const res = await convertRawTextToQti({
          rawText,
          lmsTarget,
          title: currentTitle,
        });

        const combinedPayload = `${res.previewHtml || ''}\n<div id="qti-xml-payload" style="display:none;"><![CDATA[${res.qtiXml || ''}]]></div>\n<div id="raw-source-text" style="display:none;">${rawText}</div>`;
        const allQuestions = extractAndNormalizeQuestions(combinedPayload, res.title || currentTitle);

        if (allQuestions.length > 0) {
          const fullXml = generateStandardQtiXml(allQuestions, res.title || currentTitle, lmsTarget);
          const finalPreview = renderQuestionsPreviewHtml(allQuestions, res.title || currentTitle);

          setResult({
            previewHtml: finalPreview,
            qtiXml: fullXml,
            title: res.title || currentTitle,
            count: allQuestions.length,
          });
          setActiveTab('preview');
          return;
        }
      } catch (aiErr) {
        console.warn('AI fallback failed:', aiErr);
      }

      throw new Error(
        isAr
          ? 'تعذر استخراج الأسئلة من النص، يرجى التأكد من وجود ترقيم واضح للأسئلة مع خياراتها.'
          : 'Could not parse questions. Please ensure questions and choices are clearly formatted.'
      );
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء تحويل الأسئلة.' : 'Conversion failed.'));
    } finally {
      setLoading(false);
    }
  }

  function handleCopyXml() {
    if (!result?.qtiXml) return;
    navigator.clipboard.writeText(result.qtiXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadZip(overrideTarget?: LmsTarget) {
    if (!result?.qtiXml && !result?.previewHtml && !rawText) return;
    const payload = `${result?.previewHtml || ''}\n<div id="qti-xml-payload" style="display:none;"><![CDATA[${result?.qtiXml || ''}]]></div>\n<div id="raw-source-text" style="display:none;">${rawText}</div>`;

    await createAndDownloadQtiZip({
      title: title || result?.title || 'Assessment_QTI',
      xmlPayload: payload,
      target: overrideTarget || lmsTarget,
    });
  }

  function handleDownloadXml() {
    if (!result?.qtiXml) return;
    const blob = new Blob([result.qtiXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${(title || result?.title || 'assessment').replace(/\s+/g, '_')}_${lmsTarget}.xml`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.doc,.docx,text/plain"
        className="hidden"
      />

      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold mb-3 shadow-xs">
          <FileCode2 className="w-4 h-4 text-teal-600" />
          <span>{isAr ? 'محول ومعالج الأسئلة الذكي إلى معيار QTI (يتسع لأكثر من 100 سؤال)' : 'Raw Text to Standard QTI Converter (Supports 100+ Questions)'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAr ? 'استوديو تحويل الأسئلة لمنصات LMS' : 'LMS QTI Assessment Studio'}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
          {isAr
            ? 'الصق أسئلتك المكتوبة بأي صيغة (10، 50، أو أكثر من 100 سؤال)، وسيقوم المعالج بضبطها واستخراج خياراتها وإجاباتها وتوليد حزمة QTI ZIP متوافقة 100% مع منصات مدرستك (Canvas & Cypher).'
            : 'Paste questions in any raw format (10, 50, or 100+ questions). Generates fully compliant QTI packages ready for Canvas and Cypher LMS.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className={`${isExpanded ? 'lg:col-span-12' : 'lg:col-span-6'} flex flex-col gap-5 transition-all duration-300`}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <School className="w-4 h-4 text-teal-600" />
                <span>{isAr ? 'إعدادات المنصة وحزمة الاختبار' : 'Platform & Assessment Settings'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition"
                title={isAr ? 'تكبير / تصغير مساحة العمل لراحة تامة مع 100+ سؤال' : 'Toggle Expand View'}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-blue-800" />
                    <span>{isAr ? 'عرض متجاور (50/50)' : 'Split View'}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-blue-800" />
                    <span>{isAr ? 'توسيع كامل لمساحة الإدخال (عرض 100%)' : 'Full Width View'}</span>
                  </>
                )}
              </button>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'نظام إدارة التعلم (LMS):' : 'Target Learning Platform:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectLms('furqan_canvas')}
                    className={`p-3 text-start rounded-xl border text-xs font-medium transition-all ${
                      lmsTarget === 'furqan_canvas'
                        ? 'border-teal-600 ring-2 ring-teal-600 bg-teal-50/70 text-teal-950 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/30 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 text-teal-950">مدارس الفرقان العالمية</div>
                    <div className="text-[11px] text-teal-700 font-semibold">QTI v2.1 ZIP المعتمد</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLms('canvas_lms')}
                    className={`p-3 text-start rounded-xl border text-xs font-medium transition-all ${
                      lmsTarget === 'canvas_lms'
                        ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 text-indigo-950">منصة كانفاس التعليمية</div>
                    <div className="text-[11px] text-indigo-700 font-semibold">Canvas LMS QTI ZIP</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLms('sahlah_cypher')}
                    className={`p-3 text-start rounded-xl border text-xs font-medium transition-all ${
                      lmsTarget === 'sahlah_cypher'
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 text-blue-950">أكاديمية سهلة الدولية</div>
                    <div className="text-[11px] text-blue-700 font-semibold">Cypher QTI v1.2 ZIP</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'عنوان التقييم / الاختبار (اختياري):' : 'Assessment Title (Optional):'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: اختبار الفهم القرائي - بنك الأسئلة الشامل (100 سؤال)' : 'e.g. Comprehensive Assessment Bank'}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Textarea with enhanced toolbars & capacity */}
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label className="text-xs font-bold text-slate-800">
                      {isAr ? 'مربع لصق وكتابة الأسئلة:' : 'Pasted Question Text Area:'}
                    </label>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      {isAr ? 'سعة مفتوحة لأكثر من 100 سؤال و 1000 سطر' : '100+ Questions / 1000+ Lines'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 transition"
                      title={isAr ? 'لصق النص مباشرة من الحافظة' : 'Paste from clipboard'}
                    >
                      <Clipboard className="w-3 h-3 text-blue-700" />
                      <span>{isAr ? 'لصق' : 'Paste'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 transition"
                      title={isAr ? 'استيراد ملف Word أو ملف نصي' : 'Upload file'}
                    >
                      <Upload className="w-3 h-3 text-teal-600" />
                      <span>{isAr ? 'رفع Word / نص' : 'Upload File'}</span>
                    </button>

                    {rawText && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="px-2.5 py-1 text-[11px] rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium flex items-center gap-1 transition"
                        title={isAr ? 'مسح كل النص المكتوب' : 'Clear text'}
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>{isAr ? 'مسح' : 'Clear'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setRawText(SAMPLE_QUESTIONS)}
                      className="px-2.5 py-1 text-[11px] text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg font-bold flex items-center gap-1 transition"
                      title={isAr ? 'إدراج نموذج 3 أسئلة' : 'Sample 3 Questions'}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAr ? 'نموذج (3)' : 'Sample (3)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRawText(SAMPLE_BATCH_100)}
                      className="px-2.5 py-1 text-[11px] text-blue-800 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 transition"
                      title={isAr ? 'تجربة سعة 100 سؤال كاملة دفعة واحدة' : 'Test Full 100 Questions Batch'}
                    >
                      <CheckCircle2 className="w-3 h-3 text-blue-700" />
                      <span>{isAr ? 'دفعة (100 سؤال)' : 'Batch (100)'}</span>
                    </button>

                    {/* Height Mode Toggles */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEditorHeightMode('normal')}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          editorHeightMode === 'normal' ? 'bg-white shadow-2xs font-bold text-slate-900' : 'text-slate-500'
                        }`}
                        title="ارتفاع عادي (420px)"
                      >
                        {isAr ? 'عادي' : 'Normal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorHeightMode('tall')}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          editorHeightMode === 'tall' ? 'bg-white shadow-2xs font-bold text-blue-900' : 'text-slate-500'
                        }`}
                        title="ارتفاع مضاعف (650px)"
                      >
                        {isAr ? 'مضاعف' : 'Tall'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorHeightMode(editorHeightMode === 'fullscreen' ? 'tall' : 'fullscreen')}
                        className={`px-2 py-0.5 rounded font-medium transition flex items-center gap-0.5 ${
                          editorHeightMode === 'fullscreen' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500'
                        }`}
                        title="ملء الشاشة الكامل"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                        <span>{isAr ? 'شاشة كاملة' : 'Full'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`relative ${editorHeightMode === 'fullscreen' ? 'fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl p-4 flex flex-col border border-slate-300' : ''}`}>
                  {editorHeightMode === 'fullscreen' && (
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-blue-700" />
                        <span>{isAr ? 'محرر الأسئلة في وضع ملء الشاشة (سعة استيعابية فائقة)' : 'Fullscreen Question Editor'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorHeightMode('tall')}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
                      >
                        {isAr ? 'إغلاق ملء الشاشة ✕' : 'Close Fullscreen ✕'}
                      </button>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    rows={editorHeightMode === 'normal' ? 18 : editorHeightMode === 'tall' ? 28 : 40}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={
                      isAr
                        ? 'الصق هنا أي عدد من الأسئلة بأي طريقة كُتبت بها (10، 50، 100 سؤال أو أكثر، وحتى 1000 سطر دون اقتطاع):\n- أسئلة مرقمة مع خيارات (أ، ب، ج، د أو 1، 2، 3، 4 أو A, B, C, D)\n- أرقام مشرقية (١، ٢، ٣، ٤) أو مغربية (1, 2, 3)\n- جداول منسوخة من ملفات Word أو Excel (تلصق تلقائياً كأعمدة)\n- خيارات منفصلة في أسطر أو مدمجة في سطر واحد\n\nمثال:\n1. ما هي عاصمة جمهورية مصر العربية؟\nأ) القاهرة\nب) الإسكندرية\nج) أسوان\nد) الجيزة\nالإجابة الصحيحة: أ\n\n2. ما هو ناتج العملية 25 + 75؟\nأ) 90\nب) 100\nج) 110\nد) 120\nالحل: ب'
                        : 'Paste any number of questions here (10, 50, 100+ questions)...'
                    }
                    className={`w-full text-sm p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed resize-y shadow-2xs transition-all ${
                      editorHeightMode === 'fullscreen'
                        ? 'flex-1 min-h-[500px]'
                        : editorHeightMode === 'tall'
                        ? 'min-h-[640px]'
                        : 'min-h-[420px]'
                    }`}
                  />
                </div>

                {/* Live Capacity & Counter Bar */}
                <div className="mt-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800">
                      {isAr ? `عدد الأسطر: ${lineCount}` : `Lines: ${lineCount}`}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      {isAr ? `الكلمات: ${wordCount}` : `Words: ${wordCount}`}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-bold text-blue-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      {isAr ? `الأسئلة المكتشفة: ${estimatedQuestions}` : `Detected Questions: ${estimatedQuestions}`}
                    </span>
                  </div>
                  <div className="text-teal-700 font-bold flex items-center gap-1.5 bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-200/60">
                    <span>{isAr ? '⚡ يستوعب أكثر من 100 سؤال و1000 سطر دون أي اقتطاع' : 'Supports 100+ Questions (Zero Truncation)'}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleConvert}
                disabled={loading}
                className="w-full py-4 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري التحليل وبناء حزمة الأسئلة...' : 'Converting & Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>
                      {isAr
                        ? `تحويل جميع الأسئلة (${estimatedQuestions > 0 ? estimatedQuestions + ' سؤالاً' : '100+ سؤال'}) وتوليد حزمة QTI الرسمية`
                        : 'Convert All Questions & Generate Official QTI Package'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output / Preview */}
        <div className={`${isExpanded ? 'lg:col-span-12' : 'lg:col-span-6'} flex flex-col gap-4 transition-all duration-300`}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'preview' ? 'bg-white text-blue-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة الأسئلة' : 'Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('xml')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                    activeTab === 'xml' ? 'bg-white text-blue-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{isAr ? 'كود QTI XML' : 'QTI XML Code'}</span>
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyXml}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ XML' : 'Copy XML')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadZip('furqan_canvas')}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    title={isAr ? 'حزمة معيارية QTI v2.1 معتمدة لمدارس الفرقان' : 'Furqan QTI v2.1 ZIP'}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{isAr ? 'الفرقان QTI v2.1 zip' : 'Furqan QTI v2.1'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadZip('canvas_lms')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    title={isAr ? 'حزمة اختبار متوافقة 100% مع منصة Canvas LMS' : 'Canvas LMS QTI ZIP'}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{isAr ? 'كانفاس Canvas QTI zip' : 'Canvas QTI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadZip('sahlah_cypher')}
                    className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    title={isAr ? 'حزمة معيارية QTI v1.2 لأكاديمية سهلة' : 'Sahlah QTI v1.2 ZIP'}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{isAr ? 'سهلة QTI v1.2 zip' : 'Sahlah QTI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadXml}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1"
                    title="تحميل كود XML فقط"
                  >
                    <Download className="w-3 h-3" />
                    <span>XML</span>
                  </button>
                </div>
              )}
            </div>

            {/* Display Body */}
            <div className="p-6 flex-1 overflow-auto max-h-[850px]">
              {!result && !loading && (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <BookOpen className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm mb-1">
                    {isAr ? 'بانتظار لصق الأسئلة للتحويل' : 'Awaiting questions to convert'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {isAr
                      ? 'الصق نصوص الأسئلة في الصندوق المقابل (10 أو 50 أو 100+ سؤال) واضغط على زر التحويل ليظهر هنا جدول الفحص الشامل وكود QTI XML.'
                      : 'Paste questions on the left (any number) and click Convert to inspect formatted review and valid XML here.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-800">
                    {isAr ? 'جاري معالجة الأسئلة وبناء حزمة QTI الرسمية...' : 'Processing questions & building official QTI package...'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr ? 'يتم مطابقة معايير المنصة وهيكلة الملفات لضمان ظهور كافة الأسئلة في LMS' : 'Formatting XML to ensure all questions appear in your LMS'}
                  </p>
                </div>
              )}

              {result && activeTab === 'preview' && (
                <div
                  className="prose max-w-none text-sm text-slate-800"
                  dangerouslySetInnerHTML={{ __html: result.previewHtml }}
                />
              )}

              {result && activeTab === 'xml' && (
                <pre className="p-4 bg-slate-900 text-teal-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {result.qtiXml}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

