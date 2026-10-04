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

  // 3. Check for <ol> list items where index is implicit or explicit
  const olMatches = Array.from(answerKeyHtml.matchAll(/<ol[^>]*>([\s\S]*?)<\/ol>/gi));
  for (const olM of olMatches) {
    const liMatches = Array.from(olM[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
    liMatches.forEach((liM, idx) => {
      const qNum = idx + 1;
      const liText = liM[1].replace(/<[^>]+>/g, ' ').trim();
      const explicitNumMatch = liText.match(/^(?:س\s*|السؤال\s*)?(\d+)[\s:\-ـ\.]*[\(（]?\s*([أ-دA-D])/i);
      if (explicitNumMatch) {
        keys[parseInt(explicitNumMatch[1], 10)] = explicitNumMatch[2];
      } else {
        const letterMatch = liText.match(/[\(（]\s*([أ-دA-D])\s*[\)）]/i);
        if (letterMatch) {
          keys[qNum] = letterMatch[1];
        }
      }
    });
  }

  // 4. Fallback: match any line with question number and letter
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
 * Helper to extract multiple choices and detect correct choice from a single cell or text block.
 * Handles:
 * - Line-by-line options (e.g. أ) خيار ... ب) خيار ... (صحيحة))
 * - Inline options (e.g. أ) ... ب) ... ج) ... د) ...)
 * - Green colored text or tags indicating correct answer
 */
function extractChoicesFromCellOrText(content: string): {
  choices: Array<{ id: string; text: string }>;
  correctLetter?: string;
} {
  const choices: Array<{ id: string; text: string }> = [];
  let correctLetter: string | undefined;

  const cleanLines = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Try line-by-line first
  const optLineRegex = /^[\(（]?([أ-دA-D1-4])[\)）\.\-:]\s*(.*)$/i;
  for (const line of cleanLines) {
    const m = line.match(optLineRegex);
    if (m) {
      const letter = m[1];
      let txt = m[2].trim();
      const isCorrect =
        /\(صحيحة\)|\(الصح\)|✓|✔|correct|صحيح/i.test(line) ||
        /color\s*:\s*(?:green|#16a34a|#15803d|#22c55e|#059669)/i.test(content && line);
      if (isCorrect && !correctLetter) {
        correctLetter = letter;
      }
      txt = txt.replace(/\(صحيحة\)|\(الصح\)|✓|✔/gi, '').trim();
      choices.push({
        id: `choice_${choices.length + 1}`,
        text: cleanText(txt),
      });
    }
  }

  // 2. If line-by-line didn't find at least 2 choices, try inline regex
  if (choices.length < 2) {
    const inlineText = cleanLines.join(' ');
    const inlineRegex = /[\(（]?([أ-دA-D])[\)）\.\-:]\s*([^أ-دA-D\(（]+)/gi;
    const matches = Array.from(inlineText.matchAll(inlineRegex));
    if (matches.length >= 2) {
      choices.length = 0;
      for (const m of matches) {
        const letter = m[1];
        let txt = m[2].trim();
        const isCorrect =
          /\(صحيحة\)|\(الصح\)|✓|✔|correct|صحيح/i.test(txt) ||
          /color\s*:\s*(?:green|#16a34a|#15803d|#22c55e|#059669)/i.test(content);
        if (isCorrect && !correctLetter) {
          correctLetter = letter;
        }
        txt = txt.replace(/\(صحيحة\)|\(الصح\)|✓|✔/gi, '').trim();
        choices.push({
          id: `choice_${choices.length + 1}`,
          text: cleanText(txt),
        });
      }
    }
  }

  return { choices, correctLetter };
}

/**
 * Extracts questions from an HTML Table format (Format 1: جدول الأسئلة)
 * Supports:
 * - 6 columns: [رقم السؤال | السؤال | أ | ب | ج | د]
 * - 5 columns with bundled options in cell 2: [رقم السؤال | نص السؤال | الخيارات | التعليل | الدرجة]
 * - 4 columns with bundled options: [رقم السؤال | نص السؤال | الخيارات | التعليل]
 * - 5 columns without number: [السؤال | أ | ب | ج | د]
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
      if (cellMatches.length < 2) continue;

      // Check if any cell has bundled choices:
      let bundledCellIdx = -1;
      let bundledData: { choices: Array<{ id: string; text: string }>; correctLetter?: string } = {
        choices: [],
      };

      for (let cIdx = 0; cIdx < cellMatches.length; cIdx++) {
        const testRes = extractChoicesFromCellOrText(cellMatches[cIdx][1]);
        if (testRes.choices.length >= 2) {
          bundledCellIdx = cIdx;
          bundledData = testRes;
          break;
        }
      }

      let qNum = questions.length + 1;
      let promptText = '';
      let choices: Array<{ id: string; text: string }> = [];
      let correctLetter = '';

      if (bundledCellIdx >= 1) {
        // Bundled choices found in a cell!
        if (bundledCellIdx === 1) {
          // cell 0 is prompt (or contains number + prompt)
          promptText = cleanText(cellMatches[0][1]);
          const numMatch = promptText.match(/^(\d+)[\.\-\)]\s*(.*)$/);
          if (numMatch) {
            qNum = parseInt(numMatch[1], 10);
            promptText = numMatch[2];
          }
        } else if (bundledCellIdx >= 2) {
          // cell 0 is number, cell 1 is prompt
          const numCell = cleanText(cellMatches[0][1]).replace(/[^0-9]/g, '');
          if (numCell) {
            const parsed = parseInt(numCell, 10);
            if (!isNaN(parsed)) qNum = parsed;
          }
          promptText = cleanText(cellMatches[1][1]);
        }
        choices = bundledData.choices;
        correctLetter = bundledData.correctLetter || answerKeys[qNum] || 'أ';
      } else if (cellMatches.length >= 6) {
        // Standard 6 columns: [Num, Prompt, A, B, C, D]
        const numCell = cleanText(cellMatches[0][1]).replace(/[^0-9]/g, '');
        if (numCell) {
          const parsed = parseInt(numCell, 10);
          if (!isNaN(parsed)) qNum = parsed;
        }
        promptText = cleanText(cellMatches[1][1]);
        const cleanOptionPrefix = (txt: string) => txt.replace(/^[أ-دA-D][\)\.\-:]\s*/, '').trim();
        const optA = cleanOptionPrefix(cleanText(cellMatches[2][1]));
        const optB = cleanOptionPrefix(cleanText(cellMatches[3][1]));
        const optC = cleanOptionPrefix(cleanText(cellMatches[4][1]));
        const optD = cleanOptionPrefix(cleanText(cellMatches[5][1]));
        choices = [
          { id: 'choice_1', text: optA || 'الخيار أ' },
          { id: 'choice_2', text: optB || 'الخيار ب' },
          { id: 'choice_3', text: optC || 'الخيار ج' },
          { id: 'choice_4', text: optD || 'الخيار د' },
        ].filter((o) => Boolean(o.text));
        correctLetter = answerKeys[qNum] || 'أ';
      } else if (cellMatches.length === 5) {
        // 5 columns: Prompt, A, B, C, D
        promptText = cleanText(cellMatches[0][1]);
        const numMatch = promptText.match(/^(\d+)[\.\-\)]\s*(.*)$/);
        if (numMatch) {
          qNum = parseInt(numMatch[1], 10);
          promptText = numMatch[2];
        }
        const cleanOptionPrefix = (txt: string) => txt.replace(/^[أ-دA-D][\)\.\-:]\s*/, '').trim();
        const optA = cleanOptionPrefix(cleanText(cellMatches[1][1]));
        const optB = cleanOptionPrefix(cleanText(cellMatches[2][1]));
        const optC = cleanOptionPrefix(cleanText(cellMatches[3][1]));
        const optD = cleanOptionPrefix(cleanText(cellMatches[4][1]));
        choices = [
          { id: 'choice_1', text: optA || 'الخيار أ' },
          { id: 'choice_2', text: optB || 'الخيار ب' },
          { id: 'choice_3', text: optC || 'الخيار ج' },
          { id: 'choice_4', text: optD || 'الخيار د' },
        ].filter((o) => Boolean(o.text));
        correctLetter = answerKeys[qNum] || 'أ';
      }

      if (promptText && choices.length >= 2) {
        questions.push({
          id: `Q_${qNum}`,
          title: `السؤال ${qNum}`,
          prompt: promptText,
          options: choices,
          correctId: mapLetterToChoiceId(correctLetter || 'أ'),
          points: 1,
        });
      }
    }
  }

  return questions;
}

/**
 * Extracts questions from inline pipe-separated or inline formatted text:
 * Example: 1. نص السؤال؟ أ) خيار 1 | ب) خيار 2 | ج) خيار 3 | د) خيار 4
 */
export function extractQuestionsFromInlineText(
  plainText: string,
  answerKeys: Record<number, string>
): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  // Pattern matching question stem followed by inline options
  const qBlocks = plainText.split(
    /(?:^|\n)\s*(?:[\*\#\-\s]*)(?:س\s*|السؤال\s*)?(\d+)[\.\-\:\)]\s*/gi
  );

  if (qBlocks.length < 3) return questions;

  for (let i = 1; i < qBlocks.length; i += 2) {
    const qNum = parseInt(qBlocks[i], 10);
    const content = qBlocks[i + 1] || '';

    // Check if content has inline choices like أ) ... ب) ... or |
    const optMatch = content.match(
      /^(.*?)(?:[\s\|\;\،]*)[\(（]?أ[\)）\.\-:]\s*(.*?)(?:[\s\|\;\،]*)[\(（]?ب[\)）\.\-:]\s*(.*?)(?:[\s\|\;\،]*)[\(（]?ج[\)）\.\-:]\s*(.*?)(?:[\s\|\;\،]*)[\(（]?د[\)）\.\-:]\s*([^\n]*)/i
    );

    if (optMatch) {
      const prompt = cleanText(optMatch[1]);
      const optA = cleanText(optMatch[2]);
      const optB = cleanText(optMatch[3]);
      const optC = cleanText(optMatch[4]);
      const optD = cleanText(optMatch[5]);

      if (prompt && optA && optB) {
        const correctLetter = answerKeys[qNum] || answerKeys[questions.length + 1] || 'أ';
        questions.push({
          id: `Q_${qNum}`,
          title: `السؤال ${qNum}`,
          prompt,
          options: [
            { id: 'choice_1', text: optA },
            { id: 'choice_2', text: optB },
            { id: 'choice_3', text: optC || 'الخيار ج' },
            { id: 'choice_4', text: optD || 'الخيار د' },
          ],
          correctId: mapLetterToChoiceId(correctLetter),
          points: 1,
        });
      }
    }
  }

  return questions;
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

  // Strategy 1: Extract from HTML Tables (Image 2 format)
  const tableQuestions = extractQuestionsFromHtmlTable(questionsHtml, answerKeys);
  if (tableQuestions.length >= 2) {
    return tableQuestions;
  }

  // Clean HTML to text for string parsing
  const plainText = questionsHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');

  // Strategy 2: Extract from Inline Pipe or Parentheses format (Image 1 format)
  const inlineQuestions = extractQuestionsFromInlineText(plainText, answerKeys);
  if (inlineQuestions.length >= 2) {
    return inlineQuestions;
  }

  // Strategy 3: Standard multi-line list parser
  const lines = plainText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: NormalizedQuestion[] = [];
  let currentQ: { prompt: string; options: Array<{ id: string; text: string }> } | null = null;
  const optRegex = /^([أ-دA-D])\s*[\)\.\-:]\s*(.*)$/i;

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

    const isQHeader =
      /^(\d+[\.\-\)]|س\s*\d+|السؤال\s*(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+))/i.test(
        norm
      );

    if (isQHeader) {
      if (currentQ && currentQ.options.length >= 2) {
        const qIndex = questions.length + 1;
        const correctLetter = answerKeys[qIndex] || 'أ';
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
        currentQ.options.push({
          id: `choice_${optIdx}`,
          text: cleanText(match[2]),
        });
      }
    } else if (currentQ && currentQ.options.length === 0) {
      currentQ.prompt = (currentQ.prompt + ' ' + line).trim();
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    const qIndex = questions.length + 1;
    const correctLetter = answerKeys[qIndex] || 'أ';
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
 * Deduplicates questions by prompt text.
 */
function deduplicateQuestions(list: NormalizedQuestion[]): NormalizedQuestion[] {
  const seen = new Set<string>();
  const unique: NormalizedQuestion[] = [];
  for (const q of list) {
    const key = normalizeArabic(q.prompt).slice(0, 35);
    if (!key || !seen.has(key)) {
      if (key) seen.add(key);
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
  let sourceText = '';

  const sourceMatch = rawPayload.match(/<div id="raw-source-text"[^>]*>([\s\S]*?)<\/div>/i);
  if (sourceMatch && sourceMatch[1]) {
    sourceText = sourceMatch[1];
    htmlString = htmlString.replace(/<div id="raw-source-text"[^>]*>[\s\S]*?<\/div>/gi, '');
  }

  const xmlMatch = htmlString.match(/<div id="qti-xml-payload"[^>]*>([\s\S]*?)<\/div>/i);
  if (xmlMatch && xmlMatch[1]) {
    xmlString = xmlMatch[1];
    htmlString = htmlString.replace(/<div id="qti-xml-payload"[^>]*>[\s\S]*?<\/div>/gi, '');
  } else if (rawPayload.includes('<questestinterop') || rawPayload.includes('<assessmentItem')) {
    xmlString = rawPayload;
    htmlString = '';
  }

  const rawXmlQuestions = extractQuestionsFromXml(xmlString);
  const xmlQuestions = deduplicateQuestions(rawXmlQuestions);
  const rawHtmlQuestions = extractQuestionsFromHtml(htmlString);
  const htmlQuestions = deduplicateQuestions(rawHtmlQuestions);
  const rawTextQuestions = sourceText ? deduplicateQuestions(extractQuestionsFromHtml(sourceText)) : [];

  // Find candidate list that has the most valid questions
  const candidates = [
    { name: 'html', list: htmlQuestions },
    { name: 'xml', list: xmlQuestions },
    { name: 'text', list: rawTextQuestions },
  ].filter((c) => c.list.length > 0 && c.list.every((q) => q.prompt && q.options.length >= 2));

  candidates.sort((a, b) => b.list.length - a.list.length);

  if (candidates.length > 0 && candidates[0].list.length > 0) {
    return candidates[0].list;
  }

  // Scenario 2: Rely on HTML questions if available
  if (htmlQuestions.length > 0) {
    return htmlQuestions;
  }

  // Scenario 3: XML has choices, but prompt is empty/short
  if (xmlQuestions.length > 0 && xmlQuestions.some((q) => q.options.length >= 2)) {
    return xmlQuestions.map((xmlQ, idx) => {
      const htmlQ = htmlQuestions[idx] || rawTextQuestions[idx];
      const validPrompt =
        (xmlQ.prompt && xmlQ.prompt.length >= 5 ? xmlQ.prompt : '') ||
        (htmlQ?.prompt && htmlQ.prompt.length >= 5 ? htmlQ.prompt : '') ||
        `${fallbackTitle} - السؤال ${idx + 1}: اختر البديل الصحيح مما يلي:`;

      const options = xmlQ.options.length >= 2 ? xmlQ.options : htmlQ?.options || [];
      const correctId = xmlQ.correctId || htmlQ?.correctId || 'choice_1';

      return {
        ...xmlQ,
        prompt: cleanText(validPrompt),
        options: options.map((o) => ({ id: o.id, text: cleanText(o.text) })),
        correctId,
      };
    });
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
export function buildSahlahCypherXml(questions: NormalizedQuestion[], testTitle: string, bankIdent: string): string {
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
 * Builds Al-Furqan International School QTI 2.1 XML string.
 */
export function buildFurqanQti21Xml(questions: NormalizedQuestion[], testTitle: string, testIdent: string): string {
  const items21 = questions.map((q, idx) => {
    const qIdent = q.id || `Q_${idx + 1}`;
    const simpleChoices = q.options
      .map((c) => `      <simpleChoice identifier="${c.id}">${cleanText(c.text)}</simpleChoice>`)
      .join('\n');

    return `    <assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" 
                    identifier="${qIdent}" 
                    title="${cleanText(q.title) || `السؤال ${idx + 1}`}" 
                    adaptive="false" 
                    timeDependent="false">
      <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
        <correctResponse><value>${q.correctId}</value></correctResponse>
      </responseDeclaration>
      <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
        <defaultValue><value>0</value></defaultValue>
      </outcomeDeclaration>
      <itemBody>
        <prompt>${cleanText(q.prompt)}</prompt>
        <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
${simpleChoices}
        </choiceInteraction>
      </itemBody>
      <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
    </assessmentItem>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" 
                identifier="${testIdent}" 
                title="${testTitle}">
  <testPart identifier="part_01" navigationMode="nonlinear" submissionMode="individual">
    <assessmentSection identifier="section_01" title="General Assessment" visible="true">
${items21.join('\n\n')}
    </assessmentSection>
  </testPart>
</assessmentTest>`;
}

/**
 * Generates standard QTI XML string for any list of questions.
 */
export function generateStandardQtiXml(
  questions: NormalizedQuestion[],
  testTitle: string,
  target: LmsTarget = 'sahlah_cypher'
): string {
  const safeTitle = (testTitle || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');
  const bankIdent = `QuestionBank_${Date.now()}`;
  if (target === 'sahlah_cypher') {
    return buildSahlahCypherXml(questions, safeTitle, bankIdent);
  } else {
    return buildFurqanQti21Xml(questions, safeTitle, bankIdent);
  }
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
  } else {
    // =========================================================================
    // 2. مدرسة الفرقان العالمية — QTI v2.1 ZIP
    // =========================================================================
    const testIdent = `FURQAN_TEST_${Date.now()}`;
    const fullTestXml = buildFurqanQti21Xml(questions, safeTitle, testIdent);

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" 
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" 
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1" 
          identifier="MANIFEST_FURQAN_QTI21_${Date.now()}">
  <metadata>
    <schema>QTIv2.1</schema>
    <schemaversion>2.1</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">مدرسة الفرقان العالمية - حزمة اختبار QTI v2.1 القياسية المعتمدة</imsmd:string>
        </imsmd:description>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="RES_FURQAN_QTI21" type="imsqti_test_xmlv2p1" href="assessment_qti21.xml">
      <file href="assessment_qti21.xml"/>
    </resource>
  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);
    zip.file('assessment_qti21.xml', fullTestXml);

    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeTitle}_الفرقان_العالمية_QTI_v2.1.zip`;
    saveAs(content, filename);
  }
}
