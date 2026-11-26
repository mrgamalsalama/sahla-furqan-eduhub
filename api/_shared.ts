import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Groq, { toFile } from 'groq-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { SAHLAH_LOGO, FURQAN_LOGO } from './_logos.js';

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
      } else if (Array.isArray(item?.parts)) {
        const partText = item.parts
          .map((p: any) => (typeof p === 'string' ? p : p?.text || ''))
          .filter(Boolean)
          .join('\n\n');
        if (partText) textPieces.push(partText);
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

let cachedGroqTextModels: { models: string[]; fetchedAt: number } | null = null;

async function discoverGroqTextModels(groq: Groq): Promise<string[]> {
  if (cachedGroqTextModels && Date.now() - cachedGroqTextModels.fetchedAt < 10 * 60 * 1000) {
    return cachedGroqTextModels.models;
  }

  try {
    const listRes = await groq.models.list();
    const excludedPattern = /whisper|tts|guard|orpheus|playai|distil-whisper|prompt-guard|safeguard|embed|rerank|vision/i;
    const allIds = (listRes.data || [])
      .filter((m: any) => m?.id && m?.active !== false && !excludedPattern.test(m.id))
      .map((m: any) => String(m.id));

    const priorityPatterns = [
      /llama-3\.3-70b/i,
      /llama-4-maverick/i,
      /llama-4-scout/i,
      /gpt-oss-120b/i,
      /qwen/i,
      /kimi/i,
      /deepseek/i,
      /gpt-oss-20b/i,
      /llama-3\.1-8b/i,
      /llama/i,
    ];

    const scoreModel = (id: string) => {
      const idx = priorityPatterns.findIndex((re) => re.test(id));
      return idx === -1 ? 999 : idx;
    };

    const ranked = Array.from(new Set(allIds)).sort((a, b) => scoreModel(a) - scoreModel(b));
    if (ranked.length > 0) {
      cachedGroqTextModels = { models: ranked, fetchedAt: Date.now() };
      console.log(`[Dual-Engine / Groq] Discovered active models:`, ranked.slice(0, 5).join(', '));
      return ranked;
    }
  } catch (err: any) {
    console.warn('[Dual-Engine / Groq] Model discovery failed:', err?.message || err);
  }

  return ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
}

/**
 * Groq Text Engine:
 * Ultra-fast silent fallback engine and secondary processing core with dynamic model discovery.
 */
export async function callGroqText(
  contents: any,
  options?: { fast?: boolean; model?: string; responseMimeType?: string }
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

  const explicitGroqModel =
    options?.model && !options.model.startsWith('gemini-') ? options.model : undefined;

  const discovered = hasImage ? [] : await discoverGroqTextModels(groq);

  const candidateModels = hasImage
    ? ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview']
    : Array.from(new Set([explicitGroqModel, ...discovered].filter(Boolean) as string[])).slice(0, 4);

  let lastGroqError: any = null;
  for (const modelToUse of candidateModels) {
    try {
      console.log(`[Dual-Engine / Groq] Calling model: ${modelToUse} (fast=${Boolean(options?.fast)})...`);
      const useJsonMode = options?.responseMimeType === 'application/json';
      const completion = await groq.chat.completions.create({
        model: modelToUse,
        messages: messages as any,
        temperature: options?.fast ? 0.2 : 0.4,
        max_tokens: 4096,
        top_p: 0.95,
        ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      });

      const text = completion.choices[0]?.message?.content || '';
      if (!text.trim()) {
        throw new Error(`Groq model ${modelToUse} returned empty content`);
      }
      return {
        text,
        engine: 'groq',
        model: modelToUse,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      // If json_object mode is unsupported by this specific Groq model, retry once without response_format
      if (options?.responseMimeType === 'application/json' && /response_format|json_object|json/i.test(msg)) {
        try {
          const retryCompletion = await groq.chat.completions.create({
            model: modelToUse,
            messages: messages as any,
            temperature: 0.2,
            max_tokens: 4096,
          });
          const retryText = retryCompletion.choices[0]?.message?.content || '';
          if (retryText.trim()) {
            return { text: retryText, engine: 'groq', model: modelToUse };
          }
        } catch (retryErr: any) {
          lastGroqError = retryErr;
        }
      }
      console.warn(`[Dual-Engine / Groq] Model ${modelToUse} failed:`, msg.slice(0, 180));
      lastGroqError = err;
    }
  }

  throw lastGroqError || new Error('All Groq candidate models failed.');
}

// Order prioritized by response speed and stability (flash-lite has minimal thinking latency)
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
];

let currentKeyIndex = 0;
// Short cooldown cache for models that hit 429 quota limits so we never waste latency retrying a rate-limited model
const modelQuotaCooldownUntil = new Map<string, number>();

/**
 * Unified AI Caller with Dual-Engine Architecture:
 * - Primary: Google Gemini with multi-key rotation and intelligent model fallback
 * - Silent Fallback: Groq on 429 Rate Limits, 503 Overloads, 504 Timeouts, or model exhaustion
 */
export async function callGemini(
  contents: any,
  options?: { fast?: boolean; model?: string; responseMimeType?: string; thinkingLevel?: 'LOW' | 'MEDIUM' }
) {
  const keys = getApiKeys();
  const groqKey = getGroqApiKey();

  // If no Gemini keys are configured, but Groq key is available, seamless direct dispatch to Groq
  if (keys.length === 0) {
    if (groqKey) {
      console.log('[Dual-Engine] No Gemini API key detected. Seamlessly delegating request to Groq...');
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
    modelsToTry = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  }

  // Round-robin index rotation across available keys to distribute load
  const startIndex = currentKeyIndex % keys.length;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;

  const orderedKeys = [
    ...keys.slice(startIndex),
    ...keys.slice(0, startIndex),
  ];

  let lastError: any;
  const attemptErrors: string[] = [];

  // Maximum time to spend across all Gemini attempts before activating Groq fallback (if available)
  // Kept safely under Vercel's 60s maxDuration so Groq rescue still has ~14-16s if Gemini fails.
  const geminiDeadline = Date.now() + (groqKey ? 44000 : 54000);

  // Try each API key in case of quota exhaustion or rate limits (429 / RESOURCE_EXHAUSTED)
  for (let kIdx = 0; kIdx < orderedKeys.length; kIdx++) {
    if (groqKey && geminiDeadline - Date.now() < 6000) {
      console.warn('[Dual-Engine] Gemini deadline budget exhausted. Fast-forwarding directly to Groq fallback...');
      break;
    }

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
      if (groqKey && geminiDeadline - Date.now() < 6000) {
        break;
      }

      const cooldownKey = `${kIdx}:${model}`;
      const cooldownUntil = modelQuotaCooldownUntil.get(cooldownKey) || 0;
      if (cooldownUntil > Date.now()) {
        attemptErrors.push(`${model}: skipped (429 cooldown)`);
        continue;
      }

      const maxAttemptsForModel = 2;
      let skipThinkingConfig = false;

      for (let attempt = 1; attempt <= maxAttemptsForModel; attempt++) {
        const remainingMs = geminiDeadline - Date.now();
        if (groqKey && remainingMs < 6000) {
          break;
        }

        try {
          const config: Record<string, any> = {};
          // Use MINIMAL thinking on gemini-3.1-flash-lite for maximum speed, and LOW on Gemini 4 models
          // (Never pass MINIMAL to Gemini 4 models — it is unsupported and returns 400 INVALID_ARGUMENT)
          if (!skipThinkingConfig) {
            if (model === 'gemini-3.1-flash-lite') {
              config.thinkingConfig = {
                thinkingLevel: ThinkingLevel.MINIMAL,
              };
            } else if (model.startsWith('gemini-4-')) {
              config.thinkingConfig = {
                thinkingLevel: options?.thinkingLevel === 'MEDIUM' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
              };
            }
          }
          if (options?.responseMimeType) {
            config.responseMimeType = options.responseMimeType;
          }

          // Normal flash-lite completions finish in 4-14s; cap at 20s so rare stalls fail over quickly without 35s+ waits
          const desiredTimeoutMs = 20000;
          const timeoutMs = groqKey ? Math.min(desiredTimeoutMs, Math.max(6000, remainingMs)) : Math.min(42000, Math.max(10000, remainingMs));
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              const timeoutErr = new Error(`Gemini API call to ${model} timed out after ${Math.round(timeoutMs / 1000)}s`);
              (timeoutErr as any).name = 'TimeoutError';
              reject(timeoutErr);
            }, timeoutMs);
          });

          const callPromise = ai.models.generateContent({
            model,
            contents,
            ...(Object.keys(config).length > 0 ? { config } : {}),
          });

          let response: any;
          try {
            response = await Promise.race([callPromise, timeoutPromise]);
          } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
          }

          return {
            ...response,
            text: response.text || '',
            engine: 'gemini',
            model,
          };
        } catch (err: any) {
          const errMessage = err?.message || String(err);
          attemptErrors.push(`${model}#${attempt}: ${errMessage.slice(0, 140)}`);

          const isThinkingConfigError =
            errMessage.includes('Thinking level') || errMessage.includes('thinkingConfig');
          const isTransientOverload =
            errMessage.includes('503') ||
            errMessage.includes('UNAVAILABLE') ||
            errMessage.includes('high demand') ||
            errMessage.includes('overloaded');
          const isQuotaOrRateLimit =
            errMessage.includes('429') ||
            errMessage.includes('RESOURCE_EXHAUSTED') ||
            errMessage.includes('quota') ||
            errMessage.includes('rate limit');
          const isAuthError =
            errMessage.includes('401') ||
            errMessage.includes('403') ||
            errMessage.includes('API key') ||
            errMessage.includes('API_KEY_INVALID');

          if (isThinkingConfigError && !skipThinkingConfig && attempt < maxAttemptsForModel) {
            console.warn(`Model ${model} rejected thinkingConfig. Retrying without thinkingConfig...`);
            skipThinkingConfig = true;
            lastError = err;
            continue;
          }

          if (isTransientOverload && attempt < maxAttemptsForModel && geminiDeadline - Date.now() > 8000) {
            console.warn(`Model ${model} returned transient 503 (attempt ${attempt}). Retrying after 0.9s...`);
            await new Promise((r) => setTimeout(r, 900));
            lastError = err;
            continue;
          }

          if (isQuotaOrRateLimit) {
            modelQuotaCooldownUntil.set(cooldownKey, Date.now() + 90_000);
          }

          // If key reached its quota or is invalid, switch immediately to next key instead of retrying models
          if ((isQuotaOrRateLimit || isAuthError) && orderedKeys.length > 1) {
            console.warn(`Key #${kIdx + 1} failed (${isAuthError ? 'Auth error' : 'Quota/Rate limit'}). Switching to next key in pool...`);
            lastError = err;
            break; // break to next API key
          }

          console.warn(`Model ${model} failed, switching to fallback candidate:`, errMessage.slice(0, 180));
          lastError = err;
          break;
        }
      }
    }
  }

  // AUTOMATIC SILENT RESCUE FALLBACK TO GROQ
  if (groqKey) {
    try {
      console.warn(
        `[Dual-Engine Fallback] Primary engine (Gemini) failed or timed out (${lastError?.message?.slice(0, 120) || 'All models exhausted'}). Automatically activating Groq fallback...`
      );
      return await callGroqText(contents, options);
    } catch (groqErr: any) {
      attemptErrors.push(`groq: ${(groqErr?.message || String(groqErr)).slice(0, 120)}`);
      console.error('[Dual-Engine Fallback] Groq fallback also failed:', groqErr?.message);
    }
  }

  const finalError = lastError || new Error('فشلت جميع نماذج ومفاتيح الذكاء الاصطناعي المتاحة (Gemini & Groq).');
  if (attemptErrors.length > 0 && !String(finalError.message || '').includes(' | ')) {
    finalError.attemptErrors = attemptErrors;
  }
  throw finalError;
}

export function formatApiError(error: any): { status: number; message: string } {
  const rawMessage = error?.message || String(error);
  const customStatus = error?.statusCode;
  if (customStatus) {
    return { status: customStatus, message: rawMessage };
  }

  if (
    rawMessage.includes('Timeout') ||
    rawMessage.includes('timed out') ||
    rawMessage.includes('504') ||
    error?.name === 'TimeoutError'
  ) {
    return {
      status: 504,
      message: 'استغرق توليد المحتوى وقتاً أطول من المتوقع، تم تحسين سرعة المعالجة الاحتياطية. يرجى إعادة المحاولة الآن.',
    };
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

type GradeAgeBand = 'kg' | 'lower-primary' | 'upper-primary' | 'middle' | 'high' | 'general';

function getGradeAgeBand(grade?: string): GradeAgeBand {
  if (!grade) return 'general';
  const g = grade.toLowerCase();
  if (g.includes('روضة') || g.includes('تمهيدي') || g.includes('kindergarten') || /\bkg\b/.test(g)) {
    return 'kg';
  }
  if (
    g.includes('الأول') || g.includes('الاول') ||
    g.includes('الثاني') && !g.includes('الثاني عشر') ||
    g.includes('الثالث') ||
    /\bgrade\s*[123]\b/.test(g)
  ) {
    // Disambiguate "الأول الإعدادي / الأول الثانوي" if typed manually
    if (g.includes('ثانوي')) return 'high';
    if (g.includes('إعدادي') || g.includes('اعدادي') || g.includes('متوسط')) return 'middle';
    return 'lower-primary';
  }
  if (
    g.includes('الرابع') || g.includes('الخامس') || g.includes('السادس') ||
    /\bgrade\s*[456]\b/.test(g)
  ) {
    return 'upper-primary';
  }
  if (
    g.includes('السابع') || g.includes('الثامن') || g.includes('التاسع') ||
    g.includes('إعدادي') || g.includes('اعدادي') || g.includes('متوسط') ||
    /\bgrade\s*[789]\b/.test(g)
  ) {
    return 'middle';
  }
  if (
    g.includes('العاشر') || g.includes('الحادي عشر') || g.includes('الثاني عشر') ||
    g.includes('ثانوي') || /\bgrade\s*(10|11|12)\b/.test(g)
  ) {
    return 'high';
  }
  return 'general';
}

function buildGradeCalibrationDirective(grade?: string, isAr: boolean = true): string {
  const band = getGradeAgeBand(grade);
  const gradeLabel = grade || (isAr ? 'المرحلة المحددة' : 'the target grade');

  if (!isAr) {
    const mapEn: Record<GradeAgeBand, string> = {
      kg: `Age & Grade Calibration (${gradeLabel}, Ages 4-6): Use very short, concrete, familiar everyday sentences (3-5 words), visual/tactile concepts, foundational phonics/vocabulary, and zero abstract grammatical jargon.`,
      'lower-primary': `Age & Grade Calibration (${gradeLabel}, Ages 6-9): Use clear, short sentences (5-8 words), familiar child-friendly contexts, basic foundational skills, and avoid complex multi-clause analysis or advanced terminology.`,
      'upper-primary': `Age & Grade Calibration (${gradeLabel}, Ages 9-12): Use well-structured, engaging grade-level sentences (7-12 words), age-appropriate analytical concepts, and avoid high-school-level abstraction.`,
      middle: `Age & Grade Calibration (${gradeLabel}, Ages 12-15): Use coherent multi-paragraph contexts, intermediate analytical and reasoning rigor, and curriculum-accurate terminology for middle school.`,
      high: `Age & Grade Calibration (${gradeLabel}, Ages 15-18): Use rigorous academic/literary texts, critical synthesis, advanced domain terminology, and university-prep analytical depth.`,
      general: `Age & Grade Calibration (${gradeLabel}): Strictly match vocabulary, sentence complexity, cognitive depth, and curriculum scope to ${gradeLabel}.`,
    };
    return `\n\n${mapEn[band]}`;
  }

  const mapAr: Record<GradeAgeBand, string> = {
    kg: `معايرة المرحلة العمرية (${gradeLabel} — 4 إلى 6 سنوات): جمل قصيرة جداً ومألوفة (2-4 كلمات)، تمييز الحروف والأصوات والحركات، وممنوع تماماً المصطلحات النحوية المجردة.`,
    'lower-primary': `معايرة المرحلة العمرية (${gradeLabel} — الصفوف الأولية 6-9 سنوات): جمل قصيرة وسلسة (4-7 كلمات) من عالم الطفل. المهارات المناسبة فقط: المدود والتنوين، اللام الشمسية والقمرية، التاء المربوطة والمفتوحة، المذكر والمؤنث، المفرد والمثنى والجمع، أقسام الكلمة، أسماء الإشارة والضمائر، حروف الجر الأساسية، والفهم المباشر. ممنوع أبواب متقدمة (الحال، التمييز، المفعول المطلق، البدل، الممنوع من الصرف).`,
    'upper-primary': `معايرة المرحلة العمرية (${gradeLabel} — الابتدائية العليا 9-12 سنة): جمل واضحة متوسطة الطول (6-12 كلمة). المهارات المناسبة: الجملة الاسمية والفعلية، حروف الجر والاسم المجرور، ظرف الزمان وظرف المكان (منصوبَين بلا حرف جر)، كان وإنّ وأخواتهما، النعت والمضاف إليه، علامات الإعراب للمثنى والجمع، والهمزات. ممنوع القواعد الإعدادية/الثانوية المعقدة (التمييز، الاستثناء، البدل).`,
    middle: `معايرة المرحلة العمرية (${gradeLabel} — الإعدادية/المتوسطة 12-15 سنة): نصوص مترابطة متوسطة العمق. القواعد المناسبة: المعرب والمبني، الأفعال الخمسة، النعت والحال والتوكيد والعطف، المفعول المطلق ولأجله، اللازم والمتعدي، المبني للمجهول ونائب الفاعل، المجرد والمزيد، والمشتقات الأساسية.`,
    high: `معايرة المرحلة العمرية (${gradeLabel} — الثانوية 15-18 سنة): نصوص أدبية وفكرية رصينة وشواهد أصيلة. القواعد والبلاغة: التوابع المتقدمة (البدل، التوكيد)، المنصوبات المتقدمة (التمييز، الاستثناء، المنادى)، إعمال المشتقات، المصادر، الممنوع من الصرف، وعلوم البلاغة والتحليل النقدي.`,
    general: `معايرة المرحلة العمرية (${gradeLabel}): اضبط طول الجمل ومستوى المفردات والقواعد لتطابق عمر طلاب (${gradeLabel}) بدقة.`,
  };

  return `\n\n${mapAr[band]}`;
}

function buildArabicLinguistVerificationProtocol(isAssessment: boolean = true): string {
  return `

بروتوكول خبير اللغة العربية والتدقيق النحوي (إلزامي 100%):
1. التفريق الحاسم بين (ظرف الزمان/المكان) وبين (الجار والمجرور والمفعول به):
   - ممنوع منعاً باتاً عدّ الجار والمجرور (مثل: "فِي الصَّبَاحِ، فِي الْمَدْرَسَةِ، عَلَى الطَّاوِلَةِ، إِلَى الْحَدِيقَةِ") أو اسم المكان المختص/المفعول به (مثل: "مَحَطَّةً، حَدِيقَةً، مَتْحَفاً، شَجَرَةً" في نحو "زَارَ الطَّالِبُ مَتْحَفاً") ظرفَ زمانٍ أو مكانٍ!
   - الظرف الصحيح اسم منصوب بتقدير (في) بلا حرف جر ظاهر:
     * زمان: (صَبَاحاً، مَسَاءً، لَيْلاً، نَهَاراً، يَوْماً، سَاعَةً، شِتَاءً، صَيْفاً، غَداً، قَبْلَ، بَعْدَ، حِينَ).
     * مكان مبهم: (أَمَامَ، خَلْفَ، فَوْقَ، تَحْتَ، بَيْنَ، عِنْدَ، يَمِينَ، يَسَارَ، وَسَطَ، حَوْلَ، دَاخِلَ، خَارِجَ).
2. التدقيق النحوي الكامل لكل جملة قبل اعتمادها:
   - تأكد من صحة الإعراب ومطابقة الفعل للفاعل تذكيراً وتأنيثاً (سَافَرَتِ الْعَائِلَةُ لا سَافَرَ الْعَائِلَةُ)، وتوافق زمن الفعل مع الظرف (الماضي مع أَمْسِ، والمستقبل مع غَداً)، وعدم الخلط بين النعت والمضاف إليه أو الحال، وسلامة الصيغ («أيُّ الجمل التالية» لا «أيُّ جملةٍ التالية»).
   - لا تُشكّل كل حرف في النص؛ اكتب بعربية فصيحة واضحة وضع الحركات الإعرابية فقط على أواخر الكلمات المطلوبة والشواهد النحوية (مثل: صباحاً، أمامَ، تحتَ).${
     isAssessment
       ? `
3. معايير صياغة الأسئلة:
   - كل سؤال يجب أن يكون كامل الصيغة وينتهي بعلامة استفهام (؟) أو طلب واضح، وجمله طبيعية منطقية المعنى.
   - إذا سألت عن إعراب أو نوع كلمة داخل جملة فاذكر الكلمة صراحة داخل الجملة ولا تترك مكانها فراغاً (استخدم الفراغ "......" فقط في أسئلة "أكمل الفراغ").
   - في أسئلة الاستخراج من جملة، اجعل الخيارات الأربعة (أ، ب، ج، د) من كلمات نفس الجملة، ونوّع أنماط الأسئلة، ووزّع الإجابات الصحيحة بتوازن بين (أ، ب، ج، د) ومطابقة تماماً لنموذج الإجابة والتعليل.`
       : ''
   }`;
}

function buildSubjectGuidance(settings: any, outputType: string = ''): string {
  const isAr = settings.contentLanguage === 'ar';
  const nonNative = isNonNativeSubject(settings.subject);
  const subjLower = String(settings.subject || '').toLowerCase();
  const isArabicSubject =
    subjLower.includes('عربي') || subjLower.includes('arabic') || subjLower.includes('قرآن') || subjLower.includes('quran') || !subjLower;
  const isAssessment = ['quiz', 'qti-exam', 'standardized-test', 'worksheet'].includes(outputType);
  const includeLinguistProtocol = isAr && (isAssessment || isArabicSubject);
  const gradeCalibration = buildGradeCalibrationDirective(settings.grade, isAr);

  if (nonNative) {
    const base = isAr
      ? `\n\nتوجيهات خاصة: المادة لغير الناطقين بالعربية (AFL). بسّط التراكيب والمفردات، وأضف دعماً بصرياً ومفردات مساعدة مناسبة لمتعلمي اللغة الثانية.`
      : `\n\nSpecial guidance: This subject is designed for non-native speakers (AFL / Second Language Learners). Simplify language structures, include visual supports and bilingual glossaries, and calibrate difficulty accordingly.`;
    return `${base}${gradeCalibration}${includeLinguistProtocol ? buildArabicLinguistVerificationProtocol(isAssessment) : ''}`;
  }

  const base = isAr
    ? `\n\nتوجيهات خاصة: المادة للناطقين باللغة العربية. التزم بالدقة العلمية والنحوية وملاءمة المرحلة العمرية.`
    : `\n\nSpecial guidance: Designed for native-level learners. Focus on domain accuracy, age-appropriate rigor, and higher-order analytical competencies aligned with the selected grade level.`;

  return `${base}${gradeCalibration}${includeLinguistProtocol ? buildArabicLinguistVerificationProtocol(isAssessment) : ''}`;
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
المطلوب: توليد "اختبار معياري / تشخيصي متكامل" باللغة العربية الفصيحة السليمة على شكل HTML احترافي جاهز للعرض والطباعة (من 10 إلى 12 سؤالاً معيراً)، معدّ بميزان خبير اللغة العربية ومعاير تماماً للمرحلة العمرية لـ (${settings.grade || 'الصف المختار'}).
قاعدة التدقيق النحوي الإلزامية: افحص كل سؤال وشاهد لغوي نحوياً قبل اعتماده (لا تخلط أبداً بين الجار والمجرور وبين ظرف الزمان أو المكان، وتأكد من صحة الإعراب والضبط الوظيفي وملاءمة المستوى لعمر الطالب).
تفاصيل الإطار المعياري المستهدف:
${frameworkDetails}
${subCriteriaText}
${teacherCustomStandardsText}

الهيكل الإلزامي للمخرج (HTML Structure):
1. ترويسة الاختبار المعياري (Assessment Header): بيانات المادة، الصف، نوع الإطار المعياري، زمن الاختبار، والدرجة الكلية.
2. نص الانطلاق / المادة المصدرية (Stimulus Text): في إطار بصري مميز مع ضبط أواخر الكلمات الإعرابية بدقة.
3. بنك الأسئلة المعيارية (Item Bank): كل سؤال مكتوب بوضوح وموضح بجانبه اسم المعيار المقاس ومستواه المعرفي.
4. مصفوفة مؤشرات الأداء والتحليل المعياري (Rubric & Standards Assessment Matrix):
   جدول رسمي للإشراف التربوي يشمل الأعمدة:
   (رقم السؤال | كود واسم المعيار المستهدف | مستوى التفكير / عمق المعرفة | مؤشر الأداء المعياري ودرجة الإتقان | الإجراء التدريسي والخطة العلاجية المقترحة عند الخطأ).
5. الخطة العلاجية والتدخلات التدريسية المباشرة (Remediation & Enrichment Plan).
6. نموذج الإجابات النموذجية وسلم التقدير اللفظي (Answer Key & Scoring Rubrics) بصيغة واضحة ودقيقة: "1 - (ب) [نص الخيار]: [التعليل]".
تنبيه مهم للسرعة والدقة: لا تكتب كود QTI XML يدوياً في نهاية الرد (سيتم توليد حزمة QTI ZIP تلقائياً وبدقة 100% من جدول الأسئلة ونموذج الإجابة أعلاه).
استخدم وسوم HTML القياسية فقط: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.
لا تستخدم وسوم <html> أو <body> أو <style>.`;
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
6. Official Answer Key & Analytical Rubric (formatted clearly as "1 - (B) [Option]: [Rationale]").
Note: Do NOT output raw QTI XML — the QTI ZIP package is deterministically generated from the HTML items and answer key above.
Use only standard HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.`;
  }
}

function buildBasePrompt(settings: any, outputType: string): string {
  const isAr = settings.contentLanguage === 'ar';
  const subjectGuidance = buildSubjectGuidance(settings, outputType);
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
    const ctx = `أنت خبير أكاديمي متخصص في اللغة العربية والنحو والصرف وبناء المناهج والاختبارات التربوية لأكاديمية سهلة الدولية ومدرسة الفرقان العالمية، تصوغ كل محتوى وسؤال بدقة خبير اللغة والقياس والتقويم، وتراعي بصرامة المرحلة العمرية والصف الدراسي المختار.

قاعدة لغوية ونحوية صارمة:
يجب أن تخلو جميع الأسئلة والشواهد والخيارات من أي خطأ نحوي أو صرفي أو إملائي أو خلط بين الأبواب النحوية (مثل الخلط بين الجار والمجرور والظرف)، مع استخدام عربية فصيحة سليمة وضبط أواخر الكلمات الإعرابية والشواهد النحوية فقط (دون إثقال بالتشكيل الكامل على كل حرف من النص العادي لسرعة الإنتاج وسلاسة القراءة).

معلومات الدرس:
- المادة: ${settings.subject || 'غير محدد'}
- الصف الدراسي: ${settings.grade || 'غير محدد'}
- مدة الدرس: ${settings.duration || 'غير محدد'}
- مستوى الطلاب: ${settings.studentLevel || 'غير محدد'}
- اسم المعلم: ${settings.teacherName || 'غير محدد'}
- عنوان الدرس: ${settings.lessonTitle || 'سيتم استنتاجه من المحتوى'}
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
المطلوب: توليد "خطة درس أسبوعية معتمدة" احترافية ومكثفة تربوياً تطابق النموذج الرسمي لأكاديمية سهلة الدولية ومدارس الفرقان، بلغة عربية فصيحة وسليمة (بدون تشكيل على كل حرف؛ اضبط أواخر الكلمات والشواهد النحوية فقط).

قواعد الصياغة للسرعة والجودة:
- ممنوع أي مقدمات حوارية أو رموز ماركداون (\`\`\` أو ### أو **). ابدأ فوراً بجدول الترويسة.
- استخدم HTML نظيفاً ومختصر التنسيقات (الجداول منسّقة تلقائياً في CSS) واكتب كل بند بإيجاز تربوي عملي مباشر (2-3 سطور مركزة لكل خلية).

الهيكل الرسمي المعتمد:
1. جدول الترويسة (2 صفوف × 4 خلايا):
<table>
  <tr>
    <td style="background:#1e293b;color:#fff;font-weight:bold;width:18%;text-align:center;">الأسبوع - التاريخ</td>
    <td style="background:#f8fafc;width:32%;">${weekText} - ${todayDate}</td>
    <td style="background:#1e293b;color:#fff;font-weight:bold;width:18%;text-align:center;">اسم المعلم</td>
    <td style="background:#f8fafc;width:32%;">${teacher}</td>
  </tr>
  <tr>
    <td style="background:#1e293b;color:#fff;font-weight:bold;width:18%;text-align:center;">المادة</td>
    <td style="background:#f8fafc;width:32%;">${subj}</td>
    <td style="background:#1e293b;color:#fff;font-weight:bold;width:18%;text-align:center;">الصف</td>
    <td style="background:#f8fafc;width:32%;">${grd}</td>
  </tr>
</table>

2. جدول معلومات وأساسيات الدرس (8 صفوف، عمودان: العمود الأول بـ style="background:#13748e;color:#fff;font-weight:bold;width:22%;"):
1. عنوان الدرس: ${title}
2. التاريخ: ${todayDate}
3. مدة الدرس: ${dur}
4. الأهداف: 4 أهداف سلوكية قابلة للقياس (معرفي، مهاري، تحليلي، وجداني).
5. المعايير: المعايير التعليمية المعتمدة للمادة مع الكود.
6. القيم الإسلامية والوطنية: ربط تربوي أصيل مع شاهد.
7. المصادر - تطبيق التكنولوجيا: الكتاب المدرسي، LMS، وأدوات تفاعلية (Wordwall / Kahoot).
8. المهارات الحياتية: التفكير الناقد، التواصل، العمل الجماعي، والتعلم الذاتي.

<div class="page-break"></div>
<h3 style="font-size:1.15rem;font-weight:800;color:#0f172a;margin:16px 0 8px 0;">خطوات الدرس :</h3>

3. جدول خطوات الدرس (4 أعمدة: النشاط | المدة الزمنية | الوصف | أساليب التقييم):
- صف الرأس بخلفية #1e293b ونص أبيض، وعمود "النشاط" بـ style="background:#13748e;color:#fff;font-weight:bold;".
- الصفوف الستة (بإجراءات عملية مركزة):
1. النشاط التحفيزي (5-7 دقائق)
2. الشرح المباشر (15-20 دقيقة) — النمذجة (I Do) مع أمثلة مضبوطة نحوياً
3. التطبيق الموجه (10-15 دقيقة) — عمل تعاوني (We Do)
4. العمل الفردي (10-15 دقيقة) — تطبيق مستقل (You Do)
5. تذكرة الخروج (5 دقائق) — سؤال إغلاق قياسي
6. التقييم (الواجبات والاختبارات والتقييم التكويني)

<div class="page-break"></div>

4. جدول التمايز وملاحظات المعلم (صفان بعمودين: الأول style="background:#13748e;color:#fff;font-weight:bold;width:22%;"):
- التمايز: دعم المتعثرين، مهام المتوسطين، إثراء المتفوقين، وأنماط التعلم.
- ملاحظات المعلم الشخصية للدرس: نقاط القوة، الأخطاء الشائعة ومعالجتها، وإدارة الوقت.`;
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
          themeDirective = 'التنسيق المرئي: نمط عصري جذاب مع إطارات ناعمة وبطاقات للأنشطة وأيقونات توضيحية.';
        } else if (themeStyle === 'minimal') {
          themeDirective = 'التنسيق المرئي: نمط أحادي بسيط وعالي الوضوح أبيض وأسود موفر للحبر ومثالي للطباعة.';
        } else {
          themeDirective = 'التنسيق المرئي: نمط أكاديمي كلاسيكي محكم يتضمن جداول وإطارات أنيقة.';
        }

        return `${ctx}
المطلوب: توليد "ورقة عمل تفاعلية مبنية على هرم بلوم المعرفي" جاهزة للطباعة باللغة العربية الفصيحة (بدون تشكيل على كل حرف؛ اضبط أواخر الكلمات والشواهد النحوية فقط) على شكل HTML نظيف.

تخصيصات المعلم لورقة العمل:
- عدد الصفحات المطلوبة: ${pageCount} صفحات.
${themeDirective}
${standardsSel ? `- المعايير المستهدفة: ${standardsSel}` : ''}
${teacherNotes ? `- توجيهات وملاحظات المعلم الإلزامية: """\n${teacherNotes}\n"""` : ''}
${isAutoPilot ? '- نظام الطيار الآلي (AI AutoPilot): مفعل - وزّع الأسئلة والأنشطة بتدرج مثالي من التذكر حتى الابتكار.' : ''}

هيكل ورقة العمل المتدرجة حسب هرم بلوم:
1. ترويسة ورقة العمل (اسم الطالب، الصف، التاريخ، المادة، العنوان، الدرجة).
2. القسم الأول - مستوى التذكر والفهم (Remembering & Understanding): استرجاع المفاهيم، اختيار من متعدد، صح أو خطأ مع التعليل، إكمال الفراغ.
3. القسم الثاني - مستوى التطبيق والتحليل (Applying & Analyzing): مسائل وتدريبات تطبيقية، تحليل جمل أو فقرة، مقارنة في جدول، استنتاج.
4. القسم الثالث - مستوى التقويم والابتكار (Evaluating & Creating): سؤال تفكير ناقد، تصويب خطأ مع التعليل، أو إنتاج لغوي إبداعي مناسب لعمر الطالب.

فواصل الصفحات:
لتوزيع المحتوى على ${pageCount} صفحات، ضع فاصل صفحة بين الأقسام بالصيغة التالية:
<div class="page-break">--- فاصل صفحة (Page Break) ---</div>

استخدم وسوم HTML فقط: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;
      }

      case 'slides': {
        const ps = settings.presentationSettings || {};
        const slideCount = ps.slideCount || 10;

        return `${ctx}
المطلوب: توليد "عرض شرائح تقديمي حديث على طريقة GAMMA AI" باللغة العربية الفصيحة السليمة (بدون تشكيل على كل حرف؛ اضبط الشواهد النحوية فقط)، موزّع على ${slideCount} شرائح مركزة وجذابة.

مبادئ تصميم الشرائح (موجزة، سريعة القراءة، 3-5 نقاط مركزة لكل شريحة):
1. تنوع أنماط الشرائح: غلاف (hero)، مقارنة بعمودين (split)، شبكة 3 بطاقات (grid)، خطوات متسلسلة (timeline)، تحدي وتقويم (quiz)، وملخص ختامي (summary).
2. الهيكل الدقيق لكل شريحة (حافظ على أسماء الكلاسات .slide و .slide-content و .teacher-notes مع تنسيق مختصر):
<div class="slide" data-slide-index="N" data-layout="hero|split|grid|timeline|quiz|summary" style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px;background:#fff;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:12px;">
    <h2 style="color:#0f172a;margin:0;font-size:1.3rem;">عنوان الشريحة</h2>
    <span style="background:#f0fdf4;color:#166534;padding:2px 10px;border-radius:10px;font-size:0.85em;font-weight:700;">الشريحة N من ${slideCount}</span>
  </div>
  <div class="slide-content">
    <!-- محتوى الشريحة المركز (نقاط، أمثلة مضبوطة، أو جدول مقارن) -->
  </div>
  <div class="teacher-notes" style="background:#f8fafc;border-right:4px solid #0284c7;padding:10px 14px;margin-top:12px;border-radius:8px;font-size:0.9em;">
    <strong>🎙️ سيناريو المعلم:</strong> جملة أو جملتان موجزتان للشرح. <strong>❓ سؤال نقاش:</strong> سؤال تفاعلي للفصل.
  </div>
</div>

استخدم وسوم HTML فقط بدون أي مقدمات أو ماركداون.`;
      }

      case 'quiz': {
        const subj = settings.subject || 'اللغة العربية';
        const grd = settings.grade || 'الصف السادس';

        return `${ctx}
المطلوب حصرياً: توليد "اختبار قصير شامل (10 أسئلة اختيار من متعدد)" باللغة العربية الفصيحة مع ضبط أواخر الكلمات الإعرابية والشواهد النحوية بالشكل الصحيح بدقة 100%، بصيغة HTML منسق وجاهز، مُراجع نحوياً بدقة خبير اللغة العربية ومُعاير تماماً للمرحلة العمرية لـ (${grd}).
قاعدة التدقيق قبل الإخراج:
- راجع كل سؤال وجملة شاهد نحوياً قبل كتابتها: تأكد من وجود الظاهرة النحوية المطلوبة فعلاً في الجملة (لا تطلب ظرفاً في جملة ليس فيها إلا جار ومجرور أو مفعول به، ولا تخلط بين ظرف المكان المبهم مثل "أمام/خلف/فوق/تحت/بين/عند" وبين اسم المكان المختص مثل "حديقة/محطة/متحف/مدرسة").
- تأكد من سلامة المعنى ومطابقة الفعل للفاعل تذكيراً وتأنيثاً، وملاءمة المفردات والقواعد لعمر طلاب (${grd}).
- وزّع الإجابات الصحيحة بتوازن متنوع بين (أ، ب، ج، د) ولا تجعل الإجابة الصحيحة دائماً في (أ).
قاعدة ذهبية إلزامية: ممنوع تماماً أي كلام حواري أو مقدمات شخصية، وممنوع استخدام رموز ماركداون (\`\`\` أو ### أو **). ابدأ فوراً بوسوم HTML التالية:

1. عنوان الاختبار في البداية:
<h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">اختبار قصير شامل (${subj} - ${grd})</h1>

2. الشكل الأول: جدول الأسئلة (10 أسئلة اختيار من متعدد)
اعرض جميع الأسئلة العشرة (10 أسئلة) في جدول HTML أنيق من 6 أعمدة بالضبط (رقم السؤال | السؤال | أ | ب | ج | د):
<h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold;">أولاً: جدول الأسئلة (اختيار من متعدد)</h3>
<table dir="rtl" border="1" style="width:100%; border-collapse:collapse; margin-bottom:28px; text-align:center; font-size:14px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f8fafc; color:#0f172a; font-weight:bold;">
      <th style="border:1px solid #cbd5e1; padding:10px; width:70px;">رقم السؤال</th>
      <th style="border:1px solid #cbd5e1; padding:10px; text-align:right;">السؤال</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">أ</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">ب</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">ج</th>
      <th style="border:1px solid #cbd5e1; padding:10px; width:120px;">د</th>
    </tr>
  </thead>
  <tbody>
    <!-- ضع كل سؤال كامل الصيغة في صف منفصل مع خياراته الأربعة أ، ب، ج، د (من 1 إلى 10) -->
  </tbody>
</table>

3. الشكل الثاني: نموذج الإجابة والتعليل
اعرض قائمة نقطية بجميع الإجابات (1 إلى 10) مع التعليل النحوي والتربوي الدقيق:
<div style="margin-top:24px;">
  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold;">ثانياً: نموذج الإجابة والتعليل</h3>
  <ul style="list-style-type:disc; padding-right:24px; line-height:2.2; font-size:14px; color:#1e293b;">
    <li><strong>1 - (ب) [نص الخيار الصحيح]:</strong> [التعليل النحوي والتربوي الدقيق].</li>
    <!-- كرر لجميع الأسئلة حتى السؤال 10 -->
  </ul>
</div>
تنبيه: لا تكتب كود QTI XML يدوياً في نهاية الرد (المنصة تولّد حزمة QTI ZIP تلقائياً من الجدول ونموذج الإجابة).`;
      }

      case 'qti-exam': {
        const subj = settings.subject || 'اللغة العربية';
        const grd = settings.grade || 'الصف السادس';

        return `${ctx}
المطلوب حصرياً: توليد "امتحان اختيار من متعدد شامل لمستويات بلوم (20 سؤالاً معيارياً)" باللغة العربية الفصيحة مع ضبط أواخر الكلمات الإعرابية والشواهد النحوية بالشكل الصحيح بدقة 100% على شكل HTML، بدون أي مقدمات حوارية أو رموز ماركداون، مُعد بدقة خبير اللغة العربية ومُعاير تماماً للمرحلة العمرية لـ (${grd}).
قاعدة التدقيق النحوي الإلزامية: افحص كل سؤال وجملة شاهد نحوياً قبل كتابتها (تمييز تام بين الظرف المنصوب وبين الجار والمجرور والمفعول به، صحة الإعراب والضبط ومطابقة الفعل للفاعل، ملاءمة المفردات والقواعد لـ ${grd}، وتوزيع الإجابات الصحيحة بتوازن بين أ، ب، ج، د).

1. عنوان الامتحان:
<h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">امتحان بلوم الشامل (${subj} - ${grd})</h1>

2. الشكل الأول: جدول الأسئلة (20 سؤال اختيار من متعدد)
جدول HTML أنيق بـ 6 أعمدة (رقم السؤال | السؤال | أ | ب | ج | د) لجميع الـ 20 سؤالاً موزعة حسب هرم بلوم:
- 6 أسئلة: التذكر والفهم (1 - 6).
- 8 أسئلة: التطبيق والتحليل (7 - 14).
- 6 أسئلة: التقويم والابتكار (15 - 20).
<h3 style="color:#0f172a; margin-bottom:12px; font-weight:bold;">أولاً: جدول الأسئلة (اختيار من متعدد)</h3>
<table dir="rtl" border="1" style="width:100%; border-collapse:collapse; margin-bottom:28px; text-align:center; font-size:14px; border:1px solid #cbd5e1;">
  <thead>
    <tr style="background:#f8fafc; color:#0f172a; font-weight:bold;">
      <th style="border:1px solid #cbd5e1; padding:8px; width:65px;">رقم السؤال</th>
      <th style="border:1px solid #cbd5e1; padding:8px; text-align:right;">السؤال</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">أ</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">ب</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">ج</th>
      <th style="border:1px solid #cbd5e1; padding:8px; width:110px;">د</th>
    </tr>
  </thead>
  <tbody>
    <!-- صفوف جميع الأسئلة من 1 حتى 20 -->
  </tbody>
</table>

3. الشكل الثاني: نموذج الإجابة والتعليل
<div style="margin-top:24px;">
  <h3 style="color:#0284c7; margin-bottom:12px; font-weight:bold;">ثانياً: نموذج الإجابة والتعليل</h3>
  <ul style="list-style-type:disc; padding-right:24px; line-height:2.2; font-size:14px; color:#1e293b;">
    <!-- جميع الإجابات من 1 حتى 20 بصيغة: 1 - (ب) [الخيار]: [التعليل النحوي] -->
  </ul>
</div>

4. مصفوفة نواتج التعلم وجدول المواصفات في جدول منسق.
تنبيه: لا تكتب كود QTI XML يدوياً في نهاية الرد (المنصة تولّد حزمة QTI ZIP تلقائياً من الجدول ونموذج الإجابة).`;
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
المطلوب: توليد "مهمة أدائية ومشروع تعلم قائم على المشاريع (PBL)" احترافي متكامل لأكاديمية سهلة الدولية ومدارس الفرقان، بصياغة أكاديمية رفيعة وإيجاز تربوي محكم لسرعة التوليد.

قواعد الصياغة:
- ابدأ فوراً بكود HTML المنسق دون أي كتل ماركداون (\`\`\` أو ###).
- استخدم نظام الجداول والألوان الأكاديمية الرسمية (#1e3a8a، #0f172a، #0d9488، #f8fafc).
- اكتب كل بند بعمق تربوي موجز ومباشر دون استطراد غير مفيد.

الهيكل التربوي للمهمة الأدائية المعتمدة:
1. جدول بيانات المشروع والترويسة:
   - عنوان المشروع: ${pTopic}
   - الصف: ${settings.grade} | المادة: ${settings.subject}
   - مدة المشروع: ${pDuration} | نمط العمل: ${pTeam}
   - نوع المخرج: ${pType}
2. إطار GRASPS العالمي للمهام الأدائية في جدول احترافي:
   - G (الهدف - Goal): ${gGoal}
   - R (الدور - Role): ${gRole}
   - A (الجمهور المستهدف - Audience): ${gAudience}
   - S (السياق والسيناريو الواقعي - Situation): ${gSituation}
   - P (المنتج والأداء النهائي - Product/Performance): ${gProduct}
   - S (المعايير وسلم التقييم - Standards): ${gStandards}
3. مراحل وخارطة طريق التسليم (Project Milestones) في جدول زمني منسق (4 مراحل).
4. أدوار الفريق وميثاق المسؤولية (قائد المشروع، باحث المحتوى، المصمم الإبداعي، مدقق الجودة والتقديم).
5. سلم التقييم التحليلي الشامل (Analytical Rubric 4-Levels) لتقييم 4 محاور بـ 4 مستويات (متفوق 4، متقدم 3، متمكن 2، نامٍ 1).
6. بطاقة التقييم الذاتي وتقييم الأقران (Self & Peer Assessment Form).`;
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
        return `${ctx}
Task: Generate a "Short Assessment Quiz (10 MCQs)" in English formatted as clean, professional HTML.
Distribute correct answers evenly across A, B, C, and D. Do NOT output conversational preamble or markdown syntax. Start directly with:

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
    <!-- 1 - (B) [Option text]: [Rationale] -->
  </ul>
</div>
Note: Do NOT output raw QTI XML — the QTI ZIP package is deterministically generated from the HTML table and answer key above.`;
      }

      case 'qti-exam': {
        return `${ctx}
Task: Generate a comprehensive "20-Question Bloom Exam" in English formatted as clean HTML.
Distribute correct answers evenly across A, B, C, and D.
1. Title: <h1 style="color:#0369a1; text-align:center; font-size:22px; font-weight:800; margin-bottom:20px;">Comprehensive Bloom Assessment (${settings.subject || 'Subject'} - ${settings.grade || 'Grade'})</h1>
2. Questions Table with 6 columns (Q#, Question, A, B, C, D) for all 20 questions.
3. Answer Key & Rationale list for questions 1 through 20 formatted as "1 - (B) [Option]: [Rationale]".
4. Bloom Specification Matrix table.
Note: Do NOT output raw QTI XML — the QTI ZIP package is deterministically generated from the HTML table and answer key above.`;
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
    const { action, settings = {}, outputType = 'lesson-plan', files = [] } = body || {};

    // ─────────────────────────────────────────────────────────────
    // Special Action: Interactive Video & Quiz Studio (Edpuzzle style)
    // ─────────────────────────────────────────────────────────────
    if (action === 'interactive_video_quiz') {
      const {
        videoTitle = 'Educational Video',
        videoUrl = '',
        duration = 300,
        startTrim = 0,
        endTrim = 300,
        questionCount = 5,
        dokLevel = 'DOK 2',
        grade = 'Grade 8',
        subject = 'General Science',
        lang = 'ar',
        customPrompt = '',
        videoContext = '',
        videoTranscript = '',
      } = body;

      const isArabic = lang === 'ar';
      const effectiveDuration = Math.max(30, Math.floor(endTrim - startTrim));
      const count = Math.min(15, Math.max(2, Number(questionCount) || 5));

      const systemPrompt = isArabic
        ? `أنت كبير الخبراء التربويين في تصميم الفيديوهات التفاعلية التعليمية (Interactive Video Studio على غرار Edpuzzle و Wayground).
مهمتك المحورية: توليد عدد (${count}) أسئلة تفاعلية ذكية ومحكمة تربوياً ومطابقة 100% للمحتوى الحقيقي المعروض والمشروح داخل هذا الفيديو التعليمي بالتحديد.

قواعد الارتباط بمحتوى الفيديو:
1. الارتباط المباشر بموضوع الفيديو: يجب أن ترتبط الأسئلة ارتباطاً جوهرياً وحصرياً بالمفاهيم العلمية والشروحات والتجارب والأمثلة التي يطرحها الفيديو (${videoTitle}) في مادة (${subject}). ممنوع توليد أسئلة عامة أو سطحية لا صلة لها بالموضوع الدقيق.
2. التوزيع الزمني الدقيق (Timestamp Synchronization): وزّع الأسئلة بتدرج زمني منطقي متسلسل على طول مدة الفيديو بين الثانية ${Math.floor(startTrim + 10)} والثانية ${Math.floor(endTrim - 5)}. يجب أن يطرح كل سؤال في لحظة شرح المفهوم المتعلق به أو بعدها مباشرة.
3. نوع الأسئلة: استخدم حصراً القيم التالية لحقل "type": "mcq" (اختيار من متعدد بـ 4 خيارات دون كتابة كلمة صحيح داخل نص الخيار)، أو "true_false" (صواب وخطأ بخيارين ["صحيح", "خطأ"])، أو "open" (سؤال تفكير ناقد مفتوح).
4. التغذية الراجعة الفورية: لكل سؤال، قدّم شرحاً تعليمياً موجزاً ودقيقاً يوضح سبب الإجابة الصحيحة ويثري فهم الطالب بناءً على شرح الفيديو.
5. عمق المعرفة DOK: ${dokLevel} للمرحلة (${grade}).
6. يجب أن يكون الرد بهيئة JSON صحيحة 100% بالحقول التالية حصراً (لا تكتب "(صحيح)" داخل نصوص الخيارات أبداً):
{
  "summary": "ملخص تربوي مركز لأهم المفاهيم التي يغطيها الفيديو وأهدافه",
  "questions": [
    {
      "id": "q1",
      "timestamp": 45,
      "timeFormatted": "00:45",
      "type": "mcq",
      "question": "نص السؤال المرتبط بالدقيقة 00:45 من الفيديو بدقة...",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "correctAnswer": "الخيار الأول",
      "explanation": "تغذية راجعة تربوية فورية...",
      "dokLevel": "${dokLevel}"
    }
  ]
}`
        : `You are an expert pedagogical designer for interactive educational videos (like Edpuzzle and Wayground).
Your mission: Generate exactly (${count}) rigorous, timestamped interactive questions that strictly relate to the ACTUAL educational content of this specific video.

Content Grounding Rules:
1. Strict Relevance: Questions MUST directly assess the specific topic, concepts, experiments, definitions, and explanations presented in this video (${videoTitle}) for (${subject}) at (${grade}). Avoid vague or generic questions.
2. Synchronized Timestamps: Distribute timestamps chronologically and evenly between ${Math.floor(startTrim + 10)}s and ${Math.floor(endTrim - 5)}s. Each question must appear at the logical moment the topic is discussed.
3. Clear Options & Types: The "type" field MUST strictly be one of "mcq" (4 distinct options, never append "(correct)" to option text), "true_false" (options: ["True", "False"]), or "open" (critical thinking open-ended question). Include an insightful feedback explanation for every question.
4. Target DOK Level: ${dokLevel}.
5. Return strict valid JSON with format:
{
  "summary": "Educational summary of the video concepts",
  "questions": [
    {
      "id": "q1",
      "timestamp": 45,
      "timeFormatted": "00:45",
      "type": "mcq",
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "...",
      "dokLevel": "${dokLevel}"
    }
  ]
}`;

      let extraContentContext = '';
      if (videoContext && videoContext.trim()) {
        extraContentContext += isArabic
          ? `\nمعلومات وتفاصيل المحتوى المتاح عن الفيديو:\n${videoContext.trim()}\n`
          : `\nAvailable video details & context:\n${videoContext.trim()}\n`;
      }
      if (videoTranscript && videoTranscript.trim()) {
        extraContentContext += isArabic
          ? `\nالنص المفرغ أو المحاور الأساسية للشرح:\n${videoTranscript.trim().slice(0, 3000)}\n`
          : `\nVideo transcript or key discussion points:\n${videoTranscript.trim().slice(0, 3000)}\n`;
      }

      const userPrompt = isArabic
        ? `بيانات الفيديو التعليمي للتحليل وتوليد الأسئلة:
- عنوان الفيديو والموضوع: ${videoTitle}
- المادة والمرحلة: ${subject} - ${grade}
- الرابط أو المعرف: ${videoUrl}
- مدة العرض الفعالة: ${effectiveDuration} ثانية (النطاق: ${Math.floor(startTrim)} ثانية إلى ${Math.floor(endTrim)} ثانية)
- عدد الأسئلة المطلوبة: ${count}
- عمق المعرفة المطلوب: ${dokLevel}
${extraContentContext ? `${extraContentContext}` : ''}
${customPrompt ? `- توجيهات إضافية من المعلم: ${customPrompt}` : ''}

تنبيه إلزامي: احرص أن تكون كل الأسئلة متمحورة بدقة حول "${videoTitle}" والمفاهيم العلمية التخصصية المرتبطة بها في ${subject}. أخرج النتيجة بصيغة JSON فقط:`
        : `Educational Video Information for Quiz Generation:
- Video Title & Subject Topic: ${videoTitle}
- Subject & Grade: ${subject} - ${grade}
- Video URL / ID: ${videoUrl}
- Effective Video Duration: ${effectiveDuration}s (Trim range: ${Math.floor(startTrim)}s - ${Math.floor(endTrim)}s)
- Questions count: ${count}
- DOK Depth: ${dokLevel}
${extraContentContext ? `${extraContentContext}` : ''}
${customPrompt ? `- Teacher instructions: ${customPrompt}` : ''}

Mandatory: All questions must be strictly aligned with "${videoTitle}" and key concepts in ${subject}. Output valid JSON only:`;

      // 1. Primary Engine: Google Gemini Flash with native JSON mode & automatic fallback
      let lastVideoErr: any = null;
      try {
        const geminiRes = await callGemini(
          [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          { fast: true, responseMimeType: 'application/json' }
        );
        const text = geminiRes.text || '{}';
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const jsonToParse = jsonMatch ? jsonMatch[0] : cleaned;
        const parsed = JSON.parse(jsonToParse);
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
          throw new Error('AI returned empty questions array');
        }

        const stripHint = (val: any) =>
          String(val ?? '')
            .replace(/\s*\((?:صحيح|إجابة صحيحة|الإجابة الصحيحة|correct|correct answer)\)\s*/gi, '')
            .trim();

        const formatSec = (sec: number) => {
          const safe = Math.max(0, Math.floor(sec));
          const m = Math.floor(safe / 60);
          const s = safe % 60;
          return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        const minTs = Math.floor(Number(startTrim) || 0);
        const maxTs = Math.max(minTs + 5, Math.floor(Number(endTrim) || Number(duration) || 300));
        const tfDefaults = isArabic ? ['صحيح', 'خطأ'] : ['True', 'False'];

        const normalizedQuestions = parsed.questions.map((q: any, idx: number) => {
          const rawType = String(q?.type || 'mcq').toLowerCase().trim();
          const type: 'mcq' | 'true_false' | 'open' =
            rawType === 'true_false' || rawType === 'true/false' || rawType === 'tf' || rawType === 'boolean'
              ? 'true_false'
              : rawType === 'mcq' || rawType === 'multiple_choice'
                ? 'mcq'
                : 'open';

          const rawTs = Number(q?.timestamp);
          const fallbackTs = Math.floor(minTs + ((idx + 1) * (maxTs - minTs)) / (parsed.questions.length + 1));
          const timestamp = Number.isFinite(rawTs) ? Math.min(maxTs, Math.max(minTs, Math.floor(rawTs))) : fallbackTs;

          let options: string[] = Array.isArray(q?.options)
            ? q.options.map((opt: any) => stripHint(opt)).filter(Boolean)
            : [];
          let correctAnswer = stripHint(q?.correctAnswer ?? '');

          if (type === 'true_false') {
            if (options.length !== 2) {
              options = [...tfDefaults];
            }
            const lowerAns = correctAnswer.toLowerCase();
            if (lowerAns === 'true' || lowerAns === 'صحيح' || lowerAns === 'صواب' || lowerAns === 'صح') {
              correctAnswer = options[0];
            } else if (lowerAns === 'false' || lowerAns === 'خطأ') {
              correctAnswer = options[1];
            } else if (!options.includes(correctAnswer)) {
              correctAnswer = options[0];
            }
          } else if (type === 'mcq' && options.length > 0 && !options.includes(correctAnswer)) {
            const matched = options.find((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
            correctAnswer = matched || options[0];
          }

          return {
            id: String(q?.id || `q${idx + 1}`),
            timestamp,
            timeFormatted: formatSec(timestamp),
            type,
            question: String(q?.question || '').trim(),
            options,
            correctAnswer,
            explanation: String(q?.explanation || '').trim(),
            dokLevel: String(q?.dokLevel || dokLevel),
          };
        });

        return res.status(200).json({
          success: true,
          engine: geminiRes.engine || 'gemini',
          model: geminiRes.model,
          summary: String(parsed.summary || '').trim(),
          questions: normalizedQuestions,
        });
      } catch (geminiErr: any) {
        lastVideoErr = geminiErr;
        console.warn('[Interactive Video] Primary generation failed:', geminiErr?.message || geminiErr);
      }

      const { status, message } = formatApiError(lastVideoErr);
      return res.status(status).json({
        error: message || (isArabic ? 'تعذر توليد الأسئلة التفاعلية للفيديو.' : 'Failed to generate video questions.'),
        details: lastVideoErr?.attemptErrors?.join(' | ') || lastVideoErr?.message,
      });
    }

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

    // Prioritize ultra-fast gemini-3.1-flash-lite (MINIMAL thinking) with automatic fallback to gemini-4-hydrogen
    const geminiOpts = { fast: true };

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
      response = await callGemini(parts, geminiOpts);
    } else {
      response = await callGemini(prompt, geminiOpts);
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

    return res.status(200).json({
      contentHtml: fullHtml,
      html: fullHtml,
      title,
      qtiXml,
      engine: response.engine,
      model: response.model,
    });
  } catch (error: any) {
    console.error('executeGenerate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({
      error: message,
      details: error?.attemptErrors?.join(' | ') || error?.message,
    });
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
    const {
      subject,
      grade,
      assignmentTitle,
      maxScore,
      lang = 'ar',
      imageFile,
      customCriteriaText,
    } = body || {};
    const isAr = lang !== 'en';
    const total = Number(maxScore) || 20;

    let prompt = '';
    if (isAr) {
      prompt = `أَنْتَ كَبِيرُ خُبَرَاءِ الْقِيَاسِ وَالتَّقْوِيمِ التَّرْبَوِيِّ فِي أَعْرَقِ الْمُؤَسَّسَاتِ التَّعْلِيمِيَّةِ الدَّوْلِيَّةِ (أَكَادِيمِيَّةُ سَهْلَةَ & مَدَارِسُ الْفُرْقَانِ).
مَهَمَّتُكَ: صِيَاغَةُ "سُلَّمِ تَقْدِيرٍ لَفْظِيٍّ تَحْلِيلِيٍّ احْتِرَافِيٍّ (Analytic Grading Rubric)" مَبْنِيٍّ عَلَى مَعَايِيرِ الْجَوْدَةِ التَّعْلِيمِيَّةِ لِتَقْيِيمِ التَّكْلِيفِ التَّالِي:
- الْمَادَّةُ الدِّرَاسِيَّةُ: ${subject || 'اللُّغَةُ الْعَرَبِيَّةُ'}
- الصَّفُّ الدِّرَاسِيُّ: ${grade || 'مُتَوَسِّطٌ / ثَانَوِيٌّ'}
- مَوْضُوعُ التَّكْلِيفِ أَوِ السُّؤَالِ: ${assignmentTitle || 'تَكْلِيفٌ تَعْلِيمِيٌّ'}
- الدَّرَجَةُ الْكُلِّيَّةُ الْمُسْتَحَقَّةُ: ${total} دَرَجَةً.`;

      if (imageFile && imageFile.base64) {
        prompt += `\n\n📌 هَامٌّ جِدّاً: لَقَدْ رَفَعَ الْمُعَلِّمُ صُورَةَ وَرَقَةِ الْأَسْئِلَةِ / التَّكْلِيفِ الْمُرْفَقَةِ. قُمْ بِقِرَاءَةِ نَصِّ الْأَسْئِلَةِ وَالْمَطَالِبِ الْمَوْجُودَةِ عَلَى الْوَرَقَةِ الْمُرْفَقَةِ بِدِقَّةٍ، وَاسْتَنْبِطْ سُلَّمَ التَّقْدِيرِ لِيُعَبِّرَ تَمَاماً عَنْ أَسْئِلَةِ وَعَنَاصِرِ هَذِهِ الْوَرَقَةِ.`;
      }

      if (customCriteriaText && customCriteriaText.trim()) {
        prompt += `\n\n📌 مُعْطَيَاتُ وَمَعَايِيرُ الْمُعَلِّمِ الْخَاصَّةُ:\n"""\n${customCriteriaText.trim()}\n"""\nقُمْ بِصِيَاغَةِ وَتَنْظِيمِ هَذِهِ الْمَعَايِيرِ الَّتِي حَدَّدَهَا الْمُعَلِّمُ دَاخِلَ جَدْوَلِ سُلَّمِ التَّقْدِيرِ، مَعَ ضَبْطِ أَوْزَانِهَا لِتُطَابِقَ ${total} دَرَجَةً تَمَاماً، وَكِتَابَةِ مُؤَشِّرَاتِ أَدَاءِ لِكُلِّ مُسْتَوًى.`;
      }

      prompt += `\n\nالْمَعَايِيرُ التَّرْبَوِيَّةُ الْمُعْتَمَدَةُ (قَوَاعِدُ إِلْزَامِيَّةٌ 100%):
1. صِغْ 4 إِلَى 5 مَعَايِيرَ تَقْيِيمٍ نَوْعِيَّةٍ دَقِيقَةٍ تُلَائِمُ مَوْضُوعَ التَّكْلِيفِ وَالْمَادَّةَ وَالْوَرَقَةَ الْمُرْفَقَةَ.
2. تَحْدِيدُ الدَّرَجَةِ الْقُصْوَى لِكُلِّ مِعْيَارٍ بِحَيْثُ يَكُونُ مَجْمُوعُهَا مَسَاوِياً لِـ ${total} دَرَجَةً تَمَاماً بِلَا أَيِّ زِيَادَةٍ أَوْ نُقْصَانٍ.
3. صِيَاغَةُ 4 مُسْتَوَيَاتِ أَدَاءٍ لِكُلِّ مِعْيَارٍ:
   - مُتَمَيِّزٌ (100% من الدرجة): أداء إبداعي متقن خالٍ من الثغرات.
   - مُتَقَدِّمٌ (جيد جداً / 75-80%): أداء سليم مع ملاحظات ثانوية لا تؤثر على الجوهر.
   - مَقْبُولٌ (نامٍ / 50-60%): أداء حقق الحد الأدنى مع وجود أخطاء واضحة.
   - بِحَاجَةٍ لِدَعْمٍ (أقل من 50%): قصور وضعف ظاهر يتطلب برنامجاً علاجياً.
4. اكْتُبْ كُلَّ مِعْيَارٍ بِمُؤَشِّرَاتٍ إِجْرَائِيَّةٍ وَاقِعِيَّةٍ وَمَلْمُوسَةٍ لَا تَحْتَمِلُ اللَّبْسَ.
5. صِغِ الْجَدْوَلَ فِي هَيْكَلِ HTML رَسْمِيٍّ فَائِقِ الْأَنَاقَةِ (#1e3a8a، #0f172a، #f8fafc) دُونَ أَيِّ كُتَلِ مَارْكْدَاوْن (\`\`\` أَوْ ###). ابْدَأْ بِـ <table... فَوْراً.`;
    } else {
      prompt = `You are a master educational measurement and assessment specialist for Sahlah Academy and Al-Furqan School.
Generate a comprehensive Analytic Grading Rubric for:
- Subject: ${subject || 'General'}
- Grade: ${grade || 'Unspecified'}
- Assignment: ${assignmentTitle || 'Written Task'}
- Total Marks: ${total} points.`;

      if (imageFile && imageFile.base64) {
        prompt += `\n\nNote: The user uploaded the question paper image. Inspect the image content and tailor the rubric directly to the questions shown on paper.`;
      }
      if (customCriteriaText && customCriteriaText.trim()) {
        prompt += `\n\nTeacher Custom Criteria:\n"""\n${customCriteriaText.trim()}\n"""\nIncorporate these exact teacher criteria into the rubric table, calibrating weights to sum to ${total} points.`;
      }
      prompt += `\n\nRequirements:
1. 4-5 domain-specific criteria with exact point allocation summing exactly to ${total}.
2. 4 Performance levels (Exemplary, Proficient, Developing, Beginning) with clear behavioral descriptors.
3. Output clean, elegant HTML table directly without markdown fences.`;
    }

    let contents: any = prompt;
    if (imageFile && imageFile.base64) {
      const cleanBase64 = imageFile.base64.replace(/^data:image\/[a-z]+;base64,/, '');
      contents = [
        prompt,
        {
          inlineData: {
            mimeType: imageFile.mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
      ];
    }

    const response = await callGemini(contents, { fast: true });
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
      ? `أَنْتَ رَئِيسُ لِجَانِ التَّصْحِيحِ وَالْقِيَاسِ التَّرْبَوِيِّ فِي أَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدَارِسِ الْفُرْقَانِ.
أَمَامَكَ صُورَةٌ حَقِيقِيَّةٌ لِإِجَابَةِ طَالِبٍ مَكْتُوبَةٍ بِخَطِّ الْيَدِ.
بَيَانَاتُ التَّكْلِيفِ:
- الْمَادَّةُ: ${subject || 'اللغة العربية'}
- الصَّفُّ: ${grade || 'غير محدد'}
- عُنْوَانُ التَّكْلِيفِ: ${assignmentTitle || 'تعبير وكتابة مقال'}
- الدَّرَجَةُ الْقُصْوَى: ${maxScore} دَرَجَةً.
${rubricOrModelAnswer ? `\n📌 سُلَّمُ التَّقْدِيرِ وَالْمَعَايِيرُ الْمَرْجِعِيَّةُ الْمُلْزِمَةُ لِلتَّصْحِيحِ:\n${rubricOrModelAnswer}\nقَاعِدَةٌ صَارِمَةٌ: التَزِمْ التِزَاماً حَرْفِيّاً بِمَعَايِيرِ وَدَرَجَاتِ هَذَا السُّلَّمِ فِي رَصْدِ الدَّرَجَاتِ.\n` : ''}

الْمَطْلُوبُ إِخْرَاجُ "تَقْرِيرِ تَقْيِيمٍ وَتَصْحِيحٍ تَرْبَوِيٍّ رَسْمِيٍّ شَامِلٍ" بِكُودِ HTML نَظِيفٍ وَأَنِيقٍ (#1e3a8a، #0f172a، #10b981، #f8fafc) يَتَضَمَّنُ:
1. صُنْدُوقَ النَّتِيجَةِ الْعَامَّةِ: الدَّرَجَةُ الْمُسْتَحَقَّةُ مِن ${maxScore}، النِّسْبَةُ الْمِئَوِيَّةُ، وَالتَّقْدِيرُ اللَّفْظِيُّ (مُتَمَيِّزٌ / مُتَقَدِّمٌ / مَقْبُولٌ / بِحَاجَةٍ لِدَعْمٍ).
2. تَفْرِيغَ نَصِّ الطَّالِبِ الْمَكْتُوبِ بِخَطِّ الْيَدِ: اكْتُبْ مَا خَطَّهُ الطَّالِبُ نَصّاً كَمَا هُوَ دَاخِلَ صُنْدُوقٍ مُنَسَّقٍ.
3. جَدْوَلَ رَصْدِ دَرَجَاتِ سُلَّمِ التَّقْدِيرِ (Rubric Score Breakdown):
   - جَدْوَلٌ بِأَرْبَعَةِ أَعْمِدَةٍ: (الْمِعْيَارُ | الدَّرَجَةُ الْقُصْوَى | دَرَجَةُ الطَّالِبِ | التَّعْلِيلُ وَالشَّوَاهِدُ مِنَ الْوَرَقَةِ).
4. جَدْوَلَ رَصْدِ وَتَصْوِيبِ الْأَخْطَاءِ (نَحْوِيَّةٌ، إِمْلَائِيَّةٌ، تَعْبِيرِيَّةٌ):
   - أَعْمِدَةٌ: (الْخَطَأُ كَمَا كَتَبَهُ الطَّالِبُ | الصَّوَابُ النَّمُوذَجِيُّ | الْقَاعِدَةُ وَالتَّعْلِيلُ).
5. التَّغْذِيَةَ الرَّاجِعَةَ النَّوْعِيَّةَ:
   - ✨ أَبْرَزُ نِقَاطِ الْقُوَّةِ وَالتَّمَيُّزِ فِي إِجَابَةِ الطَّالِبِ.
   - 🎯 فُرَصُ التَّحْسِينِ وَخُطَّةُ التَّطْوِيرِ الْعِلَاجِيَّةِ لِلطَّالِبِ.

أَخْرِجْ كُودَ HTML فَقَطْ دُونَ أَيِّ كُتَلِ مَارْكْدَاوْن (\`\`\` أَوْ ###).`
      : `You are the lead educational grading expert for Sahlah Academy and Al-Furqan School.
Evaluate this student handwritten submission against the criteria:
- Subject: ${subject}
- Grade: ${grade}
- Assignment: ${assignmentTitle}
- Max Score: ${maxScore}
${rubricOrModelAnswer ? `- Reference Rubric:\n${rubricOrModelAnswer}` : ''}
Generate a comprehensive, formal grading report in clean HTML including:
1. Overall Score Box (${maxScore} max, percentage, and achievement level).
2. Complete verbatim transcription of student's handwriting.
3. Rubric Breakdown Table (Criterion, Max Score, Earned Score, Justification).
4. Error Analysis & Correction Table (Student Error, Correct Form, Rule).
5. Actionable Strengths and Next Steps.
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

/**
 * Execute PDF OCR / Arabic Page Extraction:
 * Extracts rich, formatted Arabic text with diacritics, tables, and paragraphs from a PDF page canvas snapshot.
 */
export async function executePdfOcr(req: any, res: any) {
  try {
    const body = req.body || {};
    const { imageBase64, pageNumber, targetAction = 'extract_arabic' } = body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'صورة الصفحة غير متوفرة' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `أنت خبير تربوي وتقني متخصص في رقمنة وفك تشفير المستندات المدرسية والكتب وكشوف الدرجات والتقارير ثنائية اللغة (العربية والإنجليزية).
أمامك صورة عالية الدقة لصفحة من مستند تعليمي أو كشف درجات أو كتاب مدرسي (صفحة رقم ${pageNumber || 1}).

المطلوب بدقة متناهية:
1. الجداول وكشوف الدرجات والتقييمات (Assessments & Grade Cards):
   - إذا كانت الصفحة تحتوي على جدول درجات أو تقييمات، ابنِ جدول HTML كامل وأنيق:
     <table border="1" style="width:100%; border-collapse:collapse; margin:14px 0;">
       <thead><tr style="background:#f1f5f9; font-weight:bold;">...</tr></thead>
       <tbody>...</tbody>
     </table>
   - رتّب الأعمدة بدقة طبقاً للمستند الأصلي (مثل: التقييم | وقت الاستحقاق | تم التصحيح | الدرجة | النسبة المئوية % | التقدير).
   - حافظ على كافة الصفوف والدرجات والتواريخ (مثل: Attendance T1، المشروع الأول، الاختبار الأول، الواجبات، النتيجة النهائية).

2. فك التشفير وعكس الحروف المشوهة (Disjointed/Reversed Arabic):
   - بعض برامج تصدير ملفات الـ PDF المدرسية تطبع الحروف العربية مقلوبة أو مقطعة ومتباعدة (مثل "ب ل ا ط ل ا" أو ":بلاطلا" أو "مسامييقتلا" أو "ع ر ض ل د ر ج ت ح س ب ا ل ف ئ").
   - حوّلها فوراً وبلا استثناء إلى لغة عربية فصحى سليمة 100% متصلة ومفهومة (مثل: "اسم الطالب"، "التقييمات"، "الدرجة"، "عرض الدرجات حسب الفئة").

3. النصوص المزدوجة (عربي + إنجليزي):
   - حافظ على الكلمات والأكواد الإنجليزية بدقة (مثل: Hassan, Ola، Grade 4 Arabic Native (US)، W6 T1، Attendance T1، Quizzes، إلخ) مع محاذاة النص والجدول بطريقة متناسقة للقراءة من اليمين لليسار (dir="rtl").

4. استخدم وسوم HTML قياسية جاهزة لمحرر Word (استخدم <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>).
5. ممنوع وضع أي مقدمات أو اعتذارات أو كتل ماركداون (\`\`\`html). ابدأ بكود الـ HTML النظيف فوراً.`;

    const contents: any[] = [
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      },
    ];

    const response = await callGemini(contents, { fast: true });
    let html = extractHtml(response.text || '');
    html = html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return res.status(200).json({
      success: true,
      html,
      rawText: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      pageNumber,
    });
  } catch (error: any) {
    console.error('executePdfOcr error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

/**
 * In-Slide Presentation Copilot Handler:
 * Transforms individual slide points (simplify, critical question, real-world example)
 * or generates differentiated slide variants (remedial scaffolding vs gifted enrichment).
 */
export async function executePresentationCopilot(req: any, res: any) {
  try {
    const { action, pointText, slide, variant, subject = 'عام', grade = '', lang = 'ar' } = req.body || {};
    const isAr = lang === 'ar';

    if (action === 'differentiated_slide') {
      const isRemedial = variant === 'remedial';
      const prompt = isRemedial
        ? `أنت خبير تربوي متخصص في تفريد التعليم وعلاج صعوبات التعلم.
المهمة: توليد شريحة بوربوينت علاجية/داعمة (Remedial Scaffolding Slide) تبسط المفهوم الوارد في الشريحة التالية للمتعثرين وصغار السن.
المادة: ${subject} | الصف: ${grade}
الشريحة الأصلية:
العنوان: ${slide?.title || ''}
النقاط: ${(slide?.points || []).join(' - ')}

الشروط:
1. صياغة 2 إلى 3 نقاط بصرية مباشرة شديدة الوضوح والتسلسل.
2. استخدام تمثيل مبسط أو تشبيه حسي قريب من ذهن الطالب.
3. سيناريو شرح للمعلم يتضمن خطوة تمهيدية داعمة.
4. إرجاع النتيجة بصيغة JSON حصراً بهذا الهيكل فقط بدون ماركداون:
{
  "title": "عنوان الشريحة العلاجية المبسطة",
  "category": "دعم وتعزيز المفاهيم",
  "layout": "split",
  "points": ["نقطة 1", "نقطة 2", "نقطة 3"],
  "teacherScript": "سيناريو توجيه المعلم للمتعثرين...",
  "discussionPrompt": "سؤال تأكيدي للتحقق من الفهم..."
}`
        : `أنت خبير تربوي متخصص في رعاية الموهوبين والتعليم المتمايز.
المهمة: توليد شريحة بوربوينت إثرائية متقدمة (Gifted & Talented Enrichment Slide) تعمق المفهوم بمستويات تفكير عليا (DOK 3 / DOK 4) للطلاب المتفوقين.
المادة: ${subject} | الصف: ${grade}
الشريحة الأصلية:
العنوان: ${slide?.title || ''}
النقاط: ${(slide?.points || []).join(' - ')}

الشروط:
1. صياغة 2 إلى 3 نقاط تمثل تحدياً استقصائياً، معضلة واقعية، أو تطبيقاً ابتكارياً مفتوح النهاية.
2. الربط بالسياق المعاصر أو التكنولوجيا الحديثة.
3. سيناريو شرح للمعلم لإدارة النقاش الفكري.
4. إرجاع النتيجة بصيغة JSON حصراً بهذا الهيكل فقط بدون ماركداون:
{
  "title": "عنوان الشريحة الإثرائية المتقدمة",
  "category": "إثراء وتحدي للموهوبين 🌟",
  "layout": "split",
  "points": ["تحدي استقصائي 1", "تطبيق تحليلي 2"],
  "teacherScript": "سيناريو المعلم لإدارة العصف الذهني...",
  "discussionPrompt": "سؤال تفكير ناقد مفتوح النهاية..."
}`;

      const aiResponse = await callGemini(prompt, { fast: true, model: 'gemini-4-hydrogen', responseMimeType: 'application/json' });
      const cleanJson = (aiResponse.text || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      let generatedSlideData: any;
      try {
        generatedSlideData = JSON.parse(cleanJson);
      } catch {
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) generatedSlideData = JSON.parse(jsonMatch[0]);
      }

      return res.status(200).json({
        success: true,
        slide: generatedSlideData || {
          title: isRemedial ? `تبسيط: ${slide?.title || ''}` : `إثراء وتحدي: ${slide?.title || ''}`,
          category: isRemedial ? 'دعم علاجي' : 'إثراء للموهوبين',
          layout: 'split',
          points: isRemedial ? ['فهم المفهوم خطوة بخطوة', 'مثال بصري مباشر'] : ['تحليل التأثير والأسباب', 'ابتكار حلول بديلة'],
          teacherScript: isRemedial ? 'وجه الطلاب لتأمل المثال الحسي.' : 'اطرح التحدي ودع الطلاب يناقشون في مجموعات.',
        },
      });
    }

    // Point-level transformation
    let prompt = '';
    if (action === 'simplify') {
      prompt = `أنت خبير تربوي. أعد صياغة النقطة التالية لتبسيطها تماماً للمتعثرين أو صغار السن، بلغة واضحة ومباشرة وموجزة جداً (جملة واحدة قوية)، دون أي مقدمات:
السياق: درس ${subject} - ${slide?.title || ''}
النقطة الأصلية: "${pointText}"
أرجع النص المعاد صياغته فقط في سطر واحد بدون علامات تنصيص.`;
    } else if (action === 'critical_question') {
      prompt = `أنت معلم خبير في استراتيجيات التفكير الناقد. حول النقطة التعليمية التالية إلى "سؤال تفكير ناقد واستقصاء صفي" (Higher Order Inquiry Question) يثير النقاش والعصف الذهني:
السياق: درس ${subject} - ${slide?.title || ''}
النقطة الأصلية: "${pointText}"
أرجع صيغة السؤال فقط في سطر واحد بدون مقدمات ولا علامات تنصيص.`;
    } else if (action === 'real_world_example') {
      prompt = `أنت معلم خبير. اربط النقطة التعليمية التالية بمثال تطبيقي واقعي معاصر من الحياة اليومية أو التكنولوجيا يلمسه الطالب:
السياق: درس ${subject} - ${slide?.title || ''}
النقطة الأصلية: "${pointText}"
أرجع النقطة مدمجة مع المثال الواقعي المختصر في سطر واحد دون مقدمات.`;
    } else {
      return res.status(400).json({ error: 'إجراء غير مدعوم' });
    }

    const aiResponse = await callGemini(prompt, { fast: true, model: 'gemini-4-hydrogen' });
    const transformedText = (aiResponse.text || '').replace(/^["'«»]|["'«»]$/g, '').trim();

    return res.status(200).json({
      success: true,
      transformedText: transformedText || pointText,
    });
  } catch (error: any) {
    console.error('executePresentationCopilot error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}


