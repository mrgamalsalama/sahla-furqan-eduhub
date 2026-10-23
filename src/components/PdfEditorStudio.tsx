import { useState, useEffect, useRef } from 'react';
import {
  FileText, ArrowRight, ArrowLeft, Upload, Loader2,
  CheckCircle2, AlertCircle, Sparkles, Download,
  Printer, FileCode2, BookOpen, Layers,
  ChevronRight, ChevronLeft, RefreshCw, ZoomIn,
  ZoomOut, Columns, HelpCircle, Briefcase,
  Wand2
} from 'lucide-react';
import type { TeacherResource, View } from '@/types';
import { autoSaveUploadedResource } from '@/lib/storage';
import ResourcePickerModal from '@/components/ResourcePickerModal';
import type { UILang } from '@/lib/i18n';
import * as pdfjsLib from 'pdfjs-dist';
import {
  reconstructPdfPageText,
  unspaceAndFixArabic
} from '@/lib/pdfTextProcessor';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfEditorStudioProps {
  initialResource?: TeacherResource | null;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onOpenGeneratedPlan?: (sourceText: string) => void;
  uiLang: UILang;
}

type EditorMode = 'split' | 'continuous';

export default function PdfEditorStudio({
  initialResource,
  onBack,
  onNavigate,
  onOpenGeneratedPlan,
  uiLang,
}: PdfEditorStudioProps) {
  const isAr = uiLang === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // Document state
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    arrayBuffer: ArrayBuffer | null;
    numPages: number;
    rawText: string;
  } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Page range & chunking for huge books (e.g. 100+ pages)
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.2);

  // View & Edit mode:
  // 'split': Left side original PDF page canvas, Right side Word Rich Editor
  // 'continuous': Full Multi-Page connected Word document view
  const [editorMode, setEditorMode] = useState<EditorMode>('split');

  // Page contents cache: pageNumber -> { html: string, isOcr: boolean }
  const [pageContents, setPageContents] = useState<Record<number, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);

  // Combined continuous document HTML
  const [continuousHtml, setContinuousHtml] = useState<string>('');

  // AI Actions loading state
  const [aiActionLoading, setAiActionLoading] = useState(false);

  // Resource Picker Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  function notify(msg: string) {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  }

  // If initialResource passed from MyResourcesPage, load it automatically
  useEffect(() => {
    if (initialResource && initialResource.dataUrl) {
      loadFromDataUrl(initialResource.dataUrl, initialResource.name);
    }
  }, [initialResource]);

  // Load PDF from File input
  async function handleFileInput(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(isAr ? 'يرجى اختيار ملف PDF صالح.' : 'Please select a valid PDF file.');
      return;
    }
    setError(null);
    setLoadingDoc(true);

    try {
      const buffer = await file.arrayBuffer();
      await initPdfDocument(buffer, file.name);

      // Auto-save to teacher locker
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        autoSaveUploadedResource({
          id: String(Date.now()),
          name: file.name,
          type: 'pdf',
          dataUrl: reader.result as string,
          base64,
          mimeType: 'application/pdf',
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(isAr ? 'تعذر قراءة ملف الـ PDF. قد يكون الملف تالفاً أو محمياً بكلمة مرور.' : 'Failed to load PDF');
    } finally {
      setLoadingDoc(false);
    }
  }

  // Load PDF from dataUrl (e.g. from locker)
  async function loadFromDataUrl(dataUrl: string, fileName: string) {
    setLoadingDoc(true);
    setError(null);
    try {
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await initPdfDocument(bytes.buffer, fileName);
    } catch (err: any) {
      console.error(err);
      setError(isAr ? 'فشل فتح الكتاب من الحقيبة' : 'Failed to load PDF from locker');
    } finally {
      setLoadingDoc(false);
    }
  }

  // Initialize PDF.js document with CMap and standard fonts for flawless Arabic rendering
  async function initPdfDocument(buffer: ArrayBuffer, fileName: string) {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
      enableXfa: true,
    });
    const doc = await loadingTask.promise;
    setPdfDoc(doc);
    const total = doc.numPages;

    setCurrentFile({
      name: fileName,
      arrayBuffer: buffer,
      numPages: total,
      rawText: '',
    });

    setStartPage(1);
    // For large textbooks, default chunk is first 10 pages for superfast responsiveness
    setEndPage(Math.min(total, 10));
    setCurrentPage(1);
    setPageContents({});
    setContinuousHtml('');

    notify(
      isAr
        ? `تم فتح الكتاب بنجاح (${total} صفحة). تم تحديد أول ${Math.min(total, 10)} صفحات كبداية.`
        : `Loaded ${total} pages successfully.`
    );
  }

  // Render current canvas page with sharp high-DPI support
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let renderTask: any = null;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoomScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;

        // Auto extract text for this page if not yet cached
        if (!pageContents[currentPage]) {
          await extractTextForPage(page, currentPage);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Canvas render notice:', err);
        }
      }
    }

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomScale]);

  // Extract text from page (Digital text + Smart BiDi repair + OCR fallback)
  async function extractTextForPage(page: any, pageNum: number) {
    try {
      const textContent = await page.getTextContent();
      const { html, rawText, isDistorted, isTable } = reconstructPdfPageText(textContent);

      if (rawText.length > 25) {
        // Set the reconstructed and un-reversed text immediately
        const formattedHtml = `<h3>صفحة ${pageNum}</h3>\n${html}`;
        setPageContents((prev) => ({ ...prev, [pageNum]: formattedHtml }));

        // If severe Arabic distortion or complex table detected (like student assessment report card)
        if (isDistorted || isTable) {
          notify(
            isAr
              ? 'تم رصد كشف درجات/حروف معكوسة، جاري التدقيق البصري الذكي...'
              : 'Auto-refining tables and bidirectional text with AI...'
          );
          // Automatically trigger high-fidelity AI OCR for flawless presentation
          await runAiOcrForCurrentPage(pageNum);
        }
      } else {
        // Scanned page: Trigger OCR extraction via canvas
        await runAiOcrForCurrentPage(pageNum);
      }
    } catch (err) {
      console.warn('Text extraction fallback:', err);
    }
  }

  // Instant local repair for reversed / spaced Arabic letters
  function handleInstantUnreverse() {
    const currentHtml = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    if (!currentHtml) return;
    const fixed = unspaceAndFixArabic(currentHtml);
    if (editorMode === 'continuous') {
      setContinuousHtml(fixed);
    } else {
      setPageContents((prev) => ({ ...prev, [currentPage]: fixed }));
    }
    if (editorAreaRef.current) {
      editorAreaRef.current.innerHTML = fixed;
    }
    notify(isAr ? 'تم تصحيح الحروف والكلمات المعكوسة فورياً!' : 'Fixed reversed Arabic text!');
  }

  // Run AI OCR on page canvas for scanned textbooks or complex tables
  async function runAiOcrForCurrentPage(targetPageNum?: number) {
    const pageNum = targetPageNum || currentPage;
    if (!canvasRef.current) return;

    setOcrLoading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
      const res = await fetch('/api/pdf-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: dataUrl,
          pageNumber: pageNum,
        }),
      });

      if (!res.ok) {
        // If 404 (e.g. running on Vercel before redeploying newly committed api/pdf-ocr.ts)
        if (res.status === 404) {
          console.warn('[PDF-OCR] /api/pdf-ocr returned 404. Falling back to high-fidelity local text & table reconstruction.');
          const existing = pageContents[pageNum] || '';
          if (existing) {
            const fixed = unspaceAndFixArabic(existing);
            setPageContents((prev) => ({ ...prev, [pageNum]: fixed }));
            if (editorAreaRef.current && currentPage === pageNum) {
              editorAreaRef.current.innerHTML = fixed;
            }
            notify(
              isAr
                ? 'تم استخراج وتصحيح النص والجداول محلياً بنجاح! 💡 (لتفعيل التدقيق البصري السحابي، يرجى إعادة النشر على Vercel)'
                : 'Text and tables repaired locally! (Redeploy to Vercel for Cloud AI OCR)'
            );
            return;
          }
          notify(
            isAr
              ? 'تنبيه: مسار /api/pdf-ocr يتطلب إعادة نشر المشروع على Vercel لتفعيله سحابياً.'
              : 'Notice: /api/pdf-ocr requires Vercel redeployment.'
          );
          return;
        }

        throw new Error(isAr ? 'فشل استخراج النص بالذكاء الاصطناعي' : 'AI OCR request failed');
      }

      const data = await res.json();
      const html = data.html || `<p>${data.rawText || ''}</p>`;
      setPageContents((prev) => ({
        ...prev,
        [pageNum]: `<h3>صفحة ${pageNum} (نص مدقق)</h3>\n${html}`,
      }));
      if (editorAreaRef.current && currentPage === pageNum) {
        editorAreaRef.current.innerHTML = `<h3>صفحة ${pageNum} (نص مدقق)</h3>\n${html}`;
      }
      notify(isAr ? `تم تدقيق واستخراج نصوص الصفحة ${pageNum} بنجاح!` : `Extracted text for page ${pageNum}!`);
    } catch (err: any) {
      console.warn('AI OCR fallback notice:', err);
      // Graceful local fallback: Never crash the user UI
      const existing = pageContents[pageNum] || '';
      if (existing) {
        const fixed = unspaceAndFixArabic(existing);
        setPageContents((prev) => ({ ...prev, [pageNum]: fixed }));
        if (editorAreaRef.current && currentPage === pageNum) {
          editorAreaRef.current.innerHTML = fixed;
        }
        notify(isAr ? 'تم تطبيق المعالجة الذاتية المحلية للنصوص والجداول بنجاح!' : 'Applied local text & table repair!');
      } else {
        setError(isAr ? 'تعذر التعرف الضوئي التلقائي، يمكنك استخدام المحرر مباشرة.' : 'OCR failed. You can use the editor directly.');
      }
    } finally {
      setOcrLoading(false);
    }
  }

  // Update current page HTML in cache
  function handlePageHtmlChange(html: string) {
    setPageContents((prev) => ({ ...prev, [currentPage]: html }));
  }

  // Build continuous multi-page HTML from the selected range
  async function handleSwitchToContinuousMode() {
    setEditorMode('continuous');
    let merged = '';

    for (let p = startPage; p <= endPage; p++) {
      let content = pageContents[p];
      if (!content && pdfDoc) {
        try {
          const page = await pdfDoc.getPage(p);
          const textContent = await page.getTextContent();
          const { html, rawText } = reconstructPdfPageText(textContent);
          content = rawText ? html : `<p>[صفحة مصورة ${p}]</p>`;
        } catch {
          content = `<p>[صفحة ${p}]</p>`;
        }
      }
      merged += `<div class="doc-page-break" style="margin-bottom:30px; padding-bottom:20px; border-bottom:2px dashed #cbd5e1;">
  <div style="font-size:11px; font-weight:bold; color:#64748b; margin-bottom:8px;">— صفحة ${p} —</div>
  ${content || `<p>محتوى صفحة ${p}</p>`}
</div>\n`;
    }

    setContinuousHtml(merged);
    notify(isAr ? `تم تحويل الصفحات (${startPage} إلى ${endPage}) إلى مستند متصل!` : 'Continuous view ready!');
  }

  // Apply rich text formatting command to contenteditable
  function formatText(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    if (editorMode === 'split' && editorAreaRef.current) {
      handlePageHtmlChange(editorAreaRef.current.innerHTML);
    } else if (editorMode === 'continuous' && editorAreaRef.current) {
      setContinuousHtml(editorAreaRef.current.innerHTML);
    }
  }

  // AI Actions
  async function handleAiConvertToLesson() {
    const textToUse = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    const cleanText = textToUse.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      setError(isAr ? 'لا يوجد نص كافٍ في الصفحة للتحويل إلى درس.' : 'Not enough text content.');
      return;
    }

    if (onOpenGeneratedPlan) {
      onOpenGeneratedPlan(cleanText);
    } else {
      // Save text to localStorage and navigate to lesson-plan
      localStorage.setItem('eduhub_pending_source_text', cleanText);
      onNavigate('lesson-plan');
    }
  }

  async function handleAiConvertToWorksheet() {
    const textToUse = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    const cleanText = textToUse.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    localStorage.setItem('eduhub_pending_source_text', cleanText);
    onNavigate('worksheet');
  }

  async function handleAiConvertToQuiz() {
    const textToUse = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    const cleanText = textToUse.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    localStorage.setItem('eduhub_pending_source_text', cleanText);
    onNavigate('quiz-exam');
  }

  // Export as Word (.docx / rich html formatted)
  function handleExportWord() {
    const content = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    const fullDoc = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${currentFile?.name || 'مستند وورد'}</title>
<style>
  body { font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif; font-size: 13pt; line-height: 1.6; direction: rtl; text-align: right; }
  h1, h2, h3 { color: #1e3a8a; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
  th { background-color: #f1f5f9; font-weight: bold; }
</style>
</head>
<body dir="rtl">
${content}
</body>
</html>`;

    const blob = new Blob([fullDoc], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentFile?.name || 'document').replace(/\.[^/.]+$/, '')}_معدل.doc`;
    a.click();
    URL.revokeObjectURL(url);
    notify(isAr ? 'تم تصدير ملف Word بنجاح!' : 'Exported Word document!');
  }

  // Print as PDF
  function handlePrintPdf() {
    const content = editorMode === 'continuous' ? continuousHtml : (pageContents[currentPage] || '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>${currentFile?.name || 'مستند PDF'}</title>
          <style>
            body { font-family: 'Cairo', 'Segoe UI', sans-serif; padding: 24px; direction: rtl; text-align: right; }
            h1, h2, h3 { color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700 transition font-medium"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? 'العودة' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('resources')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <Briefcase className="w-3.5 h-3.5 text-slate-600" />
            <span>{isAr ? 'حقيبتي ومصادري' : 'My Locker'}</span>
          </button>

          <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
            {isAr ? '✨ محرر كتب ووثائق PDF الداعم للعربية' : 'Smart Arabic PDF Studio'}
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isAr ? 'محرر ومحول ملفات وكتب الـ PDF التفاعلي' : 'Interactive Arabic PDF & Book Studio'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'تعامل مع الكتب المدرسية الضخمة وملفات الـ PDF العربية كأنك داخل Microsoft Word. استخرج النصوص بدقة، عدّل بحرية تامة دون تشوه الحروف، وحوّل صفحات الكتاب بضغطة زر إلى خطة درس أو ورقة عمل.'
                  : 'Edit and transform massive Arabic textbooks and PDFs as seamless Word documents with zero Arabic font distortion.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handleFileInput(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingDoc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{loadingDoc ? (isAr ? 'جاري فتح الملف...' : 'Loading...') : (isAr ? 'رفع كتاب PDF' : 'Upload PDF')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition active:scale-95"
            >
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? 'اختيار من حقيبتي' : 'Pick from Locker'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-bold">{successNotice}</p>
        </div>
      )}

      {/* Main Studio Area */}
      {!currentFile ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isAr ? 'افتح كتاب المنهج أو أي ملف PDF لبدء التعديل والتحويل' : 'Open any PDF to start editing'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {isAr
                ? 'يدعم النظام الكتب المدرسية الكبيرة حتى 200+ صفحة مع محدد نطاق الصفحات لتصفح وتحرير فائق السرعة.'
                : 'Supports massive textbooks up to 200+ pages with rapid page range selection.'}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Upload className="w-4 h-4" />
              <span>{isAr ? 'رفع ملف PDF من جهازي' : 'Upload PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition"
            >
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? 'اختيار من حقيبتي السحابية' : 'Pick from Locker'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Control Bar: Page Range, View Switcher & AI Actions */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            {/* Book metadata & Range Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold text-slate-900 truncate max-w-xs" title={currentFile.name}>
                📖 {currentFile.name}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                {currentFile.numPages} {isAr ? 'صفحة' : 'pages'}
              </span>

              {/* Range Selector for large books */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold px-1">{isAr ? 'نطاق العمل:' : 'Range:'}</span>
                <input
                  type="number"
                  min="1"
                  max={currentFile.numPages}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, Number(e.target.value)))}
                  className="w-12 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-center font-bold text-slate-800"
                />
                <span className="text-slate-400">إلى</span>
                <input
                  type="number"
                  min={startPage}
                  max={currentFile.numPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Math.min(currentFile.numPages, Number(e.target.value)))}
                  className="w-12 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-center font-bold text-slate-800"
                />
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditorMode('split')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    editorMode === 'split' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAr ? 'معاينة مقارنة (PDF + Word)' : 'Split View'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToContinuousMode}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    editorMode === 'continuous' ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? 'مستند Word متصل (كامل الصفحات)' : 'Continuous Word'}</span>
                </button>
              </div>

              {/* Export Buttons */}
              <button
                type="button"
                onClick={handleExportWord}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition shadow-2xs"
                title={isAr ? 'تصدير كملف Word (.doc)' : 'Export Word'}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير Word' : 'Export Word'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
                title={isAr ? 'طباعة / حفظ PDF' : 'Print PDF'}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة PDF' : 'Print'}</span>
              </button>
            </div>
          </div>

          {/* AI Pedagogical Superpowers Bar */}
          <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span className="text-xs font-extrabold text-slate-800">
                {isAr ? 'إجراءات الذكاء الاصطناعي الذكية على محتوى الكتاب:' : 'AI Superpowers on Book Content:'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAiConvertToLesson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'تحويل لخطة درس رسمية' : 'To Lesson Plan'}</span>
              </button>

              <button
                type="button"
                onClick={handleAiConvertToWorksheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 text-xs font-bold transition shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>{isAr ? 'إنشاء ورقة عمل تفاعلية' : 'To Worksheet'}</span>
              </button>

              <button
                type="button"
                onClick={handleAiConvertToQuiz}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 text-xs font-bold transition shadow-2xs"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isAr ? 'توليد بنك أسئلة واختبار' : 'To Quiz'}</span>
              </button>

              <button
                type="button"
                onClick={() => runAiOcrForCurrentPage()}
                disabled={ocrLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-2xs disabled:opacity-50"
                title={isAr ? 'إعادة استخراج وتدقيق النص العربي بالذكاء الاصطناعي' : 'Re-extract with AI OCR'}
              >
                {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
                <span>{isAr ? 'تدقيق عربي OCR' : 'AI OCR'}</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Split View (PDF Page Canvas + Word Rich Editor) */}
          {editorMode === 'split' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Original PDF Page Canvas Preview */}
              <div className="bg-slate-900/95 rounded-3xl p-4 shadow-lg text-white flex flex-col justify-between space-y-3 min-h-[650px]">
                {/* Canvas Navigation Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition"
                      title={isAr ? 'الصفحة السابقة' : 'Previous page'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-bold px-2 text-slate-300">
                      {isAr ? `صفحة ${currentPage} من ${currentFile.numPages}` : `Page ${currentPage} of ${currentFile.numPages}`}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage >= currentFile.numPages}
                      onClick={() => setCurrentPage((p) => Math.min(currentFile.numPages, p + 1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition"
                      title={isAr ? 'الصفحة التالية' : 'Next page'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => Math.max(0.7, z - 0.2))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title={isAr ? 'تصغير' : 'Zoom out'}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono px-1 text-slate-400">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.2))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title={isAr ? 'تكبير' : 'Zoom in'}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas Render Area */}
                <div className="overflow-auto max-h-[600px] flex items-center justify-center p-2 bg-slate-950 rounded-2xl border border-slate-800">
                  <canvas ref={canvasRef} className="shadow-2xl rounded-sm max-w-full h-auto bg-white" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>{isAr ? 'معاينة الصفحة الأصلية للكتاب' : 'Original Book Page View'}</span>
                  {ocrLoading && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isAr ? 'جاري التدقيق البصري...' : 'Running OCR...'}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Microsoft Word Rich Editor */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md flex flex-col justify-between space-y-3 min-h-[650px]">
                {/* Word Toolbar */}
                <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-1.5 text-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => formatText('bold')}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-2xs font-bold w-7 h-7 flex items-center justify-center transition"
                    title={isAr ? 'عريض (Ctrl+B)' : 'Bold'}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('italic')}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-2xs italic w-7 h-7 flex items-center justify-center transition"
                    title={isAr ? 'مائل (Ctrl+I)' : 'Italic'}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('underline')}
                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-2xs underline w-7 h-7 flex items-center justify-center transition"
                    title={isAr ? 'تسطير' : 'Underline'}
                  >
                    U
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => formatText('formatBlock', '<h2>')}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs font-extrabold text-[11px] transition"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('formatBlock', '<h3>')}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs font-bold text-[11px] transition"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('formatBlock', '<p>')}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs text-[11px] transition"
                  >
                    نص عادي
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => formatText('insertUnorderedList')}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs text-[11px] transition"
                  >
                    • قائمة
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('insertOrderedList')}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs text-[11px] transition"
                  >
                    1. ترقيم
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      const tableHtml = `<table border="1" style="width:100%; border-collapse:collapse; margin:8px 0;"><thead><tr style="background:#f1f5f9;"><th>العنصر</th><th>الوصف والتفاصيل</th></tr></thead><tbody><tr><td>عنصر 1</td><td>تفاصيل 1</td></tr></tbody></table><p></p>`;
                      document.execCommand('insertHTML', false, tableHtml);
                    }}
                    className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs text-[11px] text-indigo-700 font-bold transition"
                  >
                    + جدول
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={handleInstantUnreverse}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px] transition shadow-2xs flex items-center gap-1"
                    title={isAr ? 'تصحيح ترتيب الحروف العربية المعكوسة أو المقطعة فورياً' : 'Fix reversed Arabic characters'}
                  >
                    <span>🔄 {isAr ? 'عكس الحروف فورياً' : 'Unreverse'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => runAiOcrForCurrentPage()}
                    disabled={ocrLoading}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center gap-1 disabled:opacity-50"
                    title={isAr ? 'استخراج الجداول والنصوص بدقة تامة بالذكاء الاصطناعي' : 'Extract table with AI'}
                  >
                    {ocrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                    <span>{ocrLoading ? (isAr ? 'جاري التدقيق...' : 'OCR...') : (isAr ? '🪄 تدقيق بصري ذكي للجدول' : 'AI Table OCR')}</span>
                  </button>
                </div>

                {/* Smart Notice Bar for Bilingual Reports */}
                <div className="px-3 py-2 bg-gradient-to-r from-amber-50/80 via-blue-50/70 to-indigo-50/80 rounded-xl border border-amber-200/70 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-sm">💡</span>
                    <span className="text-slate-700 text-[11px] leading-tight font-medium">
                      {isAr
                        ? 'إذا كان المستند كشف درجات أو تقريراً مدرسي يحتوي على جداول، اضغط "تدقيق بصري ذكي للجدول" لضبط الأعمدة والحروف العربية الفصحى 100% دون أي انعكاس.'
                        : 'For grade reports or assessment cards, click "AI Table OCR" to format clean tables with zero font distortion.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => runAiOcrForCurrentPage()}
                    disabled={ocrLoading}
                    className="shrink-0 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    {isAr ? 'بدء التدقيق الآن ←' : 'Start now →'}
                  </button>
                </div>

                {/* Editable Area */}
                <div
                  ref={editorAreaRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handlePageHtmlChange(e.currentTarget.innerHTML)}
                  className="flex-1 overflow-y-auto p-5 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-sm text-slate-800 leading-relaxed text-right min-h-[480px] shadow-inner"
                  dir="rtl"
                  dangerouslySetInnerHTML={{
                    __html: pageContents[currentPage] || `<p>جاري استخراج نصوص الصفحة ${currentPage}...</p>`,
                  }}
                />

                {/* Bottom Footer Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAr ? 'محرر Word مباشر يدعم العربية الكاملة والتشكيل' : 'Rich Word editor with full Arabic support'}
                  </span>
                  <span>{isAr ? 'التعديلات تحفظ محلياً وفورياً' : 'Saved locally'}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Continuous Multi-Page Connected Word Document View */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isAr ? 'مستند Word التفاعلي المتصل لكامل الصفحات' : 'Continuous Multi-Page Word Document'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? `تم دمج الصفحات من ${startPage} إلى ${endPage} في ملف واحد متصل قابل للكتابة والتنسيق كبرنامج Microsoft Word.`
                      : `Merged pages ${startPage} through ${endPage} into a continuous editable document.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تصدير المستند كـ Word (.doc)' : 'Export Word'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('split')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    {isAr ? 'العودة للمعاينة المقارنة ←' : 'Back to Split View'}
                  </button>
                </div>
              </div>

              {/* Continuous Editable Container */}
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setContinuousHtml(e.currentTarget.innerHTML)}
                className="p-8 sm:p-12 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-sm text-slate-800 leading-relaxed text-right min-h-[700px] shadow-sm max-w-4xl mx-auto"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: continuousHtml }}
              />
            </div>
          )}
        </div>
      )}

      {/* Locker Picker Modal */}
      <ResourcePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        filterType="pdf"
        onSelect={(file) => {
          if (file.dataUrl) {
            loadFromDataUrl(file.dataUrl, file.name);
          }
        }}
        uiLang={uiLang}
      />
    </div>
  );
}
