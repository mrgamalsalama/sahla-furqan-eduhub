import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from '@/types';
import { INSTITUTIONS } from '@/types';

// The free-tier request quota is counted PER MODEL PER PROJECT, so each of
// these models has its own independent daily allowance. Listing several
// working models multiplies the effective capacity (models x keys).
// Verified available for generateContent on v1beta.
const MODEL_NAMES = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
] as const;

// Built-in default keys so the app works immediately without manual setup.
// These can be overridden via VITE_GEMINI_API_KEYS / NEXT_PUBLIC_GEMINI_API_KEYS.
const API_KEYS = [
  'AQ.Ab8RN6KBP1t4IhOfXLexXFdxGB_F1uj7dELY16pL3Fe_uiYIfQ',
  'AQ.Ab8RN6IGxqstG5WTyNLAR-H7h91QCjs9TMpyxQoHg71jzpYH2g',
  'AQ.Ab8RN6JLb5Qmdigvt7Z2vNlAbpmR1UyuyafzejSUD2MzJF7G3Q',
  'AQ.Ab8RN6IznwC6_221ubctgZbtyqNAvZQ3NxfWfwV0_g0-siBahg',
];

const SERVICE_BUSY_MESSAGE = 'الخدمة تشهد ضغطاً حالياً، يرجى المحاولة بعد قليل';

function readEnv(name: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const fromVite = viteEnv?.[name];
  if (fromVite) return fromVite;
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  return undefined;
}

function getApiKeys(): string[] {
  const raw =
    readEnv('VITE_GEMINI_API_KEYS') ||
    readEnv('NEXT_PUBLIC_GEMINI_API_KEYS') ||
    readEnv('VITE_GEMINI_API_KEY') ||
    '';

  const fromEnv = raw
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter(Boolean);

  const merged = [...fromEnv, ...API_KEYS];
  return Array.from(new Set(merged));
}

function isNonNativeSubject(subject: string): boolean {
  return subject.includes('غير الناطقين') || subject.includes('Non-Native') || subject.includes('AFL') || subject.includes('Non-Arabic');
}

// Keeps each logo at a consistent 60px cap while preserving its native aspect
// ratio (object-fit:contain + width:auto), so it never stretches on screen,
// in the print window, or inside exported PDF/Word documents.
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
  // both
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
      ? `\n\nتوجيهات خاصة: المادة مخصصة لغير الناطقين باللغة. يجب تبسيط التراكيب اللغوية، اقتراح وسائل بصرية وترجمات مساعدة للمصطلحات، تكييف استراتيجيات التدريس والأنشطة لتناسب متعلمي اللغة الثانية، واستخدام أمثلة ملموسة وواضحة.`
      : `\n\nSpecial guidance: This subject is for non-native speakers. Simplify language structures, suggest visual aids and glossary translations for key terms, adapt teaching strategies and activities for second-language learners, and use concrete, clear examples.`;
  }
  return isAr
    ? `\n\nتوجيهات خاصة: المادة مخصصة للناطقين باللغة. ركّز على المهارات اللغوية والتحليلية القياسية والتعبير المتعمق المناسب للمرحلة العمرية.`
    : `\n\nSpecial guidance: This subject is for native speakers. Focus on standard linguistic and analytical skills and in-depth expression appropriate for the age group.`;
}

function buildBasePrompt(settings: LessonSettings, outputType: OutputType): string {
  const isAr = settings.contentLanguage === 'ar';
  const subjectGuidance = buildSubjectGuidance(settings);

  if (isAr) {
    const ctx = `أنت مساعد خبير في إعداد الدروس التعليمية للمعلمين في المدارس.
معلومات الدرس:
- المادة: ${settings.subject || 'غير محدد'}
- الصف الدراسي: ${settings.grade || 'غير محدد'}
- مدة الدرس: ${settings.duration || 'غير محدد'}
- مستوى الطلاب: ${settings.studentLevel || 'غير محدد'}
- اسم المعلم: ${settings.teacherName || 'غير محدد'}
- عنوان الدرس: ${settings.lessonTitle || 'سيتم استنتاجه من المحتوى'}${subjectGuidance}`;

    switch (outputType) {
      case 'lesson-plan':
        return `${ctx}

المطلوب: توليد "خطة درس معتمدة" كاملة باللغة العربية على شكل HTML منسق وجاهز للعرض.

يجب أن يحتوي HTML على جدول منظم تماماً بالشكل التالي:

1. جدول الترويسة (جدول بصف واحد وعدة أعمدة أو صفوف متعددة) يحتوي على:
   - اسم المعلم: ${settings.teacherName || '—'}
   - المادة: ${settings.subject || '—'}
   - الصف: ${settings.grade || '—'}
   - عنوان الدرس: ${settings.lessonTitle || '—'}
   - التاريخ: —
   - مدة الدرس: ${settings.duration || '—'}

2. جدول "الأساسيات" بصف واحد لكل عنصر:
   - الأهداف العامة والخاصة
   - المعايير (المعايير التعليمية المستهدفة)
   - القيم الإسلامية المنبثقة من الدرس
   - المصادر وتطبيق التكنولوجيا
   - المهارات الحياتية

3. جدول "خطوات الدرس" بـ 4 أعمدة: (النشاط | المدة الزمنية | الوصف | أساليب التقييم)
   ويجب أن يحتوي على 5 صفوف ثابتة:
   1. النشاط التحفيزي (تمهيد)
   2. الشرح المباشر (عرض)
   3. التطبيق الموجه
   4. العمل الفردي
   5. تذكرة الخروج (خاتمة)

4. جدول "التقييم" يحتوي على: الواجبات / الاختبارات / أدوات التقييم.

5. جدول "التمايز ومراعاة الفروق الفردية".

6. جدول "ملاحظات المعلم".

استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>.
لا تستخدم وسوم <html> أو <body> أو <style>. اجعل المحتوى نظيفاً ومناسباً للعرض داخل div.
اجعل كل الجداول بحدود واضحة (border="1" implicitly عبر CSS).`;

      case 'worksheet':
        return `${ctx}

المطلوب: توليد "ورقة عمل" جاهزة للطباعة باللغة العربية على شكل HTML.
ورقة العمل يجب أن تحتوي على:
- ترويسة: اسم المادة، الصف، اسم الطالب، التاريخ.
- 5 إلى 8 أنشطة متنوعة (أسئلة موضوعية ومقالية، أنشطة تأملية، أنشطة جماعية).
- تنوع في الأنشطة: سؤال اختيار من متعدد، صح/خطأ، أكمل الفراغ، أسئلة مفتوحة، أنشطة تطبيقية.
- مكان لكتابة اسم الطالب والتاريخ.
- أنشطة تتناسب مع مستوى الطلاب المحدد.
استخدم وسوم HTML فق��: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.
لا تستخدم وسوم <html> أو <body> أو <style>.`;

      case 'quiz':
        return `${ctx}

المطلوب: توليد "اختبار قصير" من نوع أسئلة اختيار من متعدد باللغة العربية على شكل HTML.
الاختبار يجب أن يحتوي على:
- ترويسة: اسم المادة، الصف، اسم الطالب، التاريخ، الدرجة.
- 10 أسئلة اختيار من متعدد، كل سؤال له 4 خيارات (أ، ب، ج، د).
- دائرة أو مربع بجانب كل خيار للإجابة.
- في نهاية الاختبار، جدول "نموذج الإجابة" (Answer Key) يحتوي على الإجابات الصحيحة لكل الأسئلة.
- الأسئلة تتناسب مع مستوى الطلاب المحدد وتغطي محتوى الدرس.
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.
لا تستخدم وسوم <html> أو <body> أو <style>.`;

      case 'slides':
        return `${ctx}

المطلوب: توليد "عرض شرائح ملخص" باللغة العربية على شكل HTML.
العرض يجب أن يحتوي على 6 إلى 10 شرائح، كل شريحة في قسم منفصل:
- شريحة العنوان: عنوان الدرس، المادة، الصف، اسم المعلم.
- شرائح المحتوى: كل شريحة تحتوي على عنوان فرعي ونقاط رئيسية (3-5 نقاط).
- شريحة الأهداف.
- شريحة الخاتمة/الملخص.
اجعل كل شريحة داخل <div> بـ class="slide" مع عنوان <h2> ونقاط <ul>.
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <div class="slide">.
لا تستخدم وسوم <html> أو <body> أو <style>.`;

      default:
        return ctx;
    }
  } else {
    const ctx = `You are an expert teaching assistant helping school teachers prepare lessons.
Lesson information:
- Subject: ${settings.subject || 'Not specified'}
- Grade: ${settings.grade || 'Not specified'}
- Duration: ${settings.duration || 'Not specified'}
- Student Level: ${settings.studentLevel || 'Not specified'}
- Teacher Name: ${settings.teacherName || 'Not specified'}
- Lesson Title: ${settings.lessonTitle || 'To be inferred from content'}${subjectGuidance}`;

    switch (outputType) {
      case 'lesson-plan':
        return `${ctx}

Task: Generate a complete "Lesson Plan" in English as well-formatted HTML ready for display.

The HTML must contain well-organized tables as follows:

1. Header table (single row with multiple columns or multiple rows) containing:
   - Teacher Name: ${settings.teacherName || '—'}
   - Subject: ${settings.subject || '—'}
   - Grade: ${settings.grade || '—'}
   - Lesson Title: ${settings.lessonTitle || '—'}
   - Date: —
   - Duration: ${settings.duration || '—'}

2. "Essentials" table with one row per item:
   - Objectives (general and specific)
   - Standards (targeted educational standards)
   - Islamic Values (derived from the lesson)
   - Resources & Tech Integration
   - Life Skills

3. "Lesson Steps" table with 4 columns: (Activity | Duration | Description | Assessment Methods)
   Must contain 5 fixed rows:
   1. Warm-up / Motivation
   2. Direct Instruction
   3. Guided Practice
   4. Independent Work
   5. Exit Ticket

4. "Assessment" table containing: Homework / Tests / Assessment Tools.

5. "Differentiation" table.

6. "Teacher Notes" table.

Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>.
Do not use <html>, <body>, or <style> tags. Keep the content clean and suitable for display inside a div.
All tables must have clear borders (border="1" implicitly via CSS).`;

      case 'worksheet':
        return `${ctx}

Task: Generate a "Worksheet" ready for printing in English as HTML.
The worksheet must contain:
- Header: Subject, Grade, Student Name, Date.
- 5 to 8 varied activities (objective and essay questions, reflective activities, group activities).
- Variety: multiple choice, true/false, fill in the blanks, open-ended questions, applied activities.
- Space for student name and date.
- Activities appropriate for the specified student level.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.
Do not use <html>, <body>, or <style> tags.`;

      case 'quiz':
        return `${ctx}

Task: Generate a "Short Quiz" with multiple choice questions in English as HTML.
The quiz must contain:
- Header: Subject, Grade, Student Name, Date, Score.
- 10 multiple choice questions, each with 4 options (A, B, C, D).
- A circle or square next to each option for answering.
- At the end, an "Answer Key" table with correct answers for all questions.
- Questions appropriate for the specified student level covering the lesson content.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.
Do not use <html>, <body>, or <style> tags.`;

      case 'slides':
        return `${ctx}

Task: Generate a "Slide Summary" in English as HTML.
The presentation must contain 6 to 10 slides, each in a separate section:
- Title slide: Lesson title, Subject, Grade, Teacher Name.
- Content slides: each with a subtitle and key points (3-5 points).
- Objectives slide.
- Conclusion/Summary slide.
Put each slide inside a <div> with class="slide" with an <h2> heading and <ul> points.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <div class="slide">.
Do not use <html>, <body>, or <style> tags.`;

      default:
        return ctx;
    }
  }
}

type GeminiRequest = string | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;

// Quota (429) or overload/unavailable (503) errors: these trigger a silent
// switch to the next API key rather than surfacing an error to the user.
function isQuotaOrOverloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:429|quota|rate\s*limit|resource_exhausted|too many requests|503|high demand|overloaded|service unavailable|temporarily unavailable)/i.test(
    message
  );
}

// Model-not-found style errors: try the next model on the same key.
function isModelUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:404|not found|not supported|does not exist|unknown model|invalid model)/i.test(message);
}

async function generateWithFallback(request: GeminiRequest) {
  const keys = getApiKeys();
  let lastError: unknown;

  // Because the daily quota is per-model-per-project, we iterate model-first:
  // for each model we try every key (each key = its own fresh quota bucket)
  // before falling back to the next model. All rotation is silent — a busy
  // message is only surfaced once every combination is exhausted.
  for (const modelName of MODEL_NAMES) {
    let modelIsDead = false;

    for (const apiKey of keys) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      try {
        return await model.generateContent(request);
      } catch (error) {
        lastError = error;
        if (isModelUnavailableError(error)) {
          // This model doesn't exist / isn't callable — no key will help,
          // so skip straight to the next model.
          modelIsDead = true;
          break;
        }
        if (isQuotaOrOverloadError(error)) {
          // Quota hit or temporarily overloaded on this key — try the next
          // key, which has an independent quota for this same model.
          continue;
        }
        // Any other error is a genuine failure (bad request, auth, etc.).
        throw error;
      }
    }

    if (modelIsDead) continue;
  }

  // Every model on every key is exhausted — only now surface a message.
  throw lastError && !isQuotaOrOverloadError(lastError) && !isModelUnavailableError(lastError)
    ? lastError
    : new Error(SERVICE_BUSY_MESSAGE);
}

export async function generateContent(
  settings: LessonSettings,
  outputType: OutputType,
  files: UploadedFile[]
): Promise<GenerationResult> {
  const prompt = buildBasePrompt(settings, outputType);

  const imageFiles = files.filter((f) => f.type === 'image');
  const docFiles = files.filter((f) => f.type !== 'image');

  let request: GeminiRequest;

  if (imageFiles.length > 0) {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    parts.push({ text: prompt });
    for (const img of imageFiles) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }
    if (docFiles.length > 0) {
      const docNames = docFiles.map((d) => d.name).join(', ');
      const note = settings.contentLanguage === 'ar'
        ? `\nملاحظة: تم رفع الملفات التالية أيضاً ولكن لا يمكن تحليلها كصورة: ${docNames}. يرجى توليد المحتوى بناءً على الصور المرفقة.`
        : `\nNote: The following files were also uploaded but cannot be analyzed as images: ${docNames}. Please generate content based on the attached images.`;
      parts.push({ text: note });
    }
    request = parts;
  } else if (docFiles.length > 0) {
    const docNames = docFiles.map((d) => d.name).join(', ');
    const note = settings.contentLanguage === 'ar'
      ? `\n\nتم رفع الملفات التالية: ${docNames}. يرجى توليد المحتوى بناءً على إعدادات الدرس.`
      : `\n\nThe following files were uploaded: ${docNames}. Please generate content based on the lesson settings.`;
    request = prompt + note;
  } else {
    request = prompt;
  }

  const result = await generateWithFallback(request);
  const text = result.response.text();

  const htmlContent = extractHtml(text);
  const institutionHeader = getInstitutionHeader(settings);
  const fullHtml = institutionHeader + htmlContent;

  const title = settings.lessonTitle || (settings.contentLanguage === 'ar'
    ? `${settings.subject || 'درس'} - ${settings.grade || ''}`
    : `${settings.subject || 'Lesson'} - ${settings.grade || ''}`);

  return { contentHtml: fullHtml, title };
}

function extractHtml(text: string): string {
  const htmlMatch = text.match(/```html\s*([\s\S]*?)\s*```/);
  if (htmlMatch) {
    return htmlMatch[1].trim();
  }
  if (text.trim().startsWith('<') || text.trim().includes('<h1>') || text.trim().includes('<table>')) {
    return text.trim();
  }
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `<p>${line.trim()}</p>`)
    .join('\n');
}
