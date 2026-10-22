import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * دالة دقيقة لحساب الحجم الفعلي للبايت للتحقق من حدود شبكة Vercel (UTF-8 Bytes)
 */
function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * تجهيز وتخفيف الملفات قبل إرسالها إلى سيرفر Vercel لتفادي Timeout 504 و 413:
 * - تجريد كامل لـ dataUrl
 * - إذا كان هناك نص مستخرج (textContent) للـ PDF أو المستندات، يُحذف الـ base64 تماماً لتقليل وقت معالجة الـ AI إلى أقل من 3 ثوانٍ
 * - الصور فقط يُسمح لها بالـ base64 إذا لم يتوفر لها نص بديل
 */
export function prepareFilesForApi(files: UploadedFile[]): Record<string, unknown>[] {
  if (!Array.isArray(files)) return [];

  return files.map((file) => {
    // 1. المستندات النصية (Word, PowerPoint, Text)
    if (file.type === 'word' || file.type === 'powerpoint' || file.type === 'text') {
      return {
        id: file.id,
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        textContent: file.textContent || '',
      };
    }

    // 2. ملفات PDF: الاعتماد التام على النص المستخرج لتفادي بطء تحليل المستند في Gemini
    if (file.type === 'pdf' || file.mimeType === 'application/pdf') {
      return {
        id: file.id,
        name: file.name,
        type: 'pdf',
        mimeType: 'application/pdf',
        // إذا كان النص المستخرج موجوداً، لا نرسل base64 إطلاقاً لمنع الـ 504
        base64: file.textContent ? '' : (file.base64 || ''),
        textContent: file.textContent || '',
      };
    }

    // 3. الصور: إرسال الـ base64 المضغوط فقط
    return {
      id: file.id,
      name: file.name,
      type: 'image',
      mimeType: file.mimeType || 'image/jpeg',
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

  let payloadObj = { settings, outputType, files: optimizedFiles };
  let payloadString = JSON.stringify(payloadObj);
  let payloadBytes = getByteLength(payloadString);

  // إذا تجاوز الحجم 3.5 ميجابايت الفعلي، احذف كل الـ base64 فوراً لمنع الـ 504 والـ 413
  if (payloadBytes > 3.5 * 1024 * 1024) {
    optimizedFiles = optimizedFiles.map((f) => ({
      ...f,
      base64: '',
      textContent: (f.textContent as string) || `[محتوى مستند: ${f.name}]`,
    }));
    payloadObj = { settings, outputType, files: optimizedFiles };
    payloadString = JSON.stringify(payloadObj);
    payloadBytes = getByteLength(payloadString);

    if (payloadBytes > 4.2 * 1024 * 1024) {
      throw new Error(
        'حجم المحتوى المرفق كبير جداً بالنسبة للخادم. يرجى إزالة بعض الملفات أو لصق النص المطلوب مباشرة.'
      );
    }
  }

  // مؤقت أمان للعميل (85 ثانية) لمنع تعليق الصفحة في الحالات القصوى
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 85000);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('حجم الملفات المرفقة تجاوز الحد المسموح. يرجى الاكتفاء بالنصوص أو تصغير الملفات.');
      }
      if (response.status === 504) {
        throw new Error(
          'استغرق الذكاء الاصطناعي وقتاً أطول من المسموح في صياغة المحتوى (Timeout 504). يُرجى تقليل تفاصيل الطلب أو استخدام محتوى أصغر وإعادة المحاولة.'
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'فشل توليد المحتوى، يرجى المحاولة بعد قليل.');
    }

    const data = await response.json();
    const rawHtml = data.contentHtml || data.html || '';
    return {
      ...data,
      contentHtml: rawHtml,
      html: rawHtml,
      title: data.title || '',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('استغرقت الاستجابة وقتاً طويلاً جداً. تم إلغاء الطلب لتفادي تعليق الصفحة، يرجى إعادة المحاولة.');
    }
    throw err;
  }
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
  imageFile?: { base64: string; mimeType?: string } | null;
  customCriteriaText?: string;
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
  lmsTarget: 'sahlah_cypher' | 'furqan_canvas' | 'canvas_lms';
  title?: string;
  subject?: string;
  grade?: string;
}): Promise<{
  success: boolean;
  qtiXml: string;
  previewHtml: string;
  extractedCount: number;
  title?: string;
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

export async function translateGeneratedContent(
  htmlContent: string,
  targetLang: 'ar' | 'en'
): Promise<string> {
  if (!htmlContent || !htmlContent.trim()) {
    throw new Error('محتوى النص المراد ترجمته فارغ.');
  }

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      htmlContent,
      targetLang,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        (targetLang === 'ar'
          ? 'تعذر ترجمة المحتوى إلى العربية حالياً، يرجى المحاولة مرة أخرى.'
          : 'Could not translate content to English, please try again.')
    );
  }

  const data = await response.json();
  if (!data?.translatedHtml) {
    throw new Error('لم يتم استلام محتوى مترجم صالح من الخادم.');
  }

  return data.translatedHtml;
}

export interface VoiceToLessonPayload {
  voiceTranscript?: string;
  audioBase64?: string;
  audioMimeType?: string;
  transcribeOnly?: boolean;
  autoGenerate?: boolean;
  targetSubject?: string;
  targetGrade?: string;
  institution?: string;
  contentLanguage?: 'ar' | 'en';
}

export interface VoiceToLessonResponse {
  success: boolean;
  transcript?: string;
  parsed: {
    subject?: string;
    grade?: string;
    lessonTitle?: string;
    duration?: string;
    keyActivities?: string;
    labExperiment?: string;
    assessmentNotes?: string;
    pedagogicalGoal?: string;
  };
  contentHtml?: string;
  title?: string;
}

export async function transcribeAudioWithGroq(
  audioBase64: string,
  audioMimeType: string = 'audio/webm',
  lang: 'ar' | 'en' = 'ar'
): Promise<string> {
  const response = await fetch('/api/voice-to-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      audioMimeType,
      transcribeOnly: true,
      contentLanguage: lang,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل تفريغ الصوت عبر Groq Whisper.');
  }

  const data = await response.json();
  return data.transcript || '';
}

export async function parseAndGenerateVoiceToLesson(
  payload: VoiceToLessonPayload
): Promise<VoiceToLessonResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 85000);

  try {
    const response = await fetch('/api/voice-to-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 504) {
        throw new Error(
          payload.contentLanguage === 'en'
            ? 'The AI processing took longer than expected. Please try again with a shorter prompt.'
            : 'استغرقت معالجة التسجيل وقتاً أطول من المعتاد (Timeout 504). يرجى تقليل تفاصيل التسجيل أو المحاولة مرة أخرى.'
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'تعذر معالجة التسجيل الصوتي.');
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('استغرقت معالجة الصوت وقتاً طويلاً وتم إلغاء الطلب لتفادي تعليق الصفحة. يرجى إعادة المحاولة.');
    }
    throw err;
  }
}

export async function differentiateContent(payload: {
  htmlContent: string;
  mode: 'easy-read' | 'gifted' | 'visual-organizer';
  targetLang?: 'ar' | 'en';
}): Promise<string> {
  const response = await fetch('/api/differentiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'تعذر تكييف المحتوى للتمايز التعليمي.');
  }

  const data = await response.json();
  return data.adaptedHtml;
}

export async function addDokQuestion(payload: {
  currentHtml: string;
  dokLevel: 3 | 4;
  bloomType?: 'analysis' | 'evaluation' | 'creation';
  lang?: 'ar' | 'en';
}): Promise<{ questionHtml: string; dokLevel: number }> {
  const response = await fetch('/api/add-dok-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'تعذر توليد سؤال التفكير الناقد.');
  }

  return response.json();
}
