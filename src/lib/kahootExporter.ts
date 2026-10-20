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
 * Normalizes Arabic text for accurate matching against answer choices
 */
function normalizeArabic(text: string): string {
  return (text || '')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove harakat / tashkeel
    .replace(/[أإآءئ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

/**
 * Determines the 1-based index (1, 2, 3, or 4) of the correct answer
 */
export function determineCorrectIndex(card: KahootCard, choices: string[]): number {
  if (!card.correctAnswer) return 1;

  const rawTarget = (card.correctAnswer || '').trim();

  // 1. Direct equality
  const directIdx = choices.findIndex((ch) => ch.trim() === rawTarget);
  if (directIdx !== -1) return directIdx + 1;

  // 2. Normalized equality (strip tashkeel, normalize alef)
  const normTarget = normalizeArabic(rawTarget);
  const normIdx = choices.findIndex((ch) => normalizeArabic(ch) === normTarget);
  if (normIdx !== -1) return normIdx + 1;

  // 3. Substring matching
  const subIdx = choices.findIndex(
    (ch) =>
      normTarget.length > 2 &&
      (normalizeArabic(ch).includes(normTarget) || normTarget.includes(normalizeArabic(ch)))
  );
  if (subIdx !== -1) return subIdx + 1;

  // 4. Numeric check (e.g. '1', '2', '3', '4' or 'أ', 'ب', 'ج', 'د')
  const num = parseInt(rawTarget, 10);
  if (!isNaN(num) && num >= 1 && num <= 4) return num;

  if (rawTarget === 'أ' || rawTarget.toLowerCase() === 'a') return 1;
  if (rawTarget === 'ب' || rawTarget.toLowerCase() === 'b') return 2;
  if (rawTarget === 'ج' || rawTarget.toLowerCase() === 'c') return 3;
  if (rawTarget === 'د' || rawTarget.toLowerCase() === 'd') return 4;

  return 1;
}

/**
 * Builds the array-of-arrays matching Kahoot's official 8-column layout (KahootQuizTemplate.xlsx)
 * Column A: Question number (# 1, 2, 3...)
 * Column B: Question - max 120 characters
 * Column C: Answer 1 - max 75 characters
 * Column D: Answer 2 - max 75 characters
 * Column E: Answer 3 - max 75 characters
 * Column F: Answer 4 - max 75 characters
 * Column G: Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs
 * Column H: Correct answer(s) - choose at least one
 */
export function buildOfficialKahootAoa(cards: KahootCard[]): (string | number)[][] {
  const aoa: (string | number)[][] = [
    [],
    ['', 'Quiz template'],
    [
      '',
      'Add questions, at least two answer alternatives, time limit and choose correct answers (at least one). Have fun creating your awesome quiz!',
    ],
    [
      '',
      'Remember: questions have a limit of 120 characters and answers can have 75 characters max. Text will turn red in Excel or Google Docs if you exceed this limit. If several answers are correct, separate them with a comma.',
    ],
    ['', "See an example question below (don't forget to overwrite this with your first question!)"],
    ['', "And remember,  if you're not using Excel you need to export to .xlsx format before you upload to Kahoot!"],
    [],
    // Row 8: Official Header Row (Column A to H)
    [
      '',
      'Question - max 120 characters',
      'Answer 1 - max 75 characters',
      'Answer 2 - max 75 characters',
      'Answer 3 - max 75 characters',
      'Answer 4 - max 75 characters',
      'Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs',
      'Correct answer(s) - choose at least one',
    ],
  ];

  cards.forEach((card, idx) => {
    const rawQuestion = (card.question || '').trim();
    const cleanQ = rawQuestion.replace(/\r?\n+/g, ' ').slice(0, 120);

    const choices =
      Array.isArray(card.choices) && card.choices.length >= 2
        ? card.choices
        : [card.correctAnswer || 'صح / صواب', 'خطأ'];

    const a1 = (choices[0] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a2 = (choices[1] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a3 = choices[2] ? choices[2].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';
    const a4 = choices[3] ? choices[3].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';

    const correctIdx = determineCorrectIndex(card, choices);
    const timeLimitSeconds = 30;

    aoa.push([
      idx + 1,
      cleanQ,
      a1,
      a2,
      a3,
      a4,
      timeLimitSeconds,
      String(correctIdx), // Critical: Kahoot requires string representation like "1" or "1,2"
    ]);
  });

  return aoa;
}

/**
 * Builds the direct 7-column layout (Column A: Question, Column G: Correct answer)
 */
export function buildDirect7KahootAoa(cards: KahootCard[]): (string | number)[][] {
  const aoa: (string | number)[][] = [
    ['Kahoot! quiz spreadsheet template'],
    ['Questions: Max 120 characters per question.'],
    ['Answers: Max 75 characters per answer. At least two alternatives are needed.'],
    ['Time limit: Recommended 20 or 30 seconds. 5, 10, 20, 30, 60, 90, 120 or 240 seconds are supported.'],
    ['Correct answer(s): Numbers 1, 2, 3 or 4. If more than one correct answer, separate with comma: 1,3'],
    [],
    [],
    [
      'Question - max 120 characters',
      'Answer 1 - max 75 characters',
      'Answer 2 - max 75 characters',
      'Answer 3 - max 75 characters',
      'Answer 4 - max 75 characters',
      'Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs',
      'Correct answer(s) - choose at least one',
    ],
  ];

  cards.forEach((card) => {
    const rawQuestion = (card.question || '').trim();
    const cleanQ = rawQuestion.replace(/\r?\n+/g, ' ').slice(0, 120);

    const choices =
      Array.isArray(card.choices) && card.choices.length >= 2
        ? card.choices
        : [card.correctAnswer || 'صح / صواب', 'خطأ'];

    const a1 = (choices[0] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a2 = (choices[1] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
    const a3 = choices[2] ? choices[2].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';
    const a4 = choices[3] ? choices[3].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';

    const correctIdx = determineCorrectIndex(card, choices);
    const timeLimitSeconds = 30;

    aoa.push([cleanQ, a1, a2, a3, a4, timeLimitSeconds, String(correctIdx)]);
  });

  return aoa;
}

/**
 * Downloads Kahoot .xlsx using the genuine official Kahoot template with fallback
 */
export async function downloadKahootXlsx(
  cards: KahootCard[],
  lessonTitle: string = 'Kahoot_Quiz',
  variant: 'official' | 'direct7' = 'official'
): Promise<void> {
  const cleanTitle = (lessonTitle || 'Kahoot_Quiz')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60);

  // Variant 1: Official Template (Uses real Kahoot template binary if available, else in-memory official)
  if (variant === 'official') {
    try {
      const res = await fetch('/assets/KahootQuizTemplate.xlsx');
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const wb = XLSX.read(arrayBuf, { type: 'array' });
        const sheetName = wb.SheetNames[0] || 'Sheet1';
        const ws = wb.Sheets[sheetName];

        // Clear existing template placeholder rows (from row index 8 to 200)
        for (let r = 8; r < 200; r++) {
          for (let c = 0; c < 10; c++) {
            delete ws[XLSX.utils.encode_cell({ r, c })];
          }
        }

        // Inject question data exactly where Kahoot expects it
        cards.forEach((card, idx) => {
          const r = 8 + idx; // Row 9 in 1-based Excel
          const cleanQ = (card.question || '').trim().replace(/\r?\n+/g, ' ').slice(0, 120);
          const choices =
            Array.isArray(card.choices) && card.choices.length >= 2
              ? card.choices
              : [card.correctAnswer || 'صح / صواب', 'خطأ'];

          const a1 = (choices[0] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
          const a2 = (choices[1] || '').trim().replace(/\r?\n+/g, ' ').slice(0, 75);
          const a3 = choices[2] ? choices[2].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';
          const a4 = choices[3] ? choices[3].trim().replace(/\r?\n+/g, ' ').slice(0, 75) : '';
          const correctIdx = determineCorrectIndex(card, choices);

          ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 'n', v: idx + 1 };
          ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: cleanQ };
          ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: a1 };
          ws[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 's', v: a2 };
          ws[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: a3 };
          ws[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 's', v: a4 };
          ws[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 'n', v: 30 };
          ws[XLSX.utils.encode_cell({ r, c: 7 })] = { t: 's', v: String(correctIdx) };
        });

        ws['!ref'] = `A1:H${Math.max(8 + cards.length, 9)}`;

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `Kahoot_${cleanTitle}.xlsx`);
        return;
      }
    } catch {
      // Fetch failed, continue to in-memory generation below
    }

    // In-memory generation of Official 8-column format
    const aoa = buildOfficialKahootAoa(cards);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 6 },  // Col A: #
      { wch: 48 }, // Col B: Question - max 120 characters
      { wch: 28 }, // Col C: Answer 1 - max 75 characters
      { wch: 28 }, // Col D: Answer 2 - max 75 characters
      { wch: 28 }, // Col E: Answer 3 - max 75 characters
      { wch: 28 }, // Col F: Answer 4 - max 75 characters
      { wch: 20 }, // Col G: Time limit (sec)
      { wch: 25 }, // Col H: Correct answer(s) - choose at least one
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Kahoot_${cleanTitle}.xlsx`);
    return;
  }

  // Variant 2: Direct 7-column format (starts with Question in Column A)
  const aoa = buildDirect7KahootAoa(cards);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 48 }, // Col A: Question - max 120 characters
    { wch: 28 }, // Col B: Answer 1 - max 75 characters
    { wch: 28 }, // Col C: Answer 2 - max 75 characters
    { wch: 28 }, // Col D: Answer 3 - max 75 characters
    { wch: 28 }, // Col E: Answer 4 - max 75 characters
    { wch: 20 }, // Col F: Time limit (sec)
    { wch: 25 }, // Col G: Correct answer(s) - choose at least one
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Kahoot_${cleanTitle}_Direct7.xlsx`);
}
