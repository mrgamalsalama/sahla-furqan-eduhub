import JSZip from 'jszip';
import type { UploadedFile } from '@/types';
import { uid } from './storage';

/**
 * Extracts clean, human-readable text from a Word (.docx) document XML.
 */
function parseDocxXml(xml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const paragraphs = Array.from(doc.getElementsByTagName('w:p'));

    const lines: string[] = [];
    for (const p of paragraphs) {
      const texts = Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '');
      const line = texts.join('').trim();
      if (line) {
        lines.push(line);
      }
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }
  } catch {
    // Fallback: regex tag stripper
  }

  return xml
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts structured slide text from a PowerPoint (.pptx) file.
 */
async function parsePptxZip(zip: JSZip): Promise<string> {
  const slideEntries = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
    .sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 0;
      const numB = matchB ? parseInt(matchB[0], 10) : 0;
      return numA - numB;
    });

  if (slideEntries.length === 0) {
    return '';
  }

  const slidesOutput: string[] = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const filename = slideEntries[i];
    const xml = await zip.files[filename].async('text');

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const textNodes = Array.from(doc.getElementsByTagName('a:t'));
    const slideLines = textNodes
      .map((t) => (t.textContent || '').trim())
      .filter(Boolean);

    if (slideLines.length > 0) {
      slidesOutput.push(`[شريحة ${i + 1}]:\n${slideLines.join(' - ')}`);
    }
  }

  return slidesOutput.join('\n\n');
}

/**
 * Convert File to Base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert File to Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a text file
 */
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Client-side image compression using HTML Canvas.
 * Resizes large smartphone/camera photos (e.g. 8 MB -> ~200 KB) while keeping sharp AI readability.
 */
export function compressImageFile(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      fileToBase64(file).then((base64) => resolve({ dataUrl: '', base64 }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawResult = (e.target?.result as string) || '';
          const rawBase64 = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
          resolve({ dataUrl: rawResult, base64: rawBase64 });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ dataUrl, base64 });
      };
      img.onerror = () => {
        const rawResult = (e.target?.result as string) || '';
        const rawBase64 = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
        resolve({ dataUrl: rawResult, base64: rawBase64 });
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => {
      resolve({ dataUrl: '', base64: '' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Lightweight in-browser PDF text extractor
 */
async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const content = decoder.decode(bytes);

    const textPieces: string[] = [];

    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let m;
    while ((m = tjRegex.exec(content)) !== null) {
      const str = m[1].trim();
      if (str.length > 0 && !/^[\x00-\x1F]+$/.test(str)) {
        textPieces.push(str);
      }
    }

    const arrayTjRegex = /\[([^\]]+)\]\s*TJ/gi;
    let arrayMatch;
    while ((arrayMatch = arrayTjRegex.exec(content)) !== null) {
      const inner = arrayMatch[1];
      const innerMatches = inner.match(/\(([^)]+)\)/g);
      if (innerMatches) {
        for (const item of innerMatches) {
          const clean = item.replace(/^\(/, '').replace(/\)$/, '').trim();
          if (clean.length > 0) {
            textPieces.push(clean);
          }
        }
      }
    }

    if (textPieces.length >= 8) {
      return textPieces
        .join(' ')
        .replace(/\\([()\\])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    }
  } catch (err) {
    console.warn('PDF quick text extraction fallback:', err);
  }
  return '';
}

/**
 * Unified Document & File Parser
 * Parses Word (.docx), PowerPoint (.pptx), PDF (.pdf), Text (.txt, .md), and Images.
 * Optimized for Vercel Serverless payload limits (never sends redundant multi-megabyte base64 strings).
 */
export async function parseDocumentFile(file: File): Promise<UploadedFile> {
  const name = file.name;
  const lowerName = name.toLowerCase();
  const mimeType = file.type || '';
  const size = file.size;
  const id = uid();

  // 1. Word Documents (.docx, .doc)
  // Text extracted directly. NO base64 needed because AI prompt consumes textContent.
  if (lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml.document')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const docXmlFile = zip.file('word/document.xml');
      let textContent = '';
      if (docXmlFile) {
        const xml = await docXmlFile.async('text');
        textContent = parseDocxXml(xml);
      }
      return {
        id,
        name,
        type: 'word',
        dataUrl: '',
        base64: '', // Omitted to keep payload ultra-light (< 50 KB instead of 15 MB)
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        textContent: textContent || `[مستند Word: ${name}]`,
        size,
      };
    } catch (err) {
      console.warn('Word parsing error:', err);
      return {
        id,
        name,
        type: 'word',
        dataUrl: '',
        base64: '',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        textContent: `[مستند Word: ${name}]`,
        size,
      };
    }
  }

  // 2. PowerPoint Presentations (.pptx, .ppt)
  // Slides text extracted directly. NO base64 needed.
  if (lowerName.endsWith('.pptx') || mimeType.includes('presentationml.presentation')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const textContent = await parsePptxZip(zip);
      return {
        id,
        name,
        type: 'powerpoint',
        dataUrl: '',
        base64: '', // Omitted to avoid payload overflow
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        textContent: textContent || `[عرض بوربوينت: ${name}]`,
        size,
      };
    } catch (err) {
      console.warn('PowerPoint parsing error:', err);
      return {
        id,
        name,
        type: 'powerpoint',
        dataUrl: '',
        base64: '',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        textContent: `[عرض بوربوينت: ${name}]`,
        size,
      };
    }
  }

  // 3. PDF Documents (.pdf)
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    const extractedText = await extractTextFromPdf(file);
    // If PDF is <= 2.5 MB, include base64 for native Gemini document processing.
    // If PDF > 2.5 MB, rely on extracted text to avoid Vercel 413 error!
    const isSmall = size <= 2.5 * 1024 * 1024;
    let base64 = '';
    if (isSmall) {
      base64 = await fileToBase64(file);
    }

    const textContent =
      extractedText ||
      (isSmall
        ? `[ملف PDF مرفق: ${name} - تم تضمينه كوثيقة رقمية في الذكاء الاصطناعي]`
        : `[ملف PDF كبير: ${name} - يُفضل نسخ نصوصه لتفادي تجاوز سعة الخادم]`);

    return {
      id,
      name,
      type: 'pdf',
      dataUrl: '',
      base64,
      mimeType: 'application/pdf',
      textContent,
      size,
    };
  }

  // 4. Plain Text, Markdown, CSV (.txt, .md, .csv)
  if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv') ||
    mimeType.startsWith('text/')
  ) {
    const textContent = await fileToText(file);
    return {
      id,
      name,
      type: 'text',
      dataUrl: '',
      base64: '',
      mimeType: 'text/plain',
      textContent,
      size,
    };
  }

  // 5. Images (.png, .jpg, .jpeg, .webp, etc.)
  // Automatically compressed client-side (max 1600px, 82% quality) to ensure payload < 300 KB!
  if (mimeType.startsWith('image/')) {
    const { dataUrl, base64 } = await compressImageFile(file, 1600, 0.82);
    return {
      id,
      name,
      type: 'image',
      dataUrl,
      base64,
      mimeType: 'image/jpeg',
      textContent: `[صورة مرفقة: ${name}]`,
      size,
    };
  }

  // Fallback for any other file
  const textContent = await fileToText(file).catch(() => `[ملف مرفق: ${name}]`);
  return {
    id,
    name,
    type: 'text',
    dataUrl: '',
    base64: '',
    mimeType: mimeType || 'application/octet-stream',
    textContent: textContent || `[ملف مرفق: ${name}]`,
    size,
  };
}
