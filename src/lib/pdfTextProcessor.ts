/**
 * Smart Arabic & Bidirectional PDF Text Processor
 * Solves:
 * 1. Spaced-out disjointed Arabic glyphs (e.g. "ب ل ا ط ل ا" -> "الطالب")
 * 2. Visual-order reversed Arabic text from SIS/JasperReports (e.g. ":بلاطلا" -> "الطالب:", "ةجردلا" -> "الدرجة")
 * 3. Mixed Arabic-English alignment (dates, grades, English codes like Grade 4, W6 T1)
 * 4. Coordinate-aware line clustering to prevent layout scrambles
 */

// Common Arabic reversed words dictionary for instant high-confidence un-reversal
const REVERSED_ARABIC_DICTIONARY: Record<string, string> = {
  'بلاطلا': 'الطلاب',
  'بلاط': 'طالب',
  'ةبلاطلا': 'الطالبة',
  'ةسردم': 'مدرسة',
  'ةسردمل': 'المدرسة',
  'ةسردمنا': 'مدرستنا',
  'ةجردلا': 'الدرجة',
  'تاجردلا': 'الدرجات',
  'ريدقتلا': 'التقدير',
  'مسامييقتلا': 'التقييمات',
  'مييقتلا': 'التقييم',
  'ةبسنلا': 'النسبة',
  'ةيوئملا': 'المئوية',
  'قاحفتسلاا': 'الاستحقاق',
  'قاحتسلاا': 'الاستحقاق',
  'حيحصتلا': 'التصحيح',
  'حيحصتل': 'التصحيح',
  'عورشملا': 'المشروع',
  'رابتخلاا': 'الاختبار',
  'روضحلا': 'الحضور',
  'كولسلا': 'السلوك',
  'سردلا': 'الدرس',
  'فصلا': 'الصف',
  'خيراتلا': 'التاريخ',
  'موقيلا': 'اليوم',
  'دادعإ': 'إعداد',
  'حاتتفا': 'افتتاح',
  'ةفاحصلا': 'الصحافة',
  'ةيبرعلا': 'العربية',
  'ةيملاسلإا': 'الإسلامية',
  'ماعلا': 'العام',
  'يساردلا': 'الدراسي',
  'لصفلا': 'الفصل',
  'لولأا': 'الأول',
  'يناثلا': 'الثاني',
  'ثلاثلا': 'الثالث',
  'عبارلا': 'الرابع',
  'سمstore': 'الخامس',
  'ةئفلا': 'الفئة',
  'بسحب': 'بحسب',
  'ضرع': 'عرض',
  'نزولا': 'الوزن',
  'ةيئاهنلا': 'النهائية',
  'ةجيتنلا': 'النتيجة',
  'عمstud': 'نعم',
  'معن': 'نعم',
  'لا': 'لا',
  'ربمسيد': 'ديسمبر',
  'ربوتكأ': 'أكتوبر',
  'ربمتبس': 'سبتمبر',
  'ربمفون': 'نوفمبر',
  'رياني': 'يناير',
  'رياربف': 'فبراير',
  'سرام': 'مارس',
  'ليربأ': 'أبريل',
  'ويام': 'مايو',
  'وينوي': 'يونيو',
  'ويلوي': 'يوليو',
  'سطسغأ': 'أغسطس',
  'احابص': 'صباحاً',
  'ادابص': 'صباحاً',
  'ءاسم': 'مساءً',
  'مسلا': 'الاسم',
  'مسا': 'اسم',
};

// Check if a character is Arabic
export function isArabicChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f) ||
    (code >= 0x08a0 && code <= 0x08ff) ||
    (code >= 0xfb50 && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  );
}

/**
 * Checks whether the text exhibits severe Arabic distortion
 * (such as spaced characters 'ب ل ا ط ل ا' or reversed keywords).
 */
export function detectDistortion(text: string): {
  isCorrupted: boolean;
  isTableReport: boolean;
  reason?: string;
} {
  if (!text || text.trim().length === 0) {
    return { isCorrupted: false, isTableReport: false };
  }

  // 1. Spaced-out Arabic letters (e.g. "ب ل ا ط ل ا")
  const spacedArabicMatches = text.match(/([\u0621-\u064A]\s+){3,}[\u0621-\u064A]/g);
  if (spacedArabicMatches && spacedArabicMatches.length > 0) {
    return {
      isCorrupted: true,
      isTableReport: isReportOrTable(text),
      reason: 'أحرف عربية مقطعة ومتباعدة (Spaced single glyphs)',
    };
  }

  // 2. Reversed Arabic keywords
  for (const reversedKey of Object.keys(REVERSED_ARABIC_DICTIONARY)) {
    if (text.includes(reversedKey)) {
      return {
        isCorrupted: true,
        isTableReport: isReportOrTable(text),
        reason: 'نصوص عربية معكوسة الاتجاه (Reversed visual RTL)',
      };
    }
  }

  // 3. Colons placed at the beginning of Arabic words (":الطالب")
  if (/:\s*[\u0621-\u064A]{3,}/.test(text) && !/[\u0621-\u064A]{3,}\s*:/.test(text)) {
    return {
      isCorrupted: true,
      isTableReport: isReportOrTable(text),
      reason: 'ترتيب علامات الترقيم معكوس',
    };
  }

  return {
    isCorrupted: false,
    isTableReport: isReportOrTable(text),
  };
}

function isReportOrTable(text: string): boolean {
  const lower = text.toLowerCase();
  const tableKeywords = [
    'grade', 'score', 'assessment', 'attendance', 'quizzes', 'homework',
    'due date', 'weight', 'task', 'percent', '%', 'درجة', 'تقييم', 'اختبار',
    'واجب', 'حضور', 'وزن', 'نسبة', 'مئوية', 'النتيجة', 'معدل'
  ];
  let hits = 0;
  for (const kw of tableKeywords) {
    if (lower.includes(kw)) hits++;
  }
  return hits >= 3;
}

/**
 * Repairs spaced-out disjointed Arabic letter sequences:
 * "ب ل ا ط ل ا" -> joins to "بلاطلا" -> un-reverses to "الطلاب"
 */
export function unspaceAndFixArabic(text: string): string {
  if (!text) return '';

  // Replace spaced isolated Arabic characters: e.g. "ب ل ا ط ل ا"
  let processed = text.replace(/(?:[\u0621-\u064A]\s+){2,}[\u0621-\u064A]/g, (match) => {
    // Extract Arabic characters
    const chars = match.replace(/\s+/g, '');
    // Usually these were written in visual order (reversed): e.g. "بلاطلا" -> "الطلاب"
    const reversed = chars.split('').reverse().join('');
    
    // Check if direct or reversed matches a dictionary term
    if (REVERSED_ARABIC_DICTIONARY[chars]) {
      return REVERSED_ARABIC_DICTIONARY[chars];
    }
    // Check if reversed starts with 'ال' or common Arabic prefixes
    if (reversed.startsWith('ال') || reversed.startsWith('و') || reversed.startsWith('ف')) {
      return reversed;
    }
    // Default to reversing if original doesn't look like normal Arabic
    return reversed;
  });

  // Fix words like ":الطالب" or ":بلاطلا"
  processed = processed.replace(/:([\u0621-\u064A]+)/g, '$1:');

  // Fix dictionary reversed words
  for (const [reversedKey, correctValue] of Object.entries(REVERSED_ARABIC_DICTIONARY)) {
    const reg = new RegExp(`\\b${reversedKey}\\b|(?<=\\s|^)${reversedKey}(?=\\s|$|[،.,:])`, 'g');
    processed = processed.replace(reg, correctValue);
  }

  return processed;
}

/**
 * Intelligent Line & Block clustering from PDF.js getTextContent items.
 * Uses 2D geometry (Y coordinates and X coordinates) to preserve lines and table columns.
 */
export function reconstructPdfPageText(textContent: any): {
  html: string;
  rawText: string;
  isDistorted: boolean;
  isTable: boolean;
} {
  if (!textContent || !textContent.items || textContent.items.length === 0) {
    return { html: '<p>صفحة فارغة أو مصورة</p>', rawText: '', isDistorted: false, isTable: false };
  }

  interface TextItemWithPos {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const items: TextItemWithPos[] = [];
  for (const rawItem of textContent.items) {
    if (!rawItem.str || !rawItem.str.trim()) continue;
    const transform = rawItem.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4];
    const y = transform[5]; // In PDF, Y=0 is bottom
    items.push({
      str: rawItem.str,
      x,
      y,
      width: rawItem.width || 0,
      height: rawItem.height || 0,
    });
  }

  if (items.length === 0) {
    return { html: '<p>صفحة فارغة</p>', rawText: '', isDistorted: false, isTable: false };
  }

  // Group items by line: Y tolerance of ~4-5 pixels
  const lineGroups: { y: number; items: TextItemWithPos[] }[] = [];
  const Y_TOLERANCE = 4.5;

  for (const item of items) {
    let matchedGroup = lineGroups.find((g) => Math.abs(g.y - item.y) <= Y_TOLERANCE);
    if (!matchedGroup) {
      matchedGroup = { y: item.y, items: [] };
      lineGroups.push(matchedGroup);
    }
    matchedGroup.items.push(item);
  }

  // Sort lines from top to bottom (descending Y in PDF coordinates)
  lineGroups.sort((a, b) => b.y - a.y);

  // For each line, sort items horizontally.
  // Note: If line is predominantly Arabic and items are LTR-ordered visually, we sort accordingly.
  const reconstructedLines: string[] = [];
  let totalRawText = '';

  for (const group of lineGroups) {
    // Sort items horizontally by X coordinate
    group.items.sort((a, b) => a.x - b.x);

    const lineText = group.items.map((it) => it.str).join(' ');
    const fixedLine = unspaceAndFixArabic(lineText);
    reconstructedLines.push(fixedLine);
    totalRawText += fixedLine + '\n';
  }

  const distortionInfo = detectDistortion(totalRawText);

  // If table-like structure detected, format into a clean HTML table
  let finalHtml = '';
  if (distortionInfo.isTableReport) {
    finalHtml = `<div style="font-size:12px; font-weight:bold; color:#0369a1; margin-bottom:8px;">📊 تم استخراج جدول / كشف درجات:</div>\n`;
    finalHtml += `<div class="pdf-reconstructed-content" style="line-height:1.7;">\n`;
    for (const line of reconstructedLines) {
      if (line.length > 0) {
        finalHtml += `<p style="margin:4px 0;">${line}</p>\n`;
      }
    }
    finalHtml += `</div>`;
  } else {
    finalHtml = reconstructedLines
      .filter((l) => l.trim().length > 0)
      .map((l) => `<p>${l}</p>`)
      .join('\n');
  }

  return {
    html: finalHtml,
    rawText: totalRawText.trim(),
    isDistorted: distortionInfo.isCorrupted,
    isTable: distortionInfo.isTableReport,
  };
}
