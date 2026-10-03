import JSZip from 'jszip';
import type { UploadedFile } from '@/types';
import { uid } from './storage';

/**
 * Extracts clean, human-readable text from a Word (.docx) document XML.
 */
function parseDocxXml(xml: string): string {
  try {
    // Match paragraphs <w:p>
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
 * Unified Document & File Parser
 * Parses Word (.docx), PowerPoint (.pptx), PDF (.pdf), Text (.txt, .md), and Images.
 */
export async function parseDocumentFile(file: File): Promise<UploadedFile> {
  const name = file.name;
  const lowerName = name.toLowerCase();
  const mimeType = file.type || '';
  const size = file.size;
  const id = uid();

  // 1. Word Documents (.docx, .doc)
  if (lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml.document')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const docXmlFile = zip.file('word/document.xml');
      let textContent = '';
      if (docXmlFile) {
        const xml = await docXmlFile.async('text');
        textContent = parseDocxXml(xml);
      }
      const base64 = await fileToBase64(file);
      return {
        id,
        name,
        type: 'word',
        dataUrl: '',
        base64,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        textContent: textContent || `[مستند Word: ${name}]`,
        size,
      };
    } catch (err) {
      console.warn('Word parsing error:', err);
      const base64 = await fileToBase64(file);
      return {
        id,
        name,
        type: 'word',
        dataUrl: '',
        base64,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        textContent: `[مستند Word: ${name}]`,
        size,
      };
    }
  }

  // 2. PowerPoint Presentations (.pptx, .ppt)
  if (lowerName.endsWith('.pptx') || mimeType.includes('presentationml.presentation')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const textContent = await parsePptxZip(zip);
      const base64 = await fileToBase64(file);
      return {
        id,
        name,
        type: 'powerpoint',
        dataUrl: '',
        base64,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        textContent: textContent || `[عرض بوربوينت: ${name}]`,
        size,
      };
    } catch (err) {
      console.warn('PowerPoint parsing error:', err);
      const base64 = await fileToBase64(file);
      return {
        id,
        name,
        type: 'powerpoint',
        dataUrl: '',
        base64,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        textContent: `[عرض بوربوينت: ${name}]`,
        size,
      };
    }
  }

  // 3. PDF Documents (.pdf)
  if (lowerName.endsWith('.pdf') || mimeType === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return {
      id,
      name,
      type: 'pdf',
      dataUrl: '',
      base64,
      mimeType: 'application/pdf',
      textContent: `[ملف PDF مرفق: ${name} - تم تضمينه مباشرة كوثيقة معتمدة في نموذج الذكاء الاصطناعي]`,
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
    const base64 = await fileToBase64(file);
    return {
      id,
      name,
      type: 'text',
      dataUrl: '',
      base64,
      mimeType: 'text/plain',
      textContent,
      size,
    };
  }

  // 5. Images (.png, .jpg, .jpeg, .webp, etc.)
  if (mimeType.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    const base64 = await fileToBase64(file);
    return {
      id,
      name,
      type: 'image',
      dataUrl,
      base64,
      mimeType,
      textContent: `[صورة مرفقة: ${name}]`,
      size,
    };
  }

  // Fallback for any other file
  const base64 = await fileToBase64(file);
  return {
    id,
    name,
    type: 'text',
    dataUrl: '',
    base64,
    mimeType: mimeType || 'application/octet-stream',
    textContent: `[ملف مرفق: ${name}]`,
    size,
  };
}
