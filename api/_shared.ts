import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

// Clean Institution Headers
function getInstitutionHeader(settings: any): string {
  const isAr = settings.contentLanguage === 'ar';
  const inst = settings.institution;

  const titleText =
    inst === 'sahlah'
      ? (isAr ? 'أكاديمية سهلة الدولية' : 'Sahlah Academy')
      : inst === 'furqan'
      ? (isAr ? 'مدرسة الفرقان العالمية' : 'Al-Furqan International School')
      : (isAr ? 'أكاديمية سهلة الدولية & مدرسة الفرقان العالمية' : 'Sahlah Academy & Al-Furqan International School');

  return `<div style="text-align:center; margin-bottom:18px; padding-bottom:12px; border-bottom:2px solid #e2e8f0;">
    <h2 style="font-size:1.35rem; font-weight:800; color:#1e3a8a; margin:0 0 4px 0;">${titleText}</h2>
  </div>`;
}

export function getApiKey(): string | undefined {
  let key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.startsWith('MY_')) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envText = fs.readFileSync(envPath, 'utf-8');
        const match = envText.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1].trim() && !match[1].startsWith('MY_')) {
          key = match[1].trim();
        }
      }
    } catch {
      // ignore
    }
  }
  return key && !key.startsWith('MY_') ? key.trim() : undefined;
}

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

export async function callGemini(contents: any) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error(
      'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ في بيئة Vercel. يرجى إضافة GEMINI_API_KEY في Project Settings > Environment Variables.'
    );
    (err as any).statusCode = 401;
    throw err;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let lastError: any;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });
        return response;
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        const isTransient =
          errMessage.includes('503') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('429') ||
          errMessage.includes('high demand');
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        console.warn(`Model ${model} failed, trying next:`, errMessage);
        lastError = err;
        break;
      }
    }
  }
  throw lastError;
}

export function formatApiError(error: any): { status: number; message: string } {
  const rawMessage = error?.message || String(error);
  const customStatus = error?.statusCode;
  if (customStatus) {
    return { status: customStatus, message: rawMessage };
  }

  if (
    rawMessage.includes('API key not valid') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('401') ||
    rawMessage.includes('Unauthorized') ||
    rawMessage.includes('غير مهيأ')
  ) {
    return {
      status: 401,
      message: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مصرح أو غير مهيأ في Vercel. يرجى مراجعة Environment Variables.',
    };
  }

  if (
    rawMessage.includes('503') ||
    rawMessage.includes('UNAVAILABLE') ||
    rawMessage.includes('high demand')
  ) {
    return {
      status: 503,
      message: 'خدمة الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات.',
    };
  }

  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'تم تجاوز الحد المسموح به من الطلبات مؤقتاً، يرجى الانتظار دقيقة واحدة.',
    };
  }

  return {
    status: 500,
    message: rawMessage || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.',
  };
}

export function extractHtml(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```html\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  return cleaned.trim();
}

function buildBasePrompt(settings: any, outputType: string): string {
  const isAr = settings.contentLanguage === 'ar';
  let typeDescription = '';
  switch (outputType) {
    case 'lesson-plan':
      typeDescription = isAr ? 'خطة درس تعليمية شاملة ومفصلة' : 'Comprehensive lesson plan';
      break;
    case 'worksheet':
      typeDescription = isAr ? 'ورقة عمل تفاعلية وتمارين تطبيقية' : 'Interactive worksheet';
      break;
    case 'quiz':
      typeDescription = isAr ? 'اختبار قصير متدرج الصعوبة مع الإجابات النموذجية' : 'Quiz with answer key';
      break;
    case 'presentation':
      typeDescription = isAr ? 'عرض تقديمي تعليمي مقسم إلى شرائح' : 'Slide presentation outline';
      break;
    case 'qti':
      typeDescription = isAr ? 'حزمة اختبار معياري متوافقة مع معايير IMS QTI' : 'IMS QTI-compatible standard assessment';
      break;
    default:
      typeDescription = isAr ? 'محتوى تعليمي شامل' : 'Comprehensive educational content';
  }

  return isAr
    ? `أنت خبير تربوي ومصمم مناهج متخصص في أكاديمية سهلة الدولية ومدارس الفرقان العالمية.
المطلوب منك إنشاء: ${typeDescription}.

بيانات الدرس:
- عنوان الدرس: ${settings.lessonTitle || 'غير محدد'}
- المادة: ${settings.subject}
- الصف: ${settings.grade}
- أهداف التعلم: ${settings.objectives || 'شاملة لمفاهيم الدرس'}
- النواتج التعليمية: ${settings.outcomes || 'تحقيق الفهم العميق'}
- التمهيد: ${settings.warmup || 'نشاط تمهيدي مشوق'}
- الأنشطة: ${settings.activities || 'استراتيجيات تدريس نشط وتمايز'}
- التقويم الختامي: ${settings.closure || 'تقويم تكويني'}

شروط المخرجات:
1. الناتج كود HTML نظيف فقط جاهز للعرض مباشرة داخل div، بدون علامات \`\`\`html وبدون \`\`\`.
2. استخدم تنسيق CSS مدمج (Inline Styles) أنيق.
3. التزم باللغة المطلوبة بالكامل.`
    : `You are an expert curriculum designer.
Task: Create ${typeDescription}.
Subject: ${settings.subject}, Grade: ${settings.grade}, Title: ${settings.lessonTitle || 'Untitled'}
Objectives: ${settings.objectives || 'Core concepts'}
Return clean HTML snippet only without markdown code fences.`;
}

// Handler for Generate
export async function executeGenerate(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { settings = {}, outputType = 'lesson-plan', files = [] } = body || {};

    let prompt = buildBasePrompt(settings, outputType);

    if (Array.isArray(files) && files.length > 0) {
      const textFiles = files.filter((f: any) => f.textContent);
      if (textFiles.length > 0) {
        prompt += `\n\nنصوص ووثائق الدرس المرفقة:\n`;
        textFiles.forEach((file: any, idx: number) => {
          prompt += `\n--- ملف ${idx + 1}: ${file.name} ---\n${file.textContent}\n`;
        });
      }
    }

    const imageFiles = Array.isArray(files)
      ? files.filter((f: any) => f.base64 && (f.type === 'image' || f.mimeType?.startsWith('image/')))
      : [];

    let response;
    if (imageFiles.length > 0) {
      const parts: any[] = [];
      imageFiles.forEach((img: any) => {
        const cleanBase64 = img.base64?.replace(/^data:image\/[a-z]+;base64,/, '') || '';
        if (cleanBase64) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/png',
              data: cleanBase64,
            },
          });
        }
      });
      parts.push({ text: prompt });
      response = await callGemini(parts);
    } else {
      response = await callGemini(prompt);
    }

    const text = response.text || '';
    const htmlContent = extractHtml(text);
    const institutionHeader = getInstitutionHeader(settings);

    const isAr = settings.contentLanguage === 'ar';
    const direction = isAr ? 'rtl' : 'ltr';
    const alignment = isAr ? 'right' : 'left';

    const fullHtml = `<div dir="${direction}" lang="${settings.contentLanguage || 'ar'}" style="direction: ${direction}; text-align: ${alignment}; font-family: inherit;">${institutionHeader}${htmlContent}</div>`;

    const titlePrefix = settings.standardFramework === 'diagnostic'
      ? (isAr ? 'اختبار تشخيصي ورصد فجوات' : 'Diagnostic Assessment')
      : (isAr ? 'اختبار معياري' : 'Benchmark Assessment');

    const title = settings.lessonTitle || `${titlePrefix} - ${settings.subject || ''} - ${settings.grade || ''}`;

    return res.status(200).json({ contentHtml: fullHtml, title });
  } catch (error: any) {
    console.error('executeGenerate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

// Advisor Prompt constants
const ADVISOR_PROMPT_AR = `أنت "المستشار التربوي الذكي" لأكاديمية سهلة ومدرسة الفرقان.
دورك تقديم استشارات دقيقة وعملية للمعلمين في:
- استراتيجيات التدريس الحديثة (التعلم النشط، الصف المقلوب، الاستقصاء، التمايز).
- إدارة الصف والدافعية وتصميم الأنشطة والمشاريع.
- صياغة الأسئلة وفق مستويات بلوم وبنوك الأسئلة.
- تعليم اللغة العربية للناطقين بغيرها (AFL).
كن داعماً، مهنياً، وقدم أمثلة عملية وقابلة للتطبيق الفوري. أجب باللغة العربية بأسلوب راقٍ وموجز.`;

const ADVISOR_PROMPT_EN = `You are the "Smart Educational Advisor" for Sahlah Academy and Al-Furqan School.
Provide practical, pedagogical guidance on active learning, differentiation, assessment design, classroom management, and curriculum enrichment.
Be supportive, professional, and practical.`;

export async function executeAdvisor(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { history = [], newMessage, lang = 'ar' } = body || {};
    const isAr = lang === 'ar';
    const systemPrompt = isAr ? ADVISOR_PROMPT_AR : ADVISOR_PROMPT_EN;
    const userTag = isAr ? 'المعلم' : 'Teacher';
    const advisorTag = isAr ? 'المستشار' : 'Advisor';

    const promptParts: string[] = [systemPrompt];
    (history || []).forEach((msg: any) => {
      const roleTag = msg.role === 'user' ? userTag : advisorTag;
      promptParts.push(`${roleTag}: ${msg.content}`);
    });
    promptParts.push(`${userTag}: ${newMessage}\n${advisorTag}:`);

    const fullPrompt = promptParts.join('\n\n');
    const response = await callGemini(fullPrompt);

    return res.status(200).json({ text: response.text || '' });
  } catch (error: any) {
    console.error('executeAdvisor error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

export async function executeRubric(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { subject, grade, assignmentTitle, maxScore, lang = 'ar' } = body || {};
    const isAr = lang !== 'en';
    const total = maxScore || 20;

    const prompt = isAr
      ? `أنت خبير قياس وتقويم تربوي وإعداد معايير تقييم ومناهج.
قم بصياغة "سلم تقدير لفظي تحليلي (Analytic Rubric)" مفصل ومحكم لتقييم المهمة التالية:
- المادة: ${subject || 'عام'}
- الصف: ${grade || 'غير محدد'}
- عنوان السؤال أو المهمة: ${assignmentTitle || 'تقييم كتابي / أدائي'}
- الدرجة الإجمالية الكلية: ${total} درجة.

المطلوب:
جدول تحليلي كامل بمعايير واضحة ومستويات أداء (ممتاز، جيد جداً، مقبول، يحتاج تحسين) وتوزيع دقيق للدرجات.
أخرج كود HTML فقط بدون أسوار كود markdown.`
      : `You are an expert educational assessment specialist.
Create an analytic grading rubric for:
- Subject: ${subject || 'General'}
- Grade: ${grade || 'Unspecified'}
- Assignment Title: ${assignmentTitle || 'Written / Performance Task'}
- Total Max Score: ${total} points.
Return clean HTML table only without markdown fences.`;

    const response = await callGemini(prompt);
    const rubric = extractHtml(response.text || '');
    return res.status(200).json({ rubric });
  } catch (error: any) {
    console.error('executeRubric error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

export async function executeGrade(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageFile, context } = body || {};
    const { subject, grade, assignmentTitle, rubricOrModelAnswer, maxScore = 20, lang = 'ar' } = context || {};
    const isAr = lang !== 'en';

    if (!imageFile || !imageFile.base64) {
      return res.status(400).json({ error: 'ملف الصورة غير موجود أو تالف.' });
    }

    const cleanBase64 = imageFile.base64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = isAr
      ? `أنت معلم خبير في التصحيح والتقويم التربوي الدقيق.
أمامك صورة لإجابة طالب مكتوبة بخط اليد.
معلومات التكليف:
- المادة: ${subject}
- الصف: ${grade}
- عنوان التكليف / الاختبار: ${assignmentTitle}
- الدرجة القصوى: ${maxScore}
${rubricOrModelAnswer ? `- سلم التقدير / الإجابة النموذجية المرجعية:\n${rubricOrModelAnswer}` : ''}

قم بقراءة خط اليد بدقة متناهية، وتصحيح كل جزء وتقديم التغذية الراجعة والدرجة المستحقة وتوصيات علاجية.
أخرج النتيجة كود HTML نظيف فقط بدون وسوم markdown.`
      : `You are an expert teacher grading a student handwritten submission.
Context:
- Subject: ${subject}
- Grade: ${grade}
- Assignment: ${assignmentTitle}
- Max Score: ${maxScore}
${rubricOrModelAnswer ? `- Reference Rubric / Answer Key:\n${rubricOrModelAnswer}` : ''}

Transcribe the handwriting carefully, grade each question, provide constructive feedback, calculate total score out of ${maxScore}, and suggest next steps.
Return clean HTML only without markdown fences.`;

    const response = await callGemini([
      {
        inlineData: {
          mimeType: imageFile.mimeType || 'image/png',
          data: cleanBase64,
        },
      },
      { text: prompt },
    ]);

    const html = extractHtml(response.text || '');
    return res.status(200).json({ html });
  } catch (error: any) {
    console.error('executeGrade error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

