import { useState, useRef } from 'react';
import {
  Sparkles, Loader2, AlertCircle, Sliders,
  Play, Download, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Edit3, Check, Palette, BookOpen, BookmarkPlus,
  Image as ImageIcon, Bold, Italic, AlignRight, AlignCenter,
  AlignLeft, Type, Layout, ShieldCheck, ChevronDown,
  Upload, Printer, FileArchive, Beaker, Video, HelpCircle,
  Wand2
} from 'lucide-react';
import { saveAs } from 'file-saver';
import type { LessonSettings, OutputType, GenerationResult, UploadedFile } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN } from '@/types';
import { getLessonSettings, saveLessonSettings, saveLesson } from '@/lib/storage';
import {
  generateContent,
  transformSlidePoint,
  generateDifferentiatedSlideVariant,
  type PointTransformAction
} from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';
import {
  GAMMA_THEMES,
  parseHtmlToGammaSlides,
  exportGammaSlidesToPptx
} from '@/lib/gammaPptx';
import type {
  GammaSlide,
  GammaThemeId,
  SimulationEmbed,
  VideoEmbed,
  FormativePoll
} from '@/lib/gammaPptx';
import { extractThemeFromPptx } from '@/lib/pptxThemeExtractor';
import type { ExtractedPptxTheme } from '@/lib/pptxThemeExtractor';
import { generateStudentHandoutPdf } from '@/lib/studentHandoutPdf';
import { exportSlidesToImageZip } from '@/lib/slideImageExporter';
import GammaPresenterModal from './GammaPresenterModal';
import ImagePickerModal from './ImagePickerModal';
import InteractiveEmbedModal from './InteractiveEmbedModal';
import InteractivePollCard from './InteractivePollCard';
import SourceMaterialUpload from './SourceMaterialUpload';
import AiLoadingDhikr from './AiLoadingDhikr';
import { saveCloudResource, getCurrentUser } from '@/lib/supabase';

interface PresentationStudioProps {
  onOpenResult?: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

const FONT_FAMILIES = [
  { id: 'Cairo', label: 'خط كايو (Cairo)' },
  { id: 'Amiri', label: 'خط أميري رصين (Amiri)' },
  { id: 'Tajawal', label: 'خط تجوال عصري (Tajawal)' },
  { id: 'Almarai', label: 'خط المراعي (Almarai)' },
  { id: 'Calibri', label: 'كاليبري القياسي (Calibri)' },
  { id: 'Arial', label: 'أريال التقليدي (Arial)' },
];

export default function PresentationStudio({ onOpenResult, uiLang }: PresentationStudioProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  // Settings
  const [settings, setSettings] = useState<LessonSettings>(() => {
    const saved = getLessonSettings();
    return {
      ...saved,
      lessonTitle: saved.lessonTitle || '',
      presentationSettings: saved.presentationSettings || {
        slideCount: 8,
        depthLevel: 'detailed',
        visualTheme: 'tech_blue',
      },
    };
  });

  const [selectedTheme, setSelectedTheme] = useState<GammaThemeId>('navy');
  const [customTheme, setCustomTheme] = useState<ExtractedPptxTheme | null>(null);
  const [cloningTheme, setCloningTheme] = useState(false);
  const [clonedSuccessNotice, setClonedSuccessNotice] = useState<string | null>(null);
  const pptxThemeInputRef = useRef<HTMLInputElement>(null);

  const [presentationTone, setPresentationTone] = useState<string>('interactive');

  // Generator states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gamma Outline Step
  const [isOutlineMode, setIsOutlineMode] = useState(false);
  const [outlineCards, setOutlineCards] = useState<Array<{ id: string; title: string; category: string }>>([]);

  // Generated Deck & Canvas
  const [slides, setSlides] = useState<GammaSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isDeckReady, setIsDeckReady] = useState(false);

  // In-place text editor
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editTeacherScript, setEditTeacherScript] = useState('');

  // Image Picker Modal
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [pickingImageSlideId, setPickingImageSlideId] = useState<string | null>(null);

  // Presenter Modal & Exports
  const [isPresenting, setIsPresenting] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Educational Extensions State
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embeddingSlideId, setEmbeddingSlideId] = useState<string | null>(null);

  // In-Slide AI Copilot State
  const [copilotLoadingPoint, setCopilotLoadingPoint] = useState<string | null>(null);
  const [activeCopilotMenuPoint, setActiveCopilotMenuPoint] = useState<string | null>(null);
  const [differentiatingSlideId, setDifferentiatingSlideId] = useState<string | null>(null);

  // Student Handout & Image Zip Export States
  const [exportingHandoutPdf, setExportingHandoutPdf] = useState(false);
  const [exportingImageZip, setExportingImageZip] = useState(false);
  const [imageZipProgress, setImageZipProgress] = useState<{ current: number; total: number } | null>(null);

  const themeConfig = (selectedTheme === 'custom' && customTheme)
    ? customTheme
    : (GAMMA_THEMES[selectedTheme] || GAMMA_THEMES.navy);

  const ps = settings.presentationSettings || {};
  const currentActiveSlide = slides[activeSlideIndex] || slides[0];

  // In-Slide AI Copilot Handlers
  async function handleTransformPoint(slideId: string, pointIndex: number, action: PointTransformAction) {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;
    const currentPointText = slide.points[pointIndex];
    if (!currentPointText) return;

    const pointKey = `${slideId}-${pointIndex}`;
    setCopilotLoadingPoint(pointKey);
    setActiveCopilotMenuPoint(null);
    setError(null);

    try {
      const transformed = await transformSlidePoint({
        action,
        pointText: currentPointText,
        slide: { title: slide.title, points: slide.points },
        subject: settings.subject,
        grade: settings.grade,
        lang: isAr ? 'ar' : 'en',
      });

      if (transformed && transformed.trim()) {
        updateSlidePoint(slideId, pointIndex, transformed.trim());
      }
    } catch (err: any) {
      console.error('Point transformation failed:', err);
      setError(isAr ? 'تعذر تكييف النقطة بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.' : 'Failed to transform point.');
    } finally {
      setCopilotLoadingPoint(null);
    }
  }

  async function handleGenerateDifferentiatedSlide(slideId: string, variant: 'remedial' | 'enrichment') {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;

    setDifferentiatingSlideId(slideId);
    setError(null);

    try {
      const generated = await generateDifferentiatedSlideVariant({
        slide: { title: slide.title, points: slide.points, category: slide.category },
        variant,
        subject: settings.subject,
        grade: settings.grade,
        lang: isAr ? 'ar' : 'en',
      });

      if (generated) {
        const newSlide: GammaSlide = {
          id: `diff-${Date.now()}`,
          index: slide.index + 1,
          title: generated.title || (variant === 'remedial' ? `تبسيط ودعم: ${slide.title}` : `إثراء وتحدي: ${slide.title}`),
          category: generated.category || (variant === 'remedial' ? 'دعم علاجي' : 'إثراء للموهوبين 🌟'),
          layout: generated.layout || 'split',
          contentHtml: '',
          points: generated.points || (variant === 'remedial' ? ['تبسيط خطوة بخطوة', 'مثال بصري مباشر'] : ['تحدي استقصائي', 'تطبيق متقدم']),
          teacherScript: generated.teacherScript || '',
          discussionPrompt: generated.discussionPrompt || '',
          differentiationType: variant,
          fontFamily: slide.fontFamily || 'Cairo',
          fontSize: slide.fontSize || 16,
          align: 'right',
        };

        // Insert right after current slide
        const currentIndex = slides.findIndex((s) => s.id === slideId);
        const nextIndex = currentIndex !== -1 ? currentIndex + 1 : slides.length;
        setSlides((prev) => {
          const updated = [...prev];
          updated.splice(nextIndex, 0, newSlide);
          return updated.map((s, idx) => ({ ...s, index: idx + 1 }));
        });
        setActiveSlideIndex(nextIndex);
      }
    } catch (err: any) {
      console.error('Differentiated slide generation failed:', err);
      setError(isAr ? 'تعذر توليد شريحة التمايز، يرجى المحاولة بعد قليل.' : 'Failed to generate differentiated slide.');
    } finally {
      setDifferentiatingSlideId(null);
    }
  }

  // Media Embed Handlers
  function handleOpenEmbedModal(slideId?: string) {
    const targetId = slideId || currentActiveSlide?.id;
    if (!targetId) return;
    setEmbeddingSlideId(targetId);
    setIsEmbedModalOpen(true);
  }

  function handleAttachSimulation(sim: SimulationEmbed) {
    if (!embeddingSlideId) return;
    setSlides((prev) =>
      prev.map((s) => (s.id === embeddingSlideId ? { ...s, simulationEmbed: sim } : s))
    );
  }

  function handleAttachVideo(video: VideoEmbed) {
    if (!embeddingSlideId) return;
    setSlides((prev) =>
      prev.map((s) => (s.id === embeddingSlideId ? { ...s, videoEmbed: video } : s))
    );
  }

  function handleRemoveSimulation(slideId: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, simulationEmbed: undefined } : s))
    );
  }

  function handleRemoveVideo(slideId: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, videoEmbed: undefined } : s))
    );
  }

  // Formative Poll Handlers
  function handleTogglePoll(slideId: string) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        if (s.interactivePoll) {
          return { ...s, interactivePoll: undefined };
        }
        return {
          ...s,
          interactivePoll: {
            question: `سؤال تفاعلي للتحقق من فهم (${s.title}): ما النتيجة المترتبة على ذلك؟`,
            options: [
              'الخيار الأول: يمثل التطبيق المباشر للمفهوم',
              'الخيار الثاني: فرضية بديلة تحتاج إلى تدقيق',
              'الخيار الثالث: استنتاج معاكس للظاهرة',
              'الخيار الرابع: تعميم غير دقيق'
            ],
            correctIndex: 0,
            explanation: 'الخيار (أ) هو الصحيح لأنه يتوافق تماماً مع القاعدة العلمية والشرح المقدم في الدرس.',
            revealed: false,
          },
        };
      })
    );
  }

  function updateSlidePoll(slideId: string, poll: FormativePoll) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, interactivePoll: poll } : s))
    );
  }

  // Student Handout PDF Export
  async function handleExportStudentHandoutPdf() {
    if (slides.length === 0) return;
    setExportingHandoutPdf(true);
    setError(null);
    try {
      const blob = await generateStudentHandoutPdf(slides, {
        lessonTitle: settings.lessonTitle || 'مذكرة_الدرس',
        subject: settings.subject || 'العلوم',
        grade: settings.grade || 'المرحلة',
        institution: settings.institution,
        teacherName: settings.teacherName,
      });
      const cleanTitle = (settings.lessonTitle || 'درس').replace(/[\/\\?%*:|"<>]/g, '_');
      saveAs(blob, `${cleanTitle}_مذكرة_الطالب_Cornell.pdf`);
    } catch (err: any) {
      console.error('Handout export error:', err);
      setError(isAr ? 'تعذر تصدير مذكرة الطالب PDF.' : 'Failed to export handout PDF.');
    } finally {
      setExportingHandoutPdf(false);
    }
  }

  // High-Res Images ZIP Export
  async function handleExportImageZip() {
    if (slides.length === 0) return;
    setExportingImageZip(true);
    setImageZipProgress({ current: 1, total: slides.length });
    setError(null);
    try {
      await exportSlidesToImageZip(
        slides,
        settings.lessonTitle || 'عرض_تقديمي',
        (current, total) => setImageZipProgress({ current, total })
      );
    } catch (err: any) {
      console.error('Image zip export error:', err);
      setError(isAr ? 'تعذر تصدير صور الشرائح، تأكد من وضوح شاشة العرض.' : 'Failed to export slide images.');
    } finally {
      setExportingImageZip(false);
      setImageZipProgress(null);
    }
  }

  // Handle PPTX theme upload & extraction
  async function handlePptxThemeUpload(uploadedFiles: FileList | null) {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const file = uploadedFiles[0];
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      setError(isAr ? 'يرجى اختيار ملف بوربوينت صالح بصيغة .pptx' : 'Please select a valid .pptx file');
      return;
    }

    setCloningTheme(true);
    setError(null);
    try {
      const extracted = await extractThemeFromPptx(file);
      setCustomTheme(extracted);
      setSelectedTheme('custom');
      setClonedSuccessNotice(
        isAr
          ? `تم استنساخ ثيم (${file.name}) بنجاح! الألوان والخطوط والشعار مفعّلة الآن للعرض بالكامل.`
          : `Cloned theme from (${file.name}) successfully!`
      );
      setTimeout(() => setClonedSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('PPTX theme extraction error:', err);
      setError(isAr ? 'تعذر استخراج الثيم من ملف البوربوينت. تأكد أنه ملف غير تالف.' : 'Failed to clone PPTX theme');
    } finally {
      setCloningTheme(false);
    }
  }

  // Live in-place WYSIWYG editing handlers
  function updateSlideTitle(slideId: string, newTitle: string) {
    if (!newTitle.trim()) return;
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, title: newTitle.trim() } : s))
    );
  }

  function updateSlidePoint(slideId: string, pointIndex: number, newText: string) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        const newPoints = [...s.points];
        if (newText.trim().length === 0) {
          newPoints.splice(pointIndex, 1);
        } else {
          newPoints[pointIndex] = newText.trim();
        }
        return { ...s, points: newPoints };
      })
    );
  }

  function addSlidePoint(slideId: string) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return { ...s, points: [...s.points, 'نقطة تعليمية جديدة (انقر للتعديل المباشر)'] };
      })
    );
  }

  function deleteSlidePoint(slideId: string, pointIndex: number) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        const newPoints = [...s.points];
        newPoints.splice(pointIndex, 1);
        return { ...s, points: newPoints };
      })
    );
  }

  function updateSlideNotes(slideId: string, newNotes: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, teacherScript: newNotes.trim() } : s))
    );
  }

  // 1. Generate Outline (Gamma-style Step 1)
  function handleGenerateOutline() {
    if (!settings.subject || !settings.grade || !settings.lessonTitle.trim()) {
      setError(isAr ? 'يرجى إدخال المادة والصف وعنوان العرض أولاً لتوليد المخطط.' : 'Please enter subject, grade, and presentation title.');
      return;
    }
    setError(null);

    const count = ps.slideCount || 8;
    const baseTitle = settings.lessonTitle.trim();

    const generatedOutline = [
      { id: '1', title: `${baseTitle}: التهيئة والأهداف النواتج`, category: 'الافتتاحية' },
      { id: '2', title: `المفاهيم التأسيسية والقواعد الجوهرية`, category: 'البناء المعرفي' },
      { id: '3', title: `أمثلة تطبيقية ونماذج واقعية`, category: 'التحليل والتطبيق' },
      { id: '4', title: `مقارنة وفحص الحالات الشائعة`, category: 'الربط والمقارنة' },
      { id: '5', title: `نشاط صفي وتحدي تفكير ناقد`, category: 'التطبيق التفاعلي' },
      { id: '6', title: `سؤال تفاعلي واستطلاع فهم الطلاب`, category: 'التقويم التكويني' },
      { id: '7', title: `الخلاصة وأهم التوصيات الذهبية`, category: 'التلخيص' },
      { id: '8', title: `التكليف الإثرائي ومهمة البحث المنزلي`, category: 'الخاتمة' },
    ].slice(0, count);

    setOutlineCards(generatedOutline);
    setIsOutlineMode(true);
  }

  // 2. Full Deck Generation (with Topic-Matched Safe Islamic/Educational Images)
  async function handleGenerateFullDeck() {
    if (!settings.subject || !settings.grade) {
      setError(isAr ? 'يرجى تحديد المادة والصف الدراسي.' : 'Please select subject and grade.');
      return;
    }
    setError(null);
    setLoading(true);

    const finalSettings: LessonSettings = {
      ...settings,
      contentLanguage: uiLang,
      presentationSettings: {
        ...ps,
        slideCount: outlineCards.length > 0 ? outlineCards.length : (ps.slideCount || 8),
      },
    };
    saveLessonSettings(finalSettings);

    try {
      const result = await generateContent(finalSettings, 'slides', files);
      const rawHtml = result.contentHtml || (result as unknown as { htmlContent?: string }).htmlContent || '';
      let parsed = parseHtmlToGammaSlides(
        rawHtml,
        settings.subject,
        settings.lessonTitle
      );
      if (parsed.length === 0) {
        parsed = [
          {
            id: 'slide_1',
            index: 1,
            title: settings.lessonTitle || 'العرض التقديمي التفاعلي',
            category: 'الافتتاحية والأهداف',
            layout: 'hero',
            contentHtml: rawHtml,
            points: ['الأهداف التعليمية العامة والخاصة', 'المفاهيم المحورية للدرس', 'أنشطة وتطبيقات صفية'],
            teacherScript: 'نبدأ بالتهيئة الحافزة وعرض نواتج التعلم المتوقعة.',
            fontFamily: 'Cairo',
            align: 'right',
          },
        ];
      }
      setSlides(parsed);
      setActiveSlideIndex(0);
      setIsDeckReady(true);
      setIsOutlineMode(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || (isAr ? 'حدث خطأ أثناء توليد شرائح Gamma.' : 'Failed to generate Gamma deck.'));
    } finally {
      setLoading(false);
    }
  }

  // Edit in place
  function startEditSlide(slide: GammaSlide) {
    setEditingSlideId(slide.id);
    setEditTitle(slide.title);
    setEditPoints(slide.points.join('\n'));
    setEditTeacherScript(slide.teacherScript || '');
  }

  function saveEditedSlide(slideId: string) {
    const lines = editPoints.split('\n').map((l) => l.trim()).filter(Boolean);
    setSlides((prev) =>
      prev.map((s) =>
        s.id === slideId
          ? {
              ...s,
              title: editTitle.trim() || s.title,
              points: lines.length > 0 ? lines : s.points,
              teacherScript: editTeacherScript.trim(),
            }
          : s
      )
    );
    setEditingSlideId(null);
  }

  // PowerPoint Ribbon Tools on Active Slide
  function updateActiveSlide(updates: Partial<GammaSlide>) {
    if (!currentActiveSlide) return;
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, ...updates } : s))
    );
  }

  // Open Image Picker
  function handleOpenImagePicker(slideId: string) {
    setPickingImageSlideId(slideId);
    setIsImagePickerOpen(true);
  }

  function handleSelectImage(url: string, caption?: string) {
    if (!pickingImageSlideId) return;
    setSlides((prev) =>
      prev.map((s) =>
        s.id === pickingImageSlideId
          ? { ...s, imageUrl: url || undefined, imageCaption: caption || undefined }
          : s
      )
    );
  }

  // Card order operations
  function moveSlide(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((s, idx) => ({ ...s, index: idx + 1 }));
    });
    setActiveSlideIndex(targetIdx);
  }

  function duplicateSlide(index: number) {
    const current = slides[index];
    const newSlide: GammaSlide = {
      ...current,
      id: `slide_${Date.now()}`,
      title: `${current.title} (نسخة)`,
      index: index + 2,
    };
    setSlides((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newSlide);
      return copy.map((s, idx) => ({ ...s, index: idx + 1 }));
    });
  }

  function deleteSlide(index: number) {
    if (slides.length <= 1) return;
    setSlides((prev) =>
      prev.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, index: idx + 1 }))
    );
    setActiveSlideIndex((prev) => Math.max(0, Math.min(prev, slides.length - 2)));
  }

  function addNewSlide() {
    const newSlide: GammaSlide = {
      id: `slide_${Date.now()}`,
      index: slides.length + 1,
      title: 'شريحة جديدة: مفهوم أو نشاط صفي',
      category: 'محتوى إضافي',
      layout: 'split',
      contentHtml: '',
      points: ['الهدف التعليمي الأساسي', 'تطبيق صفي ونموذج توضيحي'],
      teacherScript: 'توجيهات المعلم للشرح والمناقشة الصفية.',
      fontFamily: 'Cairo',
      align: 'right',
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  }

  // Direct PPTX export
  async function handleExportPptx() {
    if (slides.length === 0) {
      setError(isAr ? 'لا توجد شرائح حالياً لتصديرها. يرجى توليد العرض أولاً أو إضافة شرائح.' : 'No slides available to export. Please generate presentation first.');
      return;
    }
    setError(null);
    setExportingPptx(true);
    try {
      const schoolName = settings.institution === 'furqan'
        ? 'مدارس الفرقان العالمية'
        : 'أكاديمية سهلة الدولية';
      await exportGammaSlidesToPptx(
        slides,
        selectedTheme,
        settings.lessonTitle || 'عرض_تقديمي_Gamma',
        schoolName,
        customTheme || undefined
      );
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PPTX export error:', err);
      setError(isAr ? `حدث خطأ أثناء تنزيل ملف PowerPoint: ${msg}` : `Failed to export PowerPoint: ${msg}`);
    } finally {
      setExportingPptx(false);
    }
  }

  // Save to Library & Supabase
  async function handleSaveToLibrary() {
    const fullHtml = slides.map((s) => `
      <div class="slide" data-slide-index="${s.index}" data-layout="${s.layout}" style="border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:24px; background:#ffffff;">
        <h2>${s.title}</h2>
        ${s.imageUrl ? `<img src="${s.imageUrl}" alt="${s.title}" style="max-height:220px; border-radius:12px; margin-bottom:12px;" />` : ''}
        <ul>${s.points.map((p) => `<li>${p}</li>`).join('')}</ul>
        ${s.teacherScript ? `<div class="teacher-notes">${s.teacherScript}</div>` : ''}
      </div>
    `).join('');

    const savedLesson = {
      id: `gamma_${Date.now()}`,
      title: settings.lessonTitle || 'عرض تقديمي Gamma',
      outputType: 'slides' as OutputType,
      settings: settings,
      contentHtml: fullHtml,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: false,
    };

    saveLesson(savedLesson);

    const user = await getCurrentUser();
    if (user) {
      await saveCloudResource(savedLesson, user, false);
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in" dir="rtl">
      {/* Gamma Header Banner */}
      <div className="relative mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border border-indigo-900/40 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              إنشاء عروض بوربوينت متكاملة
            </h1>
          </div>

          {/* Quick Actions if deck ready */}
          {isDeckReady && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPresenting(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>بدء العرض (Present)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPptx}
                disabled={exportingPptx}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-950 text-xs sm:text-sm font-extrabold shadow-md transition disabled:opacity-50 ${
                  exportSuccess
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {exportingPptx ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ تجهيز وتنزيل الملف...</span>
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تم التنزيل بنجاح! ✓</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تنزيل بوربوينت (.pptx)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-800 font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 🌿 دعاء بداية التحضير وتجديد النية */}
      {!isDeckReady && (
        <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 text-emerald-900 text-xs sm:text-sm font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base font-serif">﷽</span>
            <span>
              {isAr
                ? 'بسم الله نبدأ.. اللهم لا سهل إلا ما جعلته سهلاً، وأنت تجعل الحزن إذا شئت سهلاً.'
                : 'In the name of Allah.. O Allah, there is no ease except that which You make easy.'}
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
            {isAr ? 'نحتسب نشر العلم النافع 🌱' : 'Dedicated to beneficial knowledge'}
          </span>
        </div>
      )}

      {/* VIEW 1: CREATION WIZARD */}
      {!isDeckReady && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>بيانات العرض التقديمي والصور التعليمية الآمنة</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              اختر المادة والموضوع لتوليد هيكل الشرائح وإرفاق الصور المتوافقة مع الشريعة الإسلامية تلقائياً من الإنترنت مجاناً.
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المادة الدراسية:
              </label>
              <select
                value={settings.subject}
                onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              >
                <option value="">-- اختر المادة الدراسية --</option>
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                    {isAr ? sub.ar : sub.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الصف الدراسي:
              </label>
              <select
                value={settings.grade}
                onChange={(e) => setSettings({ ...settings, grade: e.target.value })}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              >
                <option value="">-- اختر الصف الدراسي --</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عنوان وموضوع العرض التقديمي:
              </label>
              <input
                type="text"
                value={settings.lessonTitle}
                onChange={(e) => setSettings({ ...settings, lessonTitle: e.target.value })}
                placeholder="مثال: مدخل إلى الفضاء وعلم الفلك، أو كان وأخواتها"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Cards Count & Themes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                عدد بطاقات العرض (Slide Cards):
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[6, 8, 10, 12, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        presentationSettings: { ...ps, slideCount: cnt },
                      })
                    }
                    className={`py-2 text-center rounded-xl border text-xs font-bold transition-all ${
                      (ps.slideCount || 8) === cnt
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    {cnt} بطاقات
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                طابع الألوان المفضل (Gamma Theme):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(GAMMA_THEMES) as GammaThemeId[]).map((tid) => {
                  const th = GAMMA_THEMES[tid];
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => setSelectedTheme(tid)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        selectedTheme === tid
                          ? 'border-indigo-600 ring-2 ring-indigo-500 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: `#${th.bgHex}` }}
                      />
                      <span className="text-[10px] font-bold text-slate-700 truncate w-full">
                        {th.nameEn.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}

                {/* Cloned Custom Theme Swatch */}
                {customTheme && (
                  <button
                    type="button"
                    onClick={() => setSelectedTheme('custom')}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      selectedTheme === 'custom'
                        ? 'border-teal-500 ring-2 ring-teal-400 bg-teal-50/50 shadow-xs'
                        : 'border-dashed border-teal-300 hover:border-teal-400 bg-teal-50/20'
                    }`}
                    title={customTheme.nameAr}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-black/20 shadow-2xs flex items-center justify-center text-[8px]"
                      style={{ backgroundColor: `#${customTheme.bgHex}` }}
                    >
                      ✨
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 truncate w-full">
                      ثيمي المستنسخ
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PPTX Theme Cloner Card */}
          <div className="pt-2">
            <input
              ref={pptxThemeInputRef}
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(e) => handlePptxThemeUpload(e.target.files)}
            />

            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-teal-50 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {isAr ? 'استنساخ تصميم وثيم من ملف PowerPoint خاص بك (.pptx)' : 'Clone theme from your PPTX file'}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold">
                      {isAr ? 'ميزة حصرية' : 'Exclusive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {isAr
                      ? 'ارفع أي ملف بوربوينت قديم عندك له تصميم أو ألوان أو شعار خاص بمدرستك؛ سيقوم النظام بقراءة الخطوط والألوان وشعار المدرسة وتطبيقها على العرض الجديد كلياً!'
                      : 'Upload an existing PPTX file to extract its colors, fonts, and school logo for your new presentation.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {customTheme ? (
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-emerald-800 block">
                        ✓ تم استخراج الثيم:
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px] block" title={customTheme.sourceFileName}>
                        {customTheme.sourceFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => pptxThemeInputRef.current?.click()}
                      disabled={cloningTheme}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-900 text-xs font-bold border border-indigo-200 transition shadow-2xs"
                    >
                      {isAr ? 'تغيير الملف' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={cloningTheme}
                    onClick={() => pptxThemeInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {cloningTheme ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                        <span>{isAr ? 'جاري فحص واستخراج الثيم...' : 'Extracting...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-teal-300" />
                        <span>{isAr ? 'رفع ملف PPTX لاستنساخ ثيمه' : 'Upload PPTX Theme'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {clonedSuccessNotice && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{clonedSuccessNotice}</span>
              </div>
            )}
          </div>

          {/* Source Material Upload & Teacher Instructions */}
          <div className="pt-2 border-t border-slate-100">
            <SourceMaterialUpload
              files={files}
              onFilesChange={setFiles}
              teacherPrompt={settings.teacherPrompt || ''}
              onTeacherPromptChange={(prompt) => setSettings({ ...settings, teacherPrompt: prompt })}
              uiLang={uiLang}
            />
          </div>

          {/* Sharia compliance assurance banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              نظام الصور الآمن: يتم انتقاء الصور مباشرة من مكتبات الإنترنت التعليمية المجانية (طبيعة، علوم، مخطوطات، عمارة وهندسة) دون توليد صور AI لحفظ الرصيد وضمان مطابقة الشريعة بنسبة 100%.
            </span>
          </div>

          {/* Outline Preview */}
          {isOutlineMode && (
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>مخطط بطاقات العرض المقترحة (تعديل مباشر):</span>
                </span>
                <span className="text-[11px] text-indigo-700 font-semibold">
                  {outlineCards.length} بطاقات
                </span>
              </div>

              <div className="space-y-2">
                {outlineCards.map((card, idx) => (
                  <div key={card.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOutlineCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, title: val } : c))
                        );
                      }}
                      className="flex-1 text-xs font-semibold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold shrink-0">
                      {card.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOutlineCards((prev) => prev.filter((c) => c.id !== card.id))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setOutlineCards((prev) => [
                    ...prev,
                    { id: `${Date.now()}`, title: 'بطاقة محتوى إضافية', category: 'تطبيق' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بطاقة إلى المخطط</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            {!isOutlineMode ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerateOutline}
                  className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>🪄 بناء وتخصيص المخطط أولاً</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateFullDeck}
                  className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد شرائح Gamma وإرفاق الصور التعليمية...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-300" />
                      <span>🚀 توليد العرض بالكامل مع الصور فوراً</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateFullDeck}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري توليد الشرائح بناءً على المخطط المحدد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    <span>🚀 إنشاء شرائح Gamma التفاعلية الآن ({outlineCards.length} بطاقات)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL MICROSOFT POWERPOINT EDITING CANVAS */}
      {isDeckReady && (
        <div className="space-y-5">
          {/* POWERPOINT RIBBON TOOLBAR (شريط أدوات مايكروسوفت بوربوينت الكامل) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-4 space-y-3">
            {/* Top Toolbar Level: Action Commands */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span>ثيم العرض:</span>
                </span>
                <div className="flex items-center gap-1">
                  {(Object.keys(GAMMA_THEMES) as GammaThemeId[]).map((tid) => {
                    const th = GAMMA_THEMES[tid];
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setSelectedTheme(tid)}
                        title={th.nameAr}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          selectedTheme === tid
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: `#${th.bgHex}` }}
                        />
                        <span>{th.nameEn.split(' ')[0]}</span>
                      </button>
                    );
                  })}

                  {customTheme && (
                    <button
                      type="button"
                      onClick={() => setSelectedTheme('custom')}
                      title={customTheme.nameAr}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        selectedTheme === 'custom'
                          ? 'bg-slate-900 text-white shadow-xs ring-1 ring-teal-400'
                          : 'bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: `#${customTheme.bgHex}` }}
                      />
                      <span>✨ ثيمي المستنسخ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => pptxThemeInputRef.current?.click()}
                    disabled={cloningTheme}
                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold transition flex items-center gap-1 border border-indigo-200"
                    title="استنساخ ثيم من ملف بوربوينت آخر"
                  >
                    <Upload className="w-3 h-3 text-indigo-600" />
                    <span>{cloningTheme ? 'جاري الفحص...' : 'استنساخ ثيم PPTX'}</span>
                  </button>
                </div>
              </div>

              {/* Action & Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addNewSlide}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>شريحة جديدة</span>
                </button>

                {/* Printable Student Handout PDF */}
                <button
                  type="button"
                  onClick={handleExportStudentHandoutPdf}
                  disabled={exportingHandoutPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                  title="تصدير مذكرة الطالب المطبوعة (Cornell Notes Handout)"
                >
                  {exportingHandoutPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Printer className="w-4 h-4 text-indigo-700" />
                  )}
                  <span>مذكرة الطالب (PDF)</span>
                </button>

                {/* High-Res Images ZIP Export */}
                <button
                  type="button"
                  onClick={handleExportImageZip}
                  disabled={exportingImageZip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition disabled:opacity-50"
                  title="تصدير الشرائح كصور جاهزة للواتساب ومدرستي وكلاسيرا"
                >
                  {exportingImageZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span>
                        {imageZipProgress ? `تحويل (${imageZipProgress.current}/${imageZipProgress.total})...` : 'تجهيز الصور...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileArchive className="w-4 h-4 text-emerald-700" />
                      <span>صور (ZIP للواتساب)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  <BookmarkPlus className="w-4 h-4 text-blue-700" />
                  <span>{savedFeedback ? 'تم الحفظ ✅' : 'حفظ في مكتبتي'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={exportingPptx}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-950 text-xs font-extrabold shadow-sm transition disabled:opacity-50 ${
                    exportSuccess
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950'
                      : 'bg-amber-500 hover:bg-amber-400'
                  }`}
                >
                  {exportingPptx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التنزيل...</span>
                    </>
                  ) : exportSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم التنزيل بنجاح! ✓</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>تنزيل بوربوينت (.pptx)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPresenting(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-md transition"
                >
                  <Play className="w-4 h-4 fill-current text-teal-400" />
                  <span>عرض الشرائح (Present)</span>
                </button>
              </div>
            </div>

            {/* Microsoft PowerPoint Tools Ribbon (Formatting active slide) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                أدوات التنسيق (الشريحة {activeSlideIndex + 1}):
              </span>

              {/* Font Family */}
              <div className="flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={currentActiveSlide?.fontFamily || 'Cairo'}
                  onChange={(e) => updateActiveSlide({ fontFamily: e.target.value })}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <select
                value={currentActiveSlide?.fontSize || 16}
                onChange={(e) => updateActiveSlide({ fontSize: Number(e.target.value) })}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
              >
                {[14, 16, 18, 20, 24, 28, 32].map((sz) => (
                  <option key={sz} value={sz}>{sz} pt</option>
                ))}
              </select>

              {/* Bold & Italic */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ isBold: !currentActiveSlide?.isBold })}
                  className={`p-1.5 rounded-md font-bold transition ${
                    currentActiveSlide?.isBold ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عريض (Bold)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ isItalic: !currentActiveSlide?.isItalic })}
                  className={`p-1.5 rounded-md font-bold transition ${
                    currentActiveSlide?.isItalic ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="مائل (Italic)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ align: 'right' })}
                  className={`p-1.5 rounded-md transition ${
                    (currentActiveSlide?.align || 'right') === 'right' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                  }`}
                  title="محاذاة لليمين"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ align: 'center' })}
                  className={`p-1.5 rounded-md transition ${
                    currentActiveSlide?.align === 'center' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                  }`}
                  title="توسيط"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveSlide({ align: 'left' })}
                  className={`p-1.5 rounded-md transition ${
                    currentActiveSlide?.align === 'left' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                  }`}
                  title="محاذاة لليسار"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Layout Change */}
              <div className="flex items-center gap-1">
                <Layout className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={currentActiveSlide?.layout || 'standard'}
                  onChange={(e) => updateActiveSlide({ layout: e.target.value as GammaSlide['layout'] })}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
                >
                  <option value="hero">شريحة غلاف (Cover)</option>
                  <option value="split">شطرين (نص + صورة)</option>
                  <option value="grid">شبكة أعمدة ثلاثية</option>
                  <option value="timeline">تسلسل خطوات زمني</option>
                  <option value="quiz">سؤال تفاعلي وتحليل</option>
                  <option value="summary">خلاصة ختامية</option>
                </select>
              </div>

              {/* Insert / Change Image Button */}
              <button
                type="button"
                onClick={() => handleOpenImagePicker(currentActiveSlide?.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{currentActiveSlide?.imageUrl ? 'تغيير الصورة 🖼️' : 'إدراج صورة 🖼️'}</span>
              </button>

              {/* Insert Simulation or Video Embed Button */}
              <button
                type="button"
                onClick={() => handleOpenEmbedModal(currentActiveSlide?.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition"
                title="تضمين محاكاة علمية تفاعلية من PhET أو GeoGebra أو فيديو آمن"
              >
                <Beaker className="w-3.5 h-3.5 text-indigo-600" />
                <span>تضمين محاكاة / فيديو 🧪</span>
              </button>

              {/* Formative Poll Toggle Button */}
              <button
                type="button"
                onClick={() => handleTogglePoll(currentActiveSlide?.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border transition ${
                  currentActiveSlide?.interactivePoll
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                }`}
                title="إضافة كرت تصويت صفي تفاعلي مع كشف الحل ورمز QR"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{currentActiveSlide?.interactivePoll ? 'إلغاء كرت التصويت' : 'إضافة تصويت صفي 📊'}</span>
              </button>

              {/* Generate Differentiated Slide (Remedial or Enrichment) */}
              <div className="relative group/diff">
                <button
                  type="button"
                  disabled={differentiatingSlideId === currentActiveSlide?.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 font-bold border border-amber-300 transition disabled:opacity-50"
                >
                  {differentiatingSlideId === currentActiveSlide?.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>شريحة تمايز ذكية 🪄</span>
                  <ChevronDown className="w-3 h-3 text-amber-700" />
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 hidden group-hover/diff:block z-30 animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => handleGenerateDifferentiatedSlide(currentActiveSlide?.id, 'remedial')}
                    className="w-full text-right p-2 rounded-xl hover:bg-emerald-50 text-emerald-950 font-bold text-xs flex items-center justify-between"
                  >
                    <span>🟢 شريحة علاجية مبسطة (للمتعثرين)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateDifferentiatedSlide(currentActiveSlide?.id, 'enrichment')}
                    className="w-full text-right p-2 rounded-xl hover:bg-purple-50 text-purple-950 font-bold text-xs flex items-center justify-between"
                  >
                    <span>🟣 شريحة إثرائية وتحدي (للموهوبين)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Slides Deck Canvas */}
          <div className="space-y-6">
            {slides.map((slide, idx) => {
              const isActive = idx === activeSlideIndex;
              return (
                <div
                  key={slide.id}
                  data-slide-card="true"
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`rounded-3xl shadow-sm border transition-all duration-200 overflow-hidden cursor-pointer ${
                    isActive ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:border-slate-300'
                  }`}
                  style={{
                    backgroundColor: slide.layout === 'hero' ? `#${themeConfig.bgHex}` : themeConfig.isDark ? `#${themeConfig.bgHex}` : '#FFFFFF',
                    color: slide.layout === 'hero' ? '#FFFFFF' : themeConfig.isDark ? '#F8FAFC' : `#${themeConfig.textHex}`,
                    borderColor: `#${themeConfig.borderHex}`,
                    fontFamily: slide.fontFamily || 'Cairo',
                  }}
                >
                  {/* Slide Top Bar */}
                  <div className="flex items-center justify-between px-6 py-3.5 border-b border-current/10 bg-black/5">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: `#${themeConfig.accentHex}20`,
                          color: `#${themeConfig.accentHex}`,
                        }}
                      >
                        شريحة {idx + 1} من {slides.length}
                      </span>
                      <span className="text-xs opacity-70 font-semibold">
                        {slide.category}
                      </span>

                      {/* Differentiation Badge */}
                      {slide.differentiationType === 'remedial' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          🟢 مسار علاجي داعم
                        </span>
                      )}
                      {slide.differentiationType === 'enrichment' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                          🌟 مسار إثرائي وتحدي
                        </span>
                      )}

                      {slide.imageUrl && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>صورة تعليمية متوافقة</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEmbedModal(slide.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition text-xs font-bold flex items-center gap-1 text-indigo-600"
                        title="إدراج محاكاة أو فيديو"
                      >
                        <Beaker className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">محاكاة</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenImagePicker(slide.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition text-xs font-bold flex items-center gap-1 text-teal-600"
                        title="تغيير الصورة"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">الصورة</span>
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(idx, 'up');
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === slides.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(idx, 'down');
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 disabled:opacity-30 transition"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSlide(idx);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition"
                        title="تكرار الشريحة"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditSlide(slide);
                        }}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition"
                        title="تعديل المحتوى"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(idx);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 transition"
                        title="حذف الشريحة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Content Area with Image & Media Support */}
                  <div className="p-6 sm:p-10">
                    {/* Embedded Formative Poll */}
                    {slide.interactivePoll && (
                      <div className="mb-6" onClick={(e) => e.stopPropagation()}>
                        <InteractivePollCard
                          poll={slide.interactivePoll}
                          onUpdate={(updated) => updateSlidePoll(slide.id, updated)}
                        />
                      </div>
                    )}

                    {/* Embedded Simulation Card */}
                    {slide.simulationEmbed && (
                      <div className="mb-6 rounded-2xl border border-teal-500/40 bg-slate-900/10 p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-teal-600 flex items-center gap-1.5">
                            <Beaker className="w-4 h-4" />
                            <span>محاكاة مدمجة: {slide.simulationEmbed.titleAr}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSimulation(slide.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                          >
                            إزالة المحاكاة ✕
                          </button>
                        </div>
                        <iframe
                          src={slide.simulationEmbed.embedUrl}
                          className="w-full h-64 rounded-xl border border-black/10"
                          title={slide.simulationEmbed.titleAr}
                          allow="fullscreen"
                        />
                      </div>
                    )}

                    {/* Embedded Video Card */}
                    {slide.videoEmbed && (
                      <div className="mb-6 rounded-2xl border border-rose-500/40 bg-slate-900/10 p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                            <Video className="w-4 h-4" />
                            <span>مقطع فيديو آمن: {slide.videoEmbed.title || 'فيديو تعليمي'} ({slide.videoEmbed.startSeconds || 0}ث - {slide.videoEmbed.endSeconds || 'نهاية'}ث)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideo(slide.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                          >
                            إزالة الفيديو ✕
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          سيتم تشغيل الفيديو تلقائياً بالمواقيت المحددة أثناء وضع العرض الصفي الكامل.
                        </p>
                      </div>
                    )}

                    {editingSlideId === slide.id ? (
                      <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="block text-xs font-bold mb-1 opacity-80">عنوان الشريحة:</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white text-slate-900 border border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1 opacity-80">النقاط والمحتوى (كل سطر يمثل نقطة):</label>
                          <textarea
                            rows={4}
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white text-slate-900 border border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1 opacity-80">دليل وسيناريو الشرح للمعلم (Speaker Notes):</label>
                          <textarea
                            rows={2}
                            value={editTeacherScript}
                            onChange={(e) => setEditTeacherScript(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white text-slate-900 border border-slate-300"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEditedSlide(slide.id)}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>حفظ التعديلات</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSlideId(null)}
                            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Text Content Column with Live WYSIWYG Editing & Point Copilot */}
                        <div className={slide.imageUrl ? 'md:col-span-7' : 'md:col-span-12'}>
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <h3
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateSlideTitle(slide.id, e.currentTarget.textContent || '')}
                              className={`text-xl sm:text-2xl font-extrabold tracking-tight flex-1 outline-none hover:bg-black/5 focus:bg-white/80 focus:text-slate-900 focus:ring-2 focus:ring-teal-400 p-1.5 rounded-xl transition cursor-text ${
                                slide.isBold ? 'font-black' : ''
                              } ${slide.isItalic ? 'italic' : ''}`}
                              style={{ textAlign: slide.align || 'right' }}
                              title="انقر لتعديل عنوان الشريحة مباشرة"
                            >
                              {slide.title}
                            </h3>
                            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block">
                              ✍️ تحرير مباشر
                            </span>
                          </div>

                          {slide.points.length > 0 ? (
                            <div className="space-y-3">
                              <div className={`grid gap-3.5 ${slide.points.length >= 3 && slide.layout === 'grid' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                                {slide.points.map((pt, pIdx) => {
                                  const pointKey = `${slide.id}-${pIdx}`;
                                  const isLoadingThisPoint = copilotLoadingPoint === pointKey;
                                  const isMenuOpen = activeCopilotMenuPoint === pointKey;

                                  return (
                                    <div
                                      key={pIdx}
                                      className="p-3.5 sm:p-4 rounded-2xl transition group/pt relative"
                                      style={{
                                        backgroundColor: themeConfig.isDark ? '#1E293B60' : '#F8FAFC',
                                        border: `1px solid ${themeConfig.isDark ? '#334155' : '#E2E8F0'}`,
                                      }}
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <span
                                          className="w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 text-white"
                                          style={{ backgroundColor: `#${themeConfig.accentHex}` }}
                                        >
                                          {pIdx + 1}
                                        </span>

                                        <p
                                          contentEditable
                                          suppressContentEditableWarning
                                          onBlur={(e) => updateSlidePoint(slide.id, pIdx, e.currentTarget.textContent || '')}
                                          className={`leading-relaxed font-medium flex-1 outline-none hover:bg-black/5 focus:bg-white focus:text-slate-900 focus:ring-1 focus:ring-teal-400 px-2 py-1 rounded-lg transition cursor-text ${
                                            isLoadingThisPoint ? 'opacity-40 animate-pulse' : ''
                                          }`}
                                          style={{
                                            fontSize: `${slide.fontSize || 15}px`,
                                            textAlign: slide.align || 'right',
                                          }}
                                          title="انقر لتعديل النقطة مباشرة"
                                        >
                                          {pt}
                                        </p>

                                        {/* Point AI Copilot Action Menu */}
                                        <div className="relative shrink-0 flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={isLoadingThisPoint}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveCopilotMenuPoint(isMenuOpen ? null : pointKey);
                                            }}
                                            className="opacity-0 group-hover/pt:opacity-100 p-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 border border-indigo-200"
                                            title="مساعد الذكاء الاصطناعي للنص"
                                          >
                                            {isLoadingThisPoint ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Wand2 className="w-3.5 h-3.5" />
                                            )}
                                          </button>

                                          {/* Dropdown Menu */}
                                          {isMenuOpen && (
                                            <div
                                              className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-30 text-slate-900 text-xs animate-in fade-in space-y-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 border-b border-slate-100">
                                                🪄 مساعد الذكاء الاصطناعي للنص
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleTransformPoint(slide.id, pIdx, 'simplify')}
                                                className="w-full text-right p-2 rounded-xl hover:bg-emerald-50 text-emerald-950 font-bold transition flex items-center gap-1.5"
                                              >
                                                <span>🟢 تبسيط الصياغة (للمتعثرين)</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleTransformPoint(slide.id, pIdx, 'critical_question')}
                                                className="w-full text-right p-2 rounded-xl hover:bg-blue-50 text-blue-950 font-bold transition flex items-center gap-1.5"
                                              >
                                                <span>🔵 تحويل لسؤال تفكير ناقد</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleTransformPoint(slide.id, pIdx, 'real_world_example')}
                                                className="w-full text-right p-2 rounded-xl hover:bg-purple-50 text-purple-950 font-bold transition flex items-center gap-1.5"
                                              >
                                                <span>🟣 ربط بمثال واقعي معاصر</span>
                                              </button>
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteSlidePoint(slide.id, pIdx);
                                            }}
                                            className="opacity-0 group-hover/pt:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition"
                                            title="حذف هذه النقطة"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSlidePoint(slide.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-current/30 hover:border-current hover:bg-black/5 text-xs font-bold transition opacity-70 hover:opacity-100"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{isAr ? 'إضافة نقطة جديدة للشريحة' : 'Add point'}</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              className="prose max-w-none text-xs sm:text-sm"
                              dangerouslySetInnerHTML={{ __html: slide.contentHtml }}
                            />
                          )}
                        </div>

                        {/* Real Internet Educational Image Column */}
                        {slide.imageUrl && (
                          <div className="md:col-span-5 relative group/img">
                            <div className="relative rounded-2xl overflow-hidden border border-black/10 shadow-md aspect-video md:aspect-4/3 bg-slate-900/10">
                              <img
                                src={slide.imageUrl}
                                alt={slide.title}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80';
                                }}
                              />

                              {/* Hover Change Image Button */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenImagePicker(slide.id);
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs shadow-lg flex items-center gap-1.5"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>تغيير الصورة</span>
                                </button>
                              </div>
                            </div>

                            {slide.imageCaption && (
                              <p className="text-[11px] text-center mt-1.5 opacity-75 font-medium italic">
                                {slide.imageCaption}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Teacher Speaker Notes Drawer */}
                    {slide.teacherScript && (
                      <div className="mt-6 pt-4 border-t border-current/10">
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-bold flex items-center justify-between text-indigo-500 hover:text-indigo-400 select-none">
                            <span className="flex items-center gap-1.5">
                              <span>🎙️ دليل وسيناريو الشرح للمعلم (Teacher Script)</span>
                            </span>
                            <span className="text-[11px] opacity-70 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-2.5 p-3.5 rounded-xl bg-black/5 border border-current/10 text-xs leading-relaxed opacity-90">
                            <p>{slide.teacherScript}</p>
                            {slide.discussionPrompt && (
                              <div className="mt-2 font-bold text-amber-500">
                                سؤال تحفيزي: {slide.discussionPrompt}
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULLSCREEN PRESENTER MODAL */}
      <GammaPresenterModal
        isOpen={isPresenting}
        onClose={() => setIsPresenting(false)}
        slides={slides}
        themeId={selectedTheme}
        initialSlideIndex={activeSlideIndex}
        customTheme={customTheme || undefined}
      />

      {/* IMAGE PICKER MODAL */}
      <ImagePickerModal
        isOpen={isImagePickerOpen}
        onClose={() => {
          setIsImagePickerOpen(false);
          setPickingImageSlideId(null);
        }}
        onSelectImage={handleSelectImage}
        currentImageUrl={slides.find((s) => s.id === pickingImageSlideId)?.imageUrl}
      />

      {/* INTERACTIVE MEDIA & SIMULATION EMBED MODAL */}
      <InteractiveEmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        onSelectSimulation={handleAttachSimulation}
        onSelectVideo={handleAttachVideo}
        currentSimulation={currentActiveSlide?.simulationEmbed}
        currentVideo={currentActiveSlide?.videoEmbed}
      />

      {/* 🌿 شاشة انتظار الذكاء الاصطناعي مع الأذكار والصلاة على النبي ﷺ */}
      <AiLoadingDhikr
        loading={loading}
        message={isAr ? 'جاري صياغة وهندسة شرائح العرض التقديمي بالذكاء الاصطناعي...' : 'Generating presentation slides...'}
        uiLang={uiLang}
      />
    </div>
  );
}
