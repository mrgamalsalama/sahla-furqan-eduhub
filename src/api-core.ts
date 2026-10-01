import { GoogleGenAI } from '@google/genai';
import { INSTITUTIONS } from './types';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from './types';
import fs from 'node:fs';
import path from 'node:path';

function getApiKey(): string | undefined {
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

function getAI(): GoogleGenAI {
  const apiKey = getApiKey();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

export async function callGemini(contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents']) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error(
      'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ في بيئة الخادم. يرجى التأكد من ضبط المفتاح في إعدادات المنصة.'
    );
    (err as unknown as { statusCode: number }).statusCode = 401;
    throw err;
  }

  const ai = getAI();
  let lastError: unknown;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });
        return response;
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        const isTransient =
          errMessage.includes('503') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('429') ||
          errMessage.includes('high demand');
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        console.warn(`Model ${model} failed, falling back to next candidate:`, errMessage);
        lastError = err;
        break;
      }
    }
  }
  throw lastError;
}

export function formatApiError(error: unknown): { status: number; message: string } {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const customStatus = (error as { statusCode?: number })?.statusCode;
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
      message: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مصرح أو غير مهيأ بالخادم. يرجى مراجعة مفتاح API في الإعدادات.',
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

function isNonNativeSubject(subject: string): boolean {
  return (
    subject.includes('غير الناطقين') ||
    subject.includes('Non-Native') ||
    subject.includes('AFL') ||
    subject.includes('Non-Arabic')
  );
}

const LOGO_IMG_STYLE =
  'max-height:60px; max-width:100%; height:auto; width:auto; object-fit:contain; vertical-align:middle;';

function getInstitutionHeader(settings: LessonSettings): string {
  const isAr = settings.contentLanguage === 'ar';
  const inst = settings.institution;

  const logoImg = (logo: string, alt: string): string =>
    `<img src="${logo}" alt="${alt}" style="${LOGO_IMG_STYLE}" />`;

  const wrap = (inner: string, caption: string): string =>
    `<div style="text-align:center; margin-bottom:16px;">${inner}<p style="font-weight:bold; font-size:1.1rem; margin-top:4px;">${caption}</p></div>`;

  if (inst === 'sahlah') {
    return isAr
      ? wrap(logoImg(INSTITUTIONS.sahlah.logo, 'شعار أكاديمية سهلة الدولية'), INSTITUTIONS.sahlah.ar)
      : wrap(logoImg(INSTITUTIONS.sahlah.logo, 'Sahlah Academy Logo'), INSTITUTIONS.sahlah.en);
  }
  if (inst === 'furqan') {
    return isAr
      ? wrap(logoImg(INSTITUTIONS.furqan.logo, 'شعار مدرسة الفرقان العالمية'), INSTITUTIONS.furqan.ar)
      : wrap(logoImg(INSTITUTIONS.furqan.logo, 'Al-Furqan International School Logo'), INSTITUTIONS.furqan.en);
  }
  const pair = (sahlahAlt: string, furqanAlt: string): string =>
    `<div style="display:inline-flex; gap:20px; align-items:center; justify-content:center; flex-wrap:wrap;">${logoImg(
      INSTITUTIONS.sahlah.logo,
      sahlahAlt
    )}${logoImg(INSTITUTIONS.furqan.logo, furqanAlt)}</div>`;

  return isAr
    ? wrap(pair('شعار أكاديمية سهلة الدولية', 'شعار مدرسة الفرقان العالمية'), `${INSTITUTIONS.sahlah.ar} & ${INSTITUTIONS.furqan.ar}`)
    : wrap(pair('Sahlah Academy Logo', 'Al-Furqan International School Logo'), `${INSTITUTIONS.sahlah.en} & ${INSTITUTIONS.furqan.en}`);
}

function buildSubjectGuidance(settings: LessonSettings): string {
  const isAr = settings.contentLanguage === 'ar';
  const nonNative = isNonNativeSubject(settings.subject);

  if (nonNative) {
    return isAr
      ? `\n\nتوجيهات خاصة: المادة مخصصة لغير الناطقين باللغة. يجب تبسيط التراكيب اللغوية، اقتراح وسائل بصرية وترجمات مساعدة للمصطلحات، وتكييف الأسئلة لتناسب متعلمي اللغة الثانية.`
      : `\n\nSpecial guidance: This subject is for non-native speakers. Simplify language structures, provide visual/glossary supports, and tailor questions for second-language learners.`;
  }
  return isAr
    ? `\n\nتوجيهات خاصة: المادة مخصصة للناطقين باللغة. ركّز على المهارات اللغوية والتحليلية القياسية والتعبير المتعمق المناسب للمرحلة العمرية.`
    : `\n\nSpecial guidance: This subject is for native speakers. Focus on standard linguistic and analytical skills and in-depth expression appropriate for the age group.`;
}

function buildBasePrompt(settings: LessonSettings, outputType: OutputType): string {
  const isAr = settings.contentLanguage === 'ar';
  const guidance = buildSubjectGuidance(settings);

  let typeDescription = '';
  switch (outputType) {
    case 'lesson-plan':
      typeDescription = isAr ? 'خطة درس تعليمية شاملة ومفصلة' : 'Comprehensive and detailed lesson plan';
      break;
    case 'worksheet':
      typeDescription = isAr ? 'ورقة عمل تفاعلية وتمارين تطبيقية' : 'Interactive worksheet and applied exercises';
      break;
    case 'quiz':
      typeDescription = isAr ? 'اختبار قصير متدرج الصعوبة مع الإجابات النموذجية وسلم الدرجات' : 'Quiz with answer key and scoring guide';
      break;
    case 'presentation':
      typeDescription = isAr ? 'عرض تقديمي تعليمي مقسم إلى شرائح واضحة' : 'Educational slide presentation outline';
      break;
    case 'qti':
      typeDescription = isAr ? 'حزمة اختبار معياري متوافقة مع معايير IMS QTI و LMS مع مفاتيح الإجابة' : 'IMS QTI-compatible standard assessment questions with keys';
      break;
    default:
      typeDescription = isAr ? 'محتوى تعليمي شامل' : 'Comprehensive educational content';
  }

  return isAr
    ? `أنت خبير تربوي ومصمم مناهج متخصص في أكاديمية سهلة الدولية ومدارس الفرقان العالمية.
المطلوب منك إنشاء: ${typeDescription}.

بيانات الدرس والسياق التعليمي:
- عنوان الدرس: ${settings.lessonTitle || 'غير محدد'}
- المادة الدراسية: ${settings.subject}
- الصف والمرحلة: ${settings.grade}
- أهداف التعلم ومخرجاته: ${settings.objectives || 'شاملة لمفاهيم الدرس الرئيسية'}
- النواتج التعليمية المستهدفة: ${settings.outcomes || 'تحقيق الفهم العميق والتطبيق العملي'}
- التهيئة والتمهيد المقترح: ${settings.warmup || 'نشاط تمهيدي مشوق لاستثارة تفكير الطلاب'}
- أنشطة واستراتيجيات التدريس: ${settings.activities || 'استراتيجيات تدريس نشط وتمايز تعليمي'}
- الغلق والتقويم الختامي: ${settings.closure || 'تقويم تكويني وملخص ختامي'}${guidance}

شروط التنسيق والمخرجات الصارمة:
1. يجب أن يكون الناتج كود HTML نظيف فقط جاهز للعرض مباشرة داخل div، بدون علامات \`\`\`html وبدون \`\`\`.
2. استخدم تنسيق CSS مدمج (Inline Styles) أنيق ومهني:
   - العناوين الرئيسية باللون الكحلي الداكن (#1e3a8a).
   - العناوين الفرعية بلون كحلي هادئ (#2563eb).
   - الجداول بتصميم حديث مع خلفية ترويسة فاتحة (#f1f5f9) وحدود رمادية ناعمة (#cbd5e1).
   - صناديق التنبيه والملاحظات بخلفيات فاتحة وحدود ملونة جانبية.
3. التزم بلغة التدريس المطلوبة بالكامل (العربية أو الإنجليزية).`
    : `You are an expert pedagogical consultant and curriculum designer at Sahlah Academy and Al-Furqan International School.
Your task is to create: ${typeDescription}.

Lesson Context:
- Lesson Title: ${settings.lessonTitle || 'Not specified'}
- Subject: ${settings.subject}
- Grade Level: ${settings.grade}
- Learning Objectives: ${settings.objectives || 'Core curriculum standards'}
- Targeted Outcomes: ${settings.outcomes || 'Deep conceptual mastery'}
- Warm-up: ${settings.warmup || 'Engaging activator'}
- Teaching Strategies & Activities: ${settings.activities || 'Active learning and differentiated instruction'}
- Closure & Assessment: ${settings.closure || 'Formative assessment and summary'}${guidance}

Formatting rules:
1. Return clean HTML snippet only, without markdown code fences (\`\`\`html).
2. Use professional inline styles with clean spacing, modern tables, and highlighted concept boxes.
3. Strictly adhere to the requested language.`;
}

function extractHtml(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```html\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  return cleaned.trim();
}

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

// Endpoint handler: generate
export async function handleGenerate(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { settings, outputType, files = [] } = body;

    const basePrompt = buildBasePrompt(settings, outputType);
    let prompt = basePrompt;

    if (files.length > 0) {
      const textFiles = files.filter((f: UploadedFile) => f.textContent);
      if (textFiles.length > 0) {
        prompt += `\n\nنصوص ووثائق الدرس المرفقة من المعلم:\n`;
        textFiles.forEach((file: UploadedFile, idx: number) => {
          prompt += `\n--- ملف ${idx + 1}: ${file.name} ---\n${file.textContent}\n`;
        });
      }
    }

    const imageFiles = files.filter(
      (f: UploadedFile) =>
        f.base64 && (f.type === 'image' || f.mimeType?.startsWith('image/'))
    );

    let response;
    if (imageFiles.length > 0) {
      const parts: any[] = [];
      imageFiles.forEach((img: UploadedFile) => {
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

    const fullHtml = `<div dir="${direction}" lang="${settings.contentLanguage}" style="direction: ${direction}; text-align: ${alignment}; font-family: inherit;">${institutionHeader}${htmlContent}</div>`;

    const titlePrefix = settings.standardFramework === 'diagnostic'
      ? (isAr ? 'اختبار تشخيصي ورصد فجوات' : 'Diagnostic Assessment')
      : (isAr ? 'اختبار معياري' : 'Benchmark Assessment');

    const title = settings.lessonTitle || `${titlePrefix} - ${settings.subject || ''} - ${settings.grade || ''}`;

    const result: GenerationResult = { contentHtml: fullHtml, title };
    return res.status(200).json(result);
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message });
  }
}

// Endpoint handler: advisor
export async function handleAdvisor(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { history = [], newMessage, lang = 'ar' } = body;
    const isAr = lang === 'ar';
    const systemPrompt = isAr ? ADVISOR_PROMPT_AR : ADVISOR_PROMPT_EN;
    const userTag = isAr ? 'المعلم' : 'Teacher';
    const advisorTag = isAr ? 'المستشار' : 'Advisor';

    const promptParts: string[] = [systemPrompt];
    history.forEach((msg: { role: string; content: string }) => {
      const roleTag = msg.role === 'user' ? userTag : advisorTag;
      promptParts.push(`${roleTag}: ${msg.content}`);
    });
    promptParts.push(`${userTag}: ${newMessage}\n${advisorTag}:`);

    const fullPrompt = promptParts.join('\n\n');
    const response = await callGemini(fullPrompt);

    return res.status(200).json({ text: response.text || '' });
  } catch (error: unknown) {
    console.error('Error in advisor chat:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message });
  }
}

// Endpoint handler: rubric
export async function handleRubric(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { subject, grade, assignmentTitle, maxScore, lang = 'ar' } = body;
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
  } catch (error: unknown) {
    console.error('Error in rubric generation:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message });
  }
}

// Endpoint handler: grade
export async function handleGrade(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageFile, context } = body;
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
  } catch (error: unknown) {
    console.error('Error grading submission:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message });
  }
}
