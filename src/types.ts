import { SAHLAH_LOGO, FURQAN_LOGO } from './lib/logos';

export type View = 'home' | 'editor' | 'library' | 'advisor' | 'benchmark' | 'grader' | 'qti-converter';

export type OutputType =
  | 'lesson-plan'
  | 'worksheet'
  | 'slides'
  | 'quiz'
  | 'qti-exam'
  | 'standardized-test';

export type StandardFramework = 'abt' | 'ib' | 'cefr' | 'bloom' | 'diagnostic' | 'custom';
export type AbtTrack = 'arabic-a' | 'arabic-b';
export type QuestionFormat = 'all-mcq' | 'mixed';
export type TermType = 'term-1' | 'term-2' | 'term-3';

export type ContentLang = 'ar' | 'en';
export type InstitutionId = 'sahlah' | 'furqan' | 'both';

export type LmsTarget = 'sahlah_cypher' | 'furqan_canvas';

export type WorksheetTheme = 'classic' | 'modern' | 'minimal' | 'custom';
export interface WorksheetSettings {
  pageCount?: number; // 1, 2, 3, 4
  teacherCustomPrompt?: string;
  standardsSelection?: string;
  themeStyle?: WorksheetTheme;
  customThemeDescription?: string;
  aiAutoPilot?: boolean;
}

export type PresentationDepth = 'concise' | 'detailed' | 'comprehensive_script';
export type PresentationTheme = 'minimal' | 'tech_blue' | 'warm_edu' | 'creative_k12' | 'custom';
export interface PresentationSettings {
  slideCount?: number; // 6, 10, 15, 20
  depthLevel?: PresentationDepth;
  visualTheme?: PresentationTheme;
  customThemeDescription?: string;
}

export interface LessonSettings {
  subject: string;
  grade: string;
  duration: string;
  studentLevel: string;
  teacherName: string;
  lessonTitle: string;
  contentLanguage: ContentLang;
  institution: InstitutionId;
  standardFramework?: StandardFramework;
  abtTrack?: AbtTrack;
  customStandards?: string;
  sourceText?: string; // المادة العلمية أو النص المرجعي لبناء الاختبار
  questionFormat?: QuestionFormat; // نمط الأسئلة: اختيار من متعدد فقط أو متنوع
  term?: TermType; // الفصل الدراسي: الأول، الثاني، الثالث
  questionCount?: number; // عدد الأسئلة المطلوب
  worksheetSettings?: WorksheetSettings;
  presentationSettings?: PresentationSettings;
  lmsTarget?: LmsTarget;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'word';
  dataUrl: string;
  base64: string;
  mimeType: string;
  textContent?: string;
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

export const DURATIONS_AR = ['30 دقيقة', '50 دقيقة', '60 دقيقة', '100 دقيقة', '120 دقيقة'];
export const DURATIONS_EN = ['30 min', '50 min', '60 min', '100 min', '120 min'];
export const STUDENT_LEVELS_AR = ['ضعيف', 'متوسط', 'جيد', 'متميز', 'مستويات متفاوتة'];
export const STUDENT_LEVELS_EN = ['Weak', 'Average', 'Good', 'Excellent', 'Mixed levels'];

export const TERMS_AR = [
  { id: 'term-1', label: 'الفصل الدراسي الأول' },
  { id: 'term-2', label: 'الفصل الدراسي الثاني' },
  { id: 'term-3', label: 'الفصل الدراسي الثالث' },
];

export const TERMS_EN = [
  { id: 'term-1', label: 'Term 1 / Semester 1' },
  { id: 'term-2', label: 'Term 2 / Semester 2' },
  { id: 'term-3', label: 'Term 3' },
];

export const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

export const OUTPUT_LABELS_AR: Record<OutputType, string> = {
  'lesson-plan': 'خطة الدرس المعتمدة',
  worksheet: 'ورقة عمل تفاعلية (بلوم)',
  quiz: 'اختبار قصير (QTI)',
  'qti-exam': 'امتحان بلوم الشامل (50 سؤال QTI)',
  slides: 'استوديو العروض التقديمية',
  'standardized-test': 'اختبار معياري / تشخيصي (ABT / IB / تشخيص فجوات)',
};

export const OUTPUT_LABELS_EN: Record<OutputType, string> = {
  'lesson-plan': 'Approved Lesson Plan',
  worksheet: 'Interactive Worksheet (Bloom)',
  quiz: 'Short Quiz (QTI)',
  'qti-exam': 'Comprehensive Bloom Exam (50 MCQs)',
  slides: 'Presentation Studio',
  'standardized-test': 'Standardized / Diagnostic Test',
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
