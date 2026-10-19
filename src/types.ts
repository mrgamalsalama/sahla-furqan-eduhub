import { SAHLAH_LOGO, FURQAN_LOGO } from './lib/logos';

export type View =
  | 'home'
  | 'lesson-plan'
  | 'worksheet'
  | 'slides'
  | 'quiz-exam'
  | 'qti-converter'
  | 'grader-advisor'
  | 'performance-task'
  | 'weekly-statement'
  | 'editor'
  | 'library'
  | 'community'
  | 'benchmark';

export type OutputType =
  | 'lesson-plan'
  | 'worksheet'
  | 'slides'
  | 'quiz'
  | 'qti-exam'
  | 'standardized-test'
  | 'performance-task'
  | 'weekly-statement';

export type StandardFramework =
  | 'diagnostic_gap'
  | 'map_growth'
  | 'ib_criteria'
  | 'cambridge_igcse'
  | 'us_common_core'
  | 'cefr_languages'
  | 'pirls_pisa'
  | 'abt'
  | 'ib'
  | 'cefr'
  | 'bloom'
  | 'diagnostic'
  | 'custom';

export interface InternationalFrameworkOption {
  id: StandardFramework;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  badge: string;
}

export const INTERNATIONAL_FRAMEWORKS: InternationalFrameworkOption[] = [
  {
    id: 'diagnostic_gap',
    titleAr: 'تشخيص الفاقد التعليمي ومصفوفة الفجوات',
    titleEn: 'Diagnostic & Learning Gap Analysis',
    descAr: 'تحديد الفجوات السابقة ومستويات التمكن مع خطة علاجية وإثرائية فورية.',
    descEn: 'Pinpoints prior learning loss and builds an automated remediation action matrix.',
    badge: 'Diagnostic Gap',
  },
  {
    id: 'map_growth',
    titleAr: 'مقاييس التقدم الدولية (MAP Growth)',
    titleEn: 'MAP Growth / RIT Benchmarks',
    descAr: 'مستويات درجات RIT المتكيفة واختبار مقاييس التقدم NWEA MAP.',
    descEn: 'Calibrated RIT score bands and adaptive proficiency bands.',
    badge: 'NWEA MAP',
  },
  {
    id: 'ib_criteria',
    titleAr: 'البكالوريا الدولية (IB Assessment Criteria)',
    titleEn: 'IB Criteria (A, B, C, D / Rubrics 1-8)',
    descAr: 'معايير MYP/DP من A إلى D مع سلالم تقدير تحليلية من 1 إلى 8 درجات.',
    descEn: 'MYP/DP criteria A to D with analytical 1-8 achievement rubrics.',
    badge: 'IB Continuum',
  },
  {
    id: 'cambridge_igcse',
    titleAr: 'كامبريدج وإدكسل البريطانية (Cambridge / Edexcel)',
    titleEn: 'Cambridge IGCSE & Checkpoint',
    descAr: 'معايير تصحيح كامبريدج مع سلم الدرجات ومستويات الفهم AO1 و AO2 و AO3.',
    descEn: 'Official Mark Scheme bands and Assessment Objectives AO1, AO2, AO3.',
    badge: 'Cambridge',
  },
  {
    id: 'us_common_core',
    titleAr: 'المعايير الأمريكية المشتركة (US Common Core)',
    titleEn: 'US Common Core (CCSS Standards)',
    descAr: 'تصنيف الأسئلة حسب أكواد CCSS في القراءة والرياضيات والعلوم ومستويات DOK.',
    descEn: 'Item alignment with specific CCSS strand codes and DOK levels.',
    badge: 'Common Core',
  },
  {
    id: 'cefr_languages',
    titleAr: 'الإطار الأوروبي للغات (CEFR Framework)',
    titleEn: 'CEFR Framework (A1 to C2)',
    descAr: 'تصنيف المهارات اللغوية من المستوى المبتدئ A1 حتى الإتقان التام C2.',
    descEn: 'Language proficiency scale from Basic A1/A2 to Mastery C1/C2.',
    badge: 'CEFR A1-C2',
  },
  {
    id: 'pirls_pisa',
    titleAr: 'المعايير الدولية للقراءة والعلوم (PIRLS / PISA)',
    titleEn: 'PIRLS / PISA Reading Literacy',
    descAr: 'قياس الفهم القرائي العميق، التفسير، والاستدلال وحل المشكلات في سياقات واقعية.',
    descEn: 'Higher-order reading literacy, scientific reasoning, and problem solving.',
    badge: 'PISA / PIRLS',
  },
];

export type AbtTrack = 'arabic-a' | 'arabic-b';
export type QuestionFormat = 'all-mcq' | 'mixed';
export type TermType = 'term-1' | 'term-2' | 'term-3';

export type ContentLang = 'ar' | 'en';
export type InstitutionId = 'sahlah' | 'furqan' | 'both';

export type LmsTarget = 'sahlah_cypher' | 'furqan_canvas' | 'canvas_lms';

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

export interface PerformanceTaskSettings {
  projectTopic?: string;
  duration?: string; // e.g. أسبوع، أسبوعان، شهر
  teamFormat?: 'individual' | 'collaborative';
  deliverableType?: 'prototype' | 'campaign' | 'advisory_report' | 'multimedia' | 'scientific_inquiry';
  graspsGoal?: string;
  graspsRole?: string;
  graspsAudience?: string;
  graspsSituation?: string;
  graspsProduct?: string;
  graspsStandards?: string;
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
  sourceText?: string;
  questionFormat?: QuestionFormat;
  term?: TermType;
  questionCount?: number;
  worksheetSettings?: WorksheetSettings;
  presentationSettings?: PresentationSettings;
  performanceTaskSettings?: PerformanceTaskSettings;
  lmsTarget?: LmsTarget;
  selectedSubCriteria?: string[];
  teacherPrompt?: string; // Optional custom instructions from teacher: توجيهات ومتطلبات خاصة بالمعلم يلتزم بها الذكاء الاصطناعي بدقة
  weekNumber?: string; // e.g. الأسبوع الأول / Week 1
  lessonDate?: string; // e.g. تاريخ الدرس
}

export interface FrameworkSubCriterion {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
}

export const FRAMEWORK_SUB_CRITERIA: Record<string, FrameworkSubCriterion[]> = {
  diagnostic_gap: [
    { id: 'diag_concepts', code: 'GAP-CON', titleAr: 'فجوات المفاهيم التأسيسية القبلية', titleEn: 'Prior Prerequisite Concepts', descAr: 'كشف المفاهيم المفقودة من السنوات السابقة لضمان التأسيس السليم' },
    { id: 'diag_reading', code: 'GAP-READ', titleAr: 'الاستيعاب القرائي والتحليل الصامت', titleEn: 'Reading Comprehension', descAr: 'قياس الفهم المباشر والضمني للنصوص واستخلاص المعاني' },
    { id: 'diag_procedural', code: 'GAP-PRC', titleAr: 'التطبيق الإجرائي وحل المشكلات', titleEn: 'Procedural Problem Solving', descAr: 'التطبيق المنهجي للقواعد والخطوات الحسابية أو اللغوية' },
    { id: 'diag_reasoning', code: 'GAP-RSN', titleAr: 'الاستدلال والتفكير المنطقي والعلمي', titleEn: 'Reasoning & Inquiry', descAr: 'الربط والاستنتاج والتعليل وتفسير النتائج في سياقات جديدة' },
  ],
  map_growth: [
    { id: 'map_rit_bands', code: 'MAP-RIT', titleAr: 'نطاق درجات RIT المتدرجة (180-240+)', titleEn: 'Graduated RIT Bands', descAr: 'تدرج مستويات الصعوبة المعايرة وفق مقياس NWEA التكيفي' },
    { id: 'map_vocab', code: 'MAP-VOC', titleAr: 'اكتساب المفردات ودلالة السياق', titleEn: 'Vocabulary Acquisition & Use', descAr: 'فهم معاني الكلمات الدقيقة والمجازية والتراكيب في السياق' },
    { id: 'map_informational', code: 'MAP-INFO', titleAr: 'تحليل النصوص المعلوماتية والتطبيقية', titleEn: 'Informational & Scientific Texts', descAr: 'استخلاص الأدلة، الفكرة المركزية، والبنية المنطقية للنص' },
    { id: 'map_operations', code: 'MAP-OPS', titleAr: 'العمليات والتفكير الجبري والعددي', titleEn: 'Operations & Quantitative Reasoning', descAr: 'النمذجة الرياضية والحلول العددية وتطبيق العلاقات' },
  ],
  ib_criteria: [
    { id: 'ib_crit_a', code: 'CRIT-A', titleAr: 'المعيار أ: المعرفة والفهم المفاهيمي (1-8)', titleEn: 'Criterion A: Knowing & Understanding', descAr: 'شرح المفاهيم الجوهرية وتطبيقها في سياقات مألوفة وغير مألوفة' },
    { id: 'ib_crit_b', code: 'CRIT-B', titleAr: 'المعيار ب: الاستقصاء والبحث وتصميم الأنشطة (1-8)', titleEn: 'Criterion B: Inquiring & Designing', descAr: 'صياغة التساؤلات والتخطيط المنهجي للاستكشاف والتحري' },
    { id: 'ib_crit_c', code: 'CRIT-C', titleAr: 'المعيار ج: معالجة البيانات وتقييم النتائج (1-8)', titleEn: 'Criterion C: Processing & Evaluating', descAr: 'تنظيم وتحليل البيانات والرسوم واستخلاص الاستنتاجات العلمية' },
    { id: 'ib_crit_d', code: 'CRIT-D', titleAr: 'المعيار د: التفكير الناقد والتأثيرات الواقعية (1-8)', titleEn: 'Criterion D: Reflecting & Real-World Impacts', descAr: 'ربط المعرفة بالحياة والمجتمع والقضايا الأخلاقية والبيئية' },
  ],
  cambridge_igcse: [
    { id: 'cam_ao1', code: 'AO1', titleAr: 'AO1: المعرفة والفهم الصريح واسترجاع القواعد', titleEn: 'AO1: Knowledge with Understanding', descAr: 'استدعاء الحقائق والمصطلحات الدقيقة وتطبيق القواعد' },
    { id: 'cam_ao2', code: 'AO2', titleAr: 'AO2: معالجة المعلومات والتطبيق في سياقات جديدة', titleEn: 'AO2: Handling Information & Problem Solving', descAr: 'تفسير النصوص والمعطيات وحل المشكلات غير النمطية' },
    { id: 'cam_ao3', code: 'AO3', titleAr: 'AO3: التحليل والاستقصاء والتقويم الناقد', titleEn: 'AO3: Analysis, Inquiry & Critical Evaluation', descAr: 'فحص الحجج والبراهين وإصدار الأحكام المبررة' },
    { id: 'cam_markscheme', code: 'CAM-MS', titleAr: 'سلم تصحيح كامبريدج المعتمد (Official Mark Scheme)', titleEn: 'Cambridge Official Mark Scheme', descAr: 'توزيع الدرجات التفصيلي ومؤشرات التميز الأكاديمي' },
  ],
  us_common_core: [
    { id: 'ccss_dok12', code: 'DOK 1-2', titleAr: 'عمق المعرفة DOK 1 & 2: التذكر والمهارات الأساسية', titleEn: 'Recall & Basic Skills', descAr: 'استرجاع الحقائق والتعريفات والخطوات المباشرة والمفاهيم الأولية' },
    { id: 'ccss_dok3', code: 'DOK 3', titleAr: 'عمق المعرفة DOK 3: التفكير الاستراتيجي والتعليل', titleEn: 'Strategic Thinking & Reasoning', descAr: 'الاستدلال والتخطيط وتفسير الأدلة المتعددة وربط الأسباب' },
    { id: 'ccss_dok4', code: 'DOK 4', titleAr: 'عمق المعرفة DOK 4: التفكير الممتد والبحث المركب', titleEn: 'Extended Thinking & Synthesis', descAr: 'التحليل المتعمق والتركيب وحل المسائل الواقعية المعقدة عبر سياقات متعددة' },
    { id: 'ccss_strands', code: 'CCSS-STR', titleAr: 'محاور المعايير الأمريكية (Reading/Math Strands)', titleEn: 'CCSS Grade-Level Strands', descAr: 'مطابقة الأكواد الدقيقة للمعايير الأمريكية المشتركة للصف المحدد' },
  ],
  cefr_languages: [
    { id: 'cefr_a', code: 'CEFR A1-A2', titleAr: 'المستوى التأسيسي A1 - A2 (Basic User)', titleEn: 'Basic User: A1 - A2', descAr: 'فهم التراكيب المألوفة والمفردات اليومية المباشرة والتعليمات البسيطة' },
    { id: 'cefr_b', code: 'CEFR B1-B2', titleAr: 'المستوى المستقل B1 - B2 (Independent User)', titleEn: 'Independent User: B1 - B2', descAr: 'استيعاب الأفكار الرئيسية في النصوص المعقدة والتعبير السلس والربط المنطقي' },
    { id: 'cefr_c', code: 'CEFR C1-C2', titleAr: 'المستوى المتقدم C1 - C2 (Proficient User)', titleEn: 'Proficient User: C1 - C2', descAr: 'الإتقان التام والتحليل البلاغي والنقدي وتذوق الأساليب اللغوية العميقة' },
    { id: 'cefr_skills', code: 'CEFR-SKL', titleAr: 'الكفايات اللغوية التواصلية الأربع', titleEn: 'Communicative Competencies', descAr: 'القراءة والتحليل والتراكيب الوظيفية والتعبير في سياقات لغوية أصيلة' },
  ],
  pirls_pisa: [
    { id: 'pirls_retrieval', code: 'PIRLS-RET', titleAr: 'الوصول إلى المعلومات الصريحة واسترجاعها', titleEn: 'Explicit Retrieval of Information', descAr: 'تحديد حقائق ومعلومات مذكورة بوضوح في النص واستخراجها بدقة' },
    { id: 'pirls_inference', code: 'PIRLS-INF', titleAr: 'الاستنتاج المباشر والربط بين المعطيات', titleEn: 'Straightforward Inferences', descAr: 'استنباط الدلالات غير المباشرة والعلاقات السببية بين الأفكار' },
    { id: 'pirls_evaluate', code: 'PIRLS-EVAL', titleAr: 'تفسير وتكامل الأفكار وفحص وتقويم المحتوى', titleEn: 'Integrate, Interpret & Evaluate Content', descAr: 'نقد أسلوب الكاتب وتقييم ملاءمة الحجج والأفكار والأدلة' },
    { id: 'pisa_realworld', code: 'PISA-LIT', titleAr: 'PISA: حل المشكلات في سياقات الحياة الواقعية', titleEn: 'PISA Real-World Problem Solving', descAr: 'تطبيق التفكير العلمي والرياضي على مواقف حياتية معاصرة ومحاكاة المشكلات' },
  ],
};

export interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'word' | 'powerpoint' | 'text';
  dataUrl: string;
  base64: string;
  mimeType: string;
  textContent?: string;
  size?: number;
}

export interface SavedLesson {
  id: string;
  title: string;
  outputType: OutputType;
  settings: LessonSettings;
  contentHtml: string;
  html?: string;
  createdAt: number;
  updatedAt: number;
  // Cloud & Community extensions
  isPublic?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  institution?: InstitutionId;
  likesCount?: number;
  commentsCount?: number;
}

export interface ResourceComment {
  id: string;
  resourceId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  school?: string;
  comment: string;
  createdAt: number | string;
}

export interface CommunityResource extends SavedLesson {
  isPublic: boolean;
  likesCount: number;
  commentsCount: number;
}

export interface GenerationResult {
  contentHtml: string;
  html?: string;
  title: string;
  qtiXml?: string;
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
  'مرحلة الروضة (Kindergarten)',
  'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع',
  'الصف الخامس', 'الصف السادس', 'الصف السابع', 'الصف الثامن',
  'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر',
];

export const GRADES_EN = [
  'Kindergarten',
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
  'performance-task': 'المهمة الأدائية ومشاريع التعلم (PBL)',
  'weekly-statement': 'التقرير الأسبوعي المعتمد (Weekly Statement)',
};

export const OUTPUT_LABELS_EN: Record<OutputType, string> = {
  'lesson-plan': 'Approved Lesson Plan',
  worksheet: 'Interactive Worksheet (Bloom)',
  quiz: 'Short Quiz (QTI)',
  'qti-exam': 'Comprehensive Bloom Exam (50 MCQs)',
  slides: 'Presentation Studio',
  'standardized-test': 'Standardized / Diagnostic Test',
  'performance-task': 'Performance Task & PBL Project',
  'weekly-statement': 'Official Weekly Statement',
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

// -------------------------------------------------------------
// Weekly Statement (Academic Projection) Models
// -------------------------------------------------------------
export type ShiftType = 'mena' | 'us';
export type GenderCohort = 'boys' | 'girls' | 'joint';
export type NativeCohort = 'native' | 'non-native' | 'both';

export interface WeeklySubjectDailyPlan {
  id: string;
  day: number; // 1 to 5
  subjectId: string;
  subjectName: string;
  teacherName?: string;
  isNoSession: boolean;
  noSessionNote?: string; // e.g. "No Session", "No Session - Boys", "Girls: No session", "لا توجد حصة", "للناطقين: لا توجد حصة"
  genderCohort: GenderCohort; // 'joint', 'boys', 'girls'
  nativeCohort?: NativeCohort; // for Arabic/Islamic/Quran
  contentTopic: string;
  homework: string;
  optionalEnrichment: string;
  zoomUrl?: string;
}

export interface WeeklyQuizItem {
  id: string;
  date: string; // e.g. "22/10/2026" or "19/10/2026"
  subject: string; // e.g. "الإسلاميات للناطقين", "اللغة العربية للناطقين بها", "Quran Non Native"
  topics: string; // e.g. "الحديث الضعيف وأقسامه", "Relationship between letters"
  materials?: string;
}

export interface WeeklySubjectStatus {
  subjectId: string;
  is_locked: boolean;
  status: 'draft' | 'submitted';
  submitted_at?: string;
  submitted_by?: string;
  locked_at?: string;
  unlocked_at?: string;
  unlock_reason?: string;
}

export interface WeeklyStatementAuditLog {
  id: string;
  statement_id: string;
  grade: string;
  week_number: number;
  shift: ShiftType;
  subject_id: string;
  action: 'submit_and_lock' | 'unlock_for_editing' | 'save_draft' | 'content_update';
  old_content: unknown;
  new_content: unknown;
  changed_by: string;
  reason?: string;
  created_at: string;
}

export interface WeeklyStatementDocument {
  id: string;
  grade: string; // e.g. "Grade 1", "Grade 11"
  shift: ShiftType; // 'mena' | 'us'
  term: string; // "1", "2", "3"
  schoolYear: string; // "SY 2026-2027"
  weekDateHeader: string; // e.g. "September 14, 2026"
  weekRangeText: string; // e.g. "Sept 14-17, 2026"
  days: {
    [dayNumber: number]: WeeklySubjectDailyPlan[];
  };
  quizzes: WeeklyQuizItem[];
  subjectStatuses?: Record<string, WeeklySubjectStatus>;
  updatedAt: number;
}


