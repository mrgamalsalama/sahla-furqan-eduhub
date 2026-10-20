import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Groq, { toFile } from 'groq-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { SAHLAH_LOGO, FURQAN_LOGO } from './logos.js';

// Clean Institution Headers
function getInstitutionHeader(settings: any, outputType?: string): string {
  const isAr = settings.contentLanguage === 'ar';
  const inst = settings.institution || 'both';

  // For official Weekly Lesson Plan: Render exact template header (Title + Logo)
  if (outputType === 'lesson-plan') {
    let logoHtml = '';
    if (inst === 'both') {
      logoHtml = `<div style="display:flex; justify-content:center; align-items:center; gap:20px; margin-bottom:8px;">
        <img src="${SAHLAH_LOGO}" alt="أكاديمية سهلة الدولية" style="height: 38px; max-width: 170px; object-fit: contain;" />
        <div style="width:1px; height:30px; background:#cbd5e1;"></div>
        <img src="${FURQAN_LOGO}" alt="مدارس الفرقان العالمية" style="height: 44px; max-width: 120px; object-fit: contain;" />
      </div>`;
    } else if (inst === 'furqan') {
      logoHtml = `<div style="margin-bottom: 6px;">
        <img src="${FURQAN_LOGO}" alt="مدارس الفرقان العالمية" style="height: 48px; max-width: 220px; object-fit: contain; display: inline-block;" />
      </div>`;
    } else {
      logoHtml = `<div style="margin-bottom: 6px;">
        <img src="${SAHLAH_LOGO}" alt="أكاديمية سهلة الدولية" style="height: 40px; max-width: 220px; object-fit: contain; display: inline-block;" />
      </div>`;
    }

    return `<div class="sahlah-lesson-header" style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 12px; letter-spacing: 0.5px;">${isAr ? 'خطة الدرس الأسبوعية المعتمدة' : 'Official Weekly Lesson Plan'}</div>
      ${logoHtml}
    </div>`;
  }

  let logosHtml = '';
  if (inst === 'both') {
    logosHtml = `<div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom:8px;">
      <img src="${SAHLAH_LOGO}" alt="أكاديمية سهلة" style="height:32px; max-width:140px; object-fit:contain;" />
      <div style="width:1px; height:24px; background:#cbd5e1;"></div>
      <img src="${FURQAN_LOGO}" alt="الفرقان" style="height:36px; max-width:90px; object-fit:contain;" />
    </div>`;
  } else if (inst === 'furqan') {
    logosHtml = `<div style="margin-bottom:8px;"><img src="${FURQAN_LOGO}" alt="الفرقان" style="height:40px; object-fit:contain; display:inline-block;" /></div>`;
  } else {
    logosHtml = `<div style="margin-bottom:8px;"><img src="${SAHLAH_LOGO}" alt="سهلة" style="height:34px; object-fit:contain; display:inline-block;" /></div>`;
  }

  const titleText =
    inst === 'sahlah'
      ? (isAr ? 'أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ' : 'Sahlah Academy')
      : inst === 'furqan'
      ? (isAr ? 'مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ' : 'Al-Furqan International School')
      : (isAr ? 'أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ & مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ' : 'Sahlah Academy & Al-Furqan International School');

  return `<div style="text-align:center; margin-bottom:18px; padding-bottom:12px; border-bottom:2px solid #e2e8f0;">
    ${logosHtml}
    <h2 style="font-size:1.35rem; font-weight:800; color:#1e3a8a; margin:0 0 4px 0;">${titleText}</h2>
  </div>`;
}

export function getApiKeys(): string[] {
  const keys: string[] = [];

  // 1. Check GEMINI_API_KEYS (comma or newline separated list)
  const multiKeys = process.env.GEMINI_API_KEYS;
  if (multiKeys) {
    multiKeys
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('MY_'))
      .forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
  }

  // 2. Check GEMINI_API_KEY and API_KEY (can also be comma-separated or single)
  const singleKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (singleKey) {
    singleKey
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('MY_'))
      .forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
  }

  // 3. Check numbered keys GEMINI_API_KEY_1 to GEMINI_API_KEY_10
  for (let i = 1; i <= 10; i++) {
    const numberedKey = process.env[`GEMINI_API_KEY_${i}`];
    if (numberedKey && !numberedKey.startsWith('MY_')) {
      const clean = numberedKey.trim();
      if (clean && !keys.includes(clean)) keys.push(clean);
    }
  }

  // 4. Also load and merge any keys defined in .env
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf-8');
      const matches = envText.matchAll(/GEMINI_API_KEY(?:_\d+|S)?=([^\r\n]+)/g);
      for (const m of matches) {
        const val = m[1]?.trim();
        if (val && !val.startsWith('MY_')) {
          val.split(/[,\n]/).forEach((k) => {
            const cleaned = k.trim();
            if (cleaned && !cleaned.startsWith('MY_') && !keys.includes(cleaned)) {
              keys.push(cleaned);
            }
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return keys;
}

export function getApiKey(): string | undefined {
  const keys = getApiKeys();
  return keys.length > 0 ? keys[0] : undefined;
}

export function getGroqApiKeys(): string[] {
  const keys: string[] = [];

  const multiKeys = process.env.GROQ_API_KEYS;
  if (multiKeys) {
    multiKeys
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('MY_'))
      .forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
  }

  const singleKey = process.env.GROQ_API_KEY;
  if (singleKey) {
    singleKey
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('MY_'))
      .forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
  }

  for (let i = 1; i <= 5; i++) {
    const numbered = process.env[`GROQ_API_KEY_${i}`];
    if (numbered && !numbered.startsWith('MY_')) {
      const clean = numbered.trim();
      if (clean && !keys.includes(clean)) keys.push(clean);
    }
  }

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf-8');
      const matches = envText.matchAll(/GROQ_API_KEY(?:_\d+|S)?=([^\r\n]+)/g);
      for (const m of matches) {
        const val = m[1]?.trim();
        if (val && !val.startsWith('MY_')) {
          val.split(/[,\n]/).forEach((k) => {
            const cleaned = k.trim();
            if (cleaned && !keys.includes(cleaned)) keys.push(cleaned);
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return keys;
}

export function getGroqApiKey(): string | undefined {
  const keys = getGroqApiKeys();
  return keys.length > 0 ? keys[0] : undefined;
}

/**
 * Convert heterogeneous contents (string, array of {text}, or inlineData parts)
 * into OpenAI/Groq compatible chat messages.
 */
function convertContentsToGroqMessages(contents: any): Array<{ role: 'system' | 'user' | 'assistant'; content: any }> {
  if (typeof contents === 'string') {
    return [{ role: 'user', content: contents }];
  }

  if (Array.isArray(contents)) {
    const hasMedia = contents.some((item) => item?.inlineData);

    if (hasMedia) {
      const contentParts: any[] = [];
      for (const item of contents) {
        if (typeof item === 'string') {
          contentParts.push({ type: 'text', text: item });
        } else if (item?.text) {
          contentParts.push({ type: 'text', text: item.text });
        } else if (item?.inlineData) {
          const mime = item.inlineData.mimeType || 'image/png';
          const data = item.inlineData.data;
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${data}`,
            },
          });
        }
      }
      return [{ role: 'user', content: contentParts }];
    }

    const textPieces: string[] = [];
    for (const item of contents) {
      if (typeof item === 'string') {
        textPieces.push(item);
      } else if (item?.text) {
        textPieces.push(item.text);
      } else if (typeof item === 'object') {
        textPieces.push(JSON.stringify(item));
      }
    }

    if (textPieces.length === 1) {
      return [{ role: 'user', content: textPieces[0] }];
    }

    const first = textPieces[0];
    const isSystemLike = /^(أنت|You are|Instructions:|System:)/i.test(first.trim());
    if (isSystemLike && textPieces.length > 1) {
      return [
        { role: 'system', content: first },
        { role: 'user', content: textPieces.slice(1).join('\n\n') },
      ];
    }

    return [{ role: 'user', content: textPieces.join('\n\n') }];
  }

  return [{ role: 'user', content: String(contents || '') }];
}

/**
 * Groq Text Engine (llama-3.3-70b-versatile):
 * Ultra-fast silent fallback engine and secondary processing core.
 */
export async function callGroqText(
  contents: any,
  options?: { fast?: boolean; model?: string }
): Promise<{ text: string; engine: 'groq'; model: string }> {
  const groqKey = getGroqApiKey();
  if (!groqKey) {
    throw new Error('مفتاح التشغيل البديل (GROQ_API_KEY) غير مهيأ.');
  }

  const groq = new Groq({ apiKey: groqKey });
  const messages = convertContentsToGroqMessages(contents);

  const hasImage = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((part: any) => part.type === 'image_url')
  );

  const modelToUse = hasImage
    ? 'llama-3.2-90b-vision-preview'
    : (options?.model || 'llama-3.3-70b-versatile');

  console.log(`[Dual-Engine / Groq] Calling model: ${modelToUse} (fast=${Boolean(options?.fast)})...`);

  const completion = await groq.chat.completions.create({
    model: modelToUse,
    messages: messages as any,
    temperature: options?.fast ? 0.2 : 0.4,
    max_tokens: 8192,
    top_p: 0.95,
  });

  const text = completion.choices[0]?.message?.content || '';
  return {
    text,
    engine: 'groq',
    model: modelToUse,
  };
}

// Order prioritized by stability, speed, and active quota limits
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

let currentKeyIndex = 0;

/**
 * Unified AI Caller with Dual-Engine Architecture:
 * - Primary: Google Gemini with multi-key rotation and intelligent model fallback
 * - Silent Fallback: Groq llama-3.3-70b-versatile on 429 Rate Limits, 503 Overloads, 504 Timeouts, or model exhaustion
 */
export async function callGemini(contents: any, options?: { fast?: boolean; model?: string }) {
  const keys = getApiKeys();
  const groqKey = getGroqApiKey();

  // If no Gemini keys are configured, but Groq key is available, seamless direct dispatch to Groq
  if (keys.length === 0) {
    if (groqKey) {
      console.log('[Dual-Engine] No Gemini API key detected. Seamlessly delegating request to Groq llama-3.3-70b-versatile...');
      return await callGroqText(contents, options);
    }
    const err = new Error(
      'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY أو GROQ_API_KEY) غير مهيأ. يرجى إضافة مفتاح التشغيل في إعدادات البيئة.'
    );
    (err as any).statusCode = 401;
    throw err;
  }

  // Determine model fallback sequence
  let modelsToTry = [...CANDIDATE_MODELS];
  if (options?.model) {
    modelsToTry = [options.model, ...modelsToTry.filter((m) => m !== options.model)];
  } else if (options?.fast) {
    modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  }

  // Round-robin index rotation across available keys to distribute load
  const startIndex = currentKeyIndex % keys.length;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  const orderedKeys = [
    ...keys.slice(startIndex),
    ...keys.slice(0, startIndex),
  ];

  let lastError: any;

  // Try each API key in case of quota exhaustion or rate limits (429 / RESOURCE_EXHAUSTED)
  for (let kIdx = 0; kIdx < orderedKeys.length; kIdx++) {
    const apiKey = orderedKeys[kIdx];
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    for (const model of modelsToTry) {
      try {
        // Enforce a sensible 35s timeout on primary engine call to guarantee swift fallback
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => {
            const timeoutErr = new Error('Gemini API call timed out after 35s');
            (timeoutErr as any).name = 'TimeoutError';
            reject(timeoutErr);
          }, 35000)
        );

        const callPromise = ai.models.generateContent({
          model,
          contents,
          config: {
            thinkingConfig: {
              thinkingLevel: options?.fast ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
            },
          },
        });

        const response: any = await Promise.race([callPromise, timeoutPromise]);
        return {
          ...response,
          text: response.text || '',
          engine: 'gemini',
          model,
        };
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        const isQuotaOrRateLimit =
          errMessage.includes('429') ||
          errMessage.includes('RESOURCE_EXHAUSTED') ||
          errMessage.includes('quota') ||
          errMessage.includes('rate limit');

        // If key reached its quota and we have other keys in the pool, switch immediately!
        if (isQuotaOrRateLimit && orderedKeys.length > 1) {
          console.warn(`Key #${kIdx + 1} quota/rate limit reached. Switching to next key in pool...`);
          lastError = err;
          break; // break to next API key
        }

        console.warn(`Model ${model} failed, switching to fallback candidate:`, errMessage.slice(0, 150));
        lastError = err;
      }
    }
  }

  // AUTOMATIC SILENT RESCUE FALLBACK TO GROQ (llama-3.3-70b-versatile)
  if (groqKey) {
    try {
      console.warn(
        `[Dual-Engine Fallback] Primary engine (Gemini) failed (${lastError?.message?.slice(0, 120) || 'All models exhausted'}). Automatically and silently activating Groq llama-3.3-70b-versatile...`
      );
      return await callGroqText(contents, options);
    } catch (groqErr: any) {
      console.error('[Dual-Engine Fallback] Groq fallback also failed:', groqErr?.message);
    }
  }

  throw lastError || new Error('فشلت جميع نماذج ومفاتيح الذكاء الاصطناعي المتاحة (Gemini & Groq).');
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
    rawMessage.includes('غير مهيأ') ||
    rawMessage.includes('ACCOUNT_STATE_INVALID')
  ) {
    return {
      status: 401,
      message: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY أو GROQ_API_KEY) غير صالح أو تم إلغاؤه. يرجى التحقق من المفاتيح في إعدادات البيئة.',
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
  cleaned = cleaned.replace(/^```xml\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  cleaned = cleaned.trim();

  // Strip conversational chat preambles (both raw text and inside <p>...</p>)
  cleaned = cleaned.replace(
    /^(?:<p[^>]*>)?\s*(?:بصفتي|يسرني|أهلاً|مرحباً|إليك|أقدم لك|بالتأكيد|عزيزي المعلم|مرحباً بك)[\s\S]*?(?:<\/p>|---|###|(?=<h[1-6]|<table|<div))/i,
    ''
  );

  return cleaned.trim();
}

function isNonNativeSubject(subject?: string): boolean {
  if (!subject) return false;
  const s = subject.toLowerCase();
  return (
    s.includes('nonnative') ||
    s.includes('non-native') ||
    s.includes('غير الناطقين') ||
    s.includes('afl') ||
    s.includes('foreign')
  );
}

function buildSubjectGuidance(settings: any): string {
  const isAr = settings.contentLanguage === 'ar';
  const nonNative = isNonNativeSubject(settings.subject);
  if (nonNative) {
    return isAr
      ? `\n\nتَوْجِيهَاتٌ خَاصَّةٌ: الْمَادَّةُ مُخَصَّصَةٌ لِغَيْرِ النَّاطِقِينَ بِاللُّغَةِ (AFL). يَجِبُ تَبْسِيطُ التَّرَاكِيبِ اللُّغَوِيَّةِ، وَاقْتِرَاحُ وَسَائِلَ بَصَرِيَّةٍ وَمُعْجَمٍ مُسَاعِدٍ لِلْمُصْطَلَحَاتِ، وَتَكْيِيفُ الْأَسْئِلَةِ لِتُنَاسِبَ مُتَعَلِّمِي اللُّغَةِ الثَّانِيَةِ مَعَ التَّشْكِيلِ التَّامِ.`
      : `\n\nSpecial guidance: This subject is designed for non-native speakers (AFL / Second Language Learners). Simplify language structures, include visual supports and bilingual glossaries, and calibrate difficulty accordingly.`;
  }
  return isAr
    ? `\n\nتَوْجِيهَاتٌ خَاصَّةٌ: الْمَادَّةُ مُخَصَّصَةٌ لِلنَّاطِقِينَ بِاللُّغَةِ. رَكِّزْ عَلَى الْمَهَارَاتِ التَّحْلِيلِيَّةِ وَالْبَلَاغِيَّةِ وَالتَّعْبِيرِ الْعَمِيقِ الْمُنَاسِبِ لِلْمَرْحَلَةِ الْعُمْرِيَّةِ وَالْمَعَايِيرِ الْوَطَنِيَّةِ وَالدَّوْلِيَّةِ.`
    : `\n\nSpecial guidance: Designed for native-level learners. Focus on higher-order analytical, literary, and evaluative competencies appropriate for the grade level.`;
}

function getLmsXmlSchemaDirective(lmsTarget?: string, isAr: boolean = true): string {
  const isSahlah = lmsTarget === 'sahlah_cypher';
  if (isSahlah) {
    return isAr
      ? `\nتَنْبِيهٌ هَامٌّ جِدّاً لِإِصْدَارِ QTI لِأَكَادِيمِيَّةِ سَهْلَةَ (QTI v1.2 ZIP - CYPHER LMS):
قَاعِدَةٌ صَارِمَةٌ وَإِلْزَامِيَّةٌ 100%: يَجِبُ أَنْ يَتَضَمَّنَ كُلُّ عُنْصُرِ سُؤَالٍ <item> نَصَّ السُّؤَالِ كَامِلاً وَمَشْكُولاً دَاخِلَ وَسْمِ <mattext texttype="text/html"><![CDATA[<p>نص السؤال كاملاً ومشكولاً هنا</p>]]></mattext>، وَيُحْظَرُ حَظْراً قَاطِعاً تَرْكُ وسم <mattext> فَارِغاً!
كُودُ XML يَجِبُ أَنْ يَكُونَ مُتَوَافِقاً تَمَاماً مَعَ مِعْيَارِ IMS QTI v1.2:
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="SAHLAH_ASSESSMENT_01" title="...">
    <section ident="root_section">
      <item ident="Q_01" title="السؤال الأول">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material><mattext texttype="text/html"><![CDATA[<p>مَيِّزِ الِاسْمَ النَّكِرَةَ مِنَ الْبَدَائِلِ التَّالِيَةِ:</p>]]></mattext></material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
              <response_label ident="A"><material><mattext texttype="text/plain">الْكِتَابُ</mattext></material></response_label>
              <response_label ident="B"><material><mattext texttype="text/plain">مَدِينَةٌ</mattext></material></response_label>
              <response_label ident="C"><material><mattext texttype="text/plain">مَكَّةُ</mattext></material></response_label>
              <response_label ident="D"><material><mattext texttype="text/plain">هَذَا</mattext></material></response_label>
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes><decvar varname="SCORE" vartype="Decimal" defaultval="0"/></outcomes>
          <respcondition continue="No">
            <conditionvar><varequal respident="response1">B</varequal></conditionvar>
            <setvar action="Set" varname="SCORE">1</setvar>
          </respcondition>
        </resprocessing>
      </item>
    </section>
  </assessment>
</questestinterop>`
      : `\nQTI Schema Directive for Sahlah Academy (QTI v1.2): Use IMS QTI v1.2 <questestinterop> with <assessment>, <section>, and <item> format. Every <item> MUST contain the full question text inside <mattext texttype="text/html"><![CDATA[<p>Question text...</p>]]></mattext>. Never leave mattext empty!`;
  }

  // Furqan International School (QTI v2.1)
  return isAr
    ? `\nتَنْبِيهٌ إِصْدَارِ QTI لِمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ (QTI v2.1 ZIP):
يَجِبُ أَنْ يَكُونَ كُودُ XML مُتَوَافِقاً مَعَ مِعْيَارِ IMS QTI v2.1 القياسي مع استخدام وسوم:
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" identifier="Q_01" title="..." adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>A</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>نص السؤال المشكول كاملاً</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
      <simpleChoice identifier="A">الخيار الأول</simpleChoice>
      <simpleChoice identifier="B">الخيار الثاني</simpleChoice>
      <simpleChoice identifier="C">الخيار الثالث</simpleChoice>
      <simpleChoice identifier="D">الخيار الرابع</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`
    : `\nQTI Schema Directive for Al-Furqan International School (QTI v2.1): Use IMS QTI v2.1 XML items with <assessmentItem>, <responseDeclaration>, <itemBody>, and <choiceInteraction>.`;
}

function buildStandardizedPrompt(settings: any, isAr: boolean, ctx: string): string {
  const fw = settings.standardFramework || 'abt';
  const sourceText = settings.sourceText?.trim();
  const isAllMcq = settings.questionFormat === 'all-mcq';
  const lmsTarget = settings.lmsTarget || 'sahlah_cypher';

  let sourceDirective = '';
  if (sourceText) {
    sourceDirective = isAr
      ? `\n\nالْمَادَّةُ الْعِلْمِيَّةُ / النَّصُّ الْمَصْدَرِيُّ الْإِلْزَامِيُّ لِلِاخْتِبَارِ:\n"""\n${sourceText}\n"""\nقَاعِدَةٌ صَارِمَةٌ جِدّاً: يَجِبُ أَنْ تَكُونَ جَمِيعُ أَسْئِلَةِ الِاخْتِبَارِ وَالْفَهْمِ مُسْتَخْرَجَةً حَصْراً مِنْ هَذَا النَّصِّ الْمُرْفَقِ أَعْلَاهُ.`
      : `\n\nMandatory Source Text / Material:\n"""\n${sourceText}\n"""\nStrict rule: All assessment questions must be derived directly from this provided text.`;
  } else {
    sourceDirective = isAr
      ? `\n\nلَمْ يَتِمَّ إِرْفَاقُ نَصٍّ مَصْدَرِيٍّ مُحَدَّدٍ، لِذَلِكَ قُمْ بِتَوْلِيدِ نَصٍّ قِرَائِيٍّ أَوْ سِيَاقٍ عِلْمِيٍّ أَصِيلٍ وَمُلْهِمٍ مُنَاسِبٍ لِلصَّفِّ وَالْمَرْحَلَةِ، وَاضْبِطْهُ بِالشَّكْلِ التَّامِّ ثُمَّ ابْنِ الْأَسْئِلَةَ عَلَيْهِ.`
      : `\n\nNo source text was provided. Generate an authentic, grade-appropriate context/passage and base the assessment upon it.`;
  }

  const formatDirectiveAr = isAllMcq
    ? `\nتَوْجِيهٌ إِلْزَامِيٌّ لِصِيغَةِ الْأَسْئِلَةِ: طَلَبَ الْمُعَلِّمُ صَرَاحَةً نَمَطَ "اخْتِيَارٌ مِنْ مُتَعَدِّدٍ فَقَطْ (All MCQ)". جَمِيعُ الْأَسْئِلَةِ بِلَا اسْتِثْنَاءِ (15 إِلَى 20 سُؤَالاً) يَجِبُ أَنْ تَكُونَ مِنْ نَوْعِ الِاخْتِيَارِ مِنْ مُتَعَدِّدٍ مَعَ 4 بَدَائِلَ (أ، ب، ج، د)، وَمَعَ كُلِّ سُؤَالٍ اكْتُبِ اسْمَ الْمِعْيَارِ الْمَقَاسِ. لَا تَضَعْ أَيَّ أَسْئِلَةٍ مَقَالِيَّةٍ أَوْ مَهَمَّةِ تَعْبِيرٍ فِي هَذَا النَّمَطِ، وَاكْتَفِ بِأَسْئِلَةِ الِاخْتِيَارِ مِنْ مُتَعَدِّدٍ وَمَصْفُوفَةِ الْمَعَايِيرِ وَنَمُوذَجِ الْإِجَابَةِ.`
    : `\nتَوْجِيهٌ لِصِيغَةِ الْأَسْئِلَةِ: اعْتَمِدِ النَّمَطَ الْمُتَنَوِّعَ الشَّامِلَ الْأَصْلِيَّ تَمَاماً (أَسْئِلَةُ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ، وَأَسْئِلَةُ فَهْمٍ وَتَحْلِيلٍ مَقَالِيَّةٍ، وَمَهَمَّةُ إِنْتَاجٍ كِتَابِيٍّ/تَعْبِيرٍ، وَمَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ).`;

  const formatDirectiveEn = isAllMcq
    ? `\nMandatory Question Format: The teacher specified "Multiple Choice Only (All MCQ)". All questions (15 to 20 items) must strictly be 4-option multiple choice items mapped to standards without essay questions.`
    : `\nQuestion Format: Keep the authentic mixed format (MCQs + in-depth analytical questions + writing production task + benchmark matrix).`;

  const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, isAr);

  if (isAr) {
    let frameworkDetails = '';
    if (fw === 'diagnostic_gap' || fw === 'diagnostic') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الِاخْتِبَارُ التَّشْخِيصِيُّ وَمَصْفُوفَةُ رَصْدِ الْفَجَوَاتِ (Diagnostic & Learning Gap Analysis).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ جَاهِزِيَّةِ الطَّالِبِ لِلصَّفِّ الْحَالِيِّ عَبْرَ اخْتِبَارِ الْمَهَارَاتِ الْقَبْلِيَّةِ التَّرَاكُمِيَّةِ (Prerequisite Skills) لِكَشْفِ الْفَاقِدِ التَّعْلِيمِيِّ.
عَنَاصِرُ الْإِطَارِ:
- أَسْئِلَةٌ تَشْخِيصِيَّةٌ مُعَيَّرَةٌ مَعَ مُشَتَّتَاتٍ مَبْنِيَّةٍ عَلَى أَخْطَاءٍ مَفَاهِيمِيَّةٍ شَائِعَةٍ.
- جَدْوَلُ مَصْفُوفَةِ تَشْخِيصِ الْفَجَوَاتِ (Diagnostic Gap Matrix): رَقْمُ السُّؤَالِ | الْمَهَارَةُ الْقَبْلِيَّةُ | سَبَبُ الْخَطَأِ الْمُتَوَقَّعِ | نَوْعُ الْفَجْوَةِ | مُسْتَوَى التَّمَكُّنِ (مُتْقَنٌ / حَرِجٌ).
- الْخُطَّةُ الْعِلَاجِيَّةُ وَالتَّدَخُّلَاتُ التَّدْرِيسِيَّةُ الْمُبَاشِرَةُ لِلْمُعَلِّمِ (Targeted Remediation Plan).`;
    } else if (fw === 'map_growth') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَقَايِيسُ التَّقَدُّمِ الدَّوْلِيَّةِ (MAP Growth / RIT Benchmarks).
الْهَدَفُ التَّرْبَوِيُّ: اخْتِبَارٌ مُتَدَرِّجٌ صُعُوبِيّاً مُعَيَّرٌ وِفْقَ نِطَاقَاتِ RIT Score Bands (مِنَ الْمُسْتَوَى التَّأْسِيسِيِّ إِلَى الْمُتَقَدِّمِ).
عَنَاصِرُ الْإِطَارِ:
- تَصْنِيفُ كُلِّ سُؤَالٍ حَسَبَ نِطَاقِ RIT الْمُسْتَهْدَفِ وَمُؤَشِّرِ النُّمُوِّ.
- مَصْفُوفَةُ نِطَاقَاتِ الرِّيت (RIT Proficiency Bands Matrix): دُونَ الْمُسْتَوَى | قَرِيبٌ مِنَ الْمُسْتَوَى | فِي الْمُسْتَوَى | مُتَفَوِّقٌ.
- خُطَّةُ تَفْرِيدِ التَّعَلُّمِ وَالتَّمَايُزِ بِنَاءً عَلَى نَتَائِجِ MAP Growth.`;
    } else if (fw === 'ib_criteria' || fw === 'ib') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ تَقْيِيمِ الْبَكَالُورْيَا الدَّوْلِيَّةِ (IB Assessment Criteria A, B, C, D).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ كَفَايَاتِ الطَّالِبِ التَّحْلِيلِيَّةِ وَالتَّنْظِيمِيَّةِ وَاللُّغَوِيَّةِ وِفْقَ سَلَالِمِ IB (من 1 إلى 8 دَرَجَاتٍ):
- الْمِعْيَارُ أ (Criterion A: Analysing / التَّحْلِيلُ).
- الْمِعْيَارُ ب (Criterion B: Organising / التَّنْظِيمُ).
- الْمِعْيَارُ ج (Criterion C: Producing Text / إِنْتَاجُ النَّصِّ وَالْمُحْتَوَى).
- الْمِعْيَارُ د (Criterion D: Using Language / اسْتِخْدَامُ اللُّغَةِ).
عَنَاصِرُ الْإِطَارِ:
- أَسْئِلَةٌ مُصَنَّفَةٌ صَرَاحَةً تَحْتَ كُلِّ مِعْيَارٍ مَعَ سُلَّمِ تَقْدِيرٍ لَفْظِيٍّ شَامِلٍ (IB Analytical Rubric 1-8).`;
    } else if (fw === 'cambridge_igcse') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ كَامْبِرِيدْج وَإِدِكْسِل الدَّوْلِيَّةُ (Cambridge IGCSE & Checkpoint Mark Scheme).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ أَهْدَافِ التَّقْيِيمِ الثَّلَاثَةِ:
- AO1: الْمَعْرِفَةُ وَالْفَهْمُ الصَّرِيحُ (Knowledge & Understanding).
- AO2: التَّحْلِيلُ وَالتَّفْسِيرُ وَالتَّطْبِيقُ (Analysis & Interpretation).
- AO3: التَّقْيِيمُ وَالِاسْتِنْتَاجُ وَإِبْدَاءُ الرَّأْيِ (Evaluation & Critical Judgement).
عَنَاصِرُ الْإِطَارِ:
- جَدْوَلُ مُوَاصَفَاتِ كَامْبِرِيدْج (Mark Scheme Grid) يُحَدِّدُ مُخَصَّصَاتِ الدَّرَجَاتِ لِكُلِّ سُؤَالٍ مَعَ مَعَايِيرِ قَبُولِ الْإِجَابَاتِ.`;
    } else if (fw === 'us_common_core') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْمَعَايِيرُ الْأَمْرِيكِيَّةُ الْمُشْتَرَكَةُ (US Common Core / CCSS Standards).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ مَعَايِيرِ الْقِرَاءَةِ وَالْكِتَابَةِ وَالرِّيَاضِيَّاتِ وِفْقَ مُسْتَوَيَاتِ عُمْقِ الْمَعْرِفَةِ (Webb's DOK Levels 1-4):
- تَصْنِيفُ كُلِّ سُؤَالٍ وِفْقَ كُودِ الْمِعْيَارِ الدَّقِيقِ (CCSS Strand Code).
- مَصْفُوفَةُ تَوَافُقِ الْمَعَايِيرِ (CCSS Standards Crosswalk Matrix).`;
    } else if (fw === 'cefr_languages' || fw === 'cefr') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْإِطَارُ الْأُورُوبِّيُّ الْمَرْجِعِيُّ لِلُّغَاتِ (CEFR Framework A1 - C2).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ الْكَفَايَاتِ اللُّغَوِيَّةِ التَّوَاصُلِيَّةِ:
- الْمُسْتَوَى التَّأْسِيسِيُّ (A1 / A2) | الْمُسْتَوَى الْمُسْتَقِلُّ (B1 / B2) | مُسْتَوَى الْإِتْقَانِ وَالْكَمَالِ (C1 / C2).
- جَدْوَلُ تَصْنِيفِ الْكَفَايَاتِ الْمُعْجَمِيَّةِ وَالنَّحْوِيَّةِ وَالِاسْتِيعَابِيَّةِ.`;
    } else if (fw === 'pirls_pisa') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْمَعَايِيرُ الدَّوْلِيَّةُ لِلْقِرَاءَةِ وَالْعُلُومِ (PIRLS / PISA Aligned Literacy).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ مَهَارَاتِ التَّفْكِيرِ الْعُلْيَا وَحَلِّ الْمُشْكِلَاتِ فِي سِيَاقَاتِ الْحَيَاةِ الْوَاقِعِيَّةِ:
- الِاسْتِرْجَاعُ وَالْوُصُولُ إِلَى الْمَعْلُومَاتِ الصَّرِيحَةِ.
- الِاسْتِدْلَالُ الْمُبَاشِرُ وَالِاسْتِنْبَاطُ.
- تَفْسِيرُ وَدَمْجُ الْأَفْكَارِ وَالْمَعْلُومَاتِ.
- فَحْصُ وَتَقْيِيمُ الْمُحْتَوَى وَاللُّغَةِ وَالْعَنَاصِرِ النَّصِّيَّةِ.
- مَصْفُوفَةُ مُؤَشِّرَاتِ PISA/PIRLS الدَّوْلِيَّةِ.`;
    } else if (fw === 'abt') {
      const isArabicA = settings.abtTrack !== 'arabic-b';
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: اخْتِبَارُ الْقِيَاسِ الْمِعْيَارِيِّ لِلُّغَةِ الْعَرَبِيَّةِ (ABT - Arabic Benchmark Test) - مَسَارُ: ${
        isArabicA ? 'Arabic A (لِلنَّاطِقِينَ بِاللُّغَةِ الْعَرَبِيَّةِ)' : 'Arabic B (لِغَيْرِ النَّاطِقِينَ بِهَا)'
      }.
أَقْسَامُ الِاخْتِبَارِ: فَهْمُ الْمَقْرُوءِ، قَوَاعِدُ اللُّغَةِ وَالتَّرَاكِيبُ، التَّطْبِيقُ الْبَلَاغِيُّ، مَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ، وَسُلَّمُ التَّقْدِيرِ.`;
    } else {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ خَاصَّةٌ حَدَّدَهَا الْمُعَلِّمُ:
"""\n${settings.customStandards || 'نَوَاتِجُ التَّعَلُّمِ الْمِعْيَارِيَّةُ لِلْمَنْهَجِ'}\n"""`;
    }

    const subCriteriaText = settings.selectedSubCriteria && settings.selectedSubCriteria.length > 0
      ? `\nالْمَعَايِيرُ وَالْمُؤَشِّرَاتُ الْفَرْعِيَّةُ التَّخَصُّصِيَّةُ الْمُخْتَارَةُ مِنَ الْمُعَلِّمِ (يَجِبُ التَّرْكِيزُ عَلَيْهَا فِي الْأَسْئِلَةِ):\n${settings.selectedSubCriteria.map((c) => `- ${c}`).join('\n')}`
      : '';

    const teacherCustomStandardsText = settings.customStandards?.trim()
      ? `\nمَعَايِيرُ إِضَافِيَّةٌ خَاصَّةٌ مَكْتُوبَةٌ بِمَعْرِفَةِ الْمُعَلِّمِ (تَضْمِينٌ إِجْبَارِيٌّ):\n"""\n${settings.customStandards.trim()}\n"""`
      : '';

    return `${ctx}${sourceDirective}${formatDirectiveAr}
المَطْلُوبُ: تَوْلِيدُ "اخْتِبَارٍ مِعْيَارِيٍّ / تَشْخِيصِيٍّ مُتَكَامِلٍ" بِاللُّغَةِ الْعَرَبِيَّةِ بِلُغَةٍ سَلِيمَةٍ وَمَضْبُوطَةٍ عَلَى شَكْلِ HTML احْتِرَافِيٍّ جَاهِزٍ لِلْعَرْضِ وَالطِّبَاعَةِ وَالتَّصْدِيرِ لِلِاعْتِمَادِ التَّرْبَوِيِّ (مِنْ 10 إِلَى 12 سُؤَالاً مُعَيَّراً).
تَفَاصِيلُ الْإِطَارِ الْمِعْيَارِيِّ الْمُسْتَهْدَفِ:
${frameworkDetails}
${subCriteriaText}
${teacherCustomStandardsText}

الْهَيْكَلُ الْإِلْزَامِيُّ لِلْمُخْرَجِ (HTML Structure):
1. تَرْوِيسَةُ الِاخْتِبَارِ الْمِعْيَارِيِّ (Assessment Header): بَيَانَاتُ الْمَادَّةِ، الصَّفِّ، نَوْعِ الْإِطَارِ الْمِعْيَارِيِّ، زَمَنِ الِاخْتِبَارِ، وَالدَّرَجَةِ الْكُلِّيَّةِ.
2. نَصُّ الِانْطِلَاقِ / الْمَادَّةُ الْمَصْدَرِيَّةُ (Stimulus Text): فِي إِطَارٍ بَصَرِيٍّ مُمَيَّزٍ وَمَشْكُولٍ 100%.
3. بَنْكُ الْأَسْئِلَةِ الْمِعْيَارِيَّةِ (Item Bank): كُلُّ سُؤَالٍ مَكْتُوبٌ بِوُضُوحٍ وَمُوَضَّحٌ بِجَانِبِهِ اسْمُ الْمِعْيَارِ الْمَقَاسِ وَمُسْتَوَاهُ الْمَعْرِفِيُّ.
4. مَصْفُوفَةُ مُؤَشِّرَاتِ الْأَدَاءِ وَالتَّحْلِيلِ الْمِعْيَارِيِّ (Rubric & Standards Assessment Matrix):
   جَدْوَلٌ رَسْمِيٌّ تَفْصِيلِيٌّ لِلْإِشْرَافِ التَّرْبَوِيِّ يَشْمَلُ الْأَعْمِدَةَ:
   (رَقْمُ السُّؤَالِ | كُودُ وَاسْمُ الْمِعْيَارِ الْمُسْتَهْدَفِ | مُسْتَوَى التَّفْكِيرِ / عُمْقِ الْمَعْرِفَةِ | مُؤَشِّرُ الْأَدَاءِ الْمِعْيَارِيِّ وَدَرَجَةُ الْإِتْقَانِ | الْإِجْرَاءُ التَّدْرِيسِيُّ وَالْخُطَّةُ الْعِلَاجِيَّةُ الْمُقْتَرَحَةُ عِنْدَ الْخَطَأِ).
5. الْخُطَّةُ الْعِلَاجِيَّةُ وَالتَّدَخُّلَاتُ التَّدْرِيسِيَّةُ الْمُبَاشِرَةُ (Remediation & Enrichment Plan).
6. نَمُوذَجُ الْإِجَابَاتِ النَّمُوذَجِيَّةِ وَسُلَّمُ التَّقْدِيرِ اللَّفْظِيِّ (Answer Key & Scoring Rubrics).
7. فِي نِهَايَةِ الْمُخْرَجِ تَمَاماً: كُودُ QTI XML الْكَامِلُ لِلْأَسْئِلَةِ دَاخِلَ:${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- كود QTI XML الصالح هنا -->
]]></div>
اسْتَخْدِمْ وُسُومَ HTML الْقِيَاسِيَّةَ فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.
لَا تَسْتَخْدِمْ وُسُومَ <html> أَوْ <body> أَوْ <style>.`;
  } else {
    let frameworkDetails = '';
    if (fw === 'diagnostic_gap' || fw === 'diagnostic') {
      frameworkDetails = `Framework: Diagnostic Assessment & Learning Gap Analysis.
Key Components:
1. Stimulus / Context text.
2. Diagnostic Item Bank (prerequisite skills testing with diagnostic distractors).
3. Diagnostic Gap Matrix (Item # | Prerequisite Skill | Error Cause | Severity: Mastered / Needs Support / Critical Gap).
4. Targeted Remediation Action Plan for the teacher.
5. Answer Key & Scoring Guide.`;
    } else if (fw === 'map_growth') {
      frameworkDetails = `Framework: MAP Growth / RIT Benchmarks.
Key Components:
1. Calibrated items aligned with RIT score bands (from Below Basic to Advanced).
2. Competency and Growth Indicator tagged per question.
3. RIT Proficiency Bands Matrix (Low, Low Average, Average, High Average, High).
4. Differentiated instructional strategy for each band.
5. Answer Key & Rationale.`;
    } else if (fw === 'ib_criteria' || fw === 'ib') {
      frameworkDetails = `Framework: IB Assessment Criteria (MYP / DP Criteria A, B, C, D with 1-8 Rubrics).
Key Components:
1. Items grouped explicitly under Criteria:
   - Criterion A: Analysing
   - Criterion B: Organising
   - Criterion C: Producing Text / Content
   - Criterion D: Using Language
2. Comprehensive 1-8 achievement level descriptors (Analytical Rubrics).
3. Exemplars and benchmark descriptors.`;
    } else if (fw === 'cambridge_igcse') {
      frameworkDetails = `Framework: Cambridge IGCSE & Checkpoint Mark Scheme.
Key Components:
1. Assessment Objectives: AO1 (Knowledge & Understanding), AO2 (Analysis & Application), AO3 (Evaluation & Judgment).
2. Official Cambridge-style Mark Scheme Table with grade boundaries and criteria for award of marks.`;
    } else if (fw === 'us_common_core') {
      frameworkDetails = `Framework: US Common Core (CCSS Standards) & Webb's Depth of Knowledge (DOK 1-4).
Key Components:
1. Tag each item with specific CCSS strand code and DOK level.
2. CCSS Standards Alignment Crosswalk Table.
3. Formative performance rubric.`;
    } else if (fw === 'cefr_languages' || fw === 'cefr') {
      frameworkDetails = `Framework: CEFR Framework (Levels A1 to C2).
Key Components:
1. Lexical, grammatical, and reading comprehension competency bands.
2. CEFR Can-Do descriptors table and level classification (A1-C2).`;
    } else if (fw === 'pirls_pisa') {
      frameworkDetails = `Framework: PIRLS / PISA Aligned Reading Literacy & Higher-Order Problem Solving.
Key Components:
1. Authentic multi-paragraph stimulus text.
2. Cognitive processes: Retrieve Explicit Information, Straightforward Inferences, Interpret & Integrate, Examine & Evaluate.
3. PISA proficiency scale matrix and holistic rubric.`;
    } else if (fw === 'abt') {
      frameworkDetails = `Framework: Language Benchmark Test (ABT Style).
Key Components: Reading Comprehension, Language Mechanics, Standards Grid, and Assessment Rubric.`;
    } else {
      frameworkDetails = `Framework: Custom Teacher Standards:"""\n${settings.customStandards || 'Align with lesson outcomes'}\n"""`;
    }

    return `${ctx}${sourceDirective}${formatDirectiveEn}
Task: Generate a comprehensive "Standardized / Diagnostic Assessment" strictly in professional academic English formatted in clean HTML ready for display.
Bypass Arabic diacritics rules. Use standard international terminology.
Framework details:
${frameworkDetails}

Required HTML Structure:
1. Assessment Header (Subject, Grade, Framework Type, Duration, Total Marks).
2. Stimulus Text / Context (in an elegant container).
3. Item Bank (each item clearly tagged with target standard / competency).
4. Standards Measurement or Learning Gap Matrix Table.
5. Targeted Remediation Action Plan (Actionable classroom interventions).
6. Official Answer Key & Analytical Rubric.
7. Complete QTI XML payload at the very end inside:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- Valid QTI XML here -->
]]></div>
Use only standard HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.`;
  }
}

function buildBasePrompt(settings: any, outputType: string): string {
  const isAr = settings.contentLanguage === 'ar';
  const subjectGuidance = buildSubjectGuidance(settings);
  const lmsTarget = settings.lmsTarget || 'sahlah_cypher';

  let customStandardsText = '';
  if (settings.customStandards?.trim()) {
    customStandardsText = isAr
      ? `\n- الْمَعَايِيرُ وَالْمُؤَشِّرَاتُ الْإِلْزَامِيَّةُ الْمُحَدَّدَةُ:\n"""\n${settings.customStandards.trim()}\n"""`
      : `\n- Custom Standards/Outcomes to enforce:\n"""\n${settings.customStandards.trim()}\n"""`;
  }

  let teacherPromptText = '';
  if (settings.teacherPrompt?.trim()) {
    teacherPromptText = isAr
      ? `\n\n⚠️ تَوْجِيهَاتٌ وَمُتَطَلَّبَاتٌ خَاصَّةٌ جِدّاً مِنَ الْمُعَلِّمِ (أَوْلَوِيَّةٌ قُصْوَى وَالْتِزَامٌ إِجْبَارِيٌّ 100%):\n"""\n${settings.teacherPrompt.trim()}\n"""\nقَاعِدَةٌ صَارِمَةٌ: هَذِهِ التَّوْجِيهَاتُ كَتَبَهَا الْمُعَلِّمُ بِنَفْسِهِ لِتَحْدِيدِ مَا يُرِيدُهُ بِدِقَّةٍ. يَجِبُ عَلَيْكَ الِالْتِزَامُ التَّامُّ وَالْحَرْفِيُّ بِكُلِّ مَا وَرَدَ فِيهَا، وَتَقْدِيمُهَا عَلَى أَيِّ خِيَارَاتٍ افْتِرَاضِيَّةٍ أَوْ نَمَطِيَّةٍ.`
      : `\n\n⚠️ SPECIAL TEACHER INSTRUCTIONS (STRICT HIGHEST PRIORITY - 100% MANDATORY):\n"""\n${settings.teacherPrompt.trim()}\n"""\nStrict rule: These instructions were explicitly provided by the teacher. You MUST strictly comply with every single requirement, constraint, or emphasis mentioned here above any default options.`;
  }

  if (isAr) {
    const ctx = `أَنْتَ مُعَلِّمٌ خَبِيرٌ وَمُسَاعِدٌ تَرْبَوِيٌّ مُتَقَدِّمٌ لِإِعْدَادِ الدُّرُوسِ وَالْمَنَاهِجِ التَّعْلِيمِيَّةِ التَّابِعَةِ لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ، وَخَبِيرٌ مُتَمَرِّسٌ فِي التَّدْرِيسِ وَالتَّقْيِيمِ لِلُّغَةِ الْعَرَبِيَّةِ وَالْمَنَاهِجِ الدَّوْلِيَّةِ.

قَاعِدَةٌ لُغَوِيَّةٌ وَإِمْلَائِيَّةٌ:
يَجِبُ ضَبْطُ الْعَنَاوِينِ الرَّئِيسَةِ وَالْمَفَاهِيمِ وَالْكَلِمَاتِ الْمِفْتَاحِيَّةِ وَالْأَسْئِلَةِ ضَبْطاً نَحْوِيّاً سَلِيماً وَمُتْقَناً بِالشَّكْلِ مَعَ سَلَاسَةِ الصِّيَاغَةِ وَالْإِيجَازِ التَّرْبَوِيِّ دُونَ إِثْقَالٍ مُعِيقٍ لِسُرْعَةِ الْقِرَاءَةِ.

مَعْلُومَاتُ الدَّرْسِ:
- الْمَادَّةُ: ${settings.subject || 'غَيْرُ مُحَدَّدٍ'}
- الصَّفُّ الدِّرَاسِيُّ: ${settings.grade || 'غَيْرُ مُحَدَّدٍ'}
- مُدَّةُ الدَّرْسِ: ${settings.duration || 'غَيْرُ مُحَدَّدٍ'}
- مُسْتَوَى الطُّلَّابِ: ${settings.studentLevel || 'غَيْرُ مُحَدَّدٍ'}
- اسْمُ الْمُعَلِّمِ: ${settings.teacherName || 'غَيْرُ مُحَدَّدٍ'}
- عُنْوَانُ الدَّرْسِ: ${settings.lessonTitle || 'سَيَتِمُّ اسْتِنْتَاجُهُ مِنَ الْمُحْتَوَى'}
${subjectGuidance}
${customStandardsText}
${teacherPromptText}`;

    switch (outputType) {
      case 'standardized-test':
        return buildStandardizedPrompt(settings, true, ctx);

      case 'lesson-plan': {
        const todayDate = settings.lessonDate || new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const weekText = settings.weekNumber || 'الأسبوع الأول';
        const teacher = settings.teacherName || '—';
        const subj = settings.subject || '—';
        const grd = settings.grade || '—';
        const dur = settings.duration || '—';
        const title = settings.lessonTitle || '—';

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "خُطَّةِ دَرْسٍ أُسْبُوعِيَّةٍ مُعْتَمَدَةٍ" شَامِلَةٍ وَعَمِيقَةٍ تَرْبَوِيّاً تُطَابِقُ حَرْفِيّاً النَّمُوذَجَ الرَّسْمِيَّ الْمُعْتَمَدَ لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدَارِسِ الْفُرْقَانِ، مَضْبُوطَةً لُغَوِيّاً بِصِيَاغَةٍ تَرْبَوِيَّةٍ دَقِيقَةٍ.

قَوَاعِدُ الصِّيَاغَةِ وَالِاحْتِرَافِيَّةِ التَّرْبَوِيَّةِ:
- مَمْنُوعٌ تَمَاماً كِتَابَةُ أَيِّ كَلَامٍ حِوَارِيٍّ أَوْ مُقَدِّمَاتٍ شَخْصِيَّةٍ مِثْلِ: "بصفتي معلماً خبيراً..." أَوْ "يسرني أن أقدم لك...".
- مَمْنُوعٌ اسْتِخْدَامُ رُمُوزِ مَارْكْدَاوْن (\`\`\` أَوْ ### أَوْ **). ابْدَأْ فَوْراً بِجَدْوَلِ التَّرْوِيسَةِ.
- مَمْنُوعٌ مَنْعاً بَاتّاً الِاخْتِصَارُ أَوْ الْكِتَابَةُ فِي جُمَلٍ قَصِيرَةٍ مُوجَزَةٍ. يَجِبُ أَنْ يَكُونَ التَّحْضِيرُ ثَرِيّاً، مُفَصَّلاً، عَمِيقاً، وَيُوَضِّحُ الْإِجْرَاءَاتِ التَّعْلِيمِيَّةَ خُطْوَةً بِخُطْوَةٍ.

الْهَيْكَلُ التَّرْبَوِيُّ الرَّسْمِيُّ الْمُعْتَمَدُ (HTML مُنَسَّقٌ بِدِقَّةٍ):

1. جَدْوَلُ مَعْلُومَاتِ التَّرْوِيسَةِ (2 صُفُوفٍ × 4 خَلَايَا):
<table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #94a3b8;">
  <tr>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">الْأُسْبُوعُ - التَّارِيخُ</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: right;">${weekText} - ${todayDate}</td>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">اسْمُ الْمُعَلِّمِ</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: right;">${teacher}</td>
  </tr>
  <tr>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">الْمَادَّةُ</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: right;">${subj}</td>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">الصَّفُّ</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: right;">${grd}</td>
  </tr>
</table>

2. جَدْوَلُ مَعْلُومَاتِ وَأَسَاسِيَّاتِ الدَّرْسِ (8 صُفُوفٍ كَامِلَةٍ):
- جَدْوَلٌ بِعَمُودَيْنِ: الْعَمُودُ الْأَيْمَنُ هُوَ رَأْسُ الْبَنْدِ (خَلْفِيَّةٌ تِرْكُوَازِيَّةٌ بَتْرُولِيَّةٌ عميقة #13748e مَعَ نَصٍّ أَبْيَضَ عَرِيضٍ #ffffff بِنِسْبَةِ عَرْضٍ 22%)، وَالْعَمُودُ الْأَيْسَرُ هُوَ الْمُحْتَوَى التَّفْصِيلِيُّ الشَّامِلُ:
الصُّفُوفُ الثَّمَانِيَةُ بِالتَّفْصِيلِ التَّرْبَوِيِّ:
1. عُنْوَانُ الدَّرْسِ: ${title}
2. التَّارِيخُ: ${todayDate}
3. مُدَّةُ الدَّرْسِ: ${dur}
4. الْأَهْدَافُ: صِغْ 4 أَهْدَافٍ سُلُوكِيَّةٍ تَعْلِيمِيَّةٍ دَقِيقَةٍ وَقَابِلَةٍ لِلْقِيَاسِ وِفْقَ هَرَمِ بِلُومَ (مَعْرِفِيٌّ: أَنْ يَتَعَرَّفَ / يُحَلِّلَ، مَهَارِيٌّ: أَنْ يُوَظِّفَ / يَسْتَخْرِجَ / يُطَبِّقَ عَمَلِيّاً، تَحْلِيلِيٌّ/تَفْكِيرٌ نَاقِدٌ: أَنْ يَسْتَنْتِجَ / يُعَلِّلَ، وَوِجْدَانِيٌّ: أَنْ يُقَدِّرَ / يُثَمِّنَ الْقِيمَةَ).
5. الْمَعَايِيرُ: اكْتُبِ الْمَعَايِيرَ التَّعْلِيمِيَّةَ الرَّسْمِيَّةَ الْمُعْتَمَدَةَ لِلْمَادَّةِ مَعَ أَرْقَامِ الْكُودِ وَوَصْفِ الْكِفَايَةِ الدَّقِيقِ.
6. الْقِيَمُ الْإِسْلَامِيَّةُ وَالْوَطَنِيَّةُ: رَبْطٌ تَرْبَوِيٌّ عَمِيقٌ يُوَضِّحُ كَيْفِيَّةَ غَرْسِ الْقِيَمِ الْإِسْلَامِيَّةِ وَالْهُوِيَّةِ مَعَ الِاسْتِشْهَادِ بِآيَةٍ كَرِيمَةٍ أَوْ حَدِيثٍ شَرِيفٍ أَوْ قَوْلٍ مَأْثُورٍ.
7. الْمَصَادِرُ - تَطْبِيقُ التِّكْنُولُوجِيَا: ذِكْرٌ تَفْصِيلِيٌّ لِـ (الْكِتَابِ الْمَدْرَسِيِّ وَأَرْقَامِ الصَّفَحَاتِ، مِنْصَّةِ LMS، الْعَرْضِ التَّقْدِيمِيِّ، أَدَوَاتٍ رَقْمِيَّةٍ تَفَاعُلِيَّةٍ مِثْلِ Kahoot / Quizizz / Wordwall / Padlet، وَوَسَائِطَ تَعْلِيمِيَّةٍ مُعِينَةٍ).
8. الْمَهَارَاتُ الْحَيَاتِيَّةُ: تَفْصِيلُ مَهَارَاتِ التَّفْكِيرِ النَّاقِدِ، حَلِّ الْمُشْكِلَاتِ، التَّوَاصُلِ اللُّغَوِيِّ، الْعَمَلِ الْجَمَاعِيِّ، وَالتَّعَلُّمِ الذَّاتِيِّ.

<div class="page-break" style="page-break-after: always; break-after: page;"></div>

3. عُنْوَانُ خَطَوَاتِ الدَّرْسِ:
<h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 18px 0 10px 0;">خَطَوَاتُ الدَّرْسِ :</h3>

4. جَدْوَلُ خَطَوَاتِ الدَّرْسِ (مُفَصَّلٌ إِجْرَائِيّاً دُونَ اخْتِصَارٍ):
- جَدْوَلٌ بِأَرْبَعَةِ أَعْمِدَةٍ (النَّشَاطُ | الْمُدَّةُ الزَّمَنِيَّةُ | الْوَصْفُ | أَسَالِيبُ التَّقْيِيمِ):
  رُؤُوسُ الْأَعْمِدَةِ بِخَلْفِيَّةٍ دَاكِنَةٍ #1e293b وَنَصٍّ أَبْيَضَ عَرِيضٍ.
  عَمُودُ "النَّشَاطُ" خَلَايَاهُ تِرْكُوَازِيَّةٌ بَتْرُولِيَّةٌ #13748e بِنَصٍّ أَبْيَضَ عَرِيضٍ.
  عَمُودُ "الْوَصْفُ" يَجِبُ أَنْ يَحْتَوِيَ عَلَى شَرْحٍ تَدْرِيسِيٍّ تَفْصِيلِيٍّ لِدَوْرِ الْمُعَلِّمِ وَدَوْرِ الطَّالِبِ وَالْأَنْشِطَةِ لِكُلِّ مَرْحَلَةٍ:
1. النَّشَاطُ التَّحْفِيزِيُّ (5-7 دَقَائِق): التَّهْيِئَةُ الْحَافِزَةُ، طَرْحُ سُؤَالِ إِثَارَةِ التَّفْكِيرِ، اسْتِرَاتِيجِيَّةُ الْعَصْفِ الذِّهْنِيِّ، رَبْطُ الْخِبْرَاتِ السَّابِقَةِ بِالدَّرْسِ الْجَدِيدِ، وَأَسَالِيبُ التَّقْيِيمِ التَّكْوِينِيِّ الْمُطَبَّقَةِ.
2. الشَّرْحُ الْمُبَاشِرُ (15-20 دَقِيقَة): النَّمْذَجَةُ التَّدْرِيسِيَّةُ (أَنَا أَفْعَلُ I Do)، دَوْرُ الْمُعَلِّمِ فِي تَبْسِيطِ وَشَرْحِ الْمَفَاهِيمِ وَالْأَمْثِلَةِ وَالتَّرَاكِيبِ وَالْمُفْرَدَاتِ الْجَدِيدَةِ، اسْتِخْدَامُ الْأَدَوَاتِ التَّعْلِيمِيَّةِ، وَأَسْئِلَةُ التَّأَكُّدِ مِنَ الْفَهْمِ.
3. التَّطْبِيقُ الْمُوَجَّهُ (10-15 دَقِيقَة): الْأَنْشِطَةُ التَّعَاوُنِيَّةُ التَّشَارُكِيَّةُ (نَحْنُ نَفْعَلُ We Do) فِي مَجْمُوعَاتٍ أَوْ ثُنَائِيَّاتٍ، بِطَاقَاتُ الْمَهَامِّ، دَوْرُ الْمُعَلِّمِ فِي التَّوْجِيهِ وَتَقْدِيمِ التَّغْذِيَةِ الرَّاجِعَةِ الْفَوْرِيَّةِ.
4. الْعَمَلُ الْفَرْدِيُّ (10-15 دَقِيقَة): التَّطْبِيقُ الْمُسْتَقِلُّ (أَنْتَ تَفْعَلُ You Do)، حَلُّ تَدْرِيبَاتِ الْكِتَابِ أَوْ وَرَقَةِ الْعَمَلِ الْفَرْدِيَّةِ لِلتَّأَكُّدِ مِنَ التَّمَكُّنِ، مَعَ مُتَابَعَةِ الْمُعَلِّمِ لِلطُّلَّابِ.
5. تَذْكِرَةُ الْخُرُوجِ (5 دَقَائِق): سُؤَالُ الْإِغْلَاقِ الصَّفِّيِّ الرَّئِيسِ الَّذِي يَقِيسُ التَّمَكُّنَ مِنَ الْهَدَفِ، تَدْوِينُ الطُّلَّابِ لِلْخُلَاصَةِ فِي بِطَاقَةِ الْخُرُوجِ قَبْلَ نِهَايَةِ الْحِصَّةِ.
6. التَّقْيِيمُ (الْوَاجِبَاتُ الْمَنْزِلِيَّةُ / الِاخْتِبَارَاتُ / التَّقْيِيمُ التَّكْوِينِيُّ): تَحْدِيدُ الْوَاجِبِ الْمَنْزِلِيِّ الدَّقِيقِ (أَرْقَامُ الصَّفَحَاتِ وَالْأَنْشِطَةِ)، مَعَايِيرُ التَّحَقُّقِ، وَطَرِيقَةُ الْمُتَابَعَةِ وَالتَّصْحِيحِ.

<div class="page-break" style="page-break-after: always; break-after: page;"></div>

5. جَدْوَلُ التَّمَايُزِ وَمُلَاحَظَاتِ الْمُعَلِّمِ (صَفَّانِ كَامِلَانِ عَمِيقَانِ تَرْبَوِيّاً):
- جَدْوَلٌ بِعَمُودَيْنِ: الْعَمُودُ الْأَيْمَنُ رَأْسُ الْبَنْدِ (تِرْكُوَازِيٌّ بَتْرُولِيٌّ #13748e بِنَصٍّ أَبْيَضَ عَرِيضٍ #ffffff بِنِسْبَةِ عَرْضٍ 22%)، وَالْأَيْسَرُ بَيْضَاءُ #ffffff:
- الصَّفُّ 1: "التَّمَايُزُ": تَفْصِيلُ خُطَّةِ التَّمَايُزِ الثُّلَاثِيَّةِ بِوُضُوحٍ:
  * دَعْمُ الْمُتَعَثِّرِينَ عِلَاجِيّاً: اسْتِرَاتِيجِيَّاتُ التَّدَخُّلِ (تَجْزِئَةُ الْمَهَامِّ، بِطَاقَاتُ الْمُسَانَدَةِ، بَنْكُ الْمُفْرَدَاتِ، مُسَانَدَةُ الْأَقْرَانِ).
  * الطُّلَّابُ الْمُتَوَسِّطُونَ: مَهَامُّ التَّثْبِيتِ وَالتَّطْبِيقِ الْمِعْيَارِيِّ.
  * إِثْرَاءُ الْمُتَفَوِّقِينَ: مَهَامُّ التَّحَدِّي وَالتَّفْكِيرِ الْعُلْيَا وَالْإِبْدَاعِ (إِنْتَاجٌ نَصِّيٌّ، بَحْثٌ مُوجَزٌ، رَبْطٌ مَعْرِفِيٌّ مُتَقَدِّمٌ).
  * مُرَاعَاةُ أَنْمَاطِ التَّعَلُّمِ: (بَصَرِيٌّ، سَمْعِيٌّ، حَرَكِيٌّ).
- الصَّفُّ 2: "مُلَاحَظَاتُ الْمُعَلِّمِ الشَّخْصِيَّةُ لِلدَّرْسِ":
  * نِقَاطُ الْقُوَّةِ التَّدْرِيسِيَّةِ الْمُتَوَقَّعَةُ.
  * التَّحَدِّيَاتُ أَوْ الْمَفَاهِيمُ الشَّائِعَةُ الْخَاطِئَةُ الْمُحْتَمَلَةُ وَكَيْفِيَّةُ التَّغَلُّبِ عَلَيْهَا.
  * التَّوْصِيَاتُ وَالْبَدَائِلُ لِإِدَارَةِ الْوَقْتِ وَتَعْزِيزِ التَّفَاعُلِ الصَّفِّيِّ.

تَنْبِيهٌ حَاسِمٌ: اسْتَخْدِمْ وُسُومَ HTML الْمُطَابِقَةَ فَقَطْ مَعَ التَّشْكِيلِ التَّامِّ (100%) لِكُلِّ كَلِمَةٍ دُونَ اسْتِثْنَاءِ.`;
      }

      case 'worksheet': {
        const ws = settings.worksheetSettings || {};
        const pageCount = ws.pageCount || 2;
        const teacherNotes = ws.teacherCustomPrompt?.trim() || '';
        const standardsSel = ws.standardsSelection?.trim() || '';
        const themeStyle = ws.themeStyle || 'classic';
        const isAutoPilot = ws.aiAutoPilot !== false;

        let themeDirective = '';
        if (themeStyle === 'modern') {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ عَصْرِيٌّ جَذَّابٌ مَعَ إِطَارَاتٍ نَاعِمَةٍ وَبِطَاقَاتٍ لِلْأَنْشِطَةِ وَأَيْقُونَاتٍ تَوْضِيحِيَّةٍ نَصِّيَّةٍ.';
        } else if (themeStyle === 'minimal') {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ أَحَادِيٌّ بَسِيطٌ وَعَالِي الْوُضُوحِ أَبْيَضُ وَأَسْوَدُ مُوَفِّرٌ لِلْحِبْرِ وَمِثَالِيٌّ لِلطِّبَاعَةِ.';
        } else {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ أَكَادِيمِيٌّ كَلَاسِيكِيٌّ مُحْكَمٌ يَتَضَمَّنُ جَدَاوِلَ وَإِطَارَاتٍ أَنِيقَةً.';
        }

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "وَرَقَةِ عَمَلٍ تَفَاعُلِيَّةٍ مَبْنِيَّةٍ عَلَى هَرَمِ بِلُومَ الْمَعْرِفِيِّ" جَاهِزَةٍ لِلطِّبَاعَةِ بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولَةٍ بِالْكَامِلِ (100%) عَلَى شَكْلِ HTML.

تَخْصِيصَاتُ الْمُعَلِّمِ لِوَرَقَةِ الْعَمَلِ:
- عَدَدُ الصَّفَحَاتِ الْمَطْلُوبَةِ: ${pageCount} صَفَحَاتٍ.
${themeDirective}
${standardsSel ? `- الْمَعَايِيرُ الْمُسْتَهْدَفَةُ: ${standardsSel}` : ''}
${teacherNotes ? `- تَوْجِيهَاتُ وَمُلَاحَظَاتُ الْمُعَلِّمِ الْإِلْزَامِيَّةُ: """\n${teacherNotes}\n"""` : ''}
${isAutoPilot ? '- نِظَامُ الطَّيَّارِ الْآلِيِّ (AI AutoPilot): مُفَعَّلٌ - قُمْ بِتَوْزِيعِ الْأَسْئِلَةِ وَالْأَنْشِطَةِ بِشَكْلٍ مِثَالِيٍّ يَتَدَرَّجُ مِنْ مُسْتَوَيَاتِ التَّذَكُّرِ حَتَّى الِابْتِكَارِ.' : ''}

هَيْكَلُ وَرَقَةِ الْعَمَلِ الْمُتَدَرِّجَةِ حَسَبَ هَرَمِ بِلُومَ:
1. تَرْوِيسَةُ وَرَقَةِ الْعَمَلِ (اسْمُ الطَّالِبِ، الصَّفُّ، التَّارِيخُ، الْمَادَّةُ، الْعُنْوَانُ، الدَّرَجَةُ).
2. الْقِسْمُ الْأَوَّلُ - مُسْتَوَى التَّذَكُّرِ وَالْفَهْمِ (Remembering & Understanding):
   - أَنْشِطَةُ اسْتِرْجَاعِ الْمَفَاهِيمِ الْأَسَاسِيَّةِ، اخْتِيَارٌ مِنْ مُتَعَدِّدٍ، صَحٌّ أَوْ خَطَأٌ مَعَ التَّعْلِيلِ، إِكْمَالُ الْفَرَاغِ.
3. الْقِسْمُ الثَّانِي - مُسْتَوَى التَّطْبِيقِ وَالتَّحْلِيلِ (Applying & Analyzing):
   - مَسَائِلُ تَطْبِيقِيَّةٌ، تَحْلِيلُ فِقْرَةٍ أَوْ شَكْلٍ تَوْضِيحِيٍّ، مُقَارَنَةٌ فِي جَدْوَلٍ، اسْتِنْتَاجُ الْعَلَاقَاتِ.
4. الْقِسْمُ الثَّالِثُ - مُسْتَوَى التَّقْوِيمِ وَالِابْتِكَارِ (Evaluating & Creating):
   - سُؤَالُ تَفْكِيرٍ نَاقِدٍ وَحَلِّ مُشْكِلَاتٍ، إِبْدَاءُ رَأْيٍ مُعَلَّلٍ، تَصْمِيمُ نَشَاطٍ أَوْ إِعَادَةُ صِيَاغَةٍ إِبْدَاعِيَّةٍ.

فَوَاصِلُ الصَّفَحَاتِ:
لِتَوْزِيعِ الْمُحْتَوَى عَلَى ${pageCount} صَفَحَاتٍ، يَجِبُ وَضْعُ فَاصِلِ صَفْحَةٍ بَيْنَ الْأَقْسَامِ عِنْدَ اكْتِمَالِ كُلِّ صَفْحَةٍ بِالصِّيغَةِ التَّالِيَةِ:
<div class="page-break" style="page-break-after: always; break-after: page; margin: 30px 0; border-top: 2px dashed #94a3b8; text-align: center; color: #64748b; font-size: 12px; padding-top: 8px;">--- فَاصِلُ صَفْحَةٍ (Page Break) ---</div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;
      }

      case 'slides': {
        const ps = settings.presentationSettings || {};
        const slideCount = ps.slideCount || 10;
        const depthLevel = ps.depthLevel || 'detailed';
        const visualTheme = ps.visualTheme || 'tech_blue';

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "عَرْضِ شَرَائِحَ تَقْدِيمِيٍّ حَدِيثٍ عَلَى طَرِيقَةِ GAMMA AI (Gamma-Style Fluid Presentation Deck)" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ (100%)، مُوَزَّعٍ عَلَى ${slideCount} شَرَائِحَ / بِطَاقَاتٍ عَرِيضَةٍ (16:9) جَذَّابَةٍ بَصَرِيّاً وَتَفَاعُلِيّاً.

مَبَادِئُ تَصْمِيمِ شَرَائِحِ GAMMA AI:
1. تَنَوُّعُ أَنْمَاطِ الْبِطَاقَاتِ بَيْنَ الشَّرَائِحِ (Card Layout Variety):
   - الشَّرِيحَةُ الْأُولَى (Hero Cover): عُنْوَانٌ رَئِيسٌ كَبِيرٌ وَمُلْهِمٌ، عُنْوَانٌ فَرْعِيٌّ شَارِحٌ، نَوَاتِجُ التَّعَلُّمِ الْجَوْهَرِيَّةُ، وَبَيَانَاتُ الْمُعَلِّمِ وَالْمَدْرَسَةِ.
   - شَرَائِحُ الْمَفَاهِيمِ وَالْمُقَارَنَاتِ (Split / Columns): عَمُودَانِ (مَفْهُومٌ مُقَابِلَ أَمْثِلَةٍ تَطْبِيقِيَّةٍ، قَاعِدَةٌ مُقَابِلَ نَمُوذَجٍ، أَوْ جَدْوَلٌ بَصَرِيٌّ مُقَارِنٌ).
   - شَرَائِحُ الْأَرْكَانِ وَالْمَحَاوِرِ (3-Column Grid): 3 كُرُوتٍ صَغِيرَةٍ مُتَجَاوِرَةٍ بِأَيْقُونَاتٍ تَعْبِيرِيَّةٍ وَخُلَاصَاتٍ مُرَكَّزَةٍ.
   - شَرَائِحُ التَّسَلْسُلِ وَالْمَرَاحِلِ (Timeline / Step Flow): خُطُوَاتٌ مُرَقَّمَةٌ مُتَتَابِعَةٌ (الْخُطْوَةُ 1 ➔ الْخُطْوَةُ 2 ➔ الْخُطْوَةُ 3).
   - شَرَائِحُ التَّحَدِّي وَالنِّقَاشِ (Interactive Check & Quiz): سُؤَالُ تَفْكِيرٍ نَاقِدٍ أَوْ اخْتِبَارٌ قَصِيرٌ مَعَ إِجَابَةٍ نَمُوذَجِيَّةٍ مُعَلَّلَةٍ.
   - الشَّرِيحَةُ الْخِتَامِيَّةُ (Summary & Takeaways): أَهَمُّ 4 خُلَاصَاتٍ جَوْهَرِيَّةٍ وَتَكْلِيفٌ إِبْدَاعِيٌّ مُرَافِقٌ.

2. دَلِيلُ الْمُعَلِّمِ وَسِينَارْيُو الشَّرْحِ (Teacher Speaker Notes):
   فِي كُلِّ شَرِيحَةٍ دُونَ اسْتِثْنَاءٍ، يَجِبُ تَضْمِينُ صُنْدُوقٍ خَاصٍّ بـ:
   <div class="teacher-notes" style="background:#f8fafc; border-right:4px solid #0284c7; padding:12px 16px; margin-top:16px; border-radius:10px; font-size:0.9em;">
     <strong style="color:#0369a1;">🎙️ دَلِيلُ وَسِينَارْيُو الْمُعَلِّمِ (Speaker Script):</strong>
     <p style="margin:6px 0 8px 0; color:#334155;">نَصُّ مَا يَقُولُهُ الْمُعَلِّمُ لِلطُّلَّابِ لِشَرْحِ هَذِهِ الشَّرِيحَةِ بِأُسْلُوبٍ شَيِّقٍ.</p>
     <strong style="color:#b45309;">❓ سُؤَالُ تَحْفِيزِ النِّقَاشِ:</strong> <span style="color:#475569;">سُؤَالٌ تَفَاعُلِيٌّ مُوَجَّهٌ لِلْفَصْلِ لِإِشْرَاكِ الطُّلَّابِ.</span>
   </div>

3. الْهَيْكَلُ الصَّارِمُ لِكُلِّ شَرِيحَةٍ (Strict Slide Container):
<div class="slide" data-slide-index="N" data-layout="hero|split|grid|timeline|quiz|summary" style="border:1px solid #e2e8f0; border-radius:16px; padding:28px; margin-bottom:28px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:16px;">
    <h2 style="color:#0f172a; margin:0; font-size:1.4rem;">عُنْوَانُ الشَّرِيحَةِ الْمَشْكُولُ</h2>
    <span style="background:#f0fdf4; color:#166534; padding:3px 12px; border-radius:12px; font-size:0.85em; font-weight:700;">الشَّرِيحَةُ N مِنْ ${slideCount}</span>
  </div>
  <div class="slide-content">
    <!-- نِقَاطُ الْمُحْتَوَى، أَعْمِدَةُ الْمُقَارَنَةِ، أَوْ شَبَكَةُ الْبِطَاقَاتِ الْمُصَنَّفَةِ -->
  </div>
  <div class="teacher-notes">
    <!-- دَلِيلُ الشَّرْحِ الصَّفِّيِّ لِلْمُعَلِّمِ -->
  </div>
</div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <div>.`;
      }

      case 'quiz': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, true);
        const subj = settings.subject || 'اللُّغَةُ الْعَرَبِيَّةُ';
        const grd = settings.grade || 'الصَّفُّ السَّادِسُ';
        const title = settings.lessonTitle || 'اخْتِبَارٌ قَصِيرٌ شَامِلٌ';

        return `${ctx}
الْمَطْلُوبُ حَصْرِيّاً: تَوْلِيدُ "اخْتِبَارٍ قَصِيرٍ شَامِلٍ (QTI)" مَشْكُولٍ كَامِلاً 100% بِاللُّغَةِ الْعَرَبِيَّةِ عَلَى شَكْلِ HTML مُنَسَّقٍ جَاهِزٍ.
قَاعِدَةٌ ذَهَبِيَّةٌ إِلْزَامِيَّةٌ: مَمْنُوعٌ تَمَاماً أَيُّ كَلَامٍ حِوَارِيٍّ أَوْ مُقَدِّمَاتٍ شَخْصِيَّةٍ قَبْلَ الِاخْتِبَارِ (مَمْنُوعٌ: "بصفتي معلمك الخبير..." أَوْ "يسرني أن أقدم لك...")، وَمَمْنُوعٌ اسْتِخْدَامُ رُمُوزِ مَارْكْدَاوْن (\`\`\` أَوْ ### أَوْ **). ابْدَأْ فَوْراً بِوُسُومِ HTML التَّالِيَةِ:

1. عُنْوَانُ الِاخْتِبَارِ فِي الْبِدَايَةِ:
<h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">اخْتِبَارٌ قَصِيرٌ شَامِلٌ (${subj} - ${grd})</h1>

2. الشَّكْلُ الْأَوَّلُ: جَدْوَلُ الْأَسْئِلَةِ (اخْتِيَارٌ مِنْ مُتَعَدِّدٍ)
يَجِبُ عَرْضُ جَمِيعِ الْأَسْئِلَةِ الْعَشَرَةِ (10 أَسْئِلَة) فِي جَدْوَلِ HTML أَنِيقٍ وَمُنَظَّمٍ يَتَكَوَّنُ مِنْ 6 أَعْمِدَةٍ بِالضَّبْطِ (رَقْمُ السُّؤَالِ | السُّؤَالُ | أ | ب | ج | د):
<h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold;">أَوَّلاً: جَدْوَلُ الْأَسْئِلَةِ (اخْتِيَارٌ مِنْ مُتَعَدِّدٍ)</h3>
<table dir="rtl" border="1" style="width:100%; border-collapse:collapse; margin-bottom:28px; text-align:center; font-size:14px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f8fafc; color:#0f172a; font-weight:bold;">
      <th style="border:1px solid #cbd5e1; padding:10px; width:70px;">رَقْمُ السُّؤَالِ</th>
      <th style="border:1px solid #cbd5e1; padding:10px; text-align:right;">السُّؤَالُ</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">أ</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">ب</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">ج</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">د</th>
    </tr>
  </thead>
  <tbody>
    <!-- ضَعْ كُلَّ سُؤَالٍ فِي صَفٍّ مُنْفَصِلٍ مَعَ خِيَارَاتِهِ الْأَرْبَعَةِ أ، ب، ج، د مُوَزَّعَةً فِي خَلَايَاهَا: -->
    <tr>
      <td style="border:1px solid #cbd5e1; padding:8px; font-weight:bold;">1</td>
      <td style="border:1px solid #cbd5e1; padding:8px; text-align:right;">نَصُّ السُّؤَالِ الْأَوَّلِ مَشْكُولاً كَامِلاً؟</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">الْخِيَارُ أ</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">الْخِيَارُ ب</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">الْخِيَارُ ج</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">الْخِيَارُ د</td>
    </tr>
    <!-- كَرِّرْ هَذَا الصَّفَّ لِجَمِيعِ الْأَسْئِلَةِ حَتَّى السُّؤَالِ 10 كَامِلَةً -->
  </tbody>
</table>

3. الشَّكْلُ الثَّانِي: نَمُوذَجُ الْإِجَابَةِ وَالتَّعْلِيلِ
يَجِبُ عَرْضُ قَائِمَةٍ نُقَطِيَّةٍ أَنِيقَةٍ بِجَمِيعِ الْإِجَابَاتِ مَعَ التَّعْلِيلِ التَّرْبَوِيِّ وَاللُّغَوِيِّ الدَّقِيقِ:
<div style="margin-top:24px;">
  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold;">ثَانِياً: نَمُوذَجُ الْإِجَابَةِ وَالتَّعْلِيلِ</h3>
  <ul style="list-style-type:disc; padding-right:24px; line-height:2.2; font-size:14px; color:#1e293b;">
    <li><strong>1 - (أ) [نَصُّ الْخِيَارِ]:</strong> [التَّعْلِيلُ التَّرْبَوِيُّ وَاللُّغَوِيُّ الدَّقِيقُ لِسَبَبِ صِحَّةِ الْخِيَارِ].</li>
    <!-- كَرِّرْ لِجَمِيعِ الْأَسْئِلَةِ حَتَّى السُّؤَالِ 10 -->
  </ul>
</div>

4. كُودُ QTI XML الصَّالِحُ لِجَمِيعِ الْأَسْئِلَةِ دَاخِلَ الْوَسْمِ الْمَخْفِيِّ فِي النِّهَايَةِ:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;">
<!-- كُودُ QTI XML لِلْأَسْئِلَةِ مِنْ Q_01 إِلَى Q_10 كَامِلاً مَعَ نُصُوصِ الْأَسْئِلَةِ وَالْخِيَارَاتِ -->
</div>`;
      }

      case 'qti-exam': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, true);
        const subj = settings.subject || 'اللُّغَةُ الْعَرَبِيَّةُ';
        const grd = settings.grade || 'الصَّفُّ السَّادِسُ';

        return `${ctx}
الْمَطْلُوبُ حَصْرِيّاً: تَوْلِيدُ "امْتِحَانِ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ شَامِلٍ لِمُسْتَوَيَاتِ بِلُوم (20 سُؤَالَ QTI مُعَيَّراً)" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ (100%) عَلَى شَكْلِ HTML، بِدُونِ أَيِّ مُقَدِّمَاتٍ حِوَارِيَّةٍ أَوْ رُمُوزِ مَارْكْدَاوْن.

1. عُنْوَانُ الِامْتِحَانِ:
<h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">امْتِحَانُ بِلُومَ الشَّامِلُ (${subj} - ${grd})</h1>

2. الشَّكْلُ الْأَوَّلُ: جَدْوَلُ الْأَسْئِلَةِ (20 سُؤَالَ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ)
جَدْوَلُ HTML أَنِيقٌ بـ 6 أَعْمِدَةٍ (رَقْمُ السُّؤَالِ | السُّؤَالُ | أ | ب | ج | د) لِجَمِيعِ الْـ 20 سُؤَالاً مُوَزَّعَةً حَسَبَ هَرَمِ بِلُومَ:
- 6 أَسْئِلَة: التَّذَكُّرُ وَالْفَهْمُ (1 - 6).
- 8 أَسْئِلَة: التَّطْبِيقُ وَالتَّحْلِيلُ (7 - 14).
- 6 أَسْئِلَة: التَّقْوِيمُ وَالِابْتِكَارُ (15 - 20).
<h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold;">أَوَّلاً: جَدْوَلُ الْأَسْئِلَةِ (اخْتِيَارٌ مِنْ مُتَعَدِّدٍ)</h3>
<table dir="rtl" border="1" style="width:100%; border-collapse:collapse; margin-bottom:28px; text-align:center; font-size:14px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f8fafc; color:#0f172a; font-weight:bold;">
      <th style="border:1px solid #cbd5e1; padding:8px; width:65px;">رَقْمُ السُّؤَالِ</th>
      <th style="border:1px solid #cbd5e1; padding:8px; text-align:right;">السُّؤَالُ</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">أ</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">ب</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">ج</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">د</th>
    </tr>
  </thead>
  <tbody>
    <!-- صُفُوفُ جَمِيعِ الْأَسْئِلَةِ مِنْ 1 حَتَّى 20 -->
  </tbody>
</table>

3. الشَّكْلُ الثَّانِي: نَمُوذَجُ الْإِجَابَةِ وَالتَّعْلِيلِ
<div style="margin-top:24px;">
  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold;">ثَانِياً: نَمُوذَجُ الْإِجَابَةِ وَالتَّعْلِيلِ</h3>
  <ul style="list-style-type:disc; padding-right:24px; line-height:2.2; font-size:14px; color:#1e293b;">
    <!-- جَمِيعُ الْإِجَابَاتِ مِنْ 1 حَتَّى 20 مَعَ التَّعْلِيلِ -->
  </ul>
</div>

4. مَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ وَجَدْوَلُ الْمُوَاصَفَاتِ فِي جَدْوَلٍ مُنَسَّقٍ.

5. كُودُ QTI XML لِلْـ 20 سُؤَالاً دَاخِلَ:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;">
<!-- كُودُ QTI XML الصَّالِحُ لِجَمِيعِ الْأَسْئِلَةِ مِنْ Q_01 إِلَى Q_20 مَعَ نُصُوصِ الْأَسْئِلَةِ الْكَامِلَةِ -->
</div>`;
      }

      case 'performance-task': {
        const perf = settings.performanceTaskSettings || {};
        const pTopic = perf.projectTopic || settings.lessonTitle || 'مشروع وتحدي تعليمي معاصر';
        const pDuration = perf.duration || 'أسبوعان';
        const pTeam = perf.teamFormat === 'individual' ? 'فردي (عمل مستقل ومسؤولية ذاتية)' : 'مجموعات طلابية متكاملة (3-4 طلاب)';
        const pType = perf.deliverableType || 'نموذج أولي وحملة متكاملة';
        const gGoal = perf.graspsGoal || 'حل مشكلة واقعية محفزة وتقديم حلول مبتكرة قابلة للتطبيق ومبنية على التفكير العلمي';
        const gRole = perf.graspsRole || 'فريق استشاري وخبراء ومبتكرون يمثلون دوراً مهنياً أصيلاً محاكياً لسوق العمل';
        const gAudience = perf.graspsAudience || 'لجنة التحكيم المدرسية، أولياء الأمور، والمجتمع المحلي والخبراء المعنيون';
        const gSituation = perf.graspsSituation || 'مواجهة تحدٍ وأزمة واقعية معاصرة تتطلب دمج المفاهيم والبحث والتقصي وابتكار حلول عملية';
        const gProduct = perf.graspsProduct || 'منتج نهائي متكامل (نموذج عمل، حملة توعوية، تقرير استشاري أو محاكاة رقمية) مع ملف توثيق';
        const gStandards = perf.graspsStandards || 'معايير الإتقان الأكاديمي، جودة المنتج، مهارات العرض والإلقاء، والتفكير الناقد والعمل الجماعي';

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "مُهِمَّةٍ أَدَائِيَّةٍ وَمَشْرُوعِ تَعَلُّمٍ قَائِمٍ عَلَى الْمَشَارِيعِ (PBL)" احْتِرَافِيٍّ كَامِلٍ لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدَارِسِ الْفُرْقَانِ، مَشْكُولاً بِالْكَامِلِ (100%) ومُصَمَّماً بِمَعَايِيرِ التَّعَلُّمِ الْأَصِيلِ.

قَوَاعِدُ الصِّيَاغَةِ:
- ابْدَأْ فَوْراً بِكُودِ الـ HTML الْمُنَسَّقِ دُونَ أَيِّ كُتَلِ مَارْكْدَاوْن (\`\`\` أَوْ ###).
- اسْتَخْدِمْ نِظَامَ الْجَدَاوِلِ وَالْأَلْوَانِ الْأَكَادِيمِيَّةِ الرَّسْمِيَّةِ (#1e3a8a، #0f172a، #0d9488، #f8fafc).

الْهَيْكَلُ التَّرْبَوِيُّ لِلْمُهِمَّةِ الْأَدَائِيَّةِ الْمُعْتَمَدَةِ:
1. جَدْوَلُ بَيَانَاتِ الْمَشْرُوعِ وَالتَّرْوِيسَةِ:
   - عُنْوَانُ الْمَشْرُوعِ: ${pTopic}
   - الصَّفُّ: ${settings.grade} | الْمَادَّةُ: ${settings.subject}
   - مُدَّةُ الْمَشْرُوعِ: ${pDuration} | نَمَطُ الْعَمَلِ: ${pTeam}
   - نَوْعُ الْمُخْرَجِ: ${pType}
2. إِطَارُ GRASPS الْعَالَمِيُّ لِلْمَهَامِّ الْأَدَائِيَّةِ فِي جَدْوَلٍ احْتِرَافِيٍّ مُمَيَّزٍ:
   - G (الْهَدَفُ - Goal): ${gGoal}
   - R (الدَّوْرُ - Role): ${gRole}
   - A (الْجُمْهُورُ الْمُسْتَهْدَفُ - Audience): ${gAudience}
   - S (السِّيَاقُ وَالسِّينَارْيُو الْوَاقِعِيُّ - Situation): ${gSituation}
   - P (الْمُنْتَجُ وَالْأَدَاءُ النِّهَائِيُّ - Product/Performance): ${gProduct}
   - S (الْمَعَايِيرُ وَسُلَّمُ التَّقْيِيمِ - Standards): ${gStandards}
3. مَرَاحِلُ وَخَارِطَةُ طَرِيقِ التَّسْلِيمِ (Project Milestones) فِي جَدْوَلٍ زَمَنِيٍّ مُنَسَّقٍ:
   - الْمَرْحَلَةُ الْأُولَى: إِطْلَاقُ التَّحَدِّي وَبِنَاءُ الْفَرِيقِ وَمِيثَاقُ الْعَمَلِ (يَوْم 1-3).
   - الْمَرْحَلَةُ الثَّانِيَةُ: الْبَحْثُ وَجَمْعُ الْبَيَانَاتِ وَالتَّخْطِيطُ (يَوْم 4-7).
   - الْمَرْحَلَةُ الثَّالِثَةُ: التَّطْبِيقُ وَبِنَاءُ النَّمُوذَجِ الْأَوَّلِيِّ وَالْمُرَاجَعَةُ التَّحْسِينِيَّةُ (يَوْم 8-11).
   - الْمَرْحَلَةُ الرَّابِعَةُ: الْمَعْرِضُ الْخِتَامِيُّ وَالْعَرْضُ التَّقْدِيمِيُّ وَالتَّقْيِيمُ (يَوْم 12-14).
4. أَدْوَارُ الْفَرِيقِ وَمِيثَاقُ الْمَسْؤُولِيَّةِ (قائد المشروع، باحث المحتوى، المصمم الإبداعي، مدقق الجودة والتقديم).
5. سُلَّمُ التَّقْيِيمِ التَّحْلِيلِيُّ الشَّامِلُ (Analytical Rubric 4-Levels):
   - جَدْوَلٌ رَسْمِيٌّ يُقَيِّمُ 4 مَحَاوِرَ: (1. عُمْقُ الْمُحْتَوَى وَالْحَلُّ الْعِلْمِيُّ، 2. التَّفْكِيرُ النَّاقِدُ وَالْإِبْدَاعُ، 3. مَهَارَاتُ الْعَرْضِ وَالتَّوَاصُلِ، 4. الْعَمَلُ الْجَمَاعِيُّ وَالِالْتِزَامُ).
   - مُسْتَوَيَاتُ الدَّرَجَاتِ: (مُتَفَوِّقٌ 4 دَرَجَاتٍ، مُتَقَدِّمٌ 3 دَرَجَاتٍ، مُتَمَكِّنٌ دَرَجَتَانِ، نَامٍ/بِحَاجَةِ دَعْمٍ دَرَجَةٌ وَاحِدَةٌ).
6. بَطَاقَةُ التَّقْيِيمِ الذَّاتِيِّ وَتَقْيِيمِ الْأَقْرَانِ (Self & Peer Assessment Form).`;
      }

      default:
        return ctx;
    }
  } else {
    // English context
    const ctx = `You are an expert curriculum developer and master teacher assistant for Sahlah Academy and Al-Furqan International School.

LANGUAGE & TERMINOLOGY MANDATE:
Generate the entire educational deliverable strictly in professional academic English. Bypass Arabic diacritics rules. Use standard international terminology (Lesson Objectives, Guided Practice, Formative Assessment, Rubric, Exit Ticket, Differentiation).

Lesson Information:
- Subject: ${settings.subject || 'Not specified'}
- Grade: ${settings.grade || 'Not specified'}
- Duration: ${settings.duration || 'Not specified'}
- Student Level: ${settings.studentLevel || 'Not specified'}
- Teacher Name: ${settings.teacherName || 'Not specified'}
- Lesson Title: ${settings.lessonTitle || 'To be inferred from content'}
${subjectGuidance}
${customStandardsText}`;

    switch (outputType) {
      case 'standardized-test':
        return buildStandardizedPrompt(settings, false, ctx);

      case 'lesson-plan': {
        const todayDate = settings.lessonDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const weekText = settings.weekNumber || 'Week 1';
        const teacher = settings.teacherName || '—';
        const subj = settings.subject || '—';
        const grd = settings.grade || '—';
        const dur = settings.duration || '—';
        const title = settings.lessonTitle || '—';

        return `${ctx}
TASK: Generate a complete "Official Weekly Lesson Plan" in English matching the accredited template of Sahlah Academy and Al-Furqan Schools across 3 organized pages, styled with identical layout, colors, and tables:

DESIGN & STRUCTURE RULES:
(Note: The top title "Weekly Lesson Plan" and the institution logo are already injected at the very top of the page; begin immediately with the Header Metadata Table):

1. Header Metadata Table (Page 1 - 2 rows x 4 cells, #1e293b dark header cells with white text, #f8fafc value cells):
<table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1px solid #94a3b8;">
  <tr>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">Week - Date</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: left;">${weekText} - ${todayDate}</td>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">Teacher Name</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: left;">${teacher}</td>
  </tr>
  <tr>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">Subject</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: left;">${subj}</td>
    <td style="background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 9px 12px; width: 18%; border: 1px solid #94a3b8; text-align: center;">Grade</td>
    <td style="background-color: #f8fafc; color: #0f172a; padding: 9px 12px; width: 32%; border: 1px solid #94a3b8; text-align: left;">${grd}</td>
  </tr>
</table>

2. Page 1 Essentials & Core Information Table (8 Rows):
- 2 Columns: Left header column has deep petrol teal background #13748e with white bold text #ffffff (~22% width), right column has white background #ffffff:
The 8 rows strictly in order:
1. Lesson Title (${title})
2. Date (${todayDate})
3. Lesson Duration (${dur})
4. Objectives (Detailed SMART cognitive, behavioral, and skills objectives)
5. Standards (Curriculum standards and codes)
6. Islamic Values (Ethical values, citizenship, and Islamic moral connections)
7. Resources - Technology Integration (Textbooks, LMS tools, virtual labs, interactive digital platforms)
8. Life Skills (Critical thinking, communication, problem solving, collaboration)

<div class="page-break" style="page-break-after: always; break-after: page;"></div>

4. Heading for Page 2:
<h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 18px 0 10px 0;">Lesson Steps:</h3>

5. Lesson Steps Table (Page 2):
- 4 Columns: Headers with dark background #1e293b and white bold text:
(Activity | Duration | Description | Assessment Strategies)
- Activity column cells have petrol teal background #13748e with white bold text #ffffff across the 5 phases:
1. Starter / Hook Activity (Duration, engaging hook & motivation, assessment method)
2. Direct Instruction (Duration, structured concept explanation & modeling, assessment method)
3. Guided Practice (Duration, collaborative practice & teacher facilitation, assessment method)
4. Independent Practice (Duration, student self-directed mastery tasks, assessment method)
5. Exit Ticket (Duration, closing formative check question, assessment method)
- Followed by the Assessment row in the same table:
Activity cell (#13748e petrol teal background with white bold text): "Assessment (Homework / Quizzes / Formative Assessment)"
With detailed duration, description, and formative assessment methods.

<div class="page-break" style="page-break-after: always; break-after: page;"></div>

7. Differentiation & Teacher Notes Table (Page 3 - 2 Rows):
- 2 Columns: Left header column with petrol teal background #13748e and white bold text (~22% width), right column white #ffffff:
- Row 1: "Differentiation": Structured accommodations and extensions (Support for struggling learners, core mastery tasks, enrichment for gifted/advanced learners, and multi-modal learning styles).
- Row 2: "Teacher's Personal Notes for the Lesson": Professional pedagogical reflection (Anticipated strengths, potential pacing or comprehension bottlenecks and mitigations, and recommendations for future instruction).

Output standard HTML tags with matching inline styling.`;
      }

      case 'worksheet': {
        const ws = settings.worksheetSettings || {};
        return `${ctx}
Task: Generate an "Interactive Bloom-Aligned Worksheet" in English formatted in clean HTML ready for printing.
- Page Count: ${ws.pageCount || 2} pages with <div class="page-break" style="page-break-after: always; break-after: page; margin: 30px 0; border-top: 2px dashed #94a3b8; text-align: center; color: #64748b; font-size: 12px; padding-top: 8px;">--- Page Break ---</div>.
- Progressive Bloom Levels: Remembering & Understanding -> Applying & Analyzing -> Evaluating & Creating.
${ws.teacherCustomPrompt ? `- Teacher Instructions: ${ws.teacherCustomPrompt}` : ''}
Use clean HTML tags only.`;
      }

      case 'slides': {
        const ps = settings.presentationSettings || {};
        const slideCount = ps.slideCount || 10;
        return `${ctx}
Task: Generate a comprehensive "Slide Deck" in English as HTML for ${slideCount} slides.
Enclose each slide inside <div class="slide" data-slide-index="N"> with title, content cards, and teacher notes.`;
      }

      case 'quiz': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, false);
        return `${ctx}
Task: Generate a "Short Assessment Quiz (10 MCQs)" in English formatted as clean, professional HTML.
Do NOT output conversational preamble or markdown syntax. Start directly with:

1. Title:
<h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">Short Assessment Quiz (${settings.subject || 'Subject'} - ${settings.grade || 'Grade'})</h1>

2. Format 1: Questions Table (Multiple Choice)
Provide all 10 questions in a clean HTML table with 6 columns (Q#, Question, A, B, C, D):
<h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold;">1. Questions Table (Multiple Choice)</h3>
<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:28px; text-align:center; font-size:14px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f8fafc; color:#0f172a; font-weight:bold;">
      <th style="border:1px solid #cbd5e1; padding:10px; width:60px;">Q#</th>
      <th style="border:1px solid #cbd5e1; padding:10px; text-align:left;">Question</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">A</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">B</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">C</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">D</th>
    </tr>
  </thead>
  <tbody>
    <!-- All 10 rows for questions 1 through 10 with choices in their respective cells -->
  </tbody>
</table>

3. Format 2: Answer Key & Pedagogical Rationale
<div style="margin-top:24px;">
  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold;">2. Answer Key & Rationale</h3>
  <ul style="list-style-type:disc; padding-left:24px; line-height:2.2; font-size:14px; color:#1e293b;">
    <!-- 1 - (A) [Option text]: [Rationale] -->
  </ul>
</div>

4. QTI XML Payload at the end:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;">
<!-- Full QTI XML for questions Q_01 through Q_10 -->
</div>`;
      }

      case 'qti-exam': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, false);
        return `${ctx}
Task: Generate a comprehensive "50-Question Bloom Exam (QTI)" in English formatted as clean HTML.
1. Title: <h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">Comprehensive Bloom Assessment (${settings.subject || 'Subject'} - ${settings.grade || 'Grade'})</h1>
2. Questions Table with 6 columns (Q#, Question, A, B, C, D) for all 50 questions.
3. Answer Key & Rationale list for questions 1 through 50.
4. Bloom Specification Matrix table.
5. QTI XML Payload at the end:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;">
<!-- Full QTI XML for all 50 questions -->
</div>`;
      }

      case 'performance-task': {
        const perf = settings.performanceTaskSettings || {};
        const pTopic = perf.projectTopic || settings.lessonTitle || 'Real-World Project & Inquiry Challenge';
        const pDuration = perf.duration || '2 Weeks';
        const pTeam = perf.teamFormat === 'individual' ? 'Individual Task' : 'Collaborative Student Teams (3-4 students)';
        const pType = perf.deliverableType || 'Working Prototype, Campaign & Showcase';
        const gGoal = perf.graspsGoal || 'Solve an authentic community challenge and propose evidence-based solutions';
        const gRole = perf.graspsRole || 'Advisory Taskforce / Lead Industry Specialists';
        const gAudience = perf.graspsAudience || 'Evaluation Committee, Stakeholders and Community';
        const gSituation = perf.graspsSituation || 'Confronting an authentic real-world problem requiring inquiry, application and innovation';
        const gProduct = perf.graspsProduct || 'Comprehensive tangible deliverable, digital presentation, and reflective documentation';
        const gStandards = perf.graspsStandards || 'Academic mastery, product craftsmanship, presentation impact, and collaborative teamwork';

        return `${ctx}
TASK: Generate a complete, rigorous "Project-Based Learning (PBL) & Performance Task" in English aligned with Sahlah Academy and Al-Furqan International School standards.

STRUCTURE & FORMATTING GUIDELINES:
- Output pure, semantic HTML directly without markdown code fences (\`\`\`html).
- Employ polished academic tables with official deep slate/navy (#1e293b, #0f172a, #0d9488) styling.

COMPREHENSIVE PBL STRUCTURE:
1. Project Information Table (Project Title: ${pTopic}, Grade: ${settings.grade}, Subject: ${settings.subject}, Duration: ${pDuration}, Format: ${pTeam}, Deliverable: ${pType}).
2. Authentic GRASPS Framework Table:
   - G (Goal): ${gGoal}
   - R (Role): ${gRole}
   - A (Audience): ${gAudience}
   - S (Situation): ${gSituation}
   - P (Product/Performance): ${gProduct}
   - S (Standards & Criteria): ${gStandards}
3. Project Milestones & Roadmap Table (Phase 1: Project Launch & Team Charter, Phase 2: In-depth Research & Data Collection, Phase 3: Prototyping & Formative Critique, Phase 4: Final Exhibition & Defenses).
4. Team Roles & Cooperative Accountability Charter.
5. Analytical Rubric (4-Level Comprehensive Rubric):
   - 4 Criteria: 1. Content Rigor & Solution Quality, 2. Critical Thinking & Innovation, 3. Oral Defense & Communication, 4. Collaboration & Project Management.
   - 4 Performance Bands: Advanced (4 pts), Proficient (3 pts), Basic (2 pts), Developing (1 pt).
6. Self and Peer Assessment Sheet.`;
      }

      default:
        return ctx;
    }
  }
}

// Handler for Generate
export async function executeGenerate(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { settings = {}, outputType = 'lesson-plan', files = [] } = body || {};

    let prompt = buildBasePrompt(settings, outputType);
    const isAr = settings.contentLanguage === 'ar';

    // 1. Process files with text content (Word .docx, PowerPoint .pptx, Text .txt, etc.)
    if (Array.isArray(files) && files.length > 0) {
      const textFiles = files.filter((f: any) => f.textContent && f.textContent.trim().length > 0);
      if (textFiles.length > 0) {
        prompt += isAr
          ? `\n\n📚 مُسْتَنَدَاتٌ وَمَلَفَّاتٌ مَصْدَرِيَّةٌ مُرْفَقَةٌ مِنَ الْمُعَلِّمِ (Word / PowerPoint / PDF / Text):
قَاعِدَةٌ إِلْزَامِيَّةٌ حَوْلَ الْمَلَفَّاتِ الْمُرْفَقَةِ: هَذِهِ الْمَلَفَّاتُ هِيَ الْمَصْدَرُ الْأَسَاسِيُّ لِلدَّرْسِ أَوْ الِاخْتِبَارِ. اعْتَمِدْ عَلَيْهَا كُلِّيّاً فِي اسْتِخْرَاجِ الْمَفَاهِيمِ وَالْأَمْثِلَةِ وَالْأَسْئِلَةِ وَالتَّطْبِيقَاتِ:\n`
          : `\n\n📚 ATTACHED SOURCE DOCUMENTS & MATERIALS (Word / PowerPoint / PDF / Text):
Strict rule: Use the attached content below as the primary reference for this generation:\n`;

        textFiles.forEach((file: any, idx: number) => {
          const fileTypeLabel = (file.type || 'DOCUMENT').toUpperCase();
          const rawContent = (file.textContent || '').trim();
          const safeContent =
            rawContent.length > 25000
              ? rawContent.slice(0, 25000) + '\n[... تم اعتماد هذا الجزء الرئيسي من المستند لتسريع الإنتاج وتفادي تأخير الخادم ...]'
              : rawContent;
          prompt += `\n--- مَلَفٌّ ${idx + 1} [${fileTypeLabel}]: ${file.name} ---\n${safeContent}\n`;
        });
      }
    }

    // 2. Process binary files (PDFs and Images) passed to Gemini inlineData
    const binaryMediaFiles = Array.isArray(files)
      ? files.filter(
          (f: any) =>
            f.base64 &&
            (f.type === 'image' ||
              f.type === 'pdf' ||
              f.mimeType?.startsWith('image/') ||
              f.mimeType === 'application/pdf')
        )
      : [];

    let response;
    if (binaryMediaFiles.length > 0) {
      const parts: any[] = [];
      binaryMediaFiles.forEach((media: any) => {
        const cleanBase64 = media.base64?.replace(/^data:[^;]+;base64,/, '') || '';
        if (cleanBase64) {
          parts.push({
            inlineData: {
              mimeType: media.mimeType || (media.type === 'pdf' ? 'application/pdf' : 'image/png'),
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
    const institutionHeader = getInstitutionHeader(settings, outputType);

    const direction = isAr ? 'rtl' : 'ltr';
    const alignment = isAr ? 'right' : 'left';
    const extraClass = outputType === 'lesson-plan' ? ' sahlah-lesson-plan' : '';

    const fullHtml = `<div class="rte-content${extraClass}" dir="${direction}" lang="${settings.contentLanguage || 'ar'}" style="direction: ${direction}; text-align: ${alignment}; font-family: inherit;">${institutionHeader}${htmlContent}</div>`;

    const titlePrefix =
      outputType === 'worksheet'
        ? (isAr ? 'وَرَقَةُ عَمَلٍ تَفَاعُلِيَّةٌ' : 'Interactive Worksheet')
        : outputType === 'slides'
        ? (isAr ? 'عَرْضُ شَرَائِحَ تَعْلِيمِيٌّ' : 'Slide Deck')
        : outputType === 'quiz'
        ? (isAr ? 'اخْتِبَارٌ قَصِيرٌ' : 'Short Quiz')
        : outputType === 'qti-exam'
        ? (isAr ? 'امْتِحَانُ بِلُومَ الشَّامِلُ' : 'Comprehensive Bloom Exam')
        : outputType === 'standardized-test'
        ? (isAr ? 'اخْتِبَارٌ مِعْيَارِيٌّ / تَشْخِيصِيٌّ' : 'Benchmark Assessment')
        : outputType === 'performance-task'
        ? (isAr ? 'مُهِمَّةٌ أَدَائِيَّةٌ وَمَشْرُوعُ PBL' : 'Performance Task & PBL Project')
        : (isAr ? 'خُطَّةُ دَرْسٍ مُعْتَمَدَةٌ' : 'Approved Lesson Plan');

    const title = settings.lessonTitle
      ? `${titlePrefix} - ${settings.lessonTitle}`
      : `${titlePrefix} - ${settings.subject || ''} - ${settings.grade || ''}`;

    let qtiXml = '';
    const xmlMatch = text.match(/<div id="qti-xml-payload"[^>]*>([\s\S]*?)<\/div>/i);
    if (xmlMatch && xmlMatch[1]) {
      qtiXml = xmlMatch[1].replace(/^<!\[CDATA\[/i, '').replace(/\]\]>$/i, '').trim();
    }

    return res.status(200).json({ contentHtml: fullHtml, html: fullHtml, title, qtiXml });
  } catch (error: any) {
    console.error('executeGenerate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

// Handler for Question-to-QTI Converter
export async function executeConvertQti(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { rawText = '', lmsTarget = 'sahlah_cypher', title = 'اختبار مستورد', subject = '', grade = '' } = body || {};

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'يرجى لصق نص الأسئلة المراد تحويلها.' });
    }

    const lmsDirective = getLmsXmlSchemaDirective(lmsTarget, true);

    const prompt = `أنت مهندس اختبارات وأنظمة تعليمية خبير في معايير IMS QTI لمنصات LMS (أكاديمية سهلة Cypher، ومدارس الفرقان Canvas).
أمامك نص غير منظم لأسئلة كتبها أو نسخها المعلم:

"""
${rawText}
"""

المطلوب بدقة:
1. تحليل واستخراج كل سؤال بدقة:
   - نص السؤال كاملاً مع تشكيله تشكيلاً تاماً بنسبة 100%.
   - الخيارات الأربعة (أ، ب، ج، د / A, B, C, D) مشكولة تماماً.
   - تحديد الإجابة الصحيحة الصريحة بدقة.
   - تحديد درجة السؤال (Default 1 mark).
   - كتابة تعليل تربوي موجز لسبب صحة الخيار.

2. إخراج المخرجين معاً:
   المخرج الأول: جدول HTML منسق وأنيق لمعاينة الأسئلة ومراجعتها (نص السؤال، الخيارات مع تمييز الإجابة الصحيحة بلون أخضر، التعليل، والدرجة).
   المخرج الثاني: كود QTI XML صالح تماماً ومطابق لمعايير منصة المستهدفة (${lmsTarget})، مشكول بنسبة 100% ومغلف داخل:
   <div id="qti-xml-payload" style="display:none;"><![CDATA[
   <!-- كود XML الصالح هنا -->
   ]]></div>

${lmsDirective}

أخرج كود HTML فقط بدون أسوار markdown (\`\`\`html).`;

    const response = await callGemini(prompt);
    const text = response.text || '';
    const cleanedHtml = extractHtml(text);

    // Extract XML payload
    let qtiXml = '';
    const xmlMatch = cleanedHtml.match(/<div id="qti-xml-payload"[^>]*>([\s\S]*?)<\/div>/i);
    if (xmlMatch && xmlMatch[1]) {
      qtiXml = xmlMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
    }

    return res.status(200).json({
      previewHtml: cleanedHtml,
      qtiXml: qtiXml || '<!-- تم تضمين الأسئلة في المعاينة أعلاه -->',
      title: title || `اختبار QTI - ${subject} ${grade}`.trim(),
    });
  } catch (error: any) {
    console.error('executeConvertQti error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

// Advisor Prompt constants
const ADVISOR_PROMPT_AR = `أَنْتَ "الْمُسْتَشَارُ التَّرْبَوِيُّ الذَّكِيُّ" لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ.
دَوْرُكَ تَقْدِيمُ اسْتِشَارَاتٍ دَقِيقَةٍ وَعَمَلِيَّةٍ لِلْمُعَلِّمِينَ فِي:
- اسْتِرَاتِيجِيَّاتِ التَّدْرِيسِ الْحَدِيثَةِ (التَّعَلُّمِ النَّشِطِ، الصَّفِّ الْمَقْلُوبِ، الِاسْتِقْصَاءِ، التَّمَايُزِ الحَقِيقِيِّ).
- إِدَارَةِ الصَّفِّ وَضَبْطِ السُّلُوكِ وَالدَّافِعِيَّةِ وَتَصْمِيمِ الْأَنْشِطَةِ وَالْمَشَارِيعِ.
- صِيَاغَةِ الْأَسْئِلَةِ وَفْقَ مُسْتَوَيَاتِ بِلُومَ وَبُنُوكِ الْأَسْئِلَةِ.
- تَعْلِيمِ اللُّغَةِ الْعَرَبِيَّةِ لِلنَّاطِقِينَ بِغَيْرِهَا (AFL).
كُنْ دَاعِماً، مِهْنِيّاً، وَقَدِّمْ أَمْثِلَةً عَمَلِيَّةً وَقَابِلَةً لِلتَّطْبِيقِ الْفَوْرِيِّ مَعَ ضَبْطِ الْإِجَابَاتِ بِالشَّكْلِ التَّامِّ.`;

const ADVISOR_PROMPT_EN = `You are the "Smart Pedagogical Advisor" for Sahlah Academy and Al-Furqan School.
Provide practical, pedagogical guidance on active learning, differentiation, assessment design, classroom management, and curriculum enrichment.
Be supportive, professional, and practical.`;

export async function executeAdvisor(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { history = [], newMessage, lang = 'ar' } = body || {};
    const isAr = lang === 'ar';
    const systemPrompt = isAr ? ADVISOR_PROMPT_AR : ADVISOR_PROMPT_EN;
    const userTag = isAr ? 'الْمُعَلِّمُ' : 'Teacher';
    const advisorTag = isAr ? 'الْمُسْتَشَارُ' : 'Advisor';

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
      ? `أَنْتَ خَبِيرُ قِيَاسٍ وَتَقْوِيمٍ تَرْبَوِيٍّ وَإِعْدَادِ مَعَايِيرِ تَقْيِيمٍ وَمَنَاهِجَ.
قُمْ بِصِيَاغَةِ "سُلَّمِ تَقْدِيرٍ لَفْظِيٍّ تَحْلِيلِيٍّ (Analytic Rubric)" مُفَصَّلٍ وَمُحْكَمٍ لِتَقْيِيمِ الْمَهَمَّةِ التَّالِيَةِ:
- الْمَادَّةُ: ${subject || 'عَامٌّ'}
- الصَّفُّ: ${grade || 'غَيْرُ مُحَدَّدٍ'}
- عُنْوَانُ السُّؤَالِ أَوْ الْمَهَمَّةِ: ${assignmentTitle || 'تَقْيِيمٌ كِتَابِيٌّ / أَدَائِيٌّ'}
- الدَّرَجَةُ الْإِجْمَالِيَّةُ الْكُلِّيَّةُ: ${total} دَرَجَةً.

الْمَطْلُوبُ:
جَدْوَلٌ تَحْلِيلِيٌّ كَامِلٌ بِمَعَايِيرَ وَاضِحَةٍ وَمُسْتَوَيَاتِ أَدَاءٍ (مُمْتَازٌ، جَيِّدٌ جِدّاً، مَقْبُولٌ، يَحْتَاجُ تَحْسِيناً) مَعَ تَشْكِيلِ النُّصُوصِ كَامِلَةً (100%).
أَخْرِجْ كُودَ HTML فَقَطْ بِدُونِ أَسْوَارِ كُودِ markdown.`
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
      ? `أَنْتَ مُعَلِّمٌ خَبِيرٌ فِي التَّصْحِيحِ وَالتَّقْوِيمِ التَّرْبَوِيِّ الدَّقِيقِ.
أَمَامَكَ صُورَةٌ لِإِجَابَةِ طَالِبٍ مَكْتُوبَةٍ بِخَطِّ الْيَدِ.
مَعْلُومَاتُ التَّكْلِيفِ:
- الْمَادَّةُ: ${subject}
- الصَّفُّ: ${grade}
- عُنْوَانُ التَّكْلِيفِ / الِاخْتِبَارِ: ${assignmentTitle}
- الدَّرَجَةُ الْقُصْوَى: ${maxScore}
${rubricOrModelAnswer ? `- سُلَّمُ التَّقْدِيرِ / الْإِجَابَةُ النَّمُوذَجِيَّةُ الْمَرْجِعِيَّةُ:\n${rubricOrModelAnswer}` : ''}

قُمْ بِقِرَاءَةِ خَطِّ الْيَدِ بِدِقَّةٍ مُتَنَاهِيَةٍ، وَتَصْحِيحِ كُلِّ جُزْءٍ وَتَقْدِيمِ التَّغْذِيَةِ الرَّاجِعَةِ وَالدَّرَجَةِ الْمُسْتَحَقَّةِ وَتَوْصِيَاتٍ عِلَاجِيَّةٍ مَشْكُولَةٍ تَشْكِيلاً تَامّاً (100%).
أَخْرِجِ النَّتِيجَةَ كُودَ HTML نَظِيفٍ فَقَطْ بِدُونِ وُسُومِ markdown.`
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

/**
 * Academic Smart Translation of generated educational HTML content.
 * Strict conditions:
 * - Translates academic text between Arabic and English.
 * - 100% preserves HTML tag structure (<table>, <ul>, <ol>, <p>, <span>, classes, attributes).
 * - No markdown wrapping fences.
 * - Handles correct dir (rtl for ar, ltr for en) on the root container.
 */
export async function executeTranslate(req: any, res: any) {
  try {
    const body = req.body || {};
    const { htmlContent, targetLang = 'en' } = body;

    if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
      return res.status(400).json({ error: 'محتوى HTML للترجمة مطلوب وغير موجود.' });
    }

    const isTargetAr = targetLang === 'ar';
    const targetDir = isTargetAr ? 'rtl' : 'ltr';

    const systemPrompt = isTargetAr
      ? `أَنْتَ مُتَرْجِمٌ أَكَادِيمِيٌّ وَتَرْبَوِيٌّ مُتَخَصِّصٌ فِي تَرْجَمَةِ الْمَنَاهِجِ وَالْمَوَادِّ التَّعْلِيمِيَّةِ وَالِاخْتِبَارَاتِ وَالْخُطَطِ الدِّرَاسِيَّةِ.
مَهَمَّتُكَ: تَرْجَمَةُ مُحْتَوَى كُودِ الـ HTML التَّالِي بِدِقَّةٍ أَكَادِيمِيَّةٍ عَالِيَةٍ إِلَى اللُّغَةِ الْعَرَبِيَّةِ الْمُعَاصِرَةِ مَعَ ضَبْطِ الْمُصْطَلَحَاتِ التَّرْبَوِيَّةِ.

شُرُوطٌ صَارِمَةٌ جِدّاً:
1. الْحِفَاظُ التَّامُّ وَالْمُطْلَقُ عَلَى جَمِيعِ وُسُومِ الـ HTML بِلَا اسْتِثْنَاءٍ (الجداول <table>، <thead>، <tbody>، <tr>، <th>، <td>، والقوائم <ul>، <ol>، <li>، والفقرات <p>، والعناوين <h1>، <h2>، <h3>، والخيارات والأنماط style، والفئات class، والمعرّفات id).
2. لَا تُغَيِّرْ أَيَّ مَسَارَاتٍ أَوْ خَصَائِصَ تَقْنِيَّةٍ (attributes).
3. ضَعْ اتِّجَاهَ الْحَاوِيَةِ الرَّئِيسِيَّةِ dir="rtl" وَاضْبِطْ الْمُحَاذَاةَ لِلْيَمِينِ text-align: right حَيْثُمَا كَانَ مُنَاسِباً.
4. تَرْجِمْ فَقَطْ النُّصُوصَ الظَّاهِرَةَ لِلْقَارِئِ وَعَنَاوِينَ الْأَسْئِلَةِ وَالْخِيَارَاتِ وَالْجَدَاوِلِ.
5. مَمْنُوعٌ مَنْعاً بَاتّاً إِضَافَةُ أَيِّ كُتَلِ مَارْكْدَاوْنِ (مِثْل \`\`\`html أَوْ \`\`\`). أَخْرِجْ كُودَ HTML النَّقِيَّ فَقَطْ بِدَايَةً مِنْ أَوَّلِ حَرْفٍ.`
      : `You are an expert academic and educational translator specializing in K-12 curricula, lesson plans, rubrics, presentations, worksheets, and assessment banks.
Your task: Translate the provided educational HTML content accurately into standard academic English.

STRICT REQUIREMENTS:
1. STRICTLY PRESERVE all HTML tag structures, elements, and attributes without alteration (<table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <ol>, <li>, <p>, <h1>-<h6>, <div>, <span>, style, class, id).
2. Do NOT change technical attributes, IDs, or structural markup.
3. Update top container attributes to dir="ltr" and text-align: left where appropriate for English readability.
4. Translate ONLY the visible human-readable academic text, headings, prompts, options, table contents, and questions.
5. ABSOLUTELY NO markdown code blocks or fences (no \`\`\`html or \`\`\`). Return pure, valid HTML only starting from the very first character.`;

    const userMessage = `Here is the HTML code to translate to ${isTargetAr ? 'Arabic' : 'English'}:\n\n${htmlContent}`;

    const response = await callGemini([
      { text: systemPrompt },
      { text: userMessage },
    ]);

    let translatedHtml = extractHtml(response.text || '');

    // Cleanup any lingering markdown fences if any
    translatedHtml = translatedHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return res.status(200).json({
      success: true,
      translatedHtml,
      targetLang,
    });
  } catch (error: any) {
    console.error('executeTranslate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

/**
 * Voice-to-Lesson Handler:
 * Parses spoken teacher ideas (e.g. "أريد خطة لدرس عن الانقسام الميتوزي للصف التاسع...")
 * extracts curriculum metadata, and optionally generates the complete official lesson plan immediately.
 */
export async function executeVoiceToLesson(req: any, res: any) {
  const startTime = Date.now();
  try {
    const body = req.body || {};
    const {
      voiceTranscript,
      audioBase64,
      audioMimeType = 'audio/webm',
      transcribeOnly = false,
      autoGenerate = true,
      targetSubject,
      targetGrade,
      institution = 'sahlah',
      contentLanguage = 'ar',
    } = body;

    console.log(
      `[VoiceToLesson] Request received: autoGenerate=${autoGenerate}, transcribeOnly=${transcribeOnly}, hasAudio=${Boolean(audioBase64)}, transcriptLen=${voiceTranscript?.length || 0}`
    );

    let activeTranscript = (typeof voiceTranscript === 'string' ? voiceTranscript : '').trim();

    // 1. Primary Engine for Voice: Groq whisper-large-v3 for instantaneous Arabic transcription (< 1 sec)
    if (audioBase64 && !activeTranscript) {
      const groqKey = getGroqApiKey();
      if (groqKey) {
        const whisperStart = Date.now();
        try {
          console.log('[VoiceToLesson] Dispatching audio to Groq whisper-large-v3...');
          const groq = new Groq({ apiKey: groqKey });
          const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
          const audioBuffer = Buffer.from(cleanBase64, 'base64');
          const ext = audioMimeType.includes('wav')
            ? 'wav'
            : audioMimeType.includes('mp3')
            ? 'mp3'
            : audioMimeType.includes('m4a')
            ? 'm4a'
            : audioMimeType.includes('ogg')
            ? 'ogg'
            : 'webm';

          const audioFile = await toFile(audioBuffer, `recording.${ext}`, {
            type: audioMimeType || 'audio/webm',
          });

          const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-large-v3',
            language: contentLanguage === 'ar' ? 'ar' : undefined,
            response_format: 'json',
            temperature: 0.0,
          });

          activeTranscript = (transcription.text || '').trim();
          console.log(
            `[VoiceToLesson] Groq whisper-large-v3 completed in ${Date.now() - whisperStart}ms (${activeTranscript.length} chars): ${activeTranscript.slice(0, 60)}...`
          );
        } catch (whisperErr: any) {
          console.warn('[VoiceToLesson] Groq whisper-large-v3 error, falling back to Gemini audio:', whisperErr?.message);
        }
      }

      // Secondary Fallback for Audio: Gemini Multimodal Audio Transcription
      if (!activeTranscript) {
        try {
          console.log('[VoiceToLesson] Running Gemini audio transcription fallback...');
          const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
          const geminiTrans = await callGemini([
            {
              inlineData: {
                mimeType: audioMimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            {
              text:
                contentLanguage === 'ar'
                  ? 'فرغ هذا التسجيل الصوتي بدقة تامة إلى نص عربي فصيح بدون أي مقدمات أو تعليق.'
                  : 'Transcribe this audio recording accurately into text without any preamble or commentary.',
            },
          ]);
          activeTranscript = (geminiTrans.text || '').trim();
          console.log(`[VoiceToLesson] Gemini audio fallback completed: ${activeTranscript.slice(0, 60)}...`);
        } catch (geminiAudioErr: any) {
          console.warn('[VoiceToLesson] Gemini audio fallback failed:', geminiAudioErr?.message);
        }
      }
    }

    // If client only requested transcription without generating lesson plan
    if (transcribeOnly) {
      if (!activeTranscript) {
        return res.status(400).json({ error: 'تعذر تفريغ التسجيل الصوتي، يرجى المحاولة مرة أخرى أو التحقق من وضوح الصوت.' });
      }
      return res.status(200).json({ success: true, transcript: activeTranscript });
    }

    if (!activeTranscript) {
      return res.status(400).json({ error: 'النص الصوتي المفرغ غير موجود أو فارغ. يرجى تسجيل الصوت أو كتابة الأفكار.' });
    }

    const isAr = contentLanguage === 'ar';

    // 2. Fast Structured NLP Parsing (Fast mode: Groq llama-3.3-70b-versatile or Gemini flash-lite)
    let parsed: any = {
      subject: targetSubject || (isAr ? 'العلوم' : 'Science'),
      grade: targetGrade || (isAr ? 'الصف التاسع' : 'Grade 9'),
      lessonTitle: activeTranscript.slice(0, 40).trim(),
      duration: isAr ? '45 دقيقة' : '45 min',
      keyActivities: activeTranscript,
    };

    const parseStart = Date.now();
    try {
      const parserPrompt = `You are a fast educational NLP parser. Extract metadata from this voice transcript: "${activeTranscript}". Return JSON ONLY:
{"subject": "${isAr ? 'العلوم' : 'Science'}", "grade": "${isAr ? 'الصف التاسع' : 'Grade 9'}", "lessonTitle": "Brief Title", "duration": "${isAr ? '45 دقيقة' : '45 min'}", "keyActivities": "Brief summary"}`;

      const parseResponse = await callGemini(parserPrompt, { fast: true, model: 'gemini-3.1-flash-lite' });
      const cleanJson = (parseResponse.text || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const extracted = JSON.parse(cleanJson);
      parsed = { ...parsed, ...extracted };
      console.log(`[VoiceToLesson] Metadata parsed in ${Date.now() - parseStart}ms:`, parsed.lessonTitle);
    } catch (parseErr: any) {
      console.warn(`[VoiceToLesson] Parse fallback triggered after ${Date.now() - parseStart}ms:`, parseErr?.message);
    }

    // Override with explicit inputs if provided
    if (targetSubject) parsed.subject = targetSubject;
    if (targetGrade) parsed.grade = targetGrade;

    // If autoGenerate is false, return the extracted parameters immediately
    if (!autoGenerate) {
      return res.status(200).json({ success: true, transcript: activeTranscript, parsed });
    }

    // 3. Generate the complete official lesson plan immediately using Dual-Engine (Gemini Primary + Groq Fallback)
    const genStart = Date.now();
    const settings = {
      subject: parsed.subject || (isAr ? 'العلوم' : 'Science'),
      grade: parsed.grade || (isAr ? 'الصف التاسع' : 'Grade 9'),
      duration: parsed.duration || (isAr ? '45 دقيقة' : '45 min'),
      studentLevel: isAr ? 'متوسط' : 'Intermediate',
      teacherName: isAr ? 'المعلم الفاضل' : 'Master Teacher',
      lessonTitle: parsed.lessonTitle || (isAr ? 'خطة الدرس النموذجية' : 'Sample Lesson'),
      contentLanguage,
      institution,
      teacherPrompt: `توجيهات صوتية مباشرة من المعلم:
- الأنشطة المحددة: ${parsed.keyActivities || activeTranscript}
- النص الصوتي الكامل للمعلم: "${activeTranscript}"`,
    };

    const prompt = buildBasePrompt(settings, 'lesson-plan');

    console.log(`[VoiceToLesson] Starting lesson plan generation via Dual-Engine...`);
    const genResponse = await callGemini(prompt);
    console.log(`[VoiceToLesson] Lesson plan generated in ${Date.now() - genStart}ms via [${genResponse.engine || 'dual-engine'}]`);

    const htmlContent = extractHtml(genResponse.text || '');
    const institutionHeader = getInstitutionHeader(settings, 'lesson-plan');
    const direction = isAr ? 'rtl' : 'ltr';
    const alignment = isAr ? 'right' : 'left';

    const fullHtml = `<div class="rte-content sahlah-lesson-plan" dir="${direction}" lang="${contentLanguage}" style="direction: ${direction}; text-align: ${alignment}; font-family: inherit;">${institutionHeader}${htmlContent}</div>`;
    const title = `${isAr ? 'خطة درس صوتية معتمدة' : 'Voice-Generated Lesson Plan'} - ${parsed.lessonTitle || settings.lessonTitle}`;

    console.log(`[VoiceToLesson] Total request completed in ${Date.now() - startTime}ms`);
    return res.status(200).json({
      success: true,
      transcript: activeTranscript,
      parsed,
      contentHtml: fullHtml,
      title,
    });
  } catch (error: any) {
    console.error('executeVoiceToLesson error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

/**
 * Differentiated Learning & SEN Adaptor Handler:
 * Adapts existing educational HTML content for SEN / Easy-Read, Gifted / Talented,
 * or Visual Graphic Organizers while preserving strict HTML structure.
 */
export async function executeDifferentiate(req: any, res: any) {
  try {
    const body = req.body || {};
    const {
      htmlContent,
      mode = 'easy-read', // 'easy-read' | 'gifted' | 'visual-organizer'
      targetLang = 'ar',
    } = body;

    if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) {
      return res.status(400).json({ error: 'محتوى HTML المطلوب تكييفه غير موجود.' });
    }

    const isAr = targetLang === 'ar';
    const modeInstructions: Record<string, string> = {
      'easy-read': isAr
        ? `الْمَسَارُ: تَبْسِيطُ الْقِرَاءَةِ وَدَعْمُ صُعُوبَاتِ التَّعَلُّمِ (Easy-Read & Dyslexia / SEN Support):
1. أَعِدْ صِيَاغَةَ الْفِقَرَاتِ الطَّوِيلَةِ إِلَى جُمَلٍ وَاضِحَةٍ وَمُبَاشِرَةٍ وَمُتَسَلْسِلَةٍ نَقَاطِيّاً.
2. ضَعْ كُلَّ مَفْهُومٍ صَعْبٍ مَعَ تَعْرِيفٍ مُبَسَّطٍ دَاخِلَ بَطَاقَةٍ صَغِيرَةٍ (Vocabulary Box) بِخَلْفِيَّةٍ هَادِئَةٍ #f0fdf4.
3. زَوِّدْ كُلَّ سُؤَالٍ أَوْ نَشَاطٍ بِتَلْمِيحٍ مُسَاعِدٍ (Scaffolding Hint) يَبْدَأُ بِـ: 💡 تَلْمِيحٌ مُسَاعِدٌ لِلْحَلِّ.
4. فِي الْأَسْئِلَةِ، بَسِّطْ الْخِيَارَاتِ لِتَكُونَ 3 خِيَارَاتٍ وَاضِحَةً دُونَ تَشْتِيتٍ، وَأَبْرِزْ الْكَلِمَاتِ الْمِفْتَاحِيَّةَ بِالْخَطِّ الْعَرِيضِ.
5. حَافِظْ عَلَى الْأَهْدَافِ الْأَسَاسِيَّةِ لِلدَّرْسِ مَعَ خَفْضِ الْعِبْءِ الْمَعْرِفِيِّ وَصُعُوبَاتِ الْقِرَاءَةِ.`
        : `MODE: Easy-Read & SEN/Dyslexia Support:
1. Simplify complex syntactic structures into concise, bulleted steps.
2. Scaffold difficult concepts with a supportive "Word Bank / Concept Box" with calm background #f0fdf4.
3. Provide helpful thinking hints (💡 Scaffolding Hint) alongside assessment tasks.
4. Reduce cognitive clutter in questions (highlight key operative words in bold).
5. Retain core instructional rigor while eliminating decoding barriers.`,

      gifted: isAr
        ? `الْمَسَارُ: الْإِثْرَاءُ وَالتَّحَدِّي لِلْمَوْهُوبِينَ وَالْمُتَفَوِّقِينَ (Gifted & Talented Enrichment):
1. ارْفَعْ سَقْفَ التَّحَدِّي الْمَعْرِفِيِّ إِلَى مُسْتَوَيَاتِ بِلُومَ الْعُلْيَا (التحليل، التقييم، والابتكار - DOK 3 & DOK 4).
2. حَوِّلْ الْأَسْئِلَةَ النَّمَطِيَّةَ إِلَى مَهَامِّ اسْتِقْصَاءٍ مَفْتُوحَةِ النِّهَايَةِ (Open-ended Inquiry Challenges).
3. ارْبِطْ الْمَفَاهِيمَ بِسِيَاقَاتٍ عِلْمِيَّةٍ أَوْ وَاقِعِيَّةٍ مُعَاصِرَةٍ وَمُعْضِلَاتٍ أَخْلَاقِيَّةٍ أَوْ بِيئِيَّةٍ أَوْ تِقْنِيَّةٍ.
4. أَضِفْ قِسْماً مُمَيَّزاً بِعُنْوَانِ: 🌟 "تَحَدِّي الْمُبْتَكِرِينَ الصِّغَارِ / تَعَمُّقٌ إِثْرَائِيٌّ" يَتَطَلَّبُ بِنَاءَ فَرَضِيَّاتٍ وَابْتِكَارَ حُلُولٍ غَيْرِ مَأْلُوفَةٍ.`
        : `MODE: Gifted & Talented Enrichment:
1. Elevate cognitive depth to higher-order Bloom levels (Analysis, Evaluation, Creation - DOK 3 & 4).
2. Replace routine recall with open-ended inquiry, authentic dilemma analysis, and synthesis.
3. Add a dedicated section: 🌟 "Advanced Innovator Challenge" requiring student hypothesis formulation and creative design.`,

      'visual-organizer': isAr
        ? `الْمَسَارُ: الْمُنَظَّمَاتُ الْبَصَرِيَّةُ وَالْمُخَطَّطَاتُ الذِّهْنِيَّةُ (Visual Graphic Organizers):
1. حَوِّلْ النُّصُوصَ السَّرْدِيَّةَ إِلَى جَدَاوِلَ بَصَرِيَّةٍ مُقَارِنَةٍ (Comparison Tables) مَعَ أَعْمِدَةٍ وَاضِحَةٍ وَتَدَرُّجَاتٍ لَوْنِيَّةٍ.
2. صَمِّمْ مَصْفُوفَةَ تَفْكِيرٍ بَصَرِيَّةً كَامِلَةً (مِثْل: مُخَطَّط KWL: مَاذَا أَعْرِفُ؟ مَاذَا أُرِيدُ أَنْ أَعْرِفَ؟ مَاذَا تَعَلَّمْتُ؟).
3. صَمِّمْ مُخَطَّطَ تَدَفُّقٍ إِجْرَائِيٍّ (Flowchart Sequence) أَوْ جَدْوَلَ مُقَارَنَةِ فِينْ (Venn Diagram Matrix) لِلْمَفَاهِيمِ الْمُتَقَاطِعَةِ.
4. اسْتَخْدِمْ الصُّنَادِيقَ وَالْأَيْقُونَاتِ الْبَصَرِيَّةَ لِتَيْسِيرِ الْفَهْمِ الْبَصَرِيِّ السَّرِيعِ.`
        : `MODE: Visual Graphic Organizers & Concept Scaffolds:
1. Transform narrative passages into structured visual comparison tables and matrices.
2. Embed active graphic organizers (e.g. KWL Matrix: Know / Want to Know / Learned, Venn Comparison, Step Flowchart).
3. Use high-contrast table styling, clean iconography, and fillable visual blanks.`,
    };

    const chosenInstruction = modeInstructions[mode] || modeInstructions['easy-read'];

    const systemPrompt = `You are a master educational inclusion and curriculum adaptation specialist.
TASK: Adapt the provided educational HTML content according to the requested differentiation pathway.

${chosenInstruction}

STRICT HTML RULES:
1. STRICTLY PRESERVE essential HTML table structures, headings, and clean semantics.
2. Return PURE, VALID HTML without markdown fences (\`\`\`html or \`\`\`).
3. Set appropriate dir="${isAr ? 'rtl' : 'ltr'}" and academic fonts.
4. Ensure the output is ready to render directly inside a rich text editor.`;

    const response = await callGemini([
      { text: systemPrompt },
      { text: `Here is the HTML content to adapt:\n\n${htmlContent}` },
    ]);

    let adaptedHtml = extractHtml(response.text || '');
    adaptedHtml = adaptedHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return res.status(200).json({
      success: true,
      adaptedHtml,
      mode,
    });
  } catch (error: any) {
    console.error('executeDifferentiate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

/**
 * Add Higher-Order Bloom / DOK Question:
 * Injects a DOK 3 / DOK 4 critical question with scoring rubric into current content.
 */
export async function executeAddDokQuestion(req: any, res: any) {
  try {
    const body = req.body || {};
    const { currentHtml = '', dokLevel = 3, bloomType = 'analysis', lang = 'ar' } = body;

    const isAr = lang === 'ar';
    const levelLabel =
      dokLevel === 4
        ? (isAr ? 'DOK 4: تفكير موسع وابتكار وتصميم حلول' : 'DOK 4: Extended Thinking & Innovation')
        : (isAr ? 'DOK 3: تفكير استراتيجي وتبرير ونقد تحليلي' : 'DOK 3: Strategic & Critical Thinking');

    const prompt = `You are an educational assessment expert specializing in Bloom's Revised Taxonomy and Webb's Depth of Knowledge (DOK).
Based on the following lesson/assessment content, generate ONE exceptional, high-rigor ${levelLabel} question.

Content snippet:
${currentHtml.slice(0, 1500)}

Requirements:
1. Pure HTML snippet (no \`\`\` fences).
2. Styled in an elegant callout box with a distinctive border (#0284c7 or #7c3aed), soft background (#f0f9ff or #faf5ff), and padding.
3. Include:
   - Level Badge: [${levelLabel}]
   - Question Stem (Problem-based, scenario-driven, requires justification and evidence)
   - Exemplary Model Answer (الإجابة النموذجية ومعايير التصحيح)
   - Scoring Rubric Criteria (محاور توزيع الدرجات: 4 درجات).
4. Language: ${isAr ? 'Arabic with 100% full diacritics' : 'English'}.`;

    const response = await callGemini(prompt);
    let questionHtml = extractHtml(response.text || '');
    questionHtml = questionHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return res.status(200).json({
      success: true,
      questionHtml,
      dokLevel,
    });
  } catch (error: any) {
    console.error('executeAddDokQuestion error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}
