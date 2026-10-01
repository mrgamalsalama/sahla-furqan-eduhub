export type UILang = 'ar' | 'en';

export interface UIStrings {
  // Header
  brandName: string;
  brandSub: string;
  navHome: string;
  navLibrary: string;
  langSwitchLabel: string;

  // HomePage
  aiBadge: string;
  heroTitle: string;
  heroDesc: string;
  uploadTitle: string;
  uploadDesc: string;
  uploadBtn: string;
  unsupportedFile: string;
  uploadedFiles: (n: number) => string;
  clearAll: string;
  lessonSettings: string;
  lessonSettingsDesc: string;
  teacherName: string;
  teacherNamePlaceholder: string;
  lessonTitleLabel: string;
  lessonTitlePlaceholder: string;
  subject: string;
  selectSubject: string;
  grade: string;
  selectGrade: string;
  duration: string;
  studentLevel: string;
  institution: string;
  sahlahAcademy: string;
  furqanSchool: string;
  bothInstitutions: string;
  contentLanguage: string;
  arabic: string;
  english: string;
  chooseOutput: string;
  generating: string;
  genError: string;
  genLessonPlan: string;
  genLessonPlanDesc: string;
  genWorksheet: string;
  genWorksheetDesc: string;
  genQuiz: string;
  genQuizDesc: string;
  genSlides: string;
  genSlidesDesc: string;

  // LibraryPage
  libraryTitle: string;
  libraryDesc: string;
  noLessons: string;
  noLessonsDesc: string;
  openEdit: string;

  // EditorPage
  back: string;
  saveLibrary: string;
  saved: string;
  copy: string;
  copied: string;
  print: string;
  exportWord: string;
  exportingWord: string;
  exportPDF: string;
  titlePlaceholder: string;
  editorPlaceholder: string;
  tbUndo: string;
  tbRedo: string;
  tbPlain: string;
  tbH1: string;
  tbH2: string;
  tbH3: string;
  tbBold: string;
  tbItalic: string;
  tbUnderline: string;
  tbBulletList: string;
  tbNumberedList: string;
  tbQuote: string;
  tbTable: string;

  // Footer
  footerText: string;

  // Misc
  popupBlocked: string;
  apiNotConfigured: string;
}

const ar: UIStrings = {
  brandName: 'سَهلة & الفُرقان',
  brandSub: 'إديو هَب | EduHub',
  navHome: 'الرئيسية',
  navLibrary: 'مكتبتي',
  langSwitchLabel: 'English',

  aiBadge: 'مدعوم بالذكاء الاصطناعي',
  heroTitle: 'رفيق المعلم الذكي: من الفكرة إلى بنك الأسئلة',
  heroDesc: 'ارفع صورة من الكتاب أو ملف PDF أو Word، حدد إعدادات الدرس، ودع الذكاء الاصطناعي يولّد لك خطط الدروس وأوراق العمل والاختبارات والعروض',
  uploadTitle: 'ارفع ملفات الدرس',
  uploadDesc: 'اسحب وأفلت الملفات هنا، أو اضغط للاختيار. يدعم الصور و PDF و Word',
  uploadBtn: 'اختيار الملفات',
  unsupportedFile: 'نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF أو Word.',
  uploadedFiles: (n) => `الملفات المرفوعة (${n})`,
  clearAll: 'مسح الكل',
  lessonSettings: 'إعدادات الدرس',
  lessonSettingsDesc: 'المادة، الصف، المدة، مستوى الطلاب',
  teacherName: 'اسم المعلم',
  teacherNamePlaceholder: 'اكتب اسمك',
  lessonTitleLabel: 'عنوان الدرس',
  lessonTitlePlaceholder: 'عنوان الدرس (اختياري)',
  subject: 'المادة',
  selectSubject: 'اختر المادة',
  grade: 'الصف الدراسي',
  selectGrade: 'اختر الصف',
  duration: 'مدة الدرس',
  studentLevel: 'مستوى الطلاب',
  institution: 'الهوية المؤسسية والشعار',
  sahlahAcademy: 'أكاديمية سهلة الدولية',
  furqanSchool: 'مدرسة الفرقان العالمية',
  bothInstitutions: 'كلاهما معاً',
  contentLanguage: 'لغة المحتوى المولد',
  arabic: 'اللغة العربية',
  english: 'English',
  chooseOutput: 'اختر ما تريد توليده',
  generating: 'جاري التوليد...',
  genError: 'حدث خطأ أثناء التوليد. حاول مرة أخرى.',
  genLessonPlan: 'خطة الدرس المعتمدة',
  genLessonPlanDesc: 'جدول كامل مطابق للنموذج',
  genWorksheet: 'ورقة عمل',
  genWorksheetDesc: 'جاهزة للطباعة والتحميل',
  genQuiz: 'اختبار قصير',
  genQuizDesc: 'أسئلة اختيار من متعدد + نموذج إجابة',
  genSlides: 'عرض شرائح ملخص',
  genSlidesDesc: 'ملخص الدرس في شرائح',

  libraryTitle: 'مكتبتي',
  libraryDesc: 'الدروس المحفوظة محلياً في المتصفح',
  noLessons: 'لا توجد دروس محفوظة',
  noLessonsDesc: 'ابدأ بإنشاء درس جديد ثم احفظه ليظهر هنا',
  openEdit: 'فتح وتعديل',

  back: 'رجوع',
  saveLibrary: 'حفظ في مكتبتي',
  saved: 'تم الحفظ',
  copy: 'نسخ',
  copied: 'تم النسخ',
  print: 'طباعة',
  exportWord: 'تصدير Word',
  exportingWord: 'جاري التصدير...',
  exportPDF: 'تصدير PDF',
  titlePlaceholder: 'عنوان الدرس',
  editorPlaceholder: 'اكتب هنا...',
  tbUndo: 'تراجع',
  tbRedo: 'إعادة',
  tbPlain: 'نص عادي',
  tbH1: 'عنوان 1',
  tbH2: 'عنوان 2',
  tbH3: 'عنوان 3',
  tbBold: 'عريض',
  tbItalic: 'مائل',
  tbUnderline: 'تسطير',
  tbBulletList: 'قائمة نقطية',
  tbNumberedList: 'قائمة رقمية',
  tbQuote: 'اقتباس',
  tbTable: 'إدراج جدول',

  footerText: 'سَهلة & الفُرقان إديو هَب | Sahla-Furqan EduHub',

  popupBlocked: 'يرجى السماح بالنوافذ المنبثقة لتمكين الطباعة.',
  apiNotConfigured: 'لم يتم تكوين مفتاح Gemini API. يرجى التواصل مع المسؤول.',
};

const en: UIStrings = {
  brandName: 'Sahla & Furqan',
  brandSub: 'EduHub',
  navHome: 'Home',
  navLibrary: 'My Library',
  langSwitchLabel: 'العربية',

  aiBadge: 'AI-Powered',
  heroTitle: "The Teacher's Smart Companion: From Idea to Question Bank",
  heroDesc: 'Upload a photo from the textbook, a PDF, or a Word file, set your lesson options, and let AI generate lesson plans, worksheets, quizzes, and slide summaries',
  uploadTitle: 'Upload Lesson Files',
  uploadDesc: 'Drag and drop files here, or click to browse. Supports images, PDF, and Word',
  uploadBtn: 'Browse Files',
  unsupportedFile: 'Unsupported file type. Please upload an image, PDF, or Word file.',
  uploadedFiles: (n) => `Uploaded Files (${n})`,
  clearAll: 'Clear All',
  lessonSettings: 'Lesson Settings',
  lessonSettingsDesc: 'Subject, grade, duration, student level',
  teacherName: 'Teacher Name',
  teacherNamePlaceholder: 'Enter your name',
  lessonTitleLabel: 'Lesson Title',
  lessonTitlePlaceholder: 'Lesson title (optional)',
  subject: 'Subject',
  selectSubject: 'Select subject',
  grade: 'Grade',
  selectGrade: 'Select grade',
  duration: 'Duration',
  studentLevel: 'Student Level',
  institution: 'Institution & Logo',
  sahlahAcademy: 'Sahlah Academy',
  furqanSchool: 'Al-Furqan International School',
  bothInstitutions: 'Both Institutions',
  contentLanguage: 'Output Language',
  arabic: 'Arabic',
  english: 'English',
  chooseOutput: 'Choose what to generate',
  generating: 'Generating...',
  genError: 'An error occurred during generation. Please try again.',
  genLessonPlan: 'Lesson Plan',
  genLessonPlanDesc: 'Full table matching the template',
  genWorksheet: 'Worksheet',
  genWorksheetDesc: 'Ready to print and download',
  genQuiz: 'Short Quiz',
  genQuizDesc: 'Multiple choice + answer key',
  genSlides: 'Slide Summary',
  genSlidesDesc: 'Lesson summary in slides',

  libraryTitle: 'My Library',
  libraryDesc: 'Lessons saved locally in your browser',
  noLessons: 'No saved lessons',
  noLessonsDesc: 'Create a new lesson and save it to see it here',
  openEdit: 'Open & Edit',

  back: 'Back',
  saveLibrary: 'Save to Library',
  saved: 'Saved',
  copy: 'Copy',
  copied: 'Copied',
  print: 'Print',
  exportWord: 'Export Word',
  exportingWord: 'Exporting...',
  exportPDF: 'Export PDF',
  titlePlaceholder: 'Lesson title',
  editorPlaceholder: 'Start typing...',
  tbUndo: 'Undo',
  tbRedo: 'Redo',
  tbPlain: 'Plain text',
  tbH1: 'Heading 1',
  tbH2: 'Heading 2',
  tbH3: 'Heading 3',
  tbBold: 'Bold',
  tbItalic: 'Italic',
  tbUnderline: 'Underline',
  tbBulletList: 'Bullet list',
  tbNumberedList: 'Numbered list',
  tbQuote: 'Quote',
  tbTable: 'Insert table',

  footerText: 'Sahla & Furqan EduHub | سَهلة & الفُرقان إديو هَب',

  popupBlocked: 'Please allow pop-up windows to enable printing.',
  apiNotConfigured: 'Gemini API key is not configured. Please contact the administrator.',
};

const strings: Record<UILang, UIStrings> = { ar, en };

const LANG_KEY = 'eduhub_ui_lang';

export function getUILang(): UILang {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === 'en' ? 'en' : 'ar';
}

export function saveUILang(lang: UILang): void {
  localStorage.setItem(LANG_KEY, lang);
}

export function t(lang: UILang): UIStrings {
  return strings[lang];
}

export function dir(lang: UILang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
