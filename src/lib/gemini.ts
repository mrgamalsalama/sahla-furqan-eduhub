import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Optimizes files before sending over the network to Vercel Serverless.
 * - Strips `dataUrl` completely (which is only needed for local browser preview).
 * - Omit multi-megabyte `base64` for Word (.docx), PowerPoint (.pptx), and Text files (since AI only reads `textContent`).
 * - Keeps base64 for compressed images and small PDFs.
 */
export function prepareFilesForApi(files: UploadedFile[]): any[] {
  if (!Array.isArray(files)) return [];

  return files.map((file) => {
    // 1. Text-extractable documents (word, powerpoint, text):
    // NEVER send base64 or dataUrl! Only send the extracted textContent!
    if (file.type === 'word' || file.type === 'powerpoint' || file.type === 'text') {
      return {
        id: file.id,
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        textContent: file.textContent || '',
      };
    }

    // 2. Images: send compressed base64 only, NO dataUrl
    if (file.type === 'image' || file.mimeType?.startsWith('image/')) {
      return {
        id: file.id,
        name: file.name,
        type: 'image',
        mimeType: file.mimeType || 'image/jpeg',
        base64: file.base64 || '',
        textContent: file.textContent || '',
      };
    }

    // 3. PDFs: send base64 (if small) and textContent, NO dataUrl
    return {
      id: file.id,
      name: file.name,
      type: file.type || 'pdf',
      mimeType: file.mimeType || 'application/pdf',
      base64: file.base64 || '',
      textContent: file.textContent || '',
    };
  });
}

export async function generateContent(
  settings: LessonSettings,
  outputType: OutputType,
  files: UploadedFile[]
): Promise<GenerationResult> {
  let optimizedFiles = prepareFilesForApi(files);

  // Pre-flight payload size check
  let payloadString = JSON.stringify({ settings, outputType, files: optimizedFiles });

  // If payload exceeds 3.8 MB (Vercel hard limit is 4.5 MB):
  if (payloadString.length > 3.8 * 1024 * 1024) {
    // Fallback: drop all large base64 strings and rely on text representation to avoid 413 error!
    optimizedFiles = optimizedFiles.map((f) => ({
      ...f,
      base64: '',
      textContent: f.textContent || `[الملف: ${f.name}]`,
    }));
    payloadString = JSON.stringify({ settings, outputType, files: optimizedFiles });

    if (payloadString.length > 4.2 * 1024 * 1024) {
      throw new Error(
        'حجم الملفات المرفقة كبير جداً ويتجاوز سعة النقل القصوى المسموحة (4.5 ميجابايت). يرجى تقليل حجم الملفات المرفقة أو نسخ المحتوى كنص.'
      );
    }
  }

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payloadString,
  });

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        'حجم الملفات المرفقة تجاوز الحد الأقصى المسموح به (4.5 ميجابايت). يرجى تقليل حجم الملف أو نسخ المحتوى النصي مباشرة لتفادي سعة الخادم.'
      );
    }
    if (response.status === 504) {
      throw new Error(
        'استغرقت المعالجة وقتاً أطول من المعتاد من الخادم (504 Timeout). تم الآن تسريع المعالجة، يرجى إعادة المحاولة وسيتم الإنتاج بسرعة فائقة.'
      );
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل توليد المحتوى، يرجى المحاولة بعد قليل.');
  }

  return response.json();
}

export async function askEducationalAdvisor(
  history: ChatMessage[],
  newMessage: string,
  lang: 'ar' | 'en' = 'ar'
): Promise<string> {
  const response = await fetch('/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, newMessage, lang }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'تعذر التواصل مع المستشار التربوي حالياً.');
  }

  const data = await response.json();
  return data.text;
}

export async function generateRubricForAssignment(context: {
  subject: string;
  grade: string;
  assignmentTitle: string;
  maxScore: number;
  lang?: 'ar' | 'en';
}): Promise<string> {
  const response = await fetch('/api/rubric', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل توليد سلم التقدير.');
  }

  const data = await response.json();
  return data.rubric;
}

export async function gradeHandwrittenSubmission(
  imageFile: UploadedFile,
  context: {
    subject: string;
    grade: string;
    assignmentTitle: string;
    rubricOrModelAnswer?: string;
    maxScore?: number;
    lang?: 'ar' | 'en';
  }
): Promise<string> {
  const optimizedImage = {
    id: imageFile.id,
    name: imageFile.name,
    type: 'image',
    mimeType: imageFile.mimeType || 'image/jpeg',
    base64: imageFile.base64 || '',
  };

  const response = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageFile: optimizedImage, context }),
  });

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('حجم ورقة الإجابة المرفوعة كبير جداً. يرجى تصغير الصورة وإعادة المحاولة.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل تصحيح الورقة.');
  }

  const data = await response.json();
  return data.html;
}

export async function convertRawTextToQti(payload: {
  rawText: string;
  lmsTarget: 'sahlah_cypher' | 'furqan_canvas';
  title?: string;
  subject?: string;
  grade?: string;
}): Promise<{
  success: boolean;
  qtiXml: string;
  previewHtml: string;
  extractedCount: number;
  error?: string;
}> {
  const response = await fetch('/api/convert-qti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل تحويل الاختبار إلى QTI XML.');
  }

  return response.json();
}
