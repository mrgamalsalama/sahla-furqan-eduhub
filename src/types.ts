import { SAHLAH_LOGO, FURQAN_LOGO } from '@/lib/logos';

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

export const INSTITUTIONS = {
  sahlah: {
    logo: SAHLAH_LOGO,
    ar: 'أكاديمية سهلة الدولية',
    en: 'Sahlah Academy',
  },
  furqan: {
    logo: FURQAN_LOGO,
    ar: 'مدرسة الفرقان العالمية',
    en: 'Al-Furqan International School',
  },
} as const;
