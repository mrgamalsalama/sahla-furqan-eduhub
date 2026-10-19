import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface KahootCard {
  id?: number;
  question: string;
  choices?: string[];
  correctAnswer?: string;
  explanation?: string;
  concept?: string;
  level?: string;
}

/**
 * Builds the official 8-row header and data rows matching Kahoot's official template (KahootQuizTemplate.xlsx)
 */
export function buildKahootAoa(cards: KahootCard[]): (string | number)[][] {
  // Rows 1 to 7: Official Kahoot instructions banner (7 columns)
  const aoa: (string | number)[][] = [
    ['Kahoot! quiz spreadsheet template'],
    ['Questions: Max 120 characters per question.'],
    ['Answers: Max 75 characters per answer. At least two alternatives are needed.'],
    ['Time limit: Recommended 20 or 30 seconds. 5, 10, 20, 30, 60, 90, 120 or 240 seconds are supported.'],
    ['Correct answer(s): Numbers 1, 2, 3 or 4. If more than one correct answer, separate with comma: 1,3'],
    [],
    [],
    // Row 8: Official Header Row (Column A to G - exactly 7 columns)
    [
      'Question - max 120 characters',
      'Answer 1 - max 75 characters',
      'Answer 2 - max 75 characters',
      'Answer 3 - max 75 characters',
      'Answer 4 - max 75 characters',
      'Time limit (sec)',
      'Correct answer(s)',
    ],
  ];

  // Rows 9+: Questions data starting in Column A with Question text
  cards.forEach((card) => {
    const rawQuestion = (card.question || '').trim();
    // Clean and enforce 120-char limit
    const cleanQ = rawQuestion.replace(/\r?\n+/g, ' ').slice(0, 120);

    const choices = Array.isArray(card.choices) && card.choices.length >= 2
      ? card.choices
      : [card.correctAnswer || 'صح / صواب', 'خطأ'];

    const a1 = (choices[0] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a2 = (choices[1] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a3 = choices[2] ? choices[2].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';
    const a4 = choices[3] ? choices[3].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';

    // Determine correct answer number (1, 2, 3, or 4) with Arabic diacritics stripping
    let correctIdx = 1;
    if (card.correctAnswer) {
      const normalize = (s: string) =>
        s.replace(/[\u064B-\u065F\u0670]/g, '').trim().toLowerCase();
      const target = normalize(card.correctAnswer);
      const foundIdx = choices.findIndex(
        (ch) => normalize(ch) === target
      );
      if (foundIdx !== -1) {
        correctIdx = foundIdx + 1;
      } else {
        const num = parseInt(card.correctAnswer.trim(), 10);
        if (!isNaN(num) && num >= 1 && num <= 4) {
          correctIdx = num;
        }
      }
    }

    const timeLimitSeconds = 30;

    // Directly push 7 columns: A (Question) to G (Correct answer)
    aoa.push([
      cleanQ,
      a1,
      a2,
      a3,
      a4,
      timeLimitSeconds,
      correctIdx,
    ]);
  });

  return aoa;
}

/**
 * Generates and downloads the official Kahoot .xlsx spreadsheet file
 */
export function downloadKahootXlsx(cards: KahootCard[], lessonTitle: string = 'Kahoot_Quiz'): void {
  const aoa = buildKahootAoa(cards);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths for optimal view in Excel (Columns A to G)
  ws['!cols'] = [
    { wch: 48 }, // Col A: Question - max 120 characters
    { wch: 28 }, // Col B: Answer 1 - max 75 characters
    { wch: 28 }, // Col C: Answer 2 - max 75 characters
    { wch: 28 }, // Col D: Answer 3 - max 75 characters
    { wch: 28 }, // Col E: Answer 4 - max 75 characters
    { wch: 18 }, // Col F: Time limit (sec)
    { wch: 20 }, // Col G: Correct answer(s)
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Kahoot');

  // Generate safe filename
  const cleanTitle = (lessonTitle || 'Kahoot_Quiz')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60);

  const fileName = `Kahoot_${cleanTitle}.xlsx`;

  // Write workbook as binary array buffer
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, fileName);
}
