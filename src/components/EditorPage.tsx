import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Table as TableIcon,
  Printer, Copy, FileText, FileType2, Save, ArrowRight, ArrowLeft, Check,
  Type, Heading1, Heading2, Heading3, Quote, Undo, Redo,
} from 'lucide-react';
import type { OutputType, LessonSettings, SavedLesson } from '@/types';
import { OUTPUT_LABELS_AR, OUTPUT_LABELS_EN } from '@/types';
import { exportToWord, printContent, copyToClipboard } from '@/lib/export';
import { saveLesson, getLessonSettings, uid } from '@/lib/storage';
import type { UILang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface EditorPageProps {
  initialHtml: string;
  title: string;
  outputType: OutputType;
  onBack: () => void;
  editingLesson?: SavedLesson | null;
  uiLang: UILang;
}

export default function EditorPage({ initialHtml, title, outputType, onBack, editingLesson, uiLang }: EditorPageProps) {
  const s = t(uiLang);
  const isAr = uiLang === 'ar';
  const outputLabels = isAr ? OUTPUT_LABELS_AR : OUTPUT_LABELS_EN;

  const editorRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState<'word' | null>(null);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [lessonId] = useState(editingLesson?.id || uid());

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  function insertTable() {
    const headers = isAr
      ? '<thead><tr><th>العنوان 1</th><th>العنوان 2</th><th>العنوان 3</th></tr></thead>'
      : '<thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead>';
    const tableHtml = `<table border="1" style="width:100%; border-collapse: collapse;">${headers}<tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>`;
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
    printContent(currentTitle || outputLabels[outputType], html, uiLang);
  }

  function handleExportWord() {
    const html = editorRef.current?.innerHTML || '';
    exportToWord({
      title: currentTitle,
      htmlContent: html,
      fileName: currentTitle || outputLabels[outputType],
    }, uiLang);
  }

  function handleExportPDF() {
    const html = editorRef.current?.innerHTML || '';
    printContent(currentTitle || outputLabels[outputType], html, uiLang);
  }

  function handleSave() {
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
    };
    saveLesson(lesson);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const toolbarButtons: { cmd?: string; icon: typeof Bold; label: string; action?: () => void; value?: string }[] = [
    { icon: Undo, label: s.tbUndo, cmd: 'undo' },
    { icon: Redo, label: s.tbRedo, cmd: 'redo' },
    { icon: Type, label: s.tbPlain, cmd: 'formatBlock', value: 'p' },
    { icon: Heading1, label: s.tbH1, cmd: 'formatBlock', value: 'h1' },
    { icon: Heading2, label: s.tbH2, cmd: 'formatBlock', value: 'h2' },
    { icon: Heading3, label: s.tbH3, cmd: 'formatBlock', value: 'h3' },
    { icon: Bold, label: s.tbBold, cmd: 'bold' },
    { icon: Italic, label: s.tbItalic, cmd: 'italic' },
    { icon: Underline, label: s.tbUnderline, cmd: 'underline' },
    { icon: List, label: s.tbBulletList, cmd: 'insertUnorderedList' },
    { icon: ListOrdered, label: s.tbNumberedList, cmd: 'insertOrderedList' },
    { icon: Quote, label: s.tbQuote, cmd: 'formatBlock', value: 'blockquote' },
    { icon: TableIcon, label: s.tbTable, action: insertTable },
  ];

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 no-print">
        <button onClick={onBack} className="btn-ghost">
          <BackIcon className="w-4 h-4" />
          {s.back}
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-semibold">
            {outputLabels[outputType]}
          </span>
        </div>
      </div>

      {/* Title input */}
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        className={`w-full text-2xl font-bold text-gray-800 bg-transparent border-none focus:outline-none mb-4 no-print ${isAr ? 'text-right' : 'text-left'}`}
        placeholder={s.titlePlaceholder}
      />

      {/* Toolbar */}
      <div className="card p-2 mb-4 flex flex-wrap items-center gap-1 no-print">
        {toolbarButtons.map(({ cmd, icon: Icon, label, action, value }, i) => (
          <button
            key={i}
            onClick={() => (action ? action() : exec(cmd!, value))}
            title={label}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        <button onClick={handleSave} className="btn-secondary">
          {saved ? <Check className="w-4 h-4 text-success-500" /> : <Save className="w-4 h-4" />}
          {saved ? s.saved : s.saveLibrary}
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
      </div>

      {/* Editor */}
      <div className="card overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          dir={isAr ? 'rtl' : 'ltr'}
          className={`rte-content p-6 sm:p-8 min-h-[400px] focus:outline-none ${isAr ? 'text-right' : 'text-left'}`}
          style={{ fontFamily: 'Cairo, sans-serif' }}
          data-placeholder={s.editorPlaceholder}
        />
      </div>

    </div>
  );
}
