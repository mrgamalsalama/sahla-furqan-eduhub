import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateContent(
  settings: LessonSettings,
  outputType: OutputType,
  files: UploadedFile[]
): Promise<GenerationResult> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings, outputType, files }),
  });

  if (!response.ok) {
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
  const response = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageFile, context }),
  });

  if (!response.ok) {
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
}): Promise<{ previewHtml: string; qtiXml: string; title: string }> {
  const response = await fetch('/api/convert-qti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'فشل تحويل الأسئلة إلى صيغة QTI.');
  }

  return response.json();
}

