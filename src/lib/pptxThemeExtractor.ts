import JSZip from 'jszip';
import type { GammaTheme } from './gammaPptx';

export interface ExtractedPptxTheme extends GammaTheme {
  fontFamily: string;
  latinFont?: string;
  logoBase64?: string;
  sourceFileName: string;
}

/**
 * Calculates relative luminance to check if a hex color is dark
 */
function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

/**
 * Normalizes a 6-character hex string
 */
function cleanHex(hex?: string | null, fallback = '0F172A'): string {
  if (!hex) return fallback;
  const cleaned = hex.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (cleaned.length === 6) return cleaned;
  if (cleaned.length === 8) return cleaned.substring(2); // ARGB -> RGB
  return fallback;
}

/**
 * Extracts design theme, colors, fonts, and school logo from an uploaded .pptx file.
 */
export async function extractThemeFromPptx(file: File): Promise<ExtractedPptxTheme> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // Default fallbacks in case file is minimal
  let bgHex = '0F172A';
  let cardBgHex = 'FFFFFF';
  let textHex = '0F172A';
  let subtextHex = '475569';
  let accentHex = '0284C7';
  let accentSecondaryHex = '0D9488';
  let borderHex = 'CBD5E1';
  let arabicFont = 'Cairo';
  let latinFont = 'Segoe UI';
  let logoBase64: string | undefined = undefined;

  // 1. Read Theme XML (ppt/theme/theme1.xml)
  const themeFile = zip.file(/ppt\/theme\/theme[0-9]*\.xml/i)[0];
  if (themeFile) {
    const themeXml = await themeFile.async('text');

    // Extract Color Scheme
    // Match accent1 through accent6
    const accent1Match = themeXml.match(/<a:accent1[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    const accent2Match = themeXml.match(/<a:accent2[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    const dk1Match = themeXml.match(/<a:dk1[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    const lt1Match = themeXml.match(/<a:lt1[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    const dk2Match = themeXml.match(/<a:dk2[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    const lt2Match = themeXml.match(/<a:lt2[^>]*>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);

    if (accent1Match?.[1]) accentHex = cleanHex(accent1Match[1]);
    if (accent2Match?.[1]) accentSecondaryHex = cleanHex(accent2Match[1]);

    const darkColor = dk1Match?.[1] ? cleanHex(dk1Match[1]) : (dk2Match?.[1] ? cleanHex(dk2Match[1]) : '0F172A');
    const lightColor = lt1Match?.[1] ? cleanHex(lt1Match[1]) : (lt2Match?.[1] ? cleanHex(lt2Match[1]) : 'FFFFFF');

    // Determine primary background
    bgHex = darkColor;
    textHex = darkColor;
    cardBgHex = lightColor;
    subtextHex = isColorDark(darkColor) ? '475569' : '94A3B8';
    borderHex = isColorDark(darkColor) ? 'CBD5E1' : '334155';

    // Extract Fonts (Complex Script / Arabic & Latin)
    // Looking for <a:font typeface="..."/> or <a:cs typeface="..."/>
    const csFontMatch = themeXml.match(/<a:cs typeface="([^"]+)"/i) || themeXml.match(/<a:font script="Arab" typeface="([^"]+)"/i);
    if (csFontMatch?.[1]) {
      arabicFont = csFontMatch[1].trim();
    }

    const latinFontMatch = themeXml.match(/<a:latin typeface="([^"]+)"/i);
    if (latinFontMatch?.[1]) {
      latinFont = latinFontMatch[1].trim();
    }
  }

  // 2. Check slide 1 for actual background fill if defined (ppt/slides/slide1.xml)
  const slide1File = zip.file(/ppt\/slides\/slide1\.xml/i)[0];
  if (slide1File) {
    const slide1Xml = await slide1File.async('text');
    const bgClrMatch = slide1Xml.match(/<p:bg>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/i);
    if (bgClrMatch?.[1]) {
      bgHex = cleanHex(bgClrMatch[1]);
    }
  }

  // 3. Extract school logo from ppt/media/ (look for png/jpeg files)
  const mediaFiles = zip.file(/ppt\/media\/image[0-9]*\.(png|jpeg|jpg)/i);
  if (mediaFiles && mediaFiles.length > 0) {
    // Pick the most likely logo image (usually smallest image or image1)
    const logoFile = mediaFiles[0];
    try {
      const base64Data = await logoFile.async('base64');
      const ext = logoFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      logoBase64 = `data:image/${ext};base64,${base64Data}`;
    } catch (err) {
      console.warn('Failed to extract logo from PPTX media:', err);
    }
  }

  const isDark = isColorDark(bgHex);
  const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 30);

  return {
    id: 'custom' as any,
    nameAr: `ثيم مقتبس: ${cleanName}`,
    nameEn: `Cloned: ${cleanName}`,
    bgHex,
    cardBgHex,
    textHex: isDark ? 'F8FAFC' : textHex,
    subtextHex,
    accentHex,
    accentSecondaryHex,
    borderHex,
    isDark,
    fontFamily: arabicFont || 'Cairo',
    latinFont,
    logoBase64,
    sourceFileName: file.name,
  };
}
