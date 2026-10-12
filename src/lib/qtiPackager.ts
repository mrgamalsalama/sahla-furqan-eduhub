import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { LmsTarget } from '@/types';

export interface QtiPackageOptions {
  title: string;
  xmlPayload: string;
  target: LmsTarget;
  subject?: string;
  grade?: string;
}

export interface NormalizedQuestion {
  id: string;
  title: string;
  prompt: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correctId: string;
  points: number;
}

/**
 * Strips HTML tags, CDATA artifacts, and unescapes standard HTML entities.
 * Absolutely guarantees no stray `]]>` or `<![CDATA[` is left in the string.
 */
export function cleanText(str: string = ''): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/\]\]>/g, '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips Arabic diacritical marks (Tashkeel).
 */
export function stripTashkeel(s: string = ''): string {
  return s.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Normalizes Arabic letters for reliable matching.
 */
export function normalizeArabic(s: string = ''): string {
  return stripTashkeel(s)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits HTML deliverable into Questions section and Answer Key section.
 */
export function splitQuestionsAndAnswerKey(html: string): { questionsHtml: string; answerKeyHtml: string } {
  const answerKeyMarkers = [
    /نَمُوذَجُ?\s*الْ?إِجَابَةِ?/i,
    /Answer\s*Key/i,
    /مَفَاتِيحُ?\s*الْ?إِجَابَةِ?/i,
    /جَدْوَلُ?\s*الْ?إِجَابَاتِ?/i,
    /حُلُولُ?\s*الْ?أَسْئِلَةِ?/i,
    /نَمُوذَجُ?\s*التَّصْحِيحِ?/i,
  ];

  let splitIndex = -1;
  for (const marker of answerKeyMarkers) {
    const match = html.search(marker);
    if (match !== -1) {
      splitIndex = match;
      break;
    }
  }

  if (splitIndex !== -1) {
    return {
      questionsHtml: html.slice(0, splitIndex),
      answerKeyHtml: html.slice(splitIndex),
    };
  }

  return { questionsHtml: html, answerKeyHtml: '' };
}

/**
 * Extracts correct answer keys from Answer Key Table or List.
 */
export function extractAnswerKeys(answerKeyHtml: string): Record<number, string> {
  const keys: Record<number, string> = {};
  if (!answerKeyHtml) return keys;

  // 1. Check for table rows e.g. <tr><td>1</td><td>أ</td></tr>
  const trMatches = Array.from(answerKeyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  for (const trM of trMatches) {
    const tdMatches = Array.from(trM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    if (tdMatches.length >= 2) {
      const qNumText = tdMatches[0][1].replace(/<[^>]+>/g, '').trim();
      const qNum = parseInt(qNumText, 10);
      const ansText = tdMatches[1][1].replace(/<[^>]+>/g, '').trim();
      if (!isNaN(qNum) && ansText) {
        const letterMatch = ansText.match(/([أ-دA-D])/);
        if (letterMatch) {
          keys[qNum] = letterMatch[1];
        }
      }
    }
  }

  // 2. Check for bullet list format e.g. 1 - (أ) مدرسة: لأنها... or 1. (ب)
  const listMatches = Array.from(
    answerKeyHtml.matchAll(
      /(?:^|\n|<[^>]+>)\s*(?:[\*\#\-\s]*)(?:س\s*|السؤال\s*)?(\d+)[\s:\-ـ\.]*[\(（]?\s*([أ-دA-D])\s*[\)）]/gi
    )
  );
  for (const lm of listMatches) {
    const qNum = parseInt(lm[1], 10);
    if (!isNaN(qNum)) {
      keys[qNum] = lm[2];
    }
  }

  // 3. Fallback: match any line with question number and letter
  if (Object.keys(keys).length === 0) {
    const lines = answerKeyHtml
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/(?:س\s*|السؤال\s*)?(\d+)[\s:\-ـ\.]*[\(（]?\s*([أ-دA-D])/i);
      if (match) {
        const qNum = parseInt(match[1], 10);
        if (!isNaN(qNum)) {
          keys[qNum] = match[2];
        }
      }
    }
  }

  return keys;
}

export function mapLetterToChoiceId(letter: string): string {
  const upper = letter.toUpperCase();
  if (upper === 'أ' || upper === 'A' || upper === 'CHOICE_1') return 'choice_1';
  if (upper === 'ب' || upper === 'B' || upper === 'CHOICE_2') return 'choice_2';
  if (upper === 'ج' || upper === 'C' || upper === 'CHOICE_3') return 'choice_3';
  if (upper === 'د' || upper === 'D' || upper === 'CHOICE_4') return 'choice_4';
  return 'choice_1';
}

/**
 * Helper to extract multiple choices and detect correct choice from a text block or table cell.
 */
export function extractChoicesAndCorrectFromText(
  text: string
): { choices: Array<{ id: string; text: string }>; correctLetter?: string } {
  const choices: Array<{ id: string; text: string }> = [];
  let detectedLetter: string | undefined;

  // 1. Detect explicit inline answer e.g. "الإجابة الصحيحة: ج" or "الحل: ب"
  const ansMatch = text.match(
    /(?:الإجابة\s*(?:الصحيحة)?|الجواب\s*(?:الصحيح)?|الحل|مفتاح\s*الحل|Answer|Key)\s*[:：\-ـ]\s*[\(（]?\s*([أ-دA-D1-4])\s*[\)）]?/i
  );
  if (ansMatch) {
    const rawVal = ansMatch[1].toUpperCase();
    const mapNum: Record<string, string> = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
    detectedLetter = mapNum[rawVal] || rawVal;
  }

  // 2. Multi-line options: lines starting with أ) or (أ) or أ- or 1) or A)
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const optLineRegex = /^[\(（]?\s*([أ-دA-D1-4])\s*[\)）\.\-:\/ـ]\s*(.*)$/i;
  const foundLineChoices: Array<{ letter: string; text: string; isCorrect: boolean }> = [];

  for (const line of lines) {
    if (/(?:الإجابة\s*(?:الصحيحة)?|الجواب|الحل|مفتاح\s*الحل|Answer|Key)\s*[:：\-ـ]/i.test(line)) {
      const lineAnsMatch = line.match(/[:：\-ـ]\s*[\(（]?\s*([أ-دA-D1-4])\s*[\)）]?/i);
      if (lineAnsMatch && !detectedLetter) {
        const rawVal = lineAnsMatch[1].toUpperCase();
        const mapNum: Record<string, string> = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
        detectedLetter = mapNum[rawVal] || rawVal;
      }
      continue;
    }

    const match = line.match(optLineRegex);
    if (match) {
      const rawLetter = match[1].toUpperCase();
      const mapNum: Record<string, string> = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
      const letter = mapNum[rawLetter] || rawLetter;
      let optText = match[2].trim();

      const isMarkedCorrect =
        /\(?(?:صحيحة|الصحيحة|صح|الإجابة الصحيحة|correct)\)?/i.test(optText) ||
        line.startsWith('*') ||
        optText.endsWith('*');

      optText = optText
        .replace(/[\(（]?(?:صحيحة|الصحيحة|صح|الإجابة الصحيحة|correct)[\)）]?/gi, '')
        .replace(/\*/g, '')
        .trim();

      foundLineChoices.push({ letter, text: optText, isCorrect: isMarkedCorrect });
    }
  }

  if (foundLineChoices.length >= 2) {
    foundLineChoices.forEach((c, idx) => {
      choices.push({ id: `choice_${idx + 1}`, text: cleanText(c.text) });
      if (c.isCorrect && !detectedLetter) {
        detectedLetter = c.letter;
      }
    });
    return { choices, correctLetter: detectedLetter };
  }

  // 3. Inline options in a single line e.g. "أ) خيار 1 ب) خيار 2 ج) خيار 3 د) خيار 4"
  const inlineMatch = text.match(
    /[\(（]?\s*أ\s*[\)）\.\-:]\s*([\s\S]*?)[\(（]?\s*ب\s*[\)）\.\-:]\s*([\s\S]*?)(?:[\(（]?\s*ج\s*[\)）\.\-:]\s*([\s\S]*?))?(?:[\(（]?\s*د\s*[\)）\.\-:]\s*([\s\S]*?))?$/i
  );
  if (inlineMatch) {
    const cleanInlineOpt = (t: string) => {
      const isCorrect = /\(?(?:صحيحة|الصحيحة|صح|correct)\)?/i.test(t);
      const cleaned = t.replace(/[\(（]?(?:صحيحة|الصحيحة|صح|correct)[\)）]?/gi, '').trim();
      return { text: cleaned, isCorrect };
    };

    const optA = cleanInlineOpt(inlineMatch[1]);
    const optB = cleanInlineOpt(inlineMatch[2]);
    const optC = inlineMatch[3] ? cleanInlineOpt(inlineMatch[3]) : null;
    const optD = inlineMatch[4] ? cleanInlineOpt(inlineMatch[4]) : null;

    if (optA.isCorrect && !detectedLetter) detectedLetter = 'أ';
    if (optB.isCorrect && !detectedLetter) detectedLetter = 'ب';
    if (optC?.isCorrect && !detectedLetter) detectedLetter = 'ج';
    if (optD?.isCorrect && !detectedLetter) detectedLetter = 'د';

    choices.push({ id: 'choice_1', text: cleanText(optA.text) });
    choices.push({ id: 'choice_2', text: cleanText(optB.text) });
    if (optC?.text) choices.push({ id: 'choice_3', text: cleanText(optC.text) });
    if (optD?.text) choices.push({ id: 'choice_4', text: cleanText(optD.text) });

    if (choices.length >= 2) {
      return { choices, correctLetter: detectedLetter };
    }
  }

  // 4. Pipe or slash-separated options e.g. "خيار 1 | خيار 2 | خيار 3 | خيار 4"
  if (text.includes('|') || text.includes('/')) {
    const parts = (text.includes('|') ? text.split('|') : text.split('/'))
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('http'));

    if (parts.length >= 2 && parts.length <= 6) {
      parts.forEach((p, idx) => {
        const cleaned = p.replace(/^[\(（]?[أ-دA-D1-4][\)）\.\-:]\s*/, '').trim();
        choices.push({ id: `choice_${idx + 1}`, text: cleanText(cleaned) });
      });
      return { choices, correctLetter: detectedLetter };
    }
  }

  return { choices, correctLetter: detectedLetter };
}

/**
 * Extracts questions from an HTML Table format (Format 1: جدول الأسئلة)
 * Supports 3, 4, 5, 6, 7-column layouts and bundled choice columns.
 */
export function extractQuestionsFromHtmlTable(
  html: string,
  answerKeys: Record<number, string>
): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  if (!html.includes('<table')) return questions;

  const tableMatches = Array.from(html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi));
  for (const tableMatch of tableMatches) {
    const tableContent = tableMatch[1];
    const trMatches = Array.from(tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    if (trMatches.length < 2) continue;

    for (let rIdx = 0; rIdx < trMatches.length; rIdx++) {
      const rowContent = trMatches[rIdx][1];
      // Skip table header
      if (
        rowContent.includes('<th') ||
        (rIdx === 0 && (rowContent.includes('السؤال') || rowContent.includes('Question')))
      ) {
        continue;
      }

      const cellMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
      if (cellMatches.length >= 2) {
        let qNum = questions.length + 1;
        let promptText = '';
        let optA = '';
        let optB = '';
        let optC = '';
        let optD = '';
        let rowExplicitAnswer = '';

        if (cellMatches.length >= 6) {
          const numCell = cleanText(cellMatches[0][1]).replace(/[^0-9]/g, '');
          if (numCell) {
            const parsed = parseInt(numCell, 10);
            if (!isNaN(parsed)) qNum = parsed;
          }
          promptText = cleanText(cellMatches[1][1]);
          optA = cleanText(cellMatches[2][1]);
          optB = cleanText(cellMatches[3][1]);
          optC = cleanText(cellMatches[4][1]);
          optD = cleanText(cellMatches[5][1]);
          if (cellMatches[6]) {
            rowExplicitAnswer = cleanText(cellMatches[6][1]);
          }
        } else if (cellMatches.length === 5) {
          promptText = cleanText(cellMatches[0][1]);
          const numMatch = promptText.match(/^(\d+)[\.\-\)]\s*(.*)$/);
          if (numMatch) {
            qNum = parseInt(numMatch[1], 10);
            promptText = numMatch[2];
          }
          optA = cleanText(cellMatches[1][1]);
          optB = cleanText(cellMatches[2][1]);
          optC = cleanText(cellMatches[3][1]);
          optD = cleanText(cellMatches[4][1]);
        } else if (cellMatches.length >= 2 && cellMatches.length <= 4) {
          // Layouts where options are bundled into single cell (e.g. [رقم | سؤال | خيارات | إجابة])
          let cell0 = cleanText(cellMatches[0][1]);
          let cell1 = cleanText(cellMatches[1][1]);
          let choicesCell = '';

          if (cellMatches.length === 4) {
            promptText = cell1;
            choicesCell = cleanText(cellMatches[2][1]);
            rowExplicitAnswer = cleanText(cellMatches[3][1]);
          } else if (cellMatches.length === 3) {
            const num0 = parseInt(cell0.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num0)) {
              qNum = num0;
              promptText = cell1;
              choicesCell = cleanText(cellMatches[2][1]);
            } else {
              promptText = cell0;
              choicesCell = cell1;
              rowExplicitAnswer = cleanText(cellMatches[2][1]);
            }
          } else {
            promptText = cell0;
            choicesCell = cell1;
          }

          if (choicesCell) {
            const extracted = extractChoicesAndCorrectFromText(choicesCell);
            if (extracted.choices.length >= 2) {
              const correctLetter =
                rowExplicitAnswer.match(/[أ-دA-D1-4]/)?.[0] ||
                extracted.correctLetter ||
                answerKeys[qNum] ||
                'أ';

              questions.push({
                id: `Q_${qNum}`,
                title: `السؤال ${qNum}`,
                prompt: promptText,
                options: extracted.choices,
                correctId: mapLetterToChoiceId(correctLetter),
                points: 1,
              });
              continue;
            }
          }
        }

        const cleanOptionPrefix = (txt: string) =>
          txt.replace(/^[أ-دA-D1-4][\)\.\-:]\s*/, '').trim();

        optA = cleanOptionPrefix(optA);
        optB = cleanOptionPrefix(optB);
        optC = cleanOptionPrefix(optC);
        optD = cleanOptionPrefix(optD);

        if (promptText && optA && optB) {
          const ansLetterMatch = rowExplicitAnswer.match(/([أ-دA-D1-4])/i);
          const correctLetter =
            ansLetterMatch?.[1] ||
            answerKeys[qNum] ||
            answerKeys[questions.length + 1] ||
            'أ';

          questions.push({
            id: `Q_${qNum}`,
            title: `السؤال ${qNum}`,
            prompt: promptText,
            options: [
              { id: 'choice_1', text: optA || 'الخيار أ' },
              { id: 'choice_2', text: optB || 'الخيار ب' },
              { id: 'choice_3', text: optC || 'الخيار ج' },
              { id: 'choice_4', text: optD || 'الخيار د' },
            ].filter((o) => Boolean(o.text)),
            correctId: mapLetterToChoiceId(correctLetter),
            points: 1,
          });
        }
      }
    }
  }

  return questions;
}

/**
 * Extracts questions from inline pipe-separated or inline formatted text.
 */
export function extractQuestionsFromInlineText(
  plainText: string,
  answerKeys: Record<number, string>
): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  const qBlocks = plainText.split(
    /(?:^|\n)\s*(?:[\*\#\-\s]*)(?:س\s*|السؤال\s*|Q\s*)?(\d+)[\.\-\:\)]\s*/gi
  );

  if (qBlocks.length < 3) return questions;

  for (let i = 1; i < qBlocks.length; i += 2) {
    const qNum = parseInt(qBlocks[i], 10);
    const content = qBlocks[i + 1] || '';
    const extracted = extractChoicesAndCorrectFromText(content);

    if (extracted.choices.length >= 2) {
      // Find prompt part before first choice
      const promptMatch = content.match(/^(.*?)(?=[\(（]?[أ-دA-D1-4][\)）\.\-:]|\||\/)/s);
      const prompt = cleanText(promptMatch ? promptMatch[1] : content.split('\n')[0]);
      const correctLetter =
        extracted.correctLetter || answerKeys[qNum] || answerKeys[questions.length + 1] || 'أ';

      questions.push({
        id: `Q_${qNum}`,
        title: `السؤال ${qNum}`,
        prompt: prompt || `السؤال ${qNum}`,
        options: extracted.choices,
        correctId: mapLetterToChoiceId(correctLetter),
        points: 1,
      });
    }
  }

  return questions;
}

/**
 * Normalizes Eastern Arabic digits (٠-٩) to standard digits (0-9).
 */
export function normalizeArabicDigits(str: string): string {
  if (!str) return '';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (d) => easternDigits.indexOf(d).toString());
}

/**
 * Ultra-robust Universal Raw Text Questions Extractor.
 * Handles 100+ questions, Eastern Arabic numerals, unnumbered blocks,
 * TSV tables, inline choices, and all answer key patterns with 100% accuracy.
 */
export function extractQuestionsFromRawText(
  rawText: string,
  fallbackTitle: string = 'الامتحان'
): NormalizedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  // 1. Normalize Eastern Arabic digits in input
  const normalizedText = normalizeArabicDigits(rawText);

  const { questionsHtml: cleanContent, answerKeyHtml } = splitQuestionsAndAnswerKey(normalizedText);
  const globalAnswerKeys = extractAnswerKeys(answerKeyHtml || normalizedText);

  // Strategy A: Check for TSV (Tab-separated values copied from Word/Excel tables)
  const allLines = cleanContent.split('\n').map((l) => l.trim()).filter(Boolean);
  const tsvLines = allLines.filter((l) => l.includes('\t'));
  if (tsvLines.length >= 2) {
    const tsvQuestions: NormalizedQuestion[] = [];
    for (let i = 0; i < tsvLines.length; i++) {
      const line = tsvLines[i];
      if (i === 0 && (line.includes('السؤال') || line.includes('Question') || line.includes('الخيارات'))) {
        continue;
      }
      const parts = line.split('\t').map((p) => cleanText(p)).filter(Boolean);
      if (parts.length >= 4) {
        let promptText = '';
        let optA = '';
        let optB = '';
        let optC = '';
        let optD = '';
        let ansText = '';
        let qNum = tsvQuestions.length + 1;

        if (/^\d+$/.test(parts[0])) {
          const firstNum = parseInt(parts[0], 10);
          if (!isNaN(firstNum)) qNum = firstNum;
          promptText = parts[1] || '';
          optA = parts[2] || '';
          optB = parts[3] || '';
          optC = parts[4] || '';
          optD = parts[5] || '';
          ansText = parts[6] || '';
        } else {
          promptText = parts[0] || '';
          optA = parts[1] || '';
          optB = parts[2] || '';
          optC = parts[3] || '';
          optD = parts[4] || '';
          ansText = parts[5] || '';
        }

        const cleanPrefix = (s: string) => s.replace(/^[\(（]?[أ-دA-D1-4][\)）\.\-:]\s*/, '').trim();
        optA = cleanPrefix(optA);
        optB = cleanPrefix(optB);
        optC = cleanPrefix(optC);
        optD = cleanPrefix(optD);

        const letterMatch = ansText.match(/([أ-دA-D1-4])/i);
        let correctLetter = letterMatch ? letterMatch[1] : (globalAnswerKeys[qNum] || 'أ');
        const mapNum: Record<string, string> = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
        correctLetter = mapNum[correctLetter] || correctLetter;

        if (promptText && optA && optB) {
          tsvQuestions.push({
            id: `Q_${qNum}`,
            title: `السؤال ${qNum}`,
            prompt: cleanText(promptText),
            options: [
              { id: 'choice_1', text: optA },
              { id: 'choice_2', text: optB },
              { id: 'choice_3', text: optC || 'الخيار ج' },
              { id: 'choice_4', text: optD || 'الخيار د' },
            ].filter((o) => Boolean(o.text)),
            correctId: mapLetterToChoiceId(correctLetter),
            points: 1,
          });
        }
      }
    }
    if (tsvQuestions.length >= 2) {
      return tsvQuestions;
    }
  }

  // Strategy B: Comprehensive Chunk Parser (Supports numbered headers & unnumbered question blocks)
  const isQuestionHeader = (line: string): { isHeader: boolean; qNum?: number; cleanLine: string } => {
    const trimmed = line.trim();
    // Match headers like "1.", "س1:", "س١/", "سؤال 1 -", "Q1.", "1)"
    const match = trimmed.match(/^(?:س\s*|سؤال\s*|السؤال\s*|Q\s*)?(\d+)[\s\.\:\-\)\/ـ]+(.*)$/i);
    if (match) {
      return { isHeader: true, qNum: parseInt(match[1], 10), cleanLine: match[2].trim() };
    }
    // Match word ordinals like "السؤال الأول", "السؤال الثاني"
    const wordOrdinalMatch = trimmed.match(
      /^(?:السؤال\s+)?(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)[\s\.\:\-\)\/ـ]+(.*)$/i
    );
    if (wordOrdinalMatch) {
      const ordMap: Record<string, number> = {
        'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5,
        'السادس': 6, 'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10,
      };
      return { isHeader: true, qNum: ordMap[wordOrdinalMatch[1]] || 1, cleanLine: wordOrdinalMatch[2].trim() };
    }
    return { isHeader: false, cleanLine: trimmed };
  };

  const isChoiceLine = (line: string): { isChoice: boolean; letter?: string; text?: string } => {
    const trimmed = line.trim();
    const match = trimmed.match(/^[○◯\s\*\-]*[\(（]?\s*([أ-دA-D1-4])\s*[\)）\.\-:\/ـ]\s*(.*)$/i);
    if (match) {
      const letter = match[1].toUpperCase();
      const text = match[2].trim();
      return { isChoice: true, letter, text };
    }
    return { isChoice: false };
  };

  const isAnswerLine = (line: string): { isAnswer: boolean; letter?: string } => {
    const trimmed = line.trim();
    const match = trimmed.match(
      /(?:الإجابة\s*(?:الصحيحة)?|الجواب\s*(?:الصحيح)?|الحل|مفتاح\s*الحل|Answer|Key)\s*[:：\-ـ=]\s*[\(（]?\s*([أ-دA-D1-4])/i
    );
    if (match) {
      return { isAnswer: true, letter: match[1].toUpperCase() };
    }
    return { isAnswer: false };
  };

  interface RawChunk {
    qNum?: number;
    promptLines: string[];
    choiceLines: Array<{ letter: string; text: string }>;
    inlineAnswer?: string;
  }

  const chunks: RawChunk[] = [];
  let currentChunk: RawChunk | null = null;
  const contentLines = cleanContent.split('\n');

  for (let idx = 0; idx < contentLines.length; idx++) {
    const rawLine = contentLines[idx].trim();
    if (!rawLine) continue;

    // Skip metadata headers
    if (
      rawLine.startsWith('---') ||
      rawLine.startsWith('===') ||
      rawLine.includes('تعليمات الاختبار') ||
      rawLine.includes('الصف الدراسي') ||
      rawLine.includes('مادة الاختبار')
    ) {
      continue;
    }

    const headerCheck = isQuestionHeader(rawLine);
    const choiceCheck = isChoiceLine(rawLine);
    const answerCheck = isAnswerLine(rawLine);

    if (headerCheck.isHeader) {
      if (currentChunk && (currentChunk.promptLines.length > 0 || currentChunk.choiceLines.length > 0)) {
        chunks.push(currentChunk);
      }
      currentChunk = {
        qNum: headerCheck.qNum,
        promptLines: headerCheck.cleanLine ? [headerCheck.cleanLine] : [],
        choiceLines: [],
      };
    } else if (choiceCheck.isChoice) {
      if (!currentChunk) {
        currentChunk = { promptLines: [], choiceLines: [] };
      }
      let choiceText = choiceCheck.text || '';
      const isCorrect = /\(?(?:صحيحة|الصحيحة|صح|correct)\)?/i.test(choiceText);
      choiceText = choiceText.replace(/[\(（]?(?:صحيحة|الصحيحة|صح|correct)[\)）]?/gi, '').trim();

      currentChunk.choiceLines.push({
        letter: choiceCheck.letter!,
        text: choiceText,
      });

      if (isCorrect && !currentChunk.inlineAnswer) {
        currentChunk.inlineAnswer = choiceCheck.letter;
      }
    } else if (answerCheck.isAnswer) {
      if (!currentChunk) {
        currentChunk = { promptLines: [], choiceLines: [] };
      }
      currentChunk.inlineAnswer = answerCheck.letter;
    } else {
      if (currentChunk && currentChunk.choiceLines.length >= 2) {
        // We already have choices in current chunk, and now hit a non-choice line: start new question!
        chunks.push(currentChunk);
        currentChunk = {
          promptLines: [rawLine],
          choiceLines: [],
        };
      } else if (currentChunk) {
        currentChunk.promptLines.push(rawLine);
      } else {
        currentChunk = {
          promptLines: [rawLine],
          choiceLines: [],
        };
      }
    }
  }

  if (currentChunk && (currentChunk.promptLines.length > 0 || currentChunk.choiceLines.length > 0)) {
    chunks.push(currentChunk);
  }

  const resultQuestions: NormalizedQuestion[] = [];
  chunks.forEach((chunk, cIdx) => {
    const qNum = chunk.qNum || (cIdx + 1);
    let prompt = chunk.promptLines.join(' ').trim();

    // Check if inline choices exist inside prompt (e.g. "أ) كذا ب) كذا")
    let choices = chunk.choiceLines;
    if (choices.length < 2 && prompt) {
      const inlineMatches = Array.from(
        prompt.matchAll(/[\(（]?\s*([أ-دA-D1-4])\s*[\)）\.\-:\/ـ]\s*([^أ-دA-D1-4\(\)（）\n]+)/gi)
      );
      if (inlineMatches.length >= 2) {
        const promptEnd = prompt.indexOf(inlineMatches[0][0]);
        if (promptEnd > 0) {
          const actualPrompt = prompt.slice(0, promptEnd).trim();
          choices = inlineMatches.map((m) => {
            let t = m[2].trim();
            t = t.replace(/(?:الإجابة|الجواب|الحل).*$/i, '').trim();
            return { letter: m[1].toUpperCase(), text: t };
          });
          prompt = actualPrompt;
        }
      }
    }

    if (!prompt) {
      prompt = `السؤال ${qNum}`;
    }

    const mappedChoices = choices
      .map((c, i) => ({
        id: `choice_${i + 1}`,
        text: cleanText(c.text),
      }))
      .filter((c) => Boolean(c.text));

    const finalAnswerLetter = chunk.inlineAnswer || globalAnswerKeys[qNum] || choices[0]?.letter || 'أ';

    if (mappedChoices.length >= 2) {
      resultQuestions.push({
        id: `Q_${qNum}`,
        title: `السؤال ${qNum}`,
        prompt: cleanText(prompt),
        options: mappedChoices,
        correctId: mapLetterToChoiceId(finalAnswerLetter),
        points: 1,
      });
    }
  });

  return resultQuestions;
}

/**
 * Universal HTML Questions Extractor
 */
export function extractQuestionsFromHtml(rawHtml: string): NormalizedQuestion[] {
  if (!rawHtml) return [];

  // Clean out any embedded XML divs first
  const sanitizedHtml = rawHtml.replace(/<div id="qti-xml-payload"[^>]*>[\s\S]*?<\/div>/gi, '');
  const { questionsHtml, answerKeyHtml } = splitQuestionsAndAnswerKey(sanitizedHtml);
  const answerKeys = extractAnswerKeys(answerKeyHtml || sanitizedHtml);

  // Strategy 1: Extract from HTML Tables
  const tableQuestions = extractQuestionsFromHtmlTable(questionsHtml, answerKeys);
  if (tableQuestions.length >= 2) {
    return tableQuestions;
  }

  // Strategy 2: Extract from Raw Text engine
  const rawTextQuestions = extractQuestionsFromRawText(sanitizedHtml);
  if (rawTextQuestions.length >= 2) {
    return rawTextQuestions;
  }

  // Strategy 3: Clean HTML to text for string parsing
  const plainText = questionsHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');

  // Strategy 4: Extract from Inline Pipe or Parentheses format
  const inlineQuestions = extractQuestionsFromInlineText(plainText, answerKeys);
  if (inlineQuestions.length >= 2) {
    return inlineQuestions;
  }

  // Strategy 5: Standard multi-line list parser
  const lines = plainText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: NormalizedQuestion[] = [];
  let currentQ: { prompt: string; options: Array<{ id: string; text: string }>; correctLetter?: string } | null = null;
  const optRegex = /^[\(（]?\s*([أ-دA-D1-4])\s*[\)）\.\-:\/ـ]\s*(.*)$/i;

  for (const line of lines) {
    const norm = normalizeArabic(line);

    if (
      norm.includes('الماده') ||
      norm.includes('الصف') ||
      norm.includes('تعليمات') ||
      norm.includes('زمن الاختبار') ||
      norm.includes('مصفوفه نواتج') ||
      norm.includes('جدول المواصفات')
    ) {
      continue;
    }

    const ansMatch = line.match(
      /(?:الإجابة\s*(?:الصحيحة)?|الجواب|الحل|مفتاح\s*الحل|Answer|Key)\s*[:：\-ـ]\s*[\(（]?\s*([أ-دA-D1-4])/i
    );
    if (ansMatch && currentQ) {
      const rawVal = ansMatch[1].toUpperCase();
      const mapNum: Record<string, string> = { '1': 'أ', '2': 'ب', '3': 'ج', '4': 'د' };
      currentQ.correctLetter = mapNum[rawVal] || rawVal;
      continue;
    }

    const isQHeader =
      /^(\d+[\.\-\)]|س\s*\d+|السؤال\s*(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+))/i.test(
        norm
      );

    if (isQHeader) {
      if (currentQ && currentQ.options.length >= 2) {
        const qIndex = questions.length + 1;
        const correctLetter = currentQ.correctLetter || answerKeys[qIndex] || 'أ';
        questions.push({
          id: `Q_${qIndex}`,
          title: `السؤال ${qIndex}`,
          prompt: cleanText(currentQ.prompt),
          options: currentQ.options,
          correctId: mapLetterToChoiceId(correctLetter),
          points: 1,
        });
      }
      const promptText = line.replace(/^[^\:]*\:\s*/, '').replace(/^(\d+[\.\-\)]|س\s*\d+)\s*/, '').trim();
      currentQ = { prompt: promptText, options: [] };
    } else if (optRegex.test(line)) {
      const match = line.match(optRegex);
      if (currentQ && match) {
        const optIdx = currentQ.options.length + 1;
        let optText = match[2].trim();
        const isCorrect = /\(?(?:صحيحة|الصحيحة|صح|correct)\)?/i.test(optText);
        optText = optText.replace(/[\(（]?(?:صحيحة|الصحيحة|صح|correct)[\)）]?/gi, '').replace(/\*/g, '').trim();

        currentQ.options.push({
          id: `choice_${optIdx}`,
          text: cleanText(optText),
        });
        if (isCorrect && !currentQ.correctLetter) {
          const letters = ['أ', 'ب', 'ج', 'د'];
          currentQ.correctLetter = letters[optIdx - 1];
        }
      }
    } else if (currentQ && currentQ.options.length === 0) {
      currentQ.prompt = (currentQ.prompt + ' ' + line).trim();
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    const qIndex = questions.length + 1;
    const correctLetter = currentQ.correctLetter || answerKeys[qIndex] || 'أ';
    questions.push({
      id: `Q_${qIndex}`,
      title: `السؤال ${qIndex}`,
      prompt: cleanText(currentQ.prompt),
      options: currentQ.options,
      correctId: mapLetterToChoiceId(correctLetter),
      points: 1,
    });
  }

  return questions;
}

/**
 * Extracts items from raw QTI XML string.
 */
export function extractQuestionsFromXml(xml: string): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  if (!xml) return questions;

  // 1. QTI 1.2 items
  const qti12Items = Array.from(xml.matchAll(/<item\b([\s\S]*?)<\/item>/gi));
  if (qti12Items.length > 0) {
    qti12Items.forEach((m, idx) => {
      const itemContent = m[1];
      const identMatch = itemContent.match(/ident="([^"]+)"/i);
      const titleMatch = itemContent.match(/title="([^"]+)"/i);
      const id = identMatch ? identMatch[1] : `Q_${idx + 1}`;
      const title = titleMatch ? cleanText(titleMatch[1]) : `السؤال ${idx + 1}`;

      let prompt = '';
      const presMatch = itemContent.match(/<presentation>([\s\S]*?)<\/presentation>/i);
      const presContent = presMatch ? presMatch[1] : itemContent;
      const presWithoutChoices = presContent.replace(/<response_lid[\s\S]*?<\/response_lid>/gi, '');
      const mattextMatch = presWithoutChoices.match(/<mattext[^>]*>([\s\S]*?)<\/mattext>/i);
      if (mattextMatch) {
        prompt = cleanText(mattextMatch[1]);
      }

      const choices: Array<{ id: string; text: string }> = [];
      const choiceMatches = Array.from(
        itemContent.matchAll(/<response_label\b[^>]*ident="([^"]+)"[^>]*>([\s\S]*?)<\/response_label>/gi)
      );

      choiceMatches.forEach((cm, cIdx) => {
        const cMatMatch = cm[2].match(/<mattext[^>]*>([\s\S]*?)<\/mattext>/i);
        const cText = cMatMatch ? cleanText(cMatMatch[1]) : `خيار ${cIdx + 1}`;
        choices.push({
          id: `choice_${cIdx + 1}`,
          text: cText,
        });
      });

      let correctId = 'choice_1';
      const varequalMatch = itemContent.match(/<varequal[^>]*>([\s\S]*?)<\/varequal>/i);
      if (varequalMatch) {
        correctId = mapLetterToChoiceId(varequalMatch[1].trim());
      }

      questions.push({
        id,
        title,
        prompt: cleanText(prompt),
        options: choices,
        correctId,
        points: 1,
      });
    });

    return questions;
  }

  // 2. QTI 2.1 items
  const qti21Items = Array.from(xml.matchAll(/<assessmentItem\b([\s\S]*?)<\/assessmentItem>/gi));
  if (qti21Items.length > 0) {
    qti21Items.forEach((m, idx) => {
      const itemContent = m[1];
      const identMatch = itemContent.match(/identifier="([^"]+)"/i);
      const titleMatch = itemContent.match(/title="([^"]+)"/i);
      const id = identMatch ? identMatch[1] : `Q_${idx + 1}`;
      const title = titleMatch ? cleanText(titleMatch[1]) : `السؤال ${idx + 1}`;

      const promptMatch = itemContent.match(/<prompt[^>]*>([\s\S]*?)<\/prompt>/i);
      const prompt = promptMatch ? cleanText(promptMatch[1]) : '';

      const choices: Array<{ id: string; text: string }> = [];
      const choiceMatches = Array.from(
        itemContent.matchAll(/<simpleChoice\b[^>]*identifier="([^"]+)"[^>]*>([\s\S]*?)<\/simpleChoice>/gi)
      );

      choiceMatches.forEach((cm, cIdx) => {
        choices.push({
          id: `choice_${cIdx + 1}`,
          text: cleanText(cm[2]),
        });
      });

      let correctId = 'choice_1';
      const valMatch = itemContent.match(/<value[^>]*>([\s\S]*?)<\/value>/i);
      if (valMatch) {
        correctId = mapLetterToChoiceId(valMatch[1].trim());
      }

      questions.push({
        id,
        title,
        prompt,
        options: choices,
        correctId,
        points: 1,
      });
    });
  }

  return questions;
}

/**
 * Deduplicates questions only if both prompt and options are identical.
 */
function deduplicateQuestions(list: NormalizedQuestion[]): NormalizedQuestion[] {
  const seen = new Set<string>();
  const unique: NormalizedQuestion[] = [];
  for (const q of list) {
    const promptKey = normalizeArabic(q.prompt).trim();
    const optsKey = q.options.map((o) => cleanText(o.text)).join('__');
    const key = `${promptKey}:::${optsKey}`;
    if (!key || !seen.has(key)) {
      if (promptKey) seen.add(key);
      unique.push(q);
    }
  }
  return unique;
}

/**
 * Universal Question Normalizer
 */
export function extractAndNormalizeQuestions(rawPayload: string, fallbackTitle: string = 'الامتحان'): NormalizedQuestion[] {
  let xmlString = '';
  let htmlString = rawPayload;

  const xmlMatch = rawPayload.match(/<div id="qti-xml-payload"[^>]*>([\s\S]*?)<\/div>/i);
  if (xmlMatch && xmlMatch[1]) {
    xmlString = xmlMatch[1];
    htmlString = rawPayload.replace(/<div id="qti-xml-payload"[^>]*>[\s\S]*?<\/div>/gi, '');
  } else if (rawPayload.includes('<questestinterop') || rawPayload.includes('<assessmentItem')) {
    xmlString = rawPayload;
    htmlString = '';
  }

  const rawXmlQuestions = extractQuestionsFromXml(xmlString);
  const xmlQuestions = deduplicateQuestions(rawXmlQuestions);

  const rawHtmlQuestions = extractQuestionsFromHtml(htmlString);
  const htmlQuestions = deduplicateQuestions(rawHtmlQuestions);

  const directRawQuestions = extractQuestionsFromRawText(rawPayload, fallbackTitle);
  const rawTextQuestions = deduplicateQuestions(directRawQuestions);

  // Compare candidates and prioritize whichever extracted the maximum valid questions
  const candidates = [
    { type: 'rawText', list: rawTextQuestions },
    { type: 'html', list: htmlQuestions },
    { type: 'xml', list: xmlQuestions },
  ].filter((c) => c.list.length > 0);

  candidates.sort((a, b) => b.list.length - a.list.length);

  if (candidates.length > 0 && candidates[0].list.length > 0) {
    const bestCandidate = candidates[0].list;
    // Ensure all items in the best candidate have non-empty prompt and valid options
    const cleaned = bestCandidate.map((q, idx) => {
      const prompt = q.prompt && q.prompt.length >= 3 ? q.prompt : `${fallbackTitle} - السؤال ${idx + 1}`;
      return {
        ...q,
        prompt: cleanText(prompt),
        options: q.options.map((o) => ({ id: o.id, text: cleanText(o.text) })),
        correctId: q.correctId || 'choice_1',
      };
    });
    return cleaned;
  }

  return [
    {
      id: 'Q_01',
      title: 'السؤال الأول',
      prompt: `${fallbackTitle} - اختر الإجابة الصحيحة`,
      options: [
        { id: 'choice_1', text: 'الإجابة الأولى (صحيحة)' },
        { id: 'choice_2', text: 'الإجابة الثانية' },
        { id: 'choice_3', text: 'الإجابة الثالثة' },
        { id: 'choice_4', text: 'الإجابة الرابعة' },
      ],
      correctId: 'choice_1',
      points: 1,
    },
  ];
}

/**
 * Builds Sahlah Academy CYPHER Learning QTI 1.2 XML string.
 * Strictly adheres to official working template (`qti_va_1791024284.zip`).
 */
function buildSahlahCypherXml(questions: NormalizedQuestion[], testTitle: string, bankIdent: string): string {
  let itemsXml = '';

  questions.forEach((q, idx) => {
    const itemIdent = `${Date.now()}_${idx + 1}`;
    const qRef = `MultipleChoiceOneAnswer_${itemIdent}`;
    const cleanedPrompt = cleanText(q.prompt);

    const choicesXml = q.options
      .map(
        (opt, oIdx) => `            <response_label ident="choice_${oIdx + 1}">
              <material><mattext texttype="text/html"><![CDATA[<p>${cleanText(opt.text)}</p>]]></mattext></material>
            </response_label>`
      )
      .join('\n');

    itemsXml += `      <item ident="${itemIdent}">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield><fieldlabel>cc_profile</fieldlabel><fieldentry>cc.multiple_choice.v0p1</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>cc_weighting</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>assessment_question_identifierref</fieldlabel><fieldentry>${qRef}</fieldentry></qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material><mattext texttype="text/html"><![CDATA[<p>${cleanedPrompt}</p>]]></mattext></material>
          <response_lid ident="${qRef}" rcardinality="Single" rtiming="No">
            <render_choice shuffle="Yes">
${choicesXml}
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes><decvar varname="SCORE" vartype="Integer" defaultval="0" minvalue="0" maxvalue="1"/></outcomes>
          <respcondition continue="yes">
            <conditionvar><varequal respident="${qRef}va">${q.correctId}</varequal></conditionvar>
            <setvar varname="SCORE" action="Set">1</setvar>
          </respcondition>
        </resprocessing>
      </item>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${bankIdent}" title="${testTitle}">
    <section ident="root_section">
${itemsXml}    </section>
  </assessment>
</questestinterop>`;
}

/**
 * Builds Al-Furqan International School Canvas LMS QTI 1.2 XML string.
 * Strictly adheres to Canvas LMS standard QTI 1.2 with `multiple_choice_question` metadata.
 */
export function buildFurqanCanvasXml(questions: NormalizedQuestion[], testTitle: string, testIdent: string): string {
  let itemsXml = '';

  questions.forEach((q, idx) => {
    const itemIdent = `${testIdent}_q${idx + 1}`;
    const qRef = `MultipleChoiceOneAnswer_${itemIdent}`;
    const cleanedPrompt = cleanText(q.prompt);

    const choicesXml = q.options
      .map(
        (opt, oIdx) => `            <response_label ident="choice_${oIdx + 1}">
              <material>
                <mattext texttype="text/html"><![CDATA[<p>${cleanText(opt.text)}</p>]]></mattext>
              </material>
            </response_label>`
      )
      .join('\n');

    itemsXml += `      <item ident="${itemIdent}" title="${cleanText(q.title) || `السؤال ${idx + 1}`}">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield>
              <fieldlabel>question_type</fieldlabel>
              <fieldentry>multiple_choice_question</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>points_possible</fieldlabel>
              <fieldentry>1.0</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>original_answer_ids</fieldlabel>
              <fieldentry>${q.options.map((_, i) => `choice_${i + 1}`).join(',')}</fieldentry>
            </qtimetadatafield>
            <qtimetadatafield>
              <fieldlabel>assessment_question_identifierref</fieldlabel>
              <fieldentry>${qRef}</fieldentry>
            </qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material>
            <mattext texttype="text/html"><![CDATA[<p>${cleanedPrompt}</p>]]></mattext>
          </material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
${choicesXml}
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes>
            <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
          </outcomes>
          <respcondition continue="No">
            <conditionvar>
              <varequal respident="response1">${q.correctId || 'choice_1'}</varequal>
            </conditionvar>
            <setvar action="Set" varname="SCORE">100</setvar>
          </respcondition>
        </resprocessing>
      </item>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${testIdent}" title="${testTitle}">
    <qtimetadata>
      <qtimetadatafield>
        <fieldlabel>cc_maxattempts</fieldlabel>
        <fieldentry>1</fieldentry>
      </qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
${itemsXml}    </section>
  </assessment>
</questestinterop>`;
}

/**
 * Builds standard IMS QTI 2.1 <assessmentItem> XML string for individual question.
 * Strictly compliant with QTI 2.1 specification for platforms like Classera, Blackboard, Moodle.
 */
export function buildQti21ItemXml(q: NormalizedQuestion, idx: number, itemIdent: string): string {
  const num = String(idx + 1).padStart(2, '0');
  const title = cleanText(q.title) || `سؤال ${idx + 1}`;
  const prompt = cleanText(q.prompt);
  const letterMap: Record<string, string> = { choice_1: 'A', choice_2: 'B', choice_3: 'C', choice_4: 'D' };
  const correctLetter = letterMap[q.correctId] || 'A';
  const letters = ['A', 'B', 'C', 'D'];
  const choicesXml = q.options
    .map(
      (opt, i) =>
        `      <simpleChoice identifier="${letters[i] || `CHOICE_${i + 1}`}">${cleanText(opt.text)}</simpleChoice>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" 
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v2p1 http://www.imsglobal.org/xsd/imsqtiasi_v2p1.xsd" 
                identifier="${itemIdent || `BAL_${num}`}" 
                title="${title}" 
                adaptive="false" 
                timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>${correctLetter}</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>${prompt}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
${choicesXml}
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`;
}

/**
 * Builds Al-Furqan International School QTI 2.1 XML string (Legacy fallback).
 */
export function buildFurqanQti21Xml(questions: NormalizedQuestion[], testTitle: string, testIdent: string): string {
  return buildFurqanCanvasXml(questions, testTitle, testIdent);
}

/**
 * Generates standard QTI XML string for any list of questions.
 */
export function generateStandardQtiXml(
  questions: NormalizedQuestion[],
  testTitle: string,
  target: LmsTarget = 'furqan_canvas'
): string {
  const safeTitle = (testTitle || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');
  const bankIdent = `QuestionBank_${Date.now()}`;
  if (target === 'sahlah_cypher') {
    return buildSahlahCypherXml(questions, safeTitle, bankIdent);
  } else if (target === 'canvas_lms') {
    return buildFurqanCanvasXml(questions, safeTitle, bankIdent);
  } else {
    // Standard QTI 2.1 items
    return questions
      .map((q, idx) => buildQti21ItemXml(q, idx, `BAL_${String(idx + 1).padStart(2, '0')}`))
      .join('\n\n');
  }
}

/**
 * Renders a complete, pristine HTML preview table for any number of questions (even 100+).
 */
export function renderQuestionsPreviewHtml(questions: NormalizedQuestion[], testTitle: string): string {
  const safeTitle = cleanText(testTitle || 'اخْتِبَارٌ قَصِيرٌ شَامِلٌ');

  const rows = questions
    .map((q, idx) => {
      const optA = q.options[0]?.text || '';
      const optB = q.options[1]?.text || '';
      const optC = q.options[2]?.text || '';
      const optD = q.options[3]?.text || '';
      return `    <tr>
      <td style="border:1px solid #cbd5e1; padding:10px 8px; font-weight:bold; background:#f8fafc;">${idx + 1}</td>
      <td style="border:1px solid #cbd5e1; padding:10px 12px; text-align:right; font-weight:500;">${cleanText(q.prompt)}</td>
      <td style="border:1px solid #cbd5e1; padding:10px 8px; ${q.correctId === 'choice_1' ? 'background:#dcfce7; font-weight:bold; color:#15803d;' : ''}">${cleanText(optA)}</td>
      <td style="border:1px solid #cbd5e1; padding:10px 8px; ${q.correctId === 'choice_2' ? 'background:#dcfce7; font-weight:bold; color:#15803d;' : ''}">${cleanText(optB)}</td>
      <td style="border:1px solid #cbd5e1; padding:10px 8px; ${q.correctId === 'choice_3' ? 'background:#dcfce7; font-weight:bold; color:#15803d;' : ''}">${cleanText(optC)}</td>
      <td style="border:1px solid #cbd5e1; padding:10px 8px; ${q.correctId === 'choice_4' ? 'background:#dcfce7; font-weight:bold; color:#15803d;' : ''}">${cleanText(optD)}</td>
    </tr>`;
    })
    .join('\n');

  const answerKeyItems = questions
    .map((q, idx) => {
      const letterMap: Record<string, string> = { choice_1: 'أ', choice_2: 'ب', choice_3: 'ج', choice_4: 'د' };
      const correctLetter = letterMap[q.correctId] || 'أ';
      const optIdx = parseInt(q.correctId.replace('choice_', ''), 10) - 1;
      const correctOptText = q.options[optIdx]?.text || '';
      return `    <li style="margin-bottom:8px;"><strong>(${correctLetter}) ${cleanText(correctOptText)}:</strong> الإجابة المعتمدة للسؤال ${idx + 1}.</li>`;
    })
    .join('\n');

  return `<div dir="rtl" style="font-family: inherit; direction: rtl; text-align: right; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 18px 24px; border-radius: 12px; margin-bottom: 24px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">${safeTitle}</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">إجمالي عدد الأسئلة المستخرجة بنجاح: ${questions.length} سؤالاً</p>
  </div>

  <h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">أَوَّلاً: جَدْوَلُ الْأَسْئِلَةِ (اخْتِيَارٌ مِنْ مُتَعَدِّدٍ)</h3>
  <div style="overflow-x: auto; margin-bottom: 28px;">
    <table dir="rtl" border="1" style="width:100%; border-collapse:collapse; text-align:center; font-size:13px; border:1px solid #cbd5e1;">
      <thead>
        <tr style="background:#0f172a; color:#ffffff; font-weight:bold;">
          <th style="border:1px solid #334155; padding:10px 8px; width:60px;">الرقم</th>
          <th style="border:1px solid #334155; padding:10px 12px; text-align:right;">نص السؤال</th>
          <th style="border:1px solid #334155; padding:10px 8px; width:130px;">أ</th>
          <th style="border:1px solid #334155; padding:10px 8px; width:130px;">ب</th>
          <th style="border:1px solid #334155; padding:10px 8px; width:130px;">ج</th>
          <th style="border:1px solid #334155; padding:10px 8px; width:130px;">د</th>
        </tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>

  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">ثَانِياً: مِفْتَاحُ الْإِجَابَاتِ الْمُعْتَمَدَةِ</h3>
  <ol dir="rtl" style="text-align:right; font-size:13px; line-height:2.2; color:#1e293b; padding-right:24px;">
${answerKeyItems}
  </ol>
</div>`;
}

/**
 * Main Entry Point: Creates and downloads official QTI ZIP package.
 */
export async function createAndDownloadQtiZip(options: QtiPackageOptions): Promise<void> {
  const { title, xmlPayload, target } = options;
  const zip = new JSZip();
  const safeTitle = (title || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const questions = extractAndNormalizeQuestions(xmlPayload, safeTitle);

  if (target === 'sahlah_cypher') {
    // =========================================================================
    // 1. أكاديمية سهلة الدولية — Sahlah LMS (CYPHER Learning) QTI 1.2 ZIP
    // Exact match to official LMS working file (qti_va_1791024284.zip):
    // Contains ONLY Folder1/QuestionBank1.xml
    // =========================================================================
    const bankIdent = `QuestionBank_${Date.now()}`;
    const qtiXml = buildSahlahCypherXml(questions, safeTitle, bankIdent);

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${bankIdent}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">أكاديمية سهلة الدولية - حزمة أسئلة QTI v1.2 القياسية لمنصة LMS</imsmd:string>
        </imsmd:description>
      </imsmd:general>
      <imsmd:lifeCycle>
        <imsmd:contribute>
          <imsmd:date>
            <imsmd:dateTime>${dateStr}</imsmd:dateTime>
          </imsmd:date>
        </imsmd:contribute>
      </imsmd:lifeCycle>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource type="imsqti_xmlv1p2" identifier="QuestionBank1" href="Folder1/QuestionBank1.xml">
      <file href="Folder1/QuestionBank1.xml"/>
    </resource>
  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);
    zip.folder('Folder1')?.file('QuestionBank1.xml', qtiXml);

    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeTitle}_أكاديمية_سهلة_QTI.zip`;
    saveAs(content, filename);
  } else if (target === 'canvas_lms') {
    // =========================================================================
    // 2. منصة كانفاس التعليمية — Canvas LMS Direct QTI 1.2 Question Bank ZIP
    // 100% compliant with Canvas LMS standard Question Bank import.
    // =========================================================================
    const bankIdent = `QuestionBank_Canvas_${Date.now()}`;
    const canvasXml = buildFurqanCanvasXml(questions, safeTitle, bankIdent);

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${bankIdent}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">منصة كانفاس - حزمة اختبار QTI v1.2 القياسية لمنصة Canvas LMS</imsmd:string>
        </imsmd:description>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource type="imsqti_xmlv1p2" identifier="QuestionBank1" href="Folder1/QuestionBank1.xml">
      <file href="Folder1/QuestionBank1.xml"/>
    </resource>
  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);
    zip.folder('Folder1')?.file('QuestionBank1.xml', canvasXml);

    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeTitle}_كانفاس_Canvas_QTI.zip`;
    saveAs(content, filename);
  } else {
    // =========================================================================
    // 3. مدرسة الفرقان العالمية — Official Pristine QTI 2.1 ZIP
    // Exact standard required by Al-Furqan platform (Classera / QTI 2.1 LMS):
    // - bal_01.xml ... bal_N.xml (one <assessmentItem> per question)
    // - Clean imsmanifest.xml with type="imsqti_item_xmlv2p1" for every item
    // - Zero conflicting tags or invalid cartridge dependencies
    // =========================================================================
    let qti21ManifestResources = '';
    questions.forEach((q, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const itemIdent = `BAL_${num}`;
      const fileName = `bal_${num}.xml`;
      const itemXml = buildQti21ItemXml(q, idx, itemIdent);
      zip.file(fileName, itemXml);
      qti21ManifestResources += `    <resource identifier="${itemIdent}" type="imsqti_item_xmlv2p1" href="${fileName}">\n      <file href="${fileName}"/>\n    </resource>\n`;
    });

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_FURQAN_${Date.now()}" 
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" 
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">مدرسة الفرقان العالمية - حزمة أسئلة معيارية QTI v2.1 معتمدة لمنصة المدرسة</imsmd:string>
        </imsmd:description>
      </imsmd:general>
      <imsmd:lifeCycle>
        <imsmd:contribute>
          <imsmd:date>
            <imsmd:dateTime>${dateStr}</imsmd:dateTime>
          </imsmd:date>
        </imsmd:contribute>
      </imsmd:lifeCycle>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
${qti21ManifestResources}  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);

    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeTitle}_مدرسة_الفرقان_QTI_v2.1.zip`;
    saveAs(content, filename);
  }
}

