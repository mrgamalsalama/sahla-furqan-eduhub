import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GammaSlide } from './gammaPptx';

/**
 * Export all slides as crisp high-resolution PNG images packed inside a single ZIP file.
 * Perfect for sharing over WhatsApp, Telegram, Classera, or Madrasati.
 */
export async function exportSlidesToImageZip(
  slides: GammaSlide[],
  deckTitle: string = 'عرض_تقديمي',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('شرائح_العرض_التعليمي') || zip;

  // Find slide DOM elements rendered in the Presentation Studio preview
  const slideElements = document.querySelectorAll<HTMLElement>('[data-slide-card]');

  if (slideElements.length === 0) {
    throw new Error('لم يتم العثور على عناصر الشرائح في الصفحة لتصديرها.');
  }

  const total = slideElements.length;

  for (let i = 0; i < total; i++) {
    const el = slideElements[i];
    if (onProgress) onProgress(i + 1, total);

    // Render DOM node to high-res canvas (scale: 2 for Retina sharpness)
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const slideNum = String(i + 1).padStart(2, '0');
    const safeTitle = (slides[i]?.title || `شريحة_${slideNum}`).replace(/[\/\\?%*:|"<>]/g, '_').slice(0, 30);
    folder.file(`${slideNum}_${safeTitle}.png`, base64Data, { base64: true });
  }

  const cleanDeckTitle = (deckTitle || 'عرض_تقديمي').replace(/[\/\\?%*:|"<>]/g, '_').slice(0, 40);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `${cleanDeckTitle}_شرائح_الصور.zip`);
}
