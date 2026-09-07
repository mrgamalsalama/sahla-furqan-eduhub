export type View = 'home' | 'editor' | 'library';

export type OutputType = 'lesson-plan' | 'worksheet' | 'quiz' | 'slides';

export type ContentLang = 'ar' | 'en';
export type InstitutionId = 'sahlah' | 'furqan' | 'both';

export interface LessonSettings {
  subject: string;
  grade: string;
  duration: string;
  studentLevel: string;
  teacherName: string;
  lessonTitle: string;
  contentLanguage: ContentLang;
  institution: InstitutionId;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'word';
  dataUrl: string;
  base64: string;
  mimeType: string;
}

export interface SavedLesson {
  id: string;
  title: string;
  outputType: OutputType;
  settings: LessonSettings;
  contentHtml: string;
  createdAt: number;
  updatedAt: number;
}

export interface GenerationResult {
  contentHtml: string;
  title: string;
}

export interface SubjectOption {
  id: string;
  ar: string;
  en: string;
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { id: 'arabic-native', ar: 'اللغة العربية (للناطقين بها)', en: 'Arabic (Native Speakers)' },
  { id: 'arabic-nonnative', ar: 'اللغة العربية (لغير الناطقين بها - AFL)', en: 'Arabic (Non-Native Speakers - AFL)' },
  { id: 'quran-native', ar: 'القرآن الكريم (للناطقين باللغة العربية)', en: 'Quran (Arabic Speakers)' },
  { id: 'quran-nonnative', ar: 'القرآن الكريم (لغير الناطقين باللغة العربية)', en: 'Quran (Non-Arabic Speakers)' },
  { id: 'islamic-native', ar: 'التربية الإسلامية (للناطقين باللغة العربية)', en: 'Islamic Education (Arabic Speakers)' },
  { id: 'islamic-nonnative', ar: 'التربية الإسلامية باللغة الإنجليزية (لغير الناطقين بالعربية)', en: 'Islamic Studies (Non-Arabic Speakers)' },
  { id: 'english', ar: 'اللغة الإنجليزية', en: 'English' },
  { id: 'math', ar: 'الرياضيات', en: 'Mathematics' },
  { id: 'science', ar: 'العلوم', en: 'Science' },
  { id: 'social-studies', ar: 'الدراسات الاجتماعية', en: 'Social Studies' },
];

export const GRADES_AR = [
  'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع',
  'الصف الخامس', 'الصف السادس', 'الصف السابع', 'الصف الثامن',
  'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر',
];

export const GRADES_EN = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

export const DURATIONS_AR = ['30 دقيقة', '45 دقيقة', '60 دقيقة', '90 دقيقة', '120 دقيقة'];
export const DURATIONS_EN = ['30 min', '45 min', '60 min', '90 min', '120 min'];
export const STUDENT_LEVELS_AR = ['ضعيف', 'متوسط', 'جيد', 'متميز', 'مستويات متفاوتة'];
export const STUDENT_LEVELS_EN = ['Weak', 'Average', 'Good', 'Excellent', 'Mixed levels'];

export const OUTPUT_LABELS_AR: Record<OutputType, string> = {
  'lesson-plan': 'خطة الدرس المعتمدة',
  worksheet: 'ورقة عمل',
  quiz: 'اختبار قصير',
  slides: 'عرض شرائح ملخص',
};

export const OUTPUT_LABELS_EN: Record<OutputType, string> = {
  'lesson-plan': 'Lesson Plan',
  worksheet: 'Worksheet',
  quiz: 'Short Quiz',
  slides: 'Slide Summary',
};

const sahlahLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110" viewBox="0 0 320 110"><rect width="320" height="110" rx="16" fill="#ffffff"/><circle cx="55" cy="55" r="37" fill="#13b8b2"/><path d="M55 24c-18 0-31 14-31 31s13 31 31 31c12 0 22-6 27-16H63c-3 4-7 6-12 6-12 0-21-9-21-21s9-21 21-21c5 0 9 2 12 6h19C77 30 67 24 55 24Z" fill="#ffffff"/><circle cx="55" cy="55" r="7" fill="#13b8b2"/><circle cx="92" cy="20" r="9" fill="#f47b4a"/><text x="112" y="52" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#13b8b2">Sahlah</text><text x="112" y="78" font-family="Arial, sans-serif" font-size="14" fill="#f47b4a">International Academy</text></svg>`;
const furqanLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110" viewBox="0 0 320 110"><rect width="320" height="110" rx="16" fill="#ffffff"/><circle cx="55" cy="42" r="29" fill="#10b7b1"/><path d="M40 42c0-12 9-21 21-21 7 0 13 3 17 8-5-12-16-20-29-20-18 0-33 15-33 33s15 33 33 33c13 0 24-8 29-20-4 5-10 8-17 8-12 0-21-9-21-21Z" fill="#ffffff"/><circle cx="55" cy="42" r="7" fill="#10b7b1"/><circle cx="92" cy="16" r="9" fill="#f47b4a"/><text x="113" y="48" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#10b7b1">Al-Furqan</text><text x="113" y="72" font-family="Arial, sans-serif" font-size="13" fill="#f47b4a">International School</text></svg>`;

const embeddedLogo = (svg: string): string => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const INSTITUTIONS = {
  sahlah: {
    logo: embeddedLogo(sahlahLogoSvg),
    ar: 'أكاديمية سهلة الدولية',
    en: 'Sahlah Academy',
  },
  furqan: {
    logo: embeddedLogo(furqanLogoSvg),
    ar: 'مدرسة الفرقان العالمية',
    en: 'Al-Furqan International School',
  },
} as const;
