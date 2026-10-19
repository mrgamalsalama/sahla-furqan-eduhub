import type { WeeklyStatementDocument } from '@/types';
import { SAHLAH_LOGO } from './logos';
import { getDaysForGrade } from './academicCalendar';

export function generateWeeklyStatementHtml(docData: WeeklyStatementDocument): string {
  let tableRowsHtml = '';
  const daysList = getDaysForGrade(docData.grade);

  for (const dayItem of daysList) {
    const day = dayItem.dayNumber;
    const subjects = docData.days[day] || [];
    if (subjects.length === 0) continue;

    subjects.forEach((item, index) => {
      const isArabicSub = item.subjectId === 'arabic' || item.subjectId === 'islamic' || item.subjectId === 'quran';
      const subDir = isArabicSub ? 'rtl' : 'ltr';

      // Format Content/Topic
      const topicContent = item.contentTopic || (item.isNoSession ? (item.noSessionNote || 'No Session') : '');
      const formattedTopic = topicContent
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '<div style="height: 6px;"></div>';

          // Zoom link detection
          if (trimmed.startsWith('https://zoom.us') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return `<div style="margin: 4px 0;"><a href="${trimmed}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline; font-size: 0.82rem; word-break: break-all;">${trimmed}</a></div>`;
          }

          // Headers like Girls:, Boys:, اللغة العربية:, etc.
          if (
            trimmed.startsWith('Girls:') ||
            trimmed.startsWith('Boys:') ||
            trimmed.startsWith('Girls & Boys:') ||
            trimmed.startsWith('اللغة العربية') ||
            trimmed.startsWith('العربية لغير') ||
            trimmed.startsWith('للناطقين') ||
            trimmed.startsWith('Recorded')
          ) {
            return `<div style="font-weight: 700; color: #111827; margin-top: 4px; font-size: 0.88rem;">${trimmed}</div>`;
          }

          return `<div style="font-size: 0.86rem; color: #1f2937; line-height: 1.45;">${trimmed}</div>`;
        })
        .join('');

      // Format Homework
      const formattedHw = (item.homework || '')
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          if (trimmed === 'No HW') {
            return `<div style="font-weight: 600; color: #374151; font-size: 0.88rem;">No HW</div>`;
          }
          if (trimmed.startsWith('HW:') || trimmed.startsWith('H/W')) {
            return `<div style="font-weight: 700; color: #1e3a8a; font-size: 0.86rem;">${trimmed}</div>`;
          }
          return `<div style="font-size: 0.84rem; color: #374151;">${trimmed}</div>`;
        })
        .join('');

      // Format Optional/Enrichment
      const formattedOpt = (item.optionalEnrichment || '')
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';

          if (trimmed.includes('Project-Based Learning') || trimmed.includes('PBL')) {
            return `<div style="background-color: #fef08a; padding: 4px 6px; border-radius: 4px; font-weight: 800; font-size: 0.84rem; color: #854d0e; margin-bottom: 4px;">${trimmed}</div>`;
          }
          if (trimmed.includes('Optional Quiz')) {
            return `<div style="background-color: #fef08a; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 0.82rem; color: #854d0e; display: inline-block; margin-top: 2px;">${trimmed}</div>`;
          }
          if (trimmed.includes('Reading Booklet')) {
            return `<div style="color: #dc2626; font-weight: 700; font-size: 0.84rem;">${trimmed}</div>`;
          }
          return `<div style="font-size: 0.82rem; color: #374151; line-height: 1.4;">${trimmed}</div>`;
        })
        .join('');

      tableRowsHtml += `
        <tr style="page-break-inside: avoid;">
          ${
            index === 0
              ? `<td rowspan="${subjects.length}" style="border: 1px solid #222222; text-align: center; vertical-align: middle; font-weight: 700; font-size: 0.95rem; color: #136F84; background-color: #ffffff; padding: 8px 4px; width: 8%;">Day ${day}<div style="font-size: 0.75rem; color: #64748b; font-weight: 600; margin-top: 2px;">${dayItem.shortEn}</div></td>`
              : ''
          }
          <td style="border: 1px solid #222222; text-align: center; vertical-align: middle; font-weight: 600; font-size: 0.88rem; color: #111827; background-color: #ffffff; padding: 8px 6px; width: 14%;">
            ${item.subjectName}
          </td>
          <td style="border: 1px solid #222222; vertical-align: top; padding: 8px 10px; background-color: #ffffff; text-align: ${isArabicSub ? 'right' : 'left'}; direction: ${subDir}; width: 48%;">
            ${formattedTopic || '&nbsp;'}
          </td>
          <td style="border: 1px solid #222222; vertical-align: top; padding: 8px 8px; text-align: center; background-color: #ffffff; width: 15%;">
            ${formattedHw || '&nbsp;'}
          </td>
          <td style="border: 1px solid #222222; vertical-align: top; padding: 8px 8px; text-align: left; background-color: #ffffff; width: 15%;">
            ${formattedOpt || '&nbsp;'}
          </td>
        </tr>
      `;
    });
  }

  // Quiz Schedule Table HTML
  let quizTableHtml = '';
  if (docData.quizzes && docData.quizzes.length > 0) {
    const quizRowsHtml = docData.quizzes
      .map((quiz) => {
        const isArSub = /[\u0600-\u06FF]/.test(quiz.subject);
        const isArTop = /[\u0600-\u06FF]/.test(quiz.topics);

        return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #222222; text-align: center; vertical-align: middle; font-weight: 700; font-size: 0.9rem; padding: 8px; width: 20%; color: #111827;">
            ${quiz.date}
          </td>
          <td style="border: 1px solid #222222; text-align: center; vertical-align: middle; padding: 8px; width: 32%; direction: ${isArSub ? 'rtl' : 'ltr'};">
            <span style="background-color: #00e5ff; color: #004d40; font-weight: 700; font-size: 0.88rem; padding: 3px 10px; border-radius: 4px; display: inline-block;">
              ${quiz.subject}
            </span>
          </td>
          <td style="border: 1px solid #222222; vertical-align: middle; padding: 8px 12px; width: 48%; text-align: ${isArTop ? 'right' : 'left'}; direction: ${isArTop ? 'rtl' : 'ltr'};">
            <span style="background-color: #ffeb3b; font-weight: 700; font-size: 0.88rem; padding: 2px 6px; border-radius: 3px; display: inline-block; color: #111827;">
              ${quiz.topics}
            </span>
            ${quiz.materials ? `<div style="font-size: 0.8rem; color: #4b5563; margin-top: 3px;">${quiz.materials}</div>` : ''}
          </td>
        </tr>
      `;
      })
      .join('');

    quizTableHtml = `
      <div style="margin-top: 32px; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #222222;">
          <thead>
            <tr>
              <th colspan="3" style="background-color: #136F84; color: #ffffff; text-align: center; font-size: 1.05rem; font-weight: 800; padding: 10px; border: 1px solid #222222;">
                Weekly Quiz Schedule
              </th>
            </tr>
            <tr style="background-color: #136F84; color: #ffffff;">
              <th style="border: 1px solid #222222; padding: 8px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 20%;">Date</th>
              <th style="border: 1px solid #222222; padding: 8px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 32%;">Subject</th>
              <th style="border: 1px solid #222222; padding: 8px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 48%;">Topics/Lesson to be Covered/ Materials</th>
            </tr>
          </thead>
          <tbody>
            ${quizRowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div class="weekly-statement-document" style="font-family: 'Segoe UI', Arial, 'Cairo', Tahoma, sans-serif; max-width: 900px; margin: 0 auto; background-color: #ffffff; padding: 24px 32px; color: #111827;">
      
      <!-- Noble Basmala Header -->
      <div style="text-align: center; font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade New', 'Cairo', serif; font-size: 1.25rem; font-weight: bold; color: #1e293b; margin-bottom: 8px; letter-spacing: 2px;">
        ﷽
      </div>

      <!-- Sahlah Brand Header -->
      <div style="text-align: center; margin-bottom: 14px;">
        <img src="${SAHLAH_LOGO}" alt="Sahlah Academy" style="height: 38px; max-width: 190px; object-fit: contain; margin: 0 auto 10px auto; display: block;" />
      </div>

      <!-- Metadata Line -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.92rem; font-weight: 700; margin-bottom: 20px; padding: 0 4px; color: #111827;">
        <span>Date: ${docData.weekDateHeader}</span>
        <span>Term: ${docData.term}</span>
        <span style="color: #136F84; font-weight: 800; background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">Shift: ${docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}</span>
        <span>${docData.schoolYear}</span>
      </div>

      <!-- Salutation & Subtitle -->
      <div style="margin-bottom: 16px;">
        <p style="font-size: 0.95rem; font-weight: 700; margin: 0 0 4px 0; color: #111827;">Dear ${docData.grade} Parents,</p>
        <p style="font-size: 0.92rem; font-weight: 700; text-decoration: underline; margin: 0; color: #111827;">
          Please find below the academic projection for ${docData.grade} (${docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}) for the week of ${docData.weekRangeText}.
        </p>
      </div>

      <!-- Main Academic Projection Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #222222; margin-bottom: 10px;">
        <thead>
          <tr style="background-color: #136F84; color: #ffffff;">
            <th style="border: 1px solid #222222; padding: 9px 4px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 8%;">Day</th>
            <th style="border: 1px solid #222222; padding: 9px 6px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 14%;">Subject</th>
            <th style="border: 1px solid #222222; padding: 9px 10px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 48%;">Content/Topic</th>
            <th style="border: 1px solid #222222; padding: 9px 8px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 15%;">Homework</th>
            <th style="border: 1px solid #222222; padding: 9px 8px; font-size: 0.92rem; font-weight: 700; text-align: center; width: 15%;">Optional/<br/>Enrichment</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <!-- Weekly Quiz Schedule -->
      ${quizTableHtml}

      <!-- Weekly Educational & Moral Core Value -->
      ${docData.weeklyEducationalValue ? `
        <div style="margin-top: 24px; padding: 12px 18px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; text-align: center; page-break-inside: avoid;">
          <div style="font-weight: 800; color: #166534; font-size: 0.88rem; margin-bottom: 4px;">
            🌿 قِيمَةُ الْأُسْبُوعِ التَّرْبَوِيَّةِ / Weekly Educational Value
          </div>
          <div style="font-size: 0.96rem; font-weight: 700; color: #14532d; font-family: 'Amiri', 'Traditional Arabic', 'Cairo', serif; line-height: 1.6;">
            ${docData.weeklyEducationalValue}
          </div>
        </div>
      ` : ''}

      <!-- Print Styling -->
      <style>
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .weekly-statement-document {
            max-width: 100% !important;
            padding: 0 !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          a {
            text-decoration: underline !important;
            color: #0066cc !important;
          }
        }
      </style>
    </div>
  `;
}
