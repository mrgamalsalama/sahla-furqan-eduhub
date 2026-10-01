import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { INSTITUTIONS } from './src/types';
import type { LessonSettings, OutputType, UploadedFile, GenerationResult } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'node:fs';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

function getApiKey(): string | undefined {
  let key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.startsWith('MY_')) {
    try {
      const envPath = path.resolve(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        const envText = fs.readFileSync(envPath, 'utf-8');
        const match = envText.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1].trim() && !match[1].startsWith('MY_')) {
          key = match[1].trim();
        }
      }
    } catch (err: unknown) {
      console.warn('Failed to read .env file:', err);
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

async function callGemini(contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents']) {
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

function formatApiError(error: unknown): { status: number; message: string } {
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

function buildStandardizedPrompt(settings: LessonSettings, isAr: boolean, ctx: string): string {
  const fw = settings.standardFramework || 'abt';
  const sourceText = settings.sourceText?.trim();
  const isAllMcq = settings.questionFormat === 'all-mcq';

  let sourceDirective = '';
  if (sourceText) {
    sourceDirective = isAr
      ? `\n\nالمادة العلمية / النص المصدري الإلزامي للاختبار:\n"""\n${sourceText}\n"""\nقاعدة صارمة جداً: يجب أن تكون جميع أسئلة الاختبار والفهم مستخرجة حصراً من هذا النص المرفق أعلاه.`
      : `\n\nMandatory Source Text / Material:\n"""\n${sourceText}\n"""\nStrict rule: All assessment questions must be derived directly from this provided text.`;
  } else {
    sourceDirective = isAr
      ? `\n\nلم يتم إرفاق نص مصدري محدد، لذلك قم بتوليد نص قرائي أو سياق علمي أصيل وملهم مناسب للصف والمرحلة، واضبطه بالشكل التام ثم ابنِ الأسئلة عليه.`
      : `\n\nNo source text was provided. Generate an authentic, grade-appropriate context/passage and base the assessment upon it.`;
  }

  const formatDirectiveAr = isAllMcq
    ? `\nتوجيه إلزامي لصيغة الأسئلة: طلب المعلم صراحةً نمط "اختيار من متعدد فقط (All MCQ)". جميع الأسئلة بلا استثناء (15 إلى 20 سؤالاً) يجب أن تكون من نوع الاختيار من متعدد مع 4 بدائل (أ، ب، ج، د)، ومع كل سؤال اكتب اسم المعيار المقاس. لا تضع أي أسئلة مقالية أو مهمة تعبير في هذا النمط، واكتفِ بأسئلة الاختيار من متعدد ومصفوفة المعايير ونموذج الإجابة.`
    : `\nتوجيه لصيغة الأسئلة: اعتمد النمط المتنوع الشامل الأصلي تماماً (أسئلة اختيار من متعدد، وأسئلة فهم وتحليل مقالية، ومهمة إنتاج كتابي/تعبير، ومصفوفة نواتج التعلم).`;

  const formatDirectiveEn = isAllMcq
    ? `\nMandatory Question Format: The teacher specified "Multiple Choice Only (All MCQ)". All questions (15 to 20 items) must strictly be 4-option multiple choice items mapped to standards without essay questions.`
    : `\nQuestion Format: Keep the authentic mixed format (MCQs + in-depth analytical questions + writing production task + benchmark matrix).`;

  if (isAr) {
    let frameworkDetails = '';
    if (fw === 'diagnostic') {
      frameworkDetails = `الإطار المعتمد: الاختبار التشخيصي ورصد الفجوات التعليمية (Diagnostic Assessment & Learning Gap Analysis).
الهدف التربوي: قياس جاهزية الطالب للصف الحالي (${settings.grade || 'الحالي'}) عبر فحص المهارات القبلية التراكمية (Prerequisite Skills) للسنوات والصفوف السابقة لكشف الفاقد التعليمي بدقة.

أقسام الاختبار الإلزامية:
1. نص قرائي أو سياق تقويمي تأسيسي مشكول بالكامل.
2. أسئلة التشخيص: كل سؤال يقيس مهارة أساسية قبلية محددة. البدائل غير الصحيحة (المشتتات) مبنية على أخطاء مفاهيمية شائعة لدى الطلاب (Diagnostic Distractors).
3. جدول مصفوفة تشخيص الفجوات (Diagnostic Gap Matrix) يحتوي على:
    * رقم السؤال.
    * المهارة القبلية المستهدفة (من الصفوف السابقة).
    * نوع الفجوة أو سبب الخطأ المتوقع عند اختيار إجابة خاطئة.
    * مستوى إتقان المهارة (متقن / بحاجة لدعم / فجوة حرجة).
4. الخطة الإجرائية والعلاجية المقترحة للمعلم (Targeted Remediation Plan): إرشادات وتدخلات تدريسية مباشرة وسريعة لعلاج الفجوات المرصودة في الحصص القادمة.
5. نموذج الإجابة وسلم التصحيح.`;
    } else if (fw === 'abt') {
      const isArabicA = settings.abtTrack !== 'arabic-b';
      frameworkDetails = `الإطار المعتمد: اختبار القياس المعياري للغة العربية (ABT - Arabic Benchmark Test) - مسار: ${
        isArabicA ? 'Arabic A (للناطقين باللغة العربية)' : 'Arabic B (لغير الناطقين بها)'
      }.
أقسام الاختبار الإلزامية:
1. نص الانطلاق (القطعة القرائية): نص أدبي أو معلوماتي مشكول بالكامل.
2. مهارة فهم المقروء والتحليل (Reading Comprehension): أسئلة تقيس الفهم الصريح، الفهم الضمني والاستنتاج، استخراج الفكرة الرئيسة، ودلالات الألفاظ وتوظيفها السياقي.
3. مهارة قواعد اللغة والتراكيب (Language Mechanics & Grammar): أسئلة نحوية وصرفية وإملائية تطبيقية مستمدة من سياق النص.
4. ${isAllMcq ? 'أسئلة التطبيق اللغوي والبلاغي المتقدم بنمط الاختيار من متعدد' : 'مهارة الكتابة والإنتاج اللغوي (Writing Task): مهمة كتابية تعبيرية محددة العناصر مع معايير التقييم'}.
5. جدول مصفوفة نواتج التعلم المستهدفة (Learning Outcomes & Benchmark Grid): يوضح المهارة، رقم السؤال، وناتج التعلم المعياري المقاس.
6. نموذج الإجابة وسلم التقدير اللفظي (Answer Key & Rubric).`;
    } else if (fw === 'ib') {
      frameworkDetails = `الإطار المعتمد: تقييم البكالوريا الدولية (IB MYP / DP Assessment Criteria).
يجب تقسيم الأسئلة وتصنيف كل سؤال بوضوح تحت المعايير الآتية:
- المعيار أ (Criterion A: Analysing / التحليل): تحليل النصوص والأفكار والأسلوب الأدبي.
- المعيار ب (Criterion B: Organising / التنظيم): هيكلة الأفكار واستخدام أدوات الربط والتماسك.
- المعيار ج (Criterion C: Producing Text / إنتاج النص): التعبير والإبداع الكتابي وتطوير الأفكار.
- المعيار د (Criterion D: Using Language / استخدام اللغة): دقة النحو، الصرف، الإملاء، وتنوع المفردات.
يجب إرفاق جدول مواصفات وسلالم تقدير (Rubrics من 1 إلى 8).`;
    } else if (fw === 'cefr') {
      frameworkDetails = `الإطار المعتمد: الإطار الأوروبي المرجعي المشترك للغات (CEFR Levels A1 - C2).
يجب أن تتدرج الأسئلة في قياس الكفايات اللغوية:
- الكفاية المعجمية والدلالية (Vocabulary & Lexical Competence).
- الكفاية النحوية والتراكيب (Grammatical Accuracy).
- كفاية الاستيعاب المقروء (Reading Comprehension & Cohesion).
- تحديد المستوى الدقيق المتوقع للطالب (Target Band: A1/A2/B1/B2/C1).`;
    } else if (fw === 'bloom') {
      frameworkDetails = `الإطار المعتمد: مستويات هرم بلوم المعرفي (Bloom's Taxonomy).
يجب تصنيف كل سؤال وفق مستواه المعرفي:
- المستويات التأسيسية: التذكر (Remembering) والفهم (Understanding).
- المستويات المتوسطة: التطبيق (Applying) والتحليل (Analyzing).
- المستويات المتقدمة (HOTS): التقويم (Evaluating) والابتكار (Creating).
يجب إرفاق جدول مواصفات يوضح نسب توزيع الأسئلة والدرجات على كل مستوى.`;
    } else {
      frameworkDetails = `الإطار المعتمد: معايير ومؤشرات خاصة حددها المعلم:
"""\n${settings.customStandards || 'الالتزام بنواتج التعلم الخاصة بالدرس'}\n"""
قم بصياغة أسئلة تقيس هذه المؤشرات المحددة بدقة واكتب اسم المؤشر بجانب كل سؤال.`;
    }

    return `${ctx}${sourceDirective}${formatDirectiveAr}

المطلوب: توليد "اختبار معياري / تشخيصي متكامل" باللغة العربية ومشكول بالكامل على شكل HTML احترافي جاهز للعرض والطباعة والتصدير.

تفاصيل المعايير المطلوبة:
${frameworkDetails}

الهيكل الإلزامي للـ HTML:
1. ترويسة الاختبار: المادة، الصف، نوع التقييم (معياري/تشخيصي)، التاريخ، الدرجة الكلية، اسم الطالب.
2. نص الانطلاق أو المادة العلمية (داخل إطار أنيق blockquote أو div مميز).
3. الأسئلة مصنفة بدقة ومع كل سؤال يوضح المعيار أو المهارة المقاسة.
4. جدول مصفوفة قياس المعايير ونواتج التعلم أو مصفوفة الفجوات.
5. ${fw === 'diagnostic' ? 'التوصيات والخطة العلاجية المباشرة للمعلم، ثم' : ''} نموذج الإجابات وسلالم التقدير اللفظية (Rubric).
6. في نهاية المخرج تماماً: ضع كود QTI XML لجميع أسئلة الاختيار من متعدد داخل الوسم التالي لتمكين التصدير إلى منصات LMS (سهلة والفرقان):
<div id="qti-xml-payload" style="display:none;">
<!-- كرر assessmentItem لكل سؤال اختيار من متعدد -->
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" identifier="Q_01" title="عنوان السؤال" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>A</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>نص السؤال هنا</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
      <simpleChoice identifier="A">الخيار الأول</simpleChoice>
      <simpleChoice identifier="B">الخيار الثاني</simpleChoice>
      <simpleChoice identifier="C">الخيار الثالث</simpleChoice>
      <simpleChoice identifier="D">الخيار الرابع</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>
</div>

استخدم وسوم HTML القياسية فقط: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.
لا تستخدم وسوم <html> أو <body> أو <style>.`;
  } else {
    let frameworkDetails = '';
    if (fw === 'diagnostic') {
      frameworkDetails = `Framework: Diagnostic Assessment & Learning Gap Analysis.
Goal: Measure prerequisite skills from previous grades to identify learning loss.
Include: Context/Passage, Diagnostic Questions, Gap Matrix, Remediation Action Plan, and Answer Key.`;
    } else if (fw === 'abt') {
      frameworkDetails = `Framework: Arabic Benchmark Test (ABT) style / Language Benchmark. Include:
1. Source Reading Passage (Literary or Informational).
2. Reading Comprehension & In-depth Analysis section.
3. Grammar, Mechanics & Vocabulary in context section.
4. ${isAllMcq ? 'Advanced Mechanics MCQs' : 'Productive Writing task with evaluation criteria'}.
5. Benchmark Standards & Skills Grid mapping each question to its standard.
6. Full Answer Key & Scoring Rubric.`;
    } else if (fw === 'ib') {
      frameworkDetails = `Framework: IB MYP / DP Assessment Criteria (Criteria A, B, C, D).`;
    } else if (fw === 'cefr') {
      frameworkDetails = `Framework: Common European Framework of Reference for Languages (CEFR A1-C2).`;
    } else if (fw === 'bloom') {
      frameworkDetails = `Framework: Bloom's Taxonomy (All levels mapped).`;
    } else {
      frameworkDetails = `Framework: Custom Teacher Indicators:
"""\n${settings.customStandards || 'Align with lesson specific outcomes'}\n"""`;
    }

    return `${ctx}${sourceDirective}${formatDirectiveEn}

Task: Generate a comprehensive "Standardized / Diagnostic Assessment" in English formatted in clean HTML ready for display.

Framework details:
${frameworkDetails}

Include QTI XML payload at the very end enclosed in <div id="qti-xml-payload" style="display:none;"></div>.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.
Do not use <html>, <body>, or <style> tags.`;
  }
}

function buildBasePrompt(settings: LessonSettings, outputType: OutputType): string {
  const isAr = settings.contentLanguage === 'ar';
  const subjectGuidance = buildSubjectGuidance(settings);

  if (isAr) {
    const ctx = `أنت مساعد خبير في إعداد المناهج والدروس التعليمية المعتمدة باللغة العربية.

قاعدة لغوية إلزامية وصارمة:
يجب تشكيل وضبط جميع النصوص، العناوين، الفقرات، الأسئلة، والخيارات المكتوبة باللغة العربية تشكيلاً تاماً وكاملاً (حركات الإعراب والبنية: الفتحة، الضمة، الكسرة، السكون، التنوين، والشدة) ضبطاً نحوياً وصرفياً دقيقاً بنسبة 100%. لا تترك أي كلمة عربية دون تشكيل تام.

معلومات الدرس:
- المادة: ${settings.subject || 'غير محدد'}
- الصف الدراسي: ${settings.grade || 'غير محدد'}
- مدة الدرس: ${settings.duration || 'غير محدد'}
- مستوى الطلاب: ${settings.studentLevel || 'غير محدد'}
- اسم المعلم: ${settings.teacherName || 'غير محدد'}
- عنوان الدرس: ${settings.lessonTitle || 'سيتم استنتاجه من المحتوى'}${subjectGuidance}`;

    switch (outputType) {
      case 'standardized-test':
        return buildStandardizedPrompt(settings, true, ctx);

      case 'lesson-plan':
        return `${ctx}

المطلوب: توليد "خطة درس معتمدة" كاملة باللغة العربية ومشكولة تشكيلاً تاماً على شكل HTML منسق وجاهز للعرض.

يجب أن يحتوي HTML على جدول منظم تماماً بالشكل التالي:

1. جدول الترويسة يحتوي على: اسم المعلم (${settings.teacherName || '—'})، المادة (${settings.subject || '—'})، الصف (${settings.grade || '—'})، عنوان الدرس (${settings.lessonTitle || '—'})، التاريخ: —، مدة الدرس (${settings.duration || '—'}).
2. جدول "الأساسيات": الأهداف العامة والخاصة، المعايير التعليمية، القيم الإسلامية، المصادر وتطبيق التكنولوجيا، والمهارات الحياتية.
3. جدول "خطوات الدرس" بـ 4 أعمدة: (النشاط | المدة الزمنية | الوصف | أساليب التقييم) ويحتوي على 5 صفوف: (النشاط التحفيزي، الشرح المباشر، التطبيق الموجه، العمل الفردي، تذكرة الخروج).
4. جدول "التقييم".
5. جدول "التمايز ومراعاة الفروق الفردية".
6. جدول "ملاحظات المعلم".

استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>.
لا تستخدم وسوم <html> أو <body> أو <style>.`;

      case 'worksheet':
        return `${ctx}

المطلوب: توليد "ورقة عمل" جاهزة للطباعة باللغة العربية ومشكولة بالكامل على شكل HTML.
تحتوي على: ترويسة، 5 إلى 8 أنشطة متنوعة (اختيار من متعدد، صح/خطأ، أكمل الفراغ، أسئلة مفتوحة وتطبيقية)، ومكان للاسم والتاريخ.
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.`;

      case 'quiz':
        return `${ctx}

المطلوب: توليد "اختبار قصير شامل (QTI)" باللغة العربية ومشكول بالكامل على شكل HTML.
يحتوي على: ترويسة، 10 أسئلة اختيار من متعدد، نموذج الإجابة (Answer Key)، وفي نهاية المخرج كود XML لجميع الأسئلة داخل:
<div id="qti-xml-payload" style="display:none;">
<!-- كرر assessmentItem من Q_01 إلى Q_10 -->
</div>
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;

      case 'qti-exam':
        return `${ctx}

المطلوب: توليد "اختبار اختيار من متعدد شامل (QTI)" باللغة العربية ومشكول بالكامل على شكل HTML.
يحتوي على: ترويسة، 50 سؤال اختيار من متعدد موزعة حسب هرم بلوم (15 تذكر وفهم، 20 تطبيق وتحليل، 15 تقويم وابتكار)، نموذج الإجابة، وفي نهاية المخرج كود XML لجميع الأسئلة الـ 50 داخل الوسم:
<div id="qti-xml-payload" style="display:none;">
<!-- كرر assessmentItem من Q_01 إلى Q_50 -->
</div>
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;

      case 'slides':
        return `${ctx}

المطلوب: توليد "عرض شرائح ملخص" باللغة العربية ومشكول بالكامل على شكل HTML.
يحتوي على 6 إلى 10 شرائح، كل شريحة داخل <div class="slide"> مع <h2> ونقاط <ul>.
استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <div class="slide">.`;

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
      case 'standardized-test':
        return buildStandardizedPrompt(settings, false, ctx);

      case 'lesson-plan':
        return `${ctx}

Task: Generate a complete "Lesson Plan" in English as well-formatted HTML ready for display.
Includes: Header table, Essentials table, Lesson Steps table (5 stages), Assessment, Differentiation, and Teacher Notes.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>.`;

      case 'worksheet':
        return `${ctx}

Task: Generate a "Worksheet" ready for printing in English as HTML.
Contains: Header, 5 to 8 varied activities, student level alignment.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>.`;

      case 'quiz':
        return `${ctx}

Task: Generate a "Short Quiz" with 10 multiple choice questions in English as HTML with Answer Key and QTI payload inside:
<div id="qti-xml-payload" style="display:none;"></div>
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;

      case 'qti-exam':
        return `${ctx}

Task: Generate a comprehensive "Multiple Choice Exam (QTI)" with 50 questions mapped to Bloom's taxonomy, Answer Key, and full XML payload inside:
<div id="qti-xml-payload" style="display:none;"></div>
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;

      case 'slides':
        return `${ctx}

Task: Generate a "Slide Summary" in English as HTML with 6 to 10 slides, each inside <div class="slide"> with <h2> and <ul>.
Use only HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <div class="slide">.`;

      default:
        return ctx;
    }
  }
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

const ADVISOR_PROMPT_AR = `أنت "المستشار التربوي الذكي" لمعلمي المدارس ومعدي المناهج التعليمية.
مهمتك الأساسية:
1. تقديم حلول تربوية وتطبيقية سريعة لمعضلات إدارة الصف، وضبط السلوك، وتشتت الانتباه، وانخفاض دافعية التعلم.
2. اقتراح استراتيجيات تدريس نشطة وتمايز حقيقي (Differentiated Instruction) يناسب الفروق الفردية للطلاب.
3. المساعدة في صياغة المهام الأدائية، والأنشطة الإبداعية، وسلالم التقدير والتقييم (Rubrics).
4. تقديم إرشادات تربوية للتعامل والتواصل الفعال مع أولياء الأمور وحل المواقف الصفية المعقدة.

طبيعة إجاباتك:
- إجرائية ومباشرة ومقسمة لنقاط محددة يسهل على المعلم تنفيذها في الحصة القادمة فوراً.
- مراعاة واقع المعلم وضغط الوقت وكثافة الفصول.`;

const ADVISOR_PROMPT_EN = `You are the "Smart Pedagogical Advisor" for school teachers and curriculum developers.
Your core mission:
1. Provide quick, practical educational solutions for classroom management, student behavior, attention deficit, and low learning motivation.
2. Suggest active teaching strategies and authentic differentiated instruction tailored to student variances.
3. Assist in designing performance tasks, creative learning activities, and assessment rubrics.
4. Offer professional guidance for effective parent communication and resolving complex classroom scenarios.

Your response style:
- Actionable, concise, structured into clear points ready for immediate classroom implementation.
- Mindful of teacher workload, time constraints, and classroom size.`;

// API Routes
app.post('/api/generate', async (req, res) => {
  try {
    const { settings, outputType, files = [] } = req.body as {
      settings: LessonSettings;
      outputType: OutputType;
      files: UploadedFile[];
    };

    let prompt = buildBasePrompt(settings, outputType);

    if (settings.contentLanguage === 'ar') {
      prompt += `\n\nتأكيد إلزامي: احرص على تشكيل وضبط كامل النص العربي بالحركات الإعرابية والصرفية التامة والدقيقة (تشكيل كامل لجميع الكلمات بدون استثناء).`;
    }

    const imageFiles = files.filter((f) => f.type === 'image');
    const docFiles = files.filter((f) => f.type !== 'image');

    let response;

    if (imageFiles.length > 0) {
      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];
      for (const img of imageFiles) {
        const cleanBase64 = img.base64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }
      if (docFiles.length > 0) {
        const docNames = docFiles.map((d) => d.name).join(', ');
        const note = settings.contentLanguage === 'ar'
          ? `\nملاحظة: تم رفع الملفات التالية أيضاً ولكن لا يمكن تحليلها كصورة: ${docNames}. يرجى توليد المحتوى بناءً على الصور المرفقة.`
          : `\nNote: The following files were also uploaded but cannot be analyzed as images: ${docNames}. Please generate content based on the attached images.`;
        prompt += note;
      }
      parts.push({ text: prompt });

      response = await callGemini({ parts });
    } else if (docFiles.length > 0) {
      const docNames = docFiles.map((d) => d.name).join(', ');
      const note = settings.contentLanguage === 'ar'
        ? `\n\nتم رفع الملفات التالية: ${docNames}. يرجى توليد المحتوى بناءً على إعدادات الدرس.`
        : `\n\nThe following files were uploaded: ${docNames}. Please generate content based on the lesson settings.`;
      
      response = await callGemini(prompt + note);
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
    res.json(result);
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    const { status, message } = formatApiError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/advisor', async (req, res) => {
  try {
    const { history = [], newMessage, lang = 'ar' } = req.body;
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

    res.json({ text: response.text || '' });
  } catch (error: unknown) {
    console.error('Error in advisor chat:', error);
    const { status, message } = formatApiError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/rubric', async (req, res) => {
  try {
    const { subject, grade, assignmentTitle, maxScore, lang = 'ar' } = req.body;
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
1. قسّم الدرجة الكلية (${total}) على 3 إلى 5 معايير تقييم أساسية بدقة (مثلاً: الفهم وصحة المحتوى، التماسك وتنظيم الأفكار، السلامة اللغوية والنحوية، التوظيف والتعبير).
2. لكل معيار، حدد 4 مستويات أداء واضحة: (متميز / جيد جداً / متوسط / بحاجة لدعم).
3. اكتب النتيجة كنص منظم ومختصر وواضح يسهل قراءته داخل مربع نصي، موضحاً اسم كل معيار ودرجته ومؤشرات إتقانه.
لا تضع وسوم HTML أو أكواد برمجية، اكتبه كنص مقروء وواضح ومشكول.`
      : `You are an educational assessment specialist.
Generate a comprehensive analytic grading rubric for:
- Subject: ${subject || 'General'}
- Grade: ${grade || 'Unspecified'}
- Task / Question: ${assignmentTitle || 'Written Task'}
- Total Score: ${total} points.

Requirements:
1. Divide total points (${total}) across 3-5 core criteria (e.g., Content accuracy, Organisation, Linguistic mechanics, Execution).
2. Provide performance descriptors across 4 proficiency levels (Exemplary, Proficient, Developing, Novice).
3. Output as clean, structured plain text suitable for a textarea. Do not use HTML tags.`;

    const response = await callGemini(prompt);

    res.json({ rubric: (response.text || '').trim() });
  } catch (error: unknown) {
    console.error('Error generating rubric:', error);
    const { status, message } = formatApiError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/grade', async (req, res) => {
  try {
    const { imageFile, context } = req.body as {
      imageFile: UploadedFile;
      context: {
        subject: string;
        grade: string;
        assignmentTitle: string;
        rubricOrModelAnswer?: string;
        maxScore?: number;
        lang?: 'ar' | 'en';
      };
    };

    const isAr = context.lang !== 'en';
    const totalScore = context.maxScore || 20;

    const prompt = isAr
      ? `أنت خبير تربوي ومصحح معتمد. أمامك صورة لورقة إجابة كتبها طالب بخط يده.
المعلومات:
- المادة: ${context.subject || 'عام'}
- الصف: ${context.grade || 'غير محدد'}
- عنوان الواجب/السؤال: ${context.assignmentTitle || 'تقييم إجابة'}
- الدرجة الكلية: ${totalScore}
- نموذج الإجابة / سلم التقدير:
"""
${context.rubricOrModelAnswer || 'قم بالتقييم بناءً على المعايير العلمية والتربوية المعتمدة للمادة والصف.'}
"""

المطلوب بدقة:
1. استخراج النص المكتوب بخط اليد وتفريغه نصياً بدقة وأمانة كاملة.
2. تحليل الإجابة ومطابقتها بالمعايير ووضع درجة مستحقة دقيقة من ${totalScore}.
3. استخراج نقاط القوة ومواطن التحسين في جدول أو نقاط واضحة.
4. رصد الأخطاء المعرفية، والنحوية، والإملائية إن وجدت مع التصويب الدقيق لكل خطأ.
5. كتابة رسالة تغذية راجعة تربوية محفزة وموجهة للطالب مباشرة (Student Feedback Card).

أخرج النتيجة بصيغة HTML أنيق ومنسق وجاهز للعرض والطباعة بدون وسوم <html> أو <body> أو <style>. استخدم: <table>, <tr>, <th>, <td>, <div>, <p>, <ul>, <li>, <strong>.`
      : `You are an expert educational grader. Attached is an image of a student's handwritten response.
Context:
- Subject: ${context.subject || 'General'}
- Grade: ${context.grade || 'Unspecified'}
- Assignment/Question: ${context.assignmentTitle || 'Assessment'}
- Total Score: ${totalScore}
- Rubric / Model Answer:
"""
${context.rubricOrModelAnswer || 'Evaluate based on curriculum standards for this grade level.'}
"""

Requirements:
1. Transcribe the handwritten text accurately.
2. Score the submission out of ${totalScore}.
3. Identify strengths and areas for growth.
4. Highlight errors (conceptual, grammatical, spelling) with corrections.
5. Provide encouraging, constructive student feedback.

Format output as clean HTML without <html>, <body>, or <style> tags.`;

    const cleanBase64 = imageFile.base64.replace(/^data:[^;]+;base64,/, '');

    const response = await callGemini({
      parts: [
        {
          inlineData: {
            mimeType: imageFile.mimeType || 'image/png',
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
    });

    const html = extractHtml(response.text || '');
    res.json({ html });
  } catch (error: unknown) {
    console.error('Error grading submission:', error);
    const { status, message } = formatApiError(error);
    res.status(status).json({ error: message });
  }
});

// Serve frontend
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.use((req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    const url = req.originalUrl;
    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(templatePath)) {
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        return;
      }
      next();
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
