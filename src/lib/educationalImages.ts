export interface EducationalImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  titleAr: string;
  titleEn: string;
  category: 'arabic_islamic' | 'science' | 'math' | 'history_geo' | 'tech' | 'general';
  tags: string[];
}

// Curated 100% Sharia-Compliant Educational High-Res Photos (Unsplash Verified Safe Public Domain / Open License)
export const SAFE_EDUCATIONAL_IMAGES: EducationalImage[] = [
  // 1. اللغة العربية والتربية الإسلامية (Arabic & Islamic Studies)
  {
    id: 'arb_01',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=60',
    titleAr: 'كتب ومخطوطات عريقة وريشة كتابة',
    titleEn: 'Ancient Manuscripts and Pen',
    category: 'arabic_islamic',
    tags: ['لغة عربية', 'قراءة', 'بلاغة', 'كتب', 'مخطوطة', 'نحو', 'أدب', 'شعر', 'قلم'],
  },
  {
    id: 'arb_02',
    url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=300&q=60',
    titleAr: 'مكتبة كلاسيكية هادئة للدراسة والبحث',
    titleEn: 'Classical Study Library',
    category: 'arabic_islamic',
    tags: ['مكتبة', 'تعليم', 'قراءة', 'لغة عربية', 'دراسة', 'بحث', 'تأمل'],
  },
  {
    id: 'arb_03',
    url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=300&q=60',
    titleAr: 'زخارف معمارية إسلامية وهندسة أندلسية',
    titleEn: 'Islamic Architectural Geometry',
    category: 'arabic_islamic',
    tags: ['تربية إسلامية', 'عمارة إسلامية', 'زخارف', 'تاريخ إسلامي', 'حضارة', 'أندلس'],
  },
  {
    id: 'arb_04',
    url: 'https://images.unsplash.com/photo-1584281722576-904d6e91ea6b?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1584281722576-904d6e91ea6b?auto=format&fit=crop&w=300&q=60',
    titleAr: 'إضاءة هادئة ومصحف شريف وقراءة',
    titleEn: 'Spiritual Reading and Light',
    category: 'arabic_islamic',
    tags: ['قرآن كريم', 'تربية إسلامية', 'تفسير', 'حديث', 'فقه', 'عبادة', 'نور'],
  },

  // 2. العلوم والفيزياء والكيمياء والأحياء (Science & Biology & Physics)
  {
    id: 'sci_01',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=300&q=60',
    titleAr: 'مجهر مخبري وأدوات فحص علمي',
    titleEn: 'Laboratory Microscope',
    category: 'science',
    tags: ['علوم', 'مجهر', 'أحياء', 'كيمياء', 'فحص', 'خلية', 'مختبر', 'استكشاف'],
  },
  {
    id: 'sci_02',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=300&q=60',
    titleAr: 'أدوات كيمياء وأنابيب اختبار ملونة',
    titleEn: 'Chemistry Glassware',
    category: 'science',
    tags: ['كيمياء', 'تفاعلات', 'مركبات', 'علوم', 'مختبر', 'سوائل', 'تجارب'],
  },
  {
    id: 'sci_03',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=60',
    titleAr: 'أوراق نباتية خضراء وعملية البناء الضوئي',
    titleEn: 'Plant Leaves & Photosynthesis',
    category: 'science',
    tags: ['نباتات', 'أحياء', 'بيئة', 'بناء ضوئي', 'طبيعة', 'أشجار', 'علوم'],
  },
  {
    id: 'sci_04',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=60',
    titleAr: 'كوكب الأرض من الفضاء والفلك الكوني',
    titleEn: 'Planet Earth and Cosmos',
    category: 'science',
    tags: ['فضاء', 'فلك', 'أرض', 'كواكب', 'نجوم', 'جاذبية', 'فيزياء', 'شمس'],
  },
  {
    id: 'sci_05',
    url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=300&q=60',
    titleAr: 'طاقة نظيفة ومصادر الطاقة المتجددة',
    titleEn: 'Clean & Renewable Energy',
    category: 'science',
    tags: ['طاقة', 'فيزياء', 'كهرباء', 'طاقة شمسية', 'رياح', 'توليد', 'بيئة'],
  },

  // 3. الرياضيات والهندسة (Mathematics & Geometry)
  {
    id: 'mth_01',
    url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300&q=60',
    titleAr: 'أشكال وتراكيب هندسية ثلاثية الأبعاد',
    titleEn: 'Geometric Geometric Shapes',
    category: 'math',
    tags: ['رياضيات', 'هندسة', 'أشكال', 'مثلثات', 'زوايا', 'حساب', 'أبعاد'],
  },
  {
    id: 'mth_02',
    url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=300&q=60',
    titleAr: 'معادلات رياضية ومفاهيم حسابية متقدمة',
    titleEn: 'Mathematical Equations',
    category: 'math',
    tags: ['معادلات', 'جبر', 'تفاضل', 'تكامل', 'رياضيات', 'أرقام', 'دوال'],
  },
  {
    id: 'mth_03',
    url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=300&q=60',
    titleAr: 'مسطرة وفرجار وأدوات الرسم الهندسي',
    titleEn: 'Architectural Ruler & Compass',
    category: 'math',
    tags: ['فرجار', 'مسطرة', 'قياس', 'رسم هندسي', 'دائرة', 'زوايا', 'رياضيات'],
  },

  // 4. التاريخ والجغرافيا والدراسات الاجتماعية (History & Geography)
  {
    id: 'geo_01',
    url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=300&q=60',
    titleAr: 'خريطة العالم وتضاريس الكرة الأرضية',
    titleEn: 'World Map & Continents',
    category: 'history_geo',
    tags: ['جغرافيا', 'خرائط', 'تضاريس', 'قارات', 'دول', 'مناخ', 'أنهار', 'جبال'],
  },
  {
    id: 'geo_02',
    url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=300&q=60',
    titleAr: 'معالم أثرية وتاريخ الحضارات',
    titleEn: 'Historic Architectural Monuments',
    category: 'history_geo',
    tags: ['تاريخ', 'حضارة', 'آثار', 'معالم', 'دراسات اجتماعية', 'تراث'],
  },
  {
    id: 'geo_03',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=60',
    titleAr: 'قمم الجبال والطبيعة والتضاريس الوعرة',
    titleEn: 'Mountain Peaks & Geography',
    category: 'history_geo',
    tags: ['جبال', 'تضاريس', 'طبيعة', 'سياحة', 'أودية', 'جغرافيا', 'بيئة'],
  },

  // 5. التكنولوجيا والحاسوب والذكاء الاصطناعي (Computer Science & Tech)
  {
    id: 'tch_01',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=60',
    titleAr: 'رموز برمجية وشبكات الحاسوب الرقمية',
    titleEn: 'Code & Digital Networks',
    category: 'tech',
    tags: ['حاسوب', 'برمجة', 'تقنية', 'ذكاء اصطناعي', 'شبكات', 'أمن سيبراني', 'بيانات'],
  },
  {
    id: 'tch_02',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=60',
    titleAr: 'معالج دقيق ودوائر إلكترونية متطورة',
    titleEn: 'Microprocessor & Chip',
    category: 'tech',
    tags: ['إلكترونيات', 'معالج', 'عتاد', 'تقنية', 'حاسب', 'دوائر', 'روبوت'],
  },

  // 6. التعليم الصفي العام والإرشاد التربوي (General Education & Classroom)
  {
    id: 'edu_01',
    url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=300&q=60',
    titleAr: 'أدوات مدرسية وأقلام ودفاتر ملونة',
    titleEn: 'School Stationery & Learning',
    category: 'general',
    tags: ['تعليم', 'أدوات', 'مدرسة', 'أقلام', 'دفاتر', 'واجبات', 'نشاط'],
  },
  {
    id: 'edu_02',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=300&q=60',
    titleAr: 'مجموعة كتب مرتبة بشكل أنيق',
    titleEn: 'Organized Stack of Books',
    category: 'general',
    tags: ['كتب', 'معرفة', 'مكتبة', 'ثقافة', 'تحصيل علمي', 'مذاكرة'],
  },
];

/**
 * Automatically find the most relevant safe educational image based on subject and title
 */
export function getRecommendedImageForSlide(
  subject: string,
  title: string,
  slideIndex: number
): EducationalImage {
  const query = `${subject} ${title}`.toLowerCase();

  // Search by tags
  const matched = SAFE_EDUCATIONAL_IMAGES.filter((img) =>
    img.tags.some((tag) => query.includes(tag.toLowerCase()))
  );

  if (matched.length > 0) {
    return matched[slideIndex % matched.length];
  }

  // Fallback by subject category
  if (query.includes('عرب') || query.includes('إسلام') || query.includes('قرآن') || query.includes('دين')) {
    const list = SAFE_EDUCATIONAL_IMAGES.filter((img) => img.category === 'arabic_islamic');
    return list[slideIndex % list.length];
  }

  if (query.includes('علوم') || query.includes('فيزياء') || query.includes('كيمياء') || query.includes('أحياء') || query.includes('نبات') || query.includes('طاقة')) {
    const list = SAFE_EDUCATIONAL_IMAGES.filter((img) => img.category === 'science');
    return list[slideIndex % list.length];
  }

  if (query.includes('رياضيات') || query.includes('هندسة') || query.includes('حساب') || query.includes('جبر')) {
    const list = SAFE_EDUCATIONAL_IMAGES.filter((img) => img.category === 'math');
    return list[slideIndex % list.length];
  }

  if (query.includes('حاسوب') || query.includes('تقنية') || query.includes('برمجة') || query.includes('ذكاء')) {
    const list = SAFE_EDUCATIONAL_IMAGES.filter((img) => img.category === 'tech');
    return list[slideIndex % list.length];
  }

  if (query.includes('تاريخ') || query.includes('جغرافيا') || query.includes('دراسات') || query.includes('اجتماع')) {
    const list = SAFE_EDUCATIONAL_IMAGES.filter((img) => img.category === 'history_geo');
    return list[slideIndex % list.length];
  }

  // Overall fallback
  return SAFE_EDUCATIONAL_IMAGES[slideIndex % SAFE_EDUCATIONAL_IMAGES.length];
}

/**
 * Filter safe educational images based on custom search query
 */
export function searchSafeImages(query: string): EducationalImage[] {
  const q = query.trim().toLowerCase();
  if (!q) return SAFE_EDUCATIONAL_IMAGES;

  return SAFE_EDUCATIONAL_IMAGES.filter(
    (img) =>
      img.titleAr.toLowerCase().includes(q) ||
      img.titleEn.toLowerCase().includes(q) ||
      img.tags.some((t) => t.toLowerCase().includes(q))
  );
}
