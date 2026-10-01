import { saveAs } from 'file-saver';
import type { UILang } from '@/lib/i18n';

interface ExportOptions {
  title: string;
  htmlContent: string;
  fileName: string;
}

function absolutizeLogos(html: string): string {
  return html.replace(/src="\/assets\//g, `src="${window.location.origin}/assets/`);
}

function buildPrintCSS(isAr: boolean): string {
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';
  const listPadding = isAr ? 'padding-right: 1.5rem;' : 'padding-left: 1.5rem;';
  const blockquoteBorder = isAr
    ? 'border-right: 4px solid #3385fc;'
    : 'border-left: 4px solid #3385fc;';

  return `
    @page { size: A4 portrait; margin: 15mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Cairo', 'Tajawal', 'Segoe UI', sans-serif;
      direction: ${dir};
      margin: 0;
      padding: 0;
      color: #1a1a1a;
      line-height: 1.8;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      text-align: center;
      margin: 0 0 1rem;
      color: #1a3c8f;
    }
    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0.875rem 0 0.5rem;
      color: #1551e1;
    }
    h3 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0.75rem 0 0.5rem;
      color: #1843b6;
    }
    p { margin: 0.5rem 0; }
    ul { list-style: disc; ${listPadding} margin: 0.5rem 0; }
    ol { list-style: decimal; ${listPadding} margin: 0.5rem 0; }
    li { margin: 0.25rem 0; }
    table {
      width: 100%;
      border: 1px solid #000;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #000;
      border-collapse: collapse;
      padding: 0.5rem 0.75rem;
      text-align: ${textAlign};
      font-size: 0.95rem;
    }
    th {
      background: #e2e8f0;
      font-weight: 700;
    }
    tr:nth-child(even) { background: #f8fafc; }
    strong { font-weight: 700; }
    blockquote {
      ${blockquoteBorder}
      padding: 0.5rem 1rem;
      margin: 0.75rem 0;
      background: #eef7ff;
      border-radius: 0.5rem;
    }
  `;
}

// ── Print / PDF (via new window) ──

export function printContent(title: string, htmlContent: string, uiLang: UILang): void {
  const isAr = uiLang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const lang = isAr ? 'ar' : 'en';
  const css = buildPrintCSS(isAr);

  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) {
    alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة.' : 'Please allow pop-up windows to enable printing.');
    return;
  }

  const absHtml = absolutizeLogos(htmlContent);

  win.document.write(`<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${absHtml}
</body>
</html>`);
  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
  };

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* window may have been closed */
    }
  }, 1000);
}

// ── Word Export (HTML-based .doc) ──

export function exportToWord({ title, htmlContent, fileName }: ExportOptions, uiLang: UILang): void {
  const isAr = uiLang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';
  const listPadding = isAr ? 'padding-right: 24pt;' : 'padding-left: 24pt;';
  const blockquoteBorder = isAr
    ? 'border-right: 4px solid #3385fc;'
    : 'border-left: 4px solid #3385fc;';
  const absHtml = absolutizeLogos(htmlContent);

  const styles = `
    body { font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif; direction: ${dir}; font-size: 14pt; line-height: 1.8; }
    h1 { font-size: 22pt; font-weight: bold; text-align: center; color: #1a3c8f; margin: 0 0 12pt; }
    h2 { font-size: 18pt; font-weight: bold; color: #1551e1; margin: 10pt 0 6pt; }
    h3 { font-size: 16pt; font-weight: bold; color: #1843b6; margin: 8pt 0 6pt; }
    p { margin: 6pt 0; }
    ul { list-style: disc; ${listPadding} margin: 6pt 0; }
    ol { list-style: decimal; ${listPadding} margin: 6pt 0; }
    li { margin: 3pt 0; }
    table { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 12pt 0; }
    th { border: 1px solid #000; border-collapse: collapse; padding: 6pt 9pt; text-align: ${textAlign}; background: #e2e8f0; font-weight: bold; font-size: 12pt; }
    td { border: 1px solid #000; border-collapse: collapse; padding: 6pt 9pt; text-align: ${textAlign}; font-size: 12pt; }
    tr:nth-child(even) { background: #f8fafc; }
    strong { font-weight: bold; }
    blockquote { ${blockquoteBorder} padding: 6pt 12pt; margin: 9pt 0; background: #eef7ff; }
  `;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4 portrait; margin: 2cm; }
    ${styles}
  </style>
</head>
<body dir="${dir}">
  <h1>${escapeHtml(title)}</h1>
  ${absHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, `${fileName}.doc`);
}

// ── Copy to clipboard ──

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
