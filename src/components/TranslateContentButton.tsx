import { useState } from 'react';
import { Globe, Loader2, Check } from 'lucide-react';
import { translateGeneratedContent } from '@/lib/gemini';

export interface TranslateContentButtonProps {
  /**
   * Ref or getter function to extract current HTML from the editor
   */
  getHtmlContent: () => string;
  /**
   * Callback fired immediately when translation succeeds to update editor content & direction
   */
  onTranslationComplete: (translatedHtml: string, targetLang: 'ar' | 'en') => void;
  /**
   * Optional custom class names
   */
  className?: string;
  /**
   * UI language mode
   */
  uiLang?: 'ar' | 'en';
}

/**
 * Detects whether the primary human text in an HTML string is Arabic.
 * Strips HTML tags, styles, and entities first so only inner text is evaluated.
 */
export function detectIsContentArabic(html: string): boolean {
  if (!html) return true;
  // Strip tags and entities
  const textOnly = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .slice(0, 1000);

  // Match Arabic characters (Arabic, Arabic Supplement, Presentation Forms)
  const arabicMatches = textOnly.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  // Match Latin characters
  const latinMatches = textOnly.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  if (arabicCount === 0 && latinCount === 0) {
    return true; // Default fallback to Arabic
  }

  return arabicCount >= latinCount;
}

export default function TranslateContentButton({
  getHtmlContent,
  onTranslationComplete,
  className = '',
  uiLang = 'ar',
}: TranslateContentButtonProps) {
  const [translating, setTranslating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-detect current language of content
  const currentHtml = getHtmlContent();
  const isContentArabic = detectIsContentArabic(currentHtml);
  const targetLang: 'ar' | 'en' = isContentArabic ? 'en' : 'ar';

  async function handleTranslate() {
    if (translating) return;

    const rawHtml = getHtmlContent();
    if (!rawHtml || !rawHtml.trim()) {
      return;
    }

    setTranslating(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const translatedHtml = await translateGeneratedContent(rawHtml, targetLang);
      onTranslationComplete(translatedHtml, targetLang);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      console.error('Translation error:', err);
      const msg = err?.message || (uiLang === 'ar' ? 'فشلت الترجمة، يرجى المحاولة ثانية.' : 'Translation failed.');
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setTranslating(false);
    }
  }

  // Button label and styling
  const buttonLabel = isContentArabic ? '🌐 تحويل للإنجليزية' : '🌐 Translate to Arabic';
  const buttonTitle = isContentArabic
    ? 'ترجمة أكاديمية ذكية للمحتوى بالكامل إلى الإنجليزية مع حفظ الجداول والتنسيق'
    : 'Smart academic translation of all content into Arabic preserving tables and formatting';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleTranslate}
        disabled={translating}
        title={buttonTitle}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
          translating
            ? 'bg-blue-100 text-blue-400 cursor-not-allowed border border-blue-200'
            : success
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
            : isContentArabic
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border border-blue-500 shadow-blue-500/20 hover:shadow-md'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border border-teal-500 shadow-teal-500/20 hover:shadow-md'
        } ${className}`}
      >
        {translating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>{isContentArabic ? 'جارٍ التحويل للإنجليزية...' : 'Translating to Arabic...'}</span>
          </>
        ) : success ? (
          <>
            <Check className="w-4 h-4 text-white" />
            <span>{isContentArabic ? 'تمت الترجمة بنجاح!' : 'Translated!'}</span>
          </>
        ) : (
          <>
            <Globe className="w-4 h-4" />
            <span>{buttonLabel}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div
          dir="rtl"
          className="absolute top-full mt-1.5 z-50 whitespace-nowrap bg-rose-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg border border-rose-700 animate-fade-in"
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
