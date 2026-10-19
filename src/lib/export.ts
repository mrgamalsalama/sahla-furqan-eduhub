import { saveAs } from 'file-saver';
import type { UILang } from '@/lib/i18n';
import { SAHLAH_LOGO, FURQAN_LOGO } from './logos';

interface ExportOptions {
  title: string;
  htmlContent: string;
  fileName: string;
  settings?: {
    teacherName?: string;
    subject?: string;
    grade?: string;
    duration?: string;
    term?: string;
  };
}

export function buildOfficialHeaderBanner(
  settings?: {
    teacherName?: string;
    subject?: string;
    grade?: string;
    term?: string;
  },
  isAr: boolean = true
): string {
  const teacher = settings?.teacherName || '—';
  const subject = settings?.subject || '—';
  const grade = settings?.grade || '—';
  const today = isAr
    ? new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';

  return `
  <div class="official-school-header" dir="${dir}" style="margin-bottom: 20px; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; font-family: 'Cairo', 'Tajawal', sans-serif;">
    <div style="text-align: center; font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'Cairo', serif; font-size: 1.3rem; font-weight: bold; color: #0f172a; margin-bottom: 8px; letter-spacing: 2px;">
      ﷽
    </div>
    <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 10px;">
      <tr>
        <td style="width: 25%; text-align: ${isAr ? 'right' : 'left'}; vertical-align: middle; border: none; padding: 0;">
          <img src="${FURQAN_LOGO}" alt="Al-Furqan School" style="height: 60px; max-width: 120px; object-fit: contain;" />
        </td>
        <td style="width: 50%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <h2 style="font-size: 1.25rem; font-weight: 800; color: #1e3a8a; margin: 0 0 2px 0;">أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ &amp; مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ</h2>
          <p style="font-size: 0.8rem; color: #475569; margin: 0 0 4px 0; font-weight: 600;">Sahlah Academy &amp; Al-Furqan International School</p>
          <div style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">
            ${isAr ? 'المنصة التعليمية المعتمدة - إديوهب (EduHub)' : 'Accredited Educational Platform - EduHub'}
          </div>
        </td>
        <td style="width: 25%; text-align: ${isAr ? 'left' : 'right'}; vertical-align: middle; border: none; padding: 0;">
          <img src="${SAHLAH_LOGO}" alt="Sahlah Academy" style="height: 38px; max-width: 150px; object-fit: contain;" />
        </td>
      </tr>
    </table>

    <table style="width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; font-size: 0.85rem; text-align: ${textAlign}; background-color: #f8fafc;">
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; width: 25%;"><strong>${isAr ? 'المعلم:' : 'Teacher:'}</strong> ${teacher}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; width: 25%;"><strong>${isAr ? 'المادة:' : 'Subject:'}</strong> ${subject}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; width: 25%;"><strong>${isAr ? 'الصف:' : 'Grade:'}</strong> ${grade}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; width: 25%;"><strong>${isAr ? 'التاريخ:' : 'Date:'}</strong> ${today}</td>
      </tr>
    </table>
  </div>
  `;
}

function buildPrintCSS(isAr: boolean): string {
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';
  const listPadding = isAr ? 'padding-right: 1.5rem;' : 'padding-left: 1.5rem;';
  const blockquoteBorder = isAr
    ? 'border-right: 4px solid #1e3a8a;'
    : 'border-left: 4px solid #1e3a8a;';

  return `
    @page { 
      size: A4 portrait; 
      margin: 0.5in; 
    }
    * { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
      direction: ${dir};
      margin: 0;
      padding: 0;
      color: #0f172a;
      line-height: 1.8;
      font-size: 11pt;
    }
    .no-print, .btn, button, nav, header, footer {
      display: none !important;
    }
    h1 {
      font-size: 1.6rem;
      font-weight: 800;
      text-align: center;
      margin: 0 0 1rem;
      color: #1e3a8a;
    }
    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: #1e40af;
    }
    h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0.8rem 0 0.4rem;
      color: #1d4ed8;
    }
    p { margin: 0.4rem 0; }
    ul { list-style: disc; ${listPadding} margin: 0.5rem 0; }
    ol { list-style: decimal; ${listPadding} margin: 0.5rem 0; }
    li { margin: 0.25rem 0; }
    table {
      width: 100%;
      border: 1px solid #475569;
      border-collapse: collapse;
      margin: 1rem 0;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #475569;
      border-collapse: collapse;
      padding: 6px 10px;
      text-align: ${textAlign};
      font-size: 10pt;
    }
    th {
      background: #e2e8f0;
      font-weight: 700;
      color: #0f172a;
    }
    .sahlah-lesson-plan table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 20px !important;
      border: 1px solid #94a3b8 !important;
    }
    .sahlah-lesson-plan th,
    .sahlah-lesson-plan td {
      border: 1px solid #94a3b8 !important;
      padding: 7px 10px !important;
      font-size: 9.5pt !important;
      line-height: 1.5 !important;
    }
    .sahlah-lesson-header {
      margin-bottom: 16px !important;
      padding-bottom: 10px !important;
      border-bottom: 2px solid #e2e8f0 !important;
      text-align: center !important;
    }
    strong { font-weight: 700; }
    blockquote {
      ${blockquoteBorder}
      padding: 0.5rem 1rem;
      margin: 0.75rem 0;
      background: #f0f9ff !important;
      border-radius: 0.35rem;
    }
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
      height: 0;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
      visibility: hidden;
    }
  `;
}

// ── Print / PDF ──
export function printContent(
  title: string,
  htmlContent: string,
  uiLang: UILang,
  settings?: { teacherName?: string; subject?: string; grade?: string; term?: string }
): void {
  const isAr = uiLang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const lang = isAr ? 'ar' : 'en';
  const css = buildPrintCSS(isAr);

  // Ensure official header banner is not duplicated if already present
  const isLessonPlan =
    htmlContent.includes('sahlah-lesson-header') ||
    htmlContent.includes('sahlah-lesson-plan') ||
    htmlContent.includes('خطة الدرس الأسبوعية');

  const hasExistingHeader =
    isLessonPlan ||
    htmlContent.includes('official-school-header') ||
    htmlContent.includes('FURQAN_LOGO');

  const banner = hasExistingHeader ? '' : buildOfficialHeaderBanner(settings, isAr);

  // Clean visible page-break text like "--- صفحة 2 ---"
  const sanitizedContent = htmlContent
    .replace(/<div class="page-break"[^>]*>[\s\S]*?<\/div>/gi, '<div class="page-break"></div>')
    .replace(/---\s*صَفْحَةُ?\s*\d+[^<]*---/gi, '')
    .replace(/---\s*Page\s*\d+[^<]*---/gi, '');

  const hasBasmala = htmlContent.includes('﷽') || banner.includes('﷽');
  const basmalaHeader = !hasBasmala
    ? `<div style="text-align: center; font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'Cairo', serif; font-size: 1.35rem; font-weight: bold; color: #0f172a; margin-bottom: 10px; letter-spacing: 2px;">﷽</div>`
    : '';

  const fullHtml = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  ${basmalaHeader}
  ${banner}
  ${isLessonPlan ? '' : `<h1>${escapeHtml(title)}</h1>`}
  ${sanitizedContent}
</body>
</html>`;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error', e);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Hidden iframe print error:', err);
  }

  const win = window.open('', '_blank', 'width=900,height=750');
  if (win) {
    win.document.open();
    win.document.write(fullHtml);
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
        // closed
      }
    }, 1000);
  }
}

// ── Word Export (HTML-based .doc with official school dual logos) ──
export function exportToWord(
  { title, htmlContent, fileName, settings }: ExportOptions,
  uiLang: UILang
): void {
  const isAr = uiLang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const textAlign = isAr ? 'right' : 'left';
  const listPadding = isAr ? 'padding-right: 20pt;' : 'padding-left: 20pt;';
  const blockquoteBorder = isAr
    ? 'border-right: 4px solid #1e3a8a;'
    : 'border-left: 4px solid #1e3a8a;';

  const isLessonPlan =
    htmlContent.includes('sahlah-lesson-header') ||
    htmlContent.includes('sahlah-lesson-plan') ||
    htmlContent.includes('خطة الدرس الأسبوعية');

  const hasExistingHeader =
    isLessonPlan ||
    htmlContent.includes('official-school-header') ||
    htmlContent.includes('FURQAN_LOGO');

  const banner = hasExistingHeader ? '' : buildOfficialHeaderBanner(settings, isAr);

  // Clean visible text from page breaks and convert to genuine Word page break
  const sanitizedContent = htmlContent
    .replace(
      /<div class="page-break"[^>]*>[\s\S]*?<\/div>/gi,
      '<br clear="all" style="mso-special-character:line-break;page-break-before:always;" />'
    )
    .replace(/---\s*صَفْحَةُ?\s*\d+[^<]*---/gi, '')
    .replace(/---\s*Page\s*\d+[^<]*---/gi, '');

  const styles = `
    body { font-family: 'Cairo', 'Traditional Arabic', 'Segoe UI', Tahoma, sans-serif; direction: ${dir}; font-size: 11pt; line-height: 1.6; color: #000; }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; color: #1e3a8a; margin: 0 0 10pt; }
    h2 { font-size: 14pt; font-weight: bold; color: #1e40af; margin: 10pt 0 4pt; }
    h3 { font-size: 12pt; font-weight: bold; color: #0f172a; margin: 8pt 0 4pt; }
    p { margin: 4pt 0; }
    ul { list-style: disc; ${listPadding} margin: 4pt 0; }
    ol { list-style: decimal; ${listPadding} margin: 4pt 0; }
    li { margin: 2pt 0; }
    table { width: 100%; border: 1px solid #94a3b8; border-collapse: collapse; margin: 10pt 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    tr { page-break-inside: avoid; }
    th { border: 1px solid #94a3b8; border-collapse: collapse; padding: 6pt 8pt; text-align: ${textAlign}; background: #1e293b; color: #ffffff; font-weight: bold; font-size: 10pt; }
    td { border: 1px solid #94a3b8; border-collapse: collapse; padding: 6pt 8pt; text-align: ${textAlign}; font-size: 10pt; }
    strong { font-weight: bold; }
    blockquote { ${blockquoteBorder} padding: 6pt 10pt; margin: 8pt 0; background: #f0f9ff; }
    .sahlah-lesson-header { text-align: center; margin-bottom: 16pt; }
  `;

  const hasBasmala = htmlContent.includes('﷽') || banner.includes('﷽');
  const basmalaHeader = !hasBasmala
    ? `<div style="text-align: center; font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'Cairo', serif; font-size: 14pt; font-weight: bold; color: #0f172a; margin-bottom: 8pt; letter-spacing: 2px;">﷽</div>`
    : '';

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
    @page { size: A4 portrait; margin: 0.5in; }
    ${styles}
  </style>
</head>
<body dir="${dir}">
  ${basmalaHeader}
  ${banner}
  ${isLessonPlan ? '' : `<h1>${escapeHtml(title)}</h1>`}
  ${sanitizedContent}
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  saveAs(blob, `${fileName}.doc`);
}

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
