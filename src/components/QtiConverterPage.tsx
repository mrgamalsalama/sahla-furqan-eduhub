import { useState } from 'react';
import {
  FileCode2, Sparkles, Copy, Check, Download, AlertCircle, Loader2,
  School, Eye, Code, BookOpen, Package
} from 'lucide-react';
import type { UILang } from '@/lib/i18n';
import type { LmsTarget } from '@/types';
import { convertRawTextToQti } from '@/lib/gemini';
import { createAndDownloadQtiZip, extractAndNormalizeQuestions, generateStandardQtiXml } from '@/lib/qtiPackager';

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

export default function QtiConverterPage({ uiLang }: QtiConverterPageProps) {
  const isAr = uiLang === 'ar';
  const [rawText, setRawText] = useState('');
  const [lmsTarget, setLmsTarget] = useState<LmsTarget>('sahlah_cypher');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ previewHtml: string; qtiXml: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'xml'>('preview');
  const [copied, setCopied] = useState(false);

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

  async function handleConvert() {
    if (!rawText.trim()) {
      setError(isAr ? 'يرجى كتابة أو لصق نص الأسئلة أولاً.' : 'Please paste question text first.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await convertRawTextToQti({
        rawText,
        lmsTarget,
        title: title.trim() || undefined,
      });

      // Extract all questions using our comprehensive parser from previewHtml and rawText
      const combinedPayload = `${res.previewHtml || ''}\n<div id="qti-xml-payload" style="display:none;"><![CDATA[${res.qtiXml || ''}]]></div>\n<div id="raw-source-text" style="display:none;">${rawText}</div>`;
      const questions = extractAndNormalizeQuestions(combinedPayload, res.title || title);

      // Generate standard QTI XML for ALL extracted questions so XML tab and downloads are 100% complete
      let fullXml = res.qtiXml;
      if (questions.length > 0) {
        fullXml = generateStandardQtiXml(questions, res.title || title || 'Assessment_QTI', lmsTarget);
      }

      setResult({
        ...res,
        qtiXml: fullXml,
      });
      setActiveTab('preview');
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

  async function handleDownloadZip() {
    if (!result?.qtiXml && !result?.previewHtml && !rawText) return;
    const payload = `${result?.previewHtml || ''}\n<div id="qti-xml-payload" style="display:none;"><![CDATA[${result?.qtiXml || ''}]]></div>\n<div id="raw-source-text" style="display:none;">${rawText}</div>`;

    await createAndDownloadQtiZip({
      title: title || result?.title || 'Assessment_QTI',
      xmlPayload: payload,
      target: lmsTarget,
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
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold mb-3 shadow-xs">
          <FileCode2 className="w-4 h-4 text-teal-600" />
          <span>{isAr ? 'محول ومعالج الأسئلة الذكي إلى معيار QTI' : 'Raw Text to Standard QTI Converter'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isAr ? 'استوديو تحويل الأسئلة لمنصات LMS' : 'LMS QTI Assessment Studio'}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
          {isAr
            ? 'الصق أسئلتك المكتوبة بأي صيغة غير منظمة، وسيقوم الذكاء الاصطناعي بضبطها وتشكيلها بنسبة 100%، واستخراج خياراتها وإجاباتها وتوليد ملف QTI XML متوافق فوراً مع منصة مدرستك.'
            : 'Paste unstructured questions from Word, PDF, or notes. The AI will parse stems, options, and keys into fully validated QTI XML ready for Cypher and Canvas LMS.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <School className="w-4 h-4 text-teal-600" />
              <span>{isAr ? 'إعدادات المنصة المستهدفة' : 'Target LMS Settings'}</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAr ? 'نظام إدارة التعلم (LMS):' : 'Target Learning Platform:'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectLms('sahlah_cypher')}
                    className={`p-3.5 text-start rounded-xl border text-xs font-medium transition-all ${
                      lmsTarget === 'sahlah_cypher'
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 text-blue-950">أكاديمية سهلة</div>
                    <div className="text-[11px] text-slate-600 font-semibold">QTI v1.2 ZIP</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLms('furqan_canvas')}
                    className={`p-3.5 text-start rounded-xl border text-xs font-medium transition-all ${
                      lmsTarget === 'furqan_canvas'
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-blue-50/50 text-blue-950 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5 text-blue-950">مدارس الفرقان</div>
                    <div className="text-[11px] text-slate-600 font-semibold">QTI v2.1 ZIP</div>
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
                  placeholder={isAr ? 'مثال: اختبار الفهم القرائي - الأسبوع الخامس' : 'e.g. Reading Comprehension Quiz'}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isAr ? 'نص الأسئلة المنسوخ:' : 'Pasted Question Text:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_QUESTIONS)}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'لصق نموذج تجريبي' : 'Paste sample'}</span>
                  </button>
                </div>
                <textarea
                  rows={12}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    isAr
                      ? 'الصق هنا الأسئلة بأي طريقة كُتبت بها:\n\n1. ما هو عاصمة الأندلس في عصر الخلافة؟\nأ) طليطلة\nب) قرطبة\nج) إشبيلية\nد) غرناطة\nالإجابة: ب'
                      : 'Paste questions here in any raw format...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                />
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
                className="w-full py-3.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جاري التحليل والتشكيل والتحويل...' : 'Converting to QTI...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>{isAr ? 'تحويل الأسئلة وتوليد حزمة QTI' : 'Convert & Generate QTI'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output / Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
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
                <div className="flex items-center gap-2">
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
                    onClick={handleDownloadZip}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    title={isAr ? 'تصدير حزمة مضغوطة متوافقة مع نظام إدارة التعلم' : 'Download complete QTI ZIP package'}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{isAr ? '📦 تحميل حزمة الاختبار للمنصة (QTI ZIP)' : 'Download QTI ZIP'}</span>
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
            <div className="p-6 flex-1 overflow-auto max-h-[700px]">
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
                      ? 'الصق نصوص الأسئلة في الصندوق المقابل واضغط على زر التحويل ليظهر هنا جدول الفحص وكود QTI XML.'
                      : 'Paste question text on the left and click Convert to inspect formatted review and valid XML here.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-800">
                    {isAr ? 'جاري معالجة الأسئلة وتطبيق التشكيل التام بنسبة 100%...' : 'Processing questions & applying full diacritics...'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr ? 'يتم مطابقة المعايير وهيكلة حزمة QTI القياسية' : 'Building standardized QTI assessment package'}
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
