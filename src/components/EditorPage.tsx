import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Table as TableIcon,
  Printer, Copy, FileText, FileType2, Save, ArrowRight, ArrowLeft, Check,
  Type, Heading1, Heading2, Heading3, Quote, Undo, Redo, Presentation,
  AlignRight, AlignCenter, AlignLeft, AlignJustify, Package, Cloud
} from 'lucide-react';
import type { OutputType, LessonSettings, SavedLesson } from '@/types';
import { OUTPUT_LABELS_AR, OUTPUT_LABELS_EN } from '@/types';
import { exportToWord, printContent, copyToClipboard } from '@/lib/export';
import { parseHtmlToGammaSlides, exportGammaSlidesToPptx } from '@/lib/gammaPptx';
import { saveLesson, getLessonSettings, uid } from '@/lib/storage';
import { createAndDownloadQtiZip } from '@/lib/qtiPackager';
import { saveCloudResource } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface EditorPageProps {
  initialHtml: string;
  title: string;
  outputType: OutputType;
  onBack: () => void;
  editingLesson?: SavedLesson | null;
  uiLang: UILang;
  user?: User | null;
  onSignIn?: () => void;
}

const FONT_OPTIONS = [
  // خطوط عربية مميزة
  { name: 'خط القاهرة (Cairo)', value: 'Cairo, sans-serif' },
  { name: 'الخط الأميري (Amiri النسخي)', value: 'Amiri, serif' },
  { name: 'خط تجوال (Tajawal)', value: 'Tajawal, sans-serif' },
  { name: 'خط المراعي (Almarai)', value: 'Almarai, sans-serif' },
  { name: 'خط الإسكندرية (Alexandria)', value: 'Alexandria, sans-serif' },
  { name: 'خط ريدكس برو (Readex Pro)', value: 'Readex Pro, sans-serif' },
  { name: 'خط نوتو نَسخ (Noto Naskh)', value: '"Noto Naskh Arabic", serif' },
  { name: 'خط شهرزاد القرآني (Scheherazade)', value: '"Scheherazade New", serif' },
  { name: 'خط لطيف المريح (Lateef)', value: 'Lateef, cursive' },
  { name: 'خط كوفام المودرن (Kufam)', value: 'Kufam, sans-serif' },
  { name: 'خط تشانجا العريض (Changa)', value: 'Changa, sans-serif' },

  // خطوط إنجليزية وأكاديمية (English Fonts)
  { name: 'Arial (Standard Clean)', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Times New Roman (Academic)', value: '"Times New Roman", Times, serif' },
  { name: 'Calibri (Standard Office)', value: 'Calibri, Candara, Segoe, sans-serif' },
  { name: 'Poppins (Modern Geometric)', value: 'Poppins, sans-serif' },
  { name: 'Inter (High Legibility)', value: 'Inter, sans-serif' },
  { name: 'Roboto (Clean Digital)', value: 'Roboto, sans-serif' },
  { name: 'Lora (Editorial Serif)', value: 'Lora, serif' },
  { name: 'Comic Sans MS (Kids & Primary)', value: '"Comic Sans MS", "Comic Sans", cursive' },
];

const FONT_SIZES = [
  { label: '10 pt', value: '1' },
  { label: '12 pt', value: '2' },
  { label: '14 pt', value: '3' },
  { label: '16 pt', value: '4' },
  { label: '18 pt', value: '5' },
  { label: '24 pt', value: '6' },
  { label: '32 pt', value: '7' },
];

export default function EditorPage({
  initialHtml,
  title,
  outputType,
  onBack,
  editingLesson,
  uiLang,
  user,
  onSignIn,
}: EditorPageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const editorRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'word' | null>(null);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [lessonId] = useState(editingLesson?.id || uid());

  // تحديد اتجاه المحتوى والخط الافتراضي
  const isContentArabic = /[\u0600-\u06FF]/.test(initialHtml.slice(0, 500));
  const [activeFont, setActiveFont] = useState(isContentArabic ? 'Cairo, sans-serif' : 'inherit');
  const [activeFontSize, setActiveFontSize] = useState('3');
  const [activeDir, setActiveDir] = useState<'rtl' | 'ltr'>(isContentArabic ? 'rtl' : 'ltr');

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  function handleFontChange(fontFamily: string) {
    setActiveFont(fontFamily);
    exec('fontName', fontFamily);
  }

  function handleFontSizeChange(sizeValue: string) {
    setActiveFontSize(sizeValue);
    exec('fontSize', sizeValue);
  }

  function handleDirectionChange(dir: 'rtl' | 'ltr') {
    setActiveDir(dir);
    if (editorRef.current) {
      editorRef.current.dir = dir;
      editorRef.current.style.textAlign = dir === 'rtl' ? 'right' : 'left';
    }
  }

  function insertTable() {
    const headers = isContentArabic
      ? '<thead><tr><th style="color:#0f172a;background:#f1f5f9;font-weight:bold;">العنصر</th><th style="color:#0f172a;background:#f1f5f9;font-weight:bold;">التفاصيل والمحتوى</th></tr></thead>'
      : '<thead><tr><th style="color:#0f172a;background:#f1f5f9;font-weight:bold;">Component</th><th style="color:#0f172a;background:#f1f5f9;font-weight:bold;">Details & Content</th></tr></thead>';
    const tableHtml = `<table border="1" style="width:100%; border-collapse: collapse; margin: 1rem 0;">${headers}<tbody><tr><td style="text-align:${activeDir === 'rtl' ? 'right' : 'left'};">&nbsp;</td><td style="text-align:${activeDir === 'rtl' ? 'right' : 'left'};">&nbsp;</td></tr></tbody></table><p><br></p>`;
    document.execCommand('insertHTML', false, tableHtml);
    editorRef.current?.focus();
  }

  function handleCopy() {
    const html = editorRef.current?.innerHTML || '';
    copyToClipboard(html).then((ok) => {
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }

  function handlePrint() {
    const html = editorRef.current?.innerHTML || '';
    printContent(currentTitle || outputLabels[outputType], html, isContentArabic ? 'ar' : 'en');
  }

  async function handleExportWord() {
    setExporting('word');
    try {
      const html = editorRef.current?.innerHTML || '';
      const currentSettings = editingLesson?.settings || getLessonSettings();
      await exportToWord(
        {
          title: currentTitle,
          htmlContent: html,
          fileName: currentTitle || outputLabels[outputType],
          settings: currentSettings,
        },
        isContentArabic ? 'ar' : 'en'
      );
    } finally {
      setExporting(null);
    }
  }

  function handleExportPDF() {
    const html = editorRef.current?.innerHTML || '';
    const currentSettings = editingLesson?.settings || getLessonSettings();
    printContent(
      currentTitle || outputLabels[outputType],
      html,
      isContentArabic ? 'ar' : 'en',
      currentSettings
    );
  }

  async function handleDownloadQtiZip(target: 'sahlah_cypher' | 'furqan_canvas') {
    const rawHtml = editorRef.current?.innerHTML || initialContent || '';
    await createAndDownloadQtiZip({
      title: currentTitle || 'Assessment_QTI',
      xmlPayload: rawHtml,
      target,
    });
  }

  function cleanXmlText(str: string = ''): string {
    return str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  interface JSZipInstance {
    file(name: string, content: string): JSZipInstance;
    folder(name: string): JSZipInstance | null;
    generateAsync(options: { type: string }): Promise<Blob>;
  }
  type JSZipConstructor = new () => JSZipInstance;

  interface PptxSlide {
    background: { color: string };
    addShape(shape: unknown, options: Record<string, unknown>): void;
    addText(text: string | Array<{ text: string; options?: Record<string, unknown> }>, options: Record<string, unknown>): void;
  }
  interface PptxGenInstance {
    layout: string;
    rtlMode?: boolean;
    defineLayout(options: Record<string, unknown>): void;
    addSlide(): PptxSlide;
    writeFile(options: { fileName: string }): Promise<void>;
    shapes: { RECTANGLE: unknown };
  }
  type PptxGenConstructor = new () => PptxGenInstance;

  async function ensureJSZip(): Promise<JSZipConstructor> {
    const win = window as unknown as { JSZip?: JSZipConstructor };
    if (win.JSZip) return win.JSZip;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(script);
    });
    return (window as unknown as { JSZip: JSZipConstructor }).JSZip;
  }

  async function ensurePptxGen(): Promise<PptxGenConstructor> {
    const win = window as unknown as { PptxGenJS?: PptxGenConstructor };
    if (win.PptxGenJS) return win.PptxGenJS;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load PptxGenJS'));
      document.head.appendChild(script);
    });
    return (window as unknown as { PptxGenJS: PptxGenConstructor }).PptxGenJS;
  }

  // ==========================================
  // 1. تصدير الفرقان (QTI 2.1)
  // ==========================================
  async function handleExportQTIZip() {
    try {
      const JSZip = await ensureJSZip();
      const zip = new JSZip();

      const rawHtml = editorRef.current?.innerHTML || '';
      const cleaned = cleanXmlText(rawHtml);

      const itemRegex = /<assessmentItem[\s\S]*?<\/assessmentItem>/gi;
      const matched = cleaned.match(itemRegex);
      const items: string[] = matched ? Array.from(matched) : [];

      if (items.length === 0) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        const stripDiacritics = (txt: string) => txt.replace(/[\u064B-\u065F\u0670]/g, '');

        let currentQuestion = '';
        let options: { id: string; text: string }[] = [];
        const parsed: { prompt: string; options: { id: string; text: string }[]; correct: string }[] = [];

        tempDiv.querySelectorAll('li, p, tr, div').forEach((el) => {
          const rawText = el.textContent?.trim() || '';
          if (!rawText) return;

          if (
            rawText.includes('الصف') ||
            rawText.includes('المادة') ||
            rawText.includes('تعليمات') ||
            rawText.includes('نموذج الإجابة') ||
            rawText.includes('Answer Key') ||
            rawText.includes('مصفوفة نواتج') ||
            rawText.includes('Benchmark Grid')
          ) {
            return;
          }

          const plainText = stripDiacritics(rawText);

          if (/^(\d+[.\-)ـ]|س\s*\d+)/.test(plainText)) {
            if (currentQuestion && options.length >= 2) {
              parsed.push({ prompt: currentQuestion, options: [...options], correct: 'A' });
            }
            currentQuestion = rawText.replace(/^(\d+[.\-)ـ]|س\s*\d+)\s*/, '').trim();
            options = [];
          } else if (/[○◯]?\s*([أ-دA-D])\s*[).\-:]/i.test(plainText)) {
            const match = plainText.match(/[○◯]?\s*([أ-دA-D])\s*[).\-:]/i);
            if (match) {
              const letter = match[1].toUpperCase();
              const id =
                letter === 'أ' || letter === 'A'
                  ? 'A'
                  : letter === 'ب' || letter === 'B'
                  ? 'B'
                  : letter === 'ج' || letter === 'C'
                  ? 'C'
                  : 'D';

              const optText = rawText
                .replace(/^[○◯\s]*[أ-دA-D][\u064B-\u065F\u0670]*\s*[).\-:]\s*[○◯\s]*/i, '')
                .trim();
              if (optText) {
                options.push({ id, text: optText });
              }
            }
          }
        });

        if (currentQuestion && options.length >= 2) {
          parsed.push({ prompt: currentQuestion, options: [...options], correct: 'A' });
        }

        parsed.forEach((q, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const choicesXml = q.options
            .map((opt) => `      <simpleChoice identifier="${opt.id}">${opt.text}</simpleChoice>`)
            .join('\n');
          items.push(`<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" identifier="BAL_${num}" title="سؤال ${idx + 1}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>${q.correct}</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>${q.prompt}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
${choicesXml}
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`);
        });
      }

      if (items.length === 0) {
        items.push(`<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" identifier="BAL_01" title="سؤال 1" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>A</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>${currentTitle || 'اختبار تقييمي'}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
      <simpleChoice identifier="A">إجابة صحيحة</simpleChoice>
      <simpleChoice identifier="B">إجابة خاطئة</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`);
      }

      let manifestResources = '';

      items.forEach((itemContent: string, index: number) => {
        const num = String(index + 1).padStart(2, '0');
        const fileName = `bal_${num}.xml`;
        const itemIdentifier = `BAL_${num}`;

        let itemXml = itemContent.trim();
        itemXml = itemXml.replace(/identifier=["'][^"']+["']/, `identifier="${itemIdentifier}"`);

        itemXml = itemXml
          .replace(/<\/?assessmentitem\b/gi, (m) => (m.startsWith('</') ? '</assessmentItem' : '<assessmentItem'))
          .replace(/<\/?responsedeclaration\b/gi, (m) =>
            m.startsWith('</') ? '</responseDeclaration' : '<responseDeclaration'
          )
          .replace(/<\/?outcomedeclaration\b/gi, (m) =>
            m.startsWith('</') ? '</outcomeDeclaration' : '<outcomeDeclaration'
          )
          .replace(/<\/?correctresponse\b/gi, (m) => (m.startsWith('</') ? '</correctResponse' : '<correctResponse'))
          .replace(/<\/?defaultvalue\b/gi, (m) => (m.startsWith('</') ? '</defaultValue' : '<defaultValue'))
          .replace(/<\/?itembody\b/gi, (m) => (m.startsWith('</') ? '</itemBody' : '<itemBody'))
          .replace(/<\/?choiceinteraction\b/gi, (m) =>
            m.startsWith('</') ? '</choiceInteraction' : '<choiceInteraction'
          )
          .replace(/<\/?simplechoice\b/gi, (m) => (m.startsWith('</') ? '</simpleChoice' : '<simpleChoice'))
          .replace(/<\/?responseprocessing\b/gi, (m) =>
            m.startsWith('</') ? '</responseProcessing' : '<responseProcessing'
          )
          .replace(/\bbasetype=/gi, 'baseType=')
          .replace(/\bresponseidentifier=/gi, 'responseIdentifier=')
          .replace(/\bmaxchoices=/gi, 'maxChoices=')
          .replace(/\btimedependent=/gi, 'timeDependent=');

        if (!itemXml.startsWith('<?xml')) {
          itemXml = `<?xml version="1.0" encoding="UTF-8"?>\n` + itemXml;
        }

        zip.file(fileName, itemXml);
        manifestResources += `    <resource identifier="${itemIdentifier}" type="imsqti_item_xmlv2p1" href="${fileName}">\n      <file href="${fileName}"/>\n    </resource>\n`;
      });

      const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" 
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          identifier="MANIFEST_ASSESSMENT_${Date.now()}">
  <organizations/>
  <resources>
${manifestResources}  </resources>
</manifest>`;

      zip.file('imsmanifest.xml', manifestXml);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.setAttribute('download', `${currentTitle || 'exam_questions_qti'}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error details:', err);
      alert('حدث خطأ أثناء تجميع ملف الفرقان، يرجى المحاولة مرة أخرى.');
    }
  }

  // ==========================================
  // 2. تصدير سهلة (CYPHER v1.2)
  // ==========================================
  async function handleExportSahlahZip() {
    return handleDownloadQtiZip('sahlah_cypher');
  }

  // ==========================================
  // 3. تصدير البوربوينت (Direct PPTX)
  // ==========================================
  async function handleExportPPTX() {
    try {
      const rawHtml = editorRef.current?.innerHTML || '';
      let slides = parseHtmlToGammaSlides(rawHtml);
      if (slides.length === 0) {
        slides = [
          {
            id: 'slide_1',
            index: 1,
            title: currentTitle || 'عرض تقديمي',
            category: 'الافتتاحية والأهداف',
            layout: 'hero',
            contentHtml: rawHtml,
            points: ['الأهداف التعليمية الأساسية', 'المفاهيم المحورية للدرس'],
            fontFamily: 'Cairo',
            align: 'right',
          },
        ];
      }
      const schoolName = settings?.institution === 'furqan'
        ? 'مدارس الفرقان العالمية'
        : 'أكاديمية سهلة الدولية';
      await exportGammaSlidesToPptx(slides, 'navy', currentTitle || 'عرض_تقديمي', schoolName);
    } catch (err) {
      console.error('PPTX Export Error:', err);
    }
  }

  async function handleSave() {
    const html = editorRef.current?.innerHTML || '';
    const settings: LessonSettings = getLessonSettings();
    const lesson: SavedLesson = {
      id: lessonId,
      title: currentTitle || outputLabels[outputType],
      outputType,
      settings,
      contentHtml: html,
      createdAt: editingLesson?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isPublic: editingLesson?.isPublic || false,
    };
    saveLesson(lesson);
    setSaved(true);

    if (user) {
      setCloudSaving(true);
      const res = await saveCloudResource(lesson, user, lesson.isPublic);
      setCloudSaving(false);
      if (res.success) {
        setCloudSyncMsg(isAr ? 'تم الحفظ سحابياً بنجاح! ☁️' : 'Saved to Cloud! ☁️');
      }
    }

    setTimeout(() => {
      setSaved(false);
      setCloudSyncMsg(null);
    }, 2500);
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 animate-fade-in">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between mb-4 no-print">
        <button onClick={onBack} className="btn-ghost">
          <BackIcon className="w-4 h-4" />
          {s.back}
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-900 rounded-lg text-sm font-bold border border-blue-200">
            {outputLabels[outputType]}
          </span>
        </div>
      </div>

      {/* حقل العنوان */}
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        className={`w-full text-2xl font-bold text-gray-800 bg-transparent border-none focus:outline-none mb-4 no-print ${
          activeDir === 'rtl' ? 'text-right' : 'text-left'
        }`}
        placeholder={s.titlePlaceholder}
      />

      {/* شريط أدوات Word المتكامل */}
      <div className="card p-2 mb-4 flex flex-wrap items-center gap-1.5 no-print bg-white border border-gray-200 shadow-xs">
        {/* التراجع والتقدم */}
        <button
          onClick={() => exec('undo')}
          title={s.tbUndo}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('redo')}
          title={s.tbRedo}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* اختيار الخط الموسع */}
        <select
          value={activeFont}
          onChange={(e) => handleFontChange(e.target.value)}
          title={isAr ? 'نوع الخط' : 'Font Family'}
          className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-lg bg-gray-50 hover:bg-white focus:outline-none focus:border-primary-500 cursor-pointer max-w-[180px]"
        >
          {FONT_OPTIONS.map((f, i) => (
            <option key={i} value={f.value}>
              {f.name}
            </option>
          ))}
        </select>

        {/* اختيار حجم الخط بالأرقام */}
        <select
          value={activeFontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          title={isAr ? 'حجم الخط' : 'Font Size'}
          className="px-2 py-1 text-xs font-semibold border border-gray-300 rounded-lg bg-gray-50 hover:bg-white focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          {FONT_SIZES.map((s, i) => (
            <option key={i} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* تكبير / تصغير سريع لحجم الخط */}
        <button
          onClick={() => exec('fontSize', '4')}
          title={isAr ? 'تكبير الخط' : 'Increase Size'}
          className="px-2 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200"
        >
          A+
        </button>
        <button
          onClick={() => exec('fontSize', '2')}
          title={isAr ? 'تصغير الخط' : 'Decrease Size'}
          className="px-2 h-8 flex items-center justify-center rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200"
        >
          A-
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* الفقرات والعناوين */}
        <button
          onClick={() => exec('formatBlock', 'p')}
          title={s.tbPlain}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('formatBlock', 'h1')}
          title={s.tbH1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('formatBlock', 'h2')}
          title={s.tbH2}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('formatBlock', 'h3')}
          title={s.tbH3}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* التنسيق الأساسي: Bold, Italic, Underline */}
        <button
          onClick={() => exec('bold')}
          title={s.tbBold}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 font-bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('italic')}
          title={s.tbItalic}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('underline')}
          title={s.tbUnderline}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 underline"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* المحاذاة (Alignments) */}
        <button
          onClick={() => exec('justifyRight')}
          title={isAr ? 'محاذاة لليمين' : 'Align Right'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('justifyCenter')}
          title={isAr ? 'توسيط' : 'Align Center'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('justifyLeft')}
          title={isAr ? 'محاذاة لليسار' : 'Align Left'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('justifyFull')}
          title={isAr ? 'ضبط كشيدة (Justify)' : 'Justify'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* اتجاه النص الصريح (RTL / LTR) */}
        <button
          onClick={() => handleDirectionChange('rtl')}
          title={isAr ? 'اتجاه من اليمين لليسار (RTL)' : 'Right to Left'}
          className={`px-2 h-8 flex items-center justify-center rounded-lg text-xs font-semibold ${
            activeDir === 'rtl' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          RTL
        </button>
        <button
          onClick={() => handleDirectionChange('ltr')}
          title={isAr ? 'اتجاه من اليسار لليمين (LTR)' : 'Left to Right'}
          className={`px-2 h-8 flex items-center justify-center rounded-lg text-xs font-semibold ${
            activeDir === 'ltr' ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          LTR
        </button>

        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* القوائم والجداول والاقتباس */}
        <button
          onClick={() => exec('insertUnorderedList')}
          title={s.tbBulletList}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('insertOrderedList')}
          title={s.tbNumberedList}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => exec('formatBlock', 'blockquote')}
          title={s.tbQuote}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={insertTable}
          title={s.tbTable}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </div>

      {/* أزرار الإجراءات والتصدير */}
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button
          onClick={handleSave}
          disabled={cloudSaving}
          className="btn-primary flex items-center gap-1.5"
          title={user ? (isAr ? 'حفظ في مكتبتي السحابية' : 'Save to Cloud Library') : s.saveLibrary}
        >
          {cloudSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : user ? (
            <Cloud className="w-4 h-4 text-teal-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {cloudSyncMsg || (saved ? s.saved : user ? (isAr ? '💾 حفظ في مكتبتي السحابية' : '💾 Save to Cloud Library') : (isAr ? '💾 حفظ في مكتبتي' : '💾 Save to Library'))}
          </span>
        </button>
        <button onClick={handleCopy} className="btn-secondary">
          {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
          {copied ? s.copied : s.copy}
        </button>
        <button onClick={handlePrint} className="btn-secondary">
          <Printer className="w-4 h-4" />
          {s.print}
        </button>
        <button onClick={handleExportWord} disabled={exporting !== null} className="btn-primary">
          <FileType2 className="w-4 h-4" />
          {exporting === 'word' ? s.exportingWord : s.exportWord}
        </button>
        <button onClick={handleExportPDF} className="btn-accent">
          <FileText className="w-4 h-4" />
          {s.exportPDF}
        </button>

        {/* تصدير بوربوينت */}
        {(outputType === 'slides' || title?.includes('عرض') || currentTitle?.includes('عرض')) && (
          <button
            onClick={handleExportPPTX}
            className="btn-secondary text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
          >
            <Presentation className="w-4 h-4" />
            {isAr ? 'تصدير بوربوينت (.pptx)' : 'Export PowerPoint (.pptx)'}
          </button>
        )}

        {/* تصدير لمنصات LMS لجميع الاختبارات (القصيرة، والشاملة، والمعيارية ABT/IB/CEFR) */}
        {(outputType === 'qti-exam' ||
          outputType === 'quiz' ||
          outputType === 'standardized-test' ||
          title?.includes('اختبار') ||
          currentTitle?.includes('اختبار')) && (
          <div className="inline-flex items-center gap-1.5 p-1 bg-blue-50/80 rounded-xl border border-blue-200">
            <span className="text-xs font-bold text-blue-950 px-2 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-teal-600" />
              <span>{isAr ? '📦 حزمة الاختبار (QTI ZIP):' : 'QTI Packages:'}</span>
            </span>
            <button
              onClick={() => handleDownloadQtiZip('sahlah_cypher')}
              className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
              title="أكاديمية سهلة الدولية - QTI v1.2 ZIP"
            >
              <span>{isAr ? 'أكاديمية سهلة QTI v1.2 zip' : 'Sahlah QTI v1.2 ZIP'}</span>
            </button>
            <button
              onClick={() => handleDownloadQtiZip('furqan_canvas')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
              title="مدرسة الفرقان العالمية - QTI v2.1 ZIP"
            >
              <span>{isAr ? 'الفرقان العالمية QTI v2.1 zip' : 'Furqan QTI v2.1 ZIP'}</span>
            </button>
          </div>
        )}
      </div>

      {/* مساحة المحرر */}
      <div className="card overflow-hidden shadow-sm border border-slate-200">
        <div
          ref={editorRef}
          contentEditable
          dir={activeDir}
          className={`rte-content p-6 sm:p-8 min-h-[450px] focus:outline-none ${
            activeDir === 'rtl' ? 'text-right' : 'text-left'
          }`}
          style={{ fontFamily: activeFont }}
          data-placeholder={s.editorPlaceholder}
        />
      </div>
    </div>
  );
}
