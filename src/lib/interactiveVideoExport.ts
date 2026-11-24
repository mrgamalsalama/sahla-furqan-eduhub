import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { InteractiveVideoProject } from '@/types';
import { SAHLAH_LOGO, FURQAN_LOGO } from './logos';

/**
 * Format seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Export questions to standard Kahoot Excel format
 * Kahoot standard columns:
 * 1. Question (Max 120 chars)
 * 2. Answer 1 (Max 75 chars)
 * 3. Answer 2 (Max 75 chars)
 * 4. Answer 3 (Max 75 chars)
 * 5. Answer 4 (Max 75 chars)
 * 6. Time limit (sec) (e.g. 20, 30, 60)
 * 7. Correct answer(s) (1, 2, 3, or 4)
 */
export function exportToKahootExcel(project: InteractiveVideoProject): void {
  const headers = [
    'Question - max 120 characters',
    'Answer 1 - max 75 characters',
    'Answer 2 - max 75 characters',
    'Answer 3 - max 75 characters',
    'Answer 4 - max 75 characters',
    'Time limit (sec)',
    'Correct answer(s) - 1, 2, 3 or 4',
  ];

  const rows = project.questions.map((q) => {
    let opt1 = '';
    let opt2 = '';
    let opt3 = '';
    let opt4 = '';
    let correctIdx = 1;

    if (q.type === 'true_false') {
      opt1 = 'صح (True)';
      opt2 = 'خطأ (False)';
      correctIdx = q.correctAnswer.includes('صح') || q.correctAnswer.toLowerCase().includes('true') ? 1 : 2;
    } else if (q.options && q.options.length > 0) {
      opt1 = q.options[0] || '';
      opt2 = q.options[1] || '';
      opt3 = q.options[2] || '';
      opt4 = q.options[3] || '';

      const foundIdx = q.options.findIndex(
        (o) => o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
      );
      correctIdx = foundIdx >= 0 ? foundIdx + 1 : 1;
    } else {
      opt1 = q.correctAnswer || 'إجابة نموذجية';
      opt2 = 'خيار بديل';
      correctIdx = 1;
    }

    return [
      q.question.slice(0, 120),
      opt1.slice(0, 75),
      opt2.slice(0, 75),
      opt3.slice(0, 75),
      opt4.slice(0, 75),
      30, // 30 seconds default
      correctIdx,
    ];
  });

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 45 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kahoot Quiz');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safeName = (project.title || 'video_quiz').replace(/[/\\?%*:|"<>]/g, '_');
  saveAs(blob, `Kahoot_${safeName}.xlsx`);
}

/**
 * Export to Official Word (.docx) Worksheet
 */
export async function exportToDocxWorksheet(project: InteractiveVideoProject): Promise<void> {
  const docParagraphs: any[] = [
    new Paragraph({
      text: '﷽',
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: 'أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ & مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: `ورقة عمل تفاعلية مصاحبة للفيديو: ${project.title}`,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `المادة: ${project.subject} | الصف: ${project.grade} | رابط الفيديو: ${project.videoUrl}`, bold: true }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
    }),
  ];

  project.questions.forEach((q, idx) => {
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `السؤال ${idx + 1} [عند الدقيقة ${formatTime(q.timestamp)}] (${q.dokLevel || 'DOK 2'}):`,
            bold: true,
            color: '1E3A8A',
          }),
        ],
        spacing: { before: 200, after: 100 },
        alignment: AlignmentType.RIGHT,
      }),
      new Paragraph({
        children: [new TextRun({ text: q.question, bold: true, size: 24 })],
        spacing: { after: 150 },
        alignment: AlignmentType.RIGHT,
      })
    );

    if (q.type === 'mcq' && q.options && q.options.length > 0) {
      q.options.forEach((opt, optIdx) => {
        const letters = ['أ', 'ب', 'ج', 'د'];
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[  ]  ${letters[optIdx] || '-'}. ${opt}` }),
            ],
            spacing: { after: 80 },
            alignment: AlignmentType.RIGHT,
          })
        );
      });
    } else if (q.type === 'true_false') {
      docParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '[  ]  صَحِيحٌ (True)        [  ]  خَطَأٌ (False)' })],
          spacing: { after: 100 },
          alignment: AlignmentType.RIGHT,
        })
      );
    } else {
      docParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: 'إجابة الطالب: ____________________________________________________________________' })],
          spacing: { after: 150 },
          alignment: AlignmentType.RIGHT,
        })
      );
    }
  });

  // Answer Key Section at end
  docParagraphs.push(
    new Paragraph({
      text: '-------------------------------------------------------------------------------------------------',
      spacing: { before: 400, after: 200 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'مفتاح الإجابة والتغذية الراجعة للمعلم والطلاب (Answer Key):', bold: true, color: '059669' })],
      spacing: { after: 150 },
      alignment: AlignmentType.RIGHT,
    })
  );

  project.questions.forEach((q, idx) => {
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. الإجابة الصحيحة: `, bold: true }),
          new TextRun({ text: `${q.correctAnswer} — ` }),
          new TextRun({ text: q.explanation || 'تم التحقق من الفهم.', italics: true, color: '4B5563' }),
        ],
        spacing: { after: 80 },
        alignment: AlignmentType.RIGHT,
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const { Packer } = await import('docx');
  const buffer = await Packer.toBlob(doc);
  const safeName = (project.title || 'video_worksheet').replace(/[/\\?%*:|"<>]/g, '_');
  saveAs(buffer, `Worksheet_${safeName}.docx`);
}

/**
 * Print friendly HTML generation
 */
export function printVideoWorksheet(project: InteractiveVideoProject): void {
  const safeTitle = project.title || 'Interactive Video Quiz';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(project.videoUrl)}`;

  const questionsHtml = project.questions
    .map((q, idx) => {
      let optionsHtml = '';
      if (q.type === 'mcq' && q.options && q.options.length > 0) {
        const letters = ['أ', 'ب', 'ج', 'د'];
        optionsHtml = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            ${q.options
              .map(
                (opt, oIdx) => `
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #f8fafc; font-size: 13px;">
                <span style="display: inline-block; width: 18px; height: 18px; border: 1.5px solid #94a3b8; border-radius: 50%; vertical-align: middle; margin-inline-end: 6px;"></span>
                <strong>${letters[oIdx] || '-'}.</strong> ${opt}
              </div>
            `
              )
              .join('')}
          </div>
        `;
      } else if (q.type === 'true_false') {
        optionsHtml = `
          <div style="display: flex; gap: 24px; margin-top: 8px; font-size: 13px;">
            <label style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 16px; background: #f8fafc;">
              <span style="display: inline-block; width: 16px; height: 16px; border: 1.5px solid #94a3b8; border-radius: 50%; vertical-align: middle; margin-inline-end: 6px;"></span>
              صحيح (True)
            </label>
            <label style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 16px; background: #f8fafc;">
              <span style="display: inline-block; width: 16px; height: 16px; border: 1.5px solid #94a3b8; border-radius: 50%; vertical-align: middle; margin-inline-end: 6px;"></span>
              خطأ (False)
            </label>
          </div>
        `;
      } else {
        optionsHtml = `
          <div style="border-bottom: 1.5px dotted #94a3b8; height: 32px; margin-top: 12px;"></div>
          <div style="border-bottom: 1.5px dotted #94a3b8; height: 32px; margin-top: 8px;"></div>
        `;
      }

      return `
        <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px dashed #e2e8f0; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
              ⏱️ الدقيقة ${formatTime(q.timestamp)}
            </span>
            <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; font-size: 11px;">
              ${q.dokLevel || 'DOK 2'}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
            ${idx + 1}. ${q.question}
          </div>
          ${optionsHtml}
        </div>
      `;
    })
    .join('');

  const answerKeyHtml = project.questions
    .map(
      (q, idx) => `
      <div style="margin-bottom: 6px; font-size: 12px; color: #1e293b;">
        <strong>${idx + 1}.</strong> الإجابة: <span style="color: #047857; font-weight: 700;">${q.correctAnswer}</span>
        ${q.explanation ? `<span style="color: #64748b;"> — (${q.explanation})</span>` : ''}
      </div>
    `
    )
    .join('');

  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 12px; color: #0f172a; line-height: 1.5; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- Header Banner -->
  <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px;">
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">﷽</div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <img src="${FURQAN_LOGO}" style="height: 48px; max-width: 110px; object-fit: contain;" />
      <div>
        <h2 style="margin: 0; font-size: 18px; color: #1e3a8a;">أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ & مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ</h2>
        <div style="font-size: 13px; font-weight: 700; color: #475569; margin-top: 2px;">ورقة عمل الفيديو التفاعلي الذكي (Interactive Video Quiz)</div>
      </div>
      <img src="${SAHLAH_LOGO}" style="height: 38px; max-width: 140px; object-fit: contain;" />
    </div>
  </div>

  <!-- Meta & QR Box -->
  <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px;">
    <div>
      <div><strong>عنوان الفيديو:</strong> ${safeTitle}</div>
      <div style="margin-top: 4px;"><strong>المادة:</strong> ${project.subject} | <strong>الصف:</strong> ${project.grade}</div>
      <div style="margin-top: 4px;"><strong>اسم الطالب:</strong> ________________________  | <strong>الفصل:</strong> _________</div>
    </div>
    <div style="text-align: center;">
      <img src="${qrUrl}" alt="Scan to watch" style="width: 72px; height: 72px; border: 1px solid #e2e8f0; border-radius: 4px;" />
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">امسح لمشاهدة الفيديو</div>
    </div>
  </div>

  <!-- Questions List -->
  <div>
    ${questionsHtml}
  </div>

  <!-- Answer Key at bottom / separate page -->
  <div style="margin-top: 30px; border-top: 2px dashed #059669; padding-top: 14px; page-break-inside: avoid;">
    <div style="font-weight: 800; color: #047857; margin-bottom: 8px; font-size: 13px;">
      🔑 نموذج الإجابة المعتمد والتغذية الراجعة (Answer Key):
    </div>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;">
      ${answerKeyHtml}
    </div>
  </div>

</body>
</html>`;

  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const frameDoc = printIframe.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(fullHtml);
    frameDoc.close();

    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.warn('Print frame error:', e);
      }
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 3000);
    }, 400);
  }
}
