import { useState, useRef } from 'react';
import {
  FileCheck2, ArrowRight, ArrowLeft, X, Loader2,
  AlertCircle, Sparkles, BookOpen, Wand2, Eye, Edit3, Trash2,
  CheckCircle2, Table as TableIcon, Plus, PenTool,
  Scale, FileText, Check, ShieldCheck
} from 'lucide-react';
import type { UploadedFile, OutputType, GenerationResult, InstitutionId } from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN, INSTITUTIONS } from '@/types';
import { uid } from '@/lib/storage';
import { gradeHandwrittenSubmission, generateRubricForAssignment } from '@/lib/gemini';
import type { UILang } from '@/lib/i18n';

interface GraderPageProps {
  onBack: () => void;
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

interface RubricPreset {
  id: string;
  titleAr: string;
  titleEn: string;
  badge: string;
  maxScore: number;
  subjectMatch?: string;
  html: string;
}

export interface CustomCriterionItem {
  id: string;
  name: string;
  points: number;
  descriptor: string;
}

type RubricSourceMode = 'preset' | 'ai_extract' | 'custom_builder';
type CustomInputStyle = 'interactive' | 'freeform';

const RUBRIC_PRESETS: RubricPreset[] = [
  {
    id: 'arabic_essay',
    titleAr: 'تعبير وكتابة إبداعية / مقال',
    titleEn: 'Arabic Composition & Essay',
    badge: 'كتابة وتعبير (20 د)',
    maxScore: 20,
    subjectMatch: 'اللغة العربية (للناطقين بها)',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:right;">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:800; width:26%;">الْمِعْيَارُ وَالْوَزْنُ</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَمَيِّزٌ (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَقَدِّمٌ (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مَقْبُولٌ (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">بِحَاجَةٍ لِدَعْمٍ (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. الْمُحْتَوَى وَعُمْقُ الْأَفْكَارِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أفكار إبداعية عميقة ومترابطة، مع شواهد وأدلة مقنعة واستيعاب تام للموضوع (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أفكار واضحة ومترابطة مع شواهد مناسبة وتفاصيل داعمة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أفكار عامة تقليدية مع شواهد محدودة وبعض التشتت (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أفكار مشتتة أو سطحية، وخروج عن الفكرة الرئيسة (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. الْبِنَاءُ وَالتَّرَابُطُ التَّنْظِيمِيُّ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">مقدمة جاذبة، فقرات متناسقة بروابط لغوية محكمة، وخاتمة ملهمة وملخصة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">بناء منظم ومقدمة وخاتمة واضحتان مع حسن توظيف أدوات الربط (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تقسيم الفقرات غير منتظم، وروابط الانتقال بين الأفكار ركيكة (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">غياب التقسيم إلى فقرات وتداخل عشوائي للجمل دون روابط (1.5 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. الثَّرْوَةُ اللُّغَوِيَّةُ وَالْأُسْلُوبُ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">توظيف بليغ للمفردات الفصيحة وتراكيب بلاغية وخيال شائق ومؤثر (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">لغة سليمة ومفردات متنوعة مع بعض الصور التعبيرية المناسبة (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">لغة بسيطة ومباشرة وتكرار مستمر في الألفاظ والتراكيب (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ركاكة في الأسلوب واستخدام ألفاظ عامية أو غير دقيقة (1.5 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. الصِّحَّةُ النَّحْوِيَّةُ وَالصَّرْفِيَّةُ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خلو تام من الأخطاء الإعرابية والنحوية، وسلامة تامة لتركيب الجمل (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء نحوية نادرة لا تؤثر على وضوح المعنى وبناء الجمل (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء نحوية متكررة في المبتدأ والخبر، والفاعل، والمجرورات (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">كثرة الأخطاء النحوية التي تخل بالمعنى العام للجمل (1.5 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">5. السَّلَامَةُ الْإِمْلَائِيَّةُ وَالتَّرْقِيمُ (3 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">صحة تامة لرسم الهمزات والتنوين، استخدام احترافي للترقيم، وخط مقروء (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء إملائية نادرة جداً، توظيف جيد لعلامات الترقيم، وخط واضح (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء في همزات الوصل والقطع والتاء المربوطة، وإهمال الترقيم (1.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء إملائية فادحة تشوه الكلمات مع خط غير مقروء (1 د أو أقل).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'dictation_grammar',
    titleAr: 'إملاء وخط وقواعد لغوية',
    titleEn: 'Dictation & Grammar Rules',
    badge: 'الإملاء والخط (15 د)',
    maxScore: 15,
    subjectMatch: 'اللغة العربية (للناطقين بها)',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:right;">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:800; width:26%;">الْمِعْيَارُ وَالْوَزْنُ</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَمَيِّزٌ (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَقَدِّمٌ (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مَقْبُولٌ (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">بِحَاجَةٍ لِدَعْمٍ (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. صِحَّةُ الْهَمَزَاتِ وَالتَّنْوِينِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">كتابة الهمزات بأنواعها ورسم التنوين بدقة تامة دون أي خطأ (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خطأ إملائي واحد غير متكرر في رسم همزة متوسطة أو متطرفة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء متكررة (2-3 أخطاء) في همزة الوصل والقطع والتنوين (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أكثر من 4 أخطاء إملائية تشير لخلط مفاهيمي في القواعد الإملائية (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. الضَّبْطُ الْإِعْرَابِيُّ وَسَلَامَةُ النَّحْوِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ضبط دقيق لأواخر الكلمات ومراعاة الموقع الإعرابي دون أي لحن (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ضبط إعرابي سليم مع خطأ إعرابي يسير واحد لا يخل بالمعنى (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إغفال ضبط أواخر بعض الكلمات أو خطآن إعرابيان في التراكيب الأساسية (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">عجز عن الضبط الإعرابي ووجود أخطاء فادحة في الحركات الأساسية (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. جَوْدَةُ الْخَطِّ وَالتَّرْقِيمِ وَالنَّظَافَةِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط رقعة أو نسخ جميل ومقروء بوضوح تام، وتوظيف مثالي للترقيم وتنظيم الورقة (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط واضح ومقروء مع توظيف مناسب لعلامات الترقيم الأساسية (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط متوسط الصعوبة في القراءة مع شطب يسير وإهمال الترقيم (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط غير مقروء وكثرة الشطب وتشتت النص (2 د أو أقل).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'math_science',
    titleAr: 'حل مسألة رياضية / تجربة علمية',
    titleEn: 'Math Problem Solving & Science Lab',
    badge: 'الرياضيات والعلوم (20 د)',
    maxScore: 20,
    subjectMatch: 'الرياضيات',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:right;">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:800; width:26%;">الْمِعْيَارُ وَالْوَزْنُ</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَمَيِّزٌ (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَقَدِّمٌ (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مَقْبُولٌ (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">بِحَاجَةٍ لِدَعْمٍ (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. فَهْمُ الْمَسْأَلَةِ وَالْمُعْطَيَاتِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">استخراج كامل للمعطيات والمطلوب بدقة، وتمثيل المسألة برسم أو مخطط (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تحديد صحيح للمعطيات والمطلوب مع فهم واضح لجوهر المسألة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تحديد جزئي للمعطيات مع إغفال بعض التفاصيل الأساسية (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">فهم خاطئ للمسألة أو خلط بين المعطيات والمطلوب (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. اخْتِيَارُ الْقَانُونِ وَالْمَنْهَجِيَّةِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">اختيار القانون العلمي الصحيح وتوضيح صيغته وعلاقاته الرياضية (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">اختيار صحيح للقانون والمنهجية مع تطبيق مباشر وسليم (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">اختيار قانون تقريبي أو غير مكتمل الصيغة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">استخدام قانون خاطئ لا يمت للمسألة بصلة (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. دِقَّةُ الْعَمَلِيَّاتِ الْحِسَابِيَّةِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تسلسل منطقي متدرج للخطوات خالٍ تماماً من أخطاء الحساب والتحويل (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خطوات حل مرتبة مع خطأ حسابي بسيط غير مؤثر على المنهجية (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">قفز على الخطوات وأخطاء حسابية متعددة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">عشوائية في العمليات وأخطاء حسابية فادحة (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. النَّتِيجَةُ وَوَحَدَاتُ الْقِيَاسِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">وصول للناتج النهائي الصحيح مع كتابة وحدة القياس وتفسير منطقي (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ناتج صحيح مع نسيان كتابة وحدة القياس أو خطأ طفيف بها (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ناتج نهائي غير دقيق رغم صحة المنهجية العامة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ناتج خاطئ دون وحدات ودون تحقق من منطقية النتيجة (2 د أو أقل).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'reading_analysis',
    titleAr: 'فهم مقروء وتحليل نصوص',
    titleEn: 'Reading Comprehension & Analysis',
    badge: 'النصوص والقراءة (20 د)',
    maxScore: 20,
    subjectMatch: 'اللغة العربية (للناطقين بها)',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:right;">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:800; width:26%;">الْمِعْيَارُ وَالْوَزْنُ</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَمَيِّزٌ (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَقَدِّمٌ (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مَقْبُولٌ (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">بِحَاجَةٍ لِدَعْمٍ (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. الْأَفْكَارُ الصَّرِيحَةُ وَالضِّمْنِيَّةُ (6 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">استيعاب شامل للفكرة العامة والمغزى الضمني والرسائل الخفية للنص بدقة (6 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">فهم واضح للأفكار المباشرة مع استنتاج جيد لبعض المعاني الضمنية (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">اقتصار على الأفكار السطحية المباشرة مع عجز عن استنتاج المعنى الضمني (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">فهم مغلوط للنص أو ابتعاد عن السياق الأصلي (2 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. التَّحْلِيلُ الدَّلَالِيُّ وَالْبَلَاغِيُّ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تفسير دقيق لمعاني الكلمات في سياقها، وبيان الأثر الجمالي للصور البلاغية (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تحديد سليم لمعظم المفردات وتسمية الصور التعبيرية المناسبة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تفسير معجمي عام للمفردات دون ربط بالسياق، وتحديد سطحي للصور (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">عجز عن فهم الكلمات في سياقها والخلط بين الألوان البيانية (2 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. الِاسْتِنْتَاجُ وَإِبْدَاءُ الرَّأْيِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">حكم نقدي معلل بحجج منطقية قوية من النص وخبرات واقعية موازية (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إبداء رأي سليم مدعوم بتعليل مقبول وشواهد من النص (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إبداء رأي دون تعليل مقنع أو شواهد داعمة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إجابات مقتضبة نعم/لا دون تعليل أو تفكير نقدي (1.5 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. سَلَامَةُ الصِّيَاغَةِ وَالْإِيجَازُ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">صياغة الإجابة بجمل فصيحة تامة المعنى خالية من الحشو والركاكة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">صياغة لغوية سليمة ومفهومة مع حسن التلخيص (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">صياغة مهزوزة مع تكرار ونقل حرفي دون تصرف (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">جمل غير مكتملة المعنى وركاكة شديدة في التعبير (1.5 د).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'islamic_studies',
    titleAr: 'تلاوة وحفظ وتجويد وتربية إسلامية',
    titleEn: 'Islamic Studies & Quran Tajweed',
    badge: 'التربية الإسلامية (20 د)',
    maxScore: 20,
    subjectMatch: 'التربية الإسلامية',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:right;">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:right; font-weight:800; width:26%;">الْمِعْيَارُ وَالْوَزْنُ</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَمَيِّزٌ (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مُتَقَدِّمٌ (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">مَقْبُولٌ (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">بِحَاجَةٍ لِدَعْمٍ (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. صِحَّةُ الْحِفْظِ وَضَبْطُ الْكَلِمَاتِ (6 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">حفظ متقن ومحكم دون أي تردد أو خطأ في تشكيل أو ترتيب الآيات (6 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">حفظ جيد جداً مع تردد يسير أو تصويب ذاتي سريع لخطأ تشكيل واحد (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">حفظ مقبول مع تكرار التردد والوقوف وحاجة لتذكير في بداية الآيات (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ضعف واضح في الحفظ وتداخل في الآيات يستوجب إعادة المراجعة (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. تَطْبِيقُ أَحْكَامِ التَّجْوِيدِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تطبيق متقن لأحكام النون والميم الساكنتين والمدود ومخارج الحروف وصفاتها (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تطبيق سليم لمعظم الأحكام مع نقص يسير في ضبط مقادير المد أو الغنن (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">اقتصار على بعض الأحكام الشائعة مع إغفال أحكام هامة كالإخفاء والإدغام (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">غياب أحكام التجويد الأساسية أو ارتكاب لحن جلي (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. فَهْمُ الْمَفَاهِيمِ وَالْأَحْكَامِ الشَّرْعِيَّةِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">استيعاب عميق للمعاني الإجمالية، واستنباط الدروس المستفادة والأحكام الفقهية (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">فهم واضح للمفاهيم الأساسية والأدلة الشرعية ومفردات الآيات (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">فهم سطحي أو جزئي للمفردات والأحكام الواردة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خلط في المفاهيم الشرعية أو عجز عن بيان المعنى الأساسي (2 د أو أقل).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. حُسْنُ التَّرْتِيلِ وَالْوَقْفِ وَالِابْتِدَاءِ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">صوت ندي خاشع وترتيل هادئ مع التزام دقيق بعلامات الوقف والابتداء (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ترتيل طيب ومراعاة جيدة لعلامات الوقف في معظم المواضع (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">سرعة في القراءة أو وقوف غير مناسب أحياناً يغير المعنى يسيراً (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">قراءة مستعجلة خالية من التأني وإخلال بمواضع الوقف والابتداء (1.5 د).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'english_writing',
    titleAr: 'مقال باللغة الإنجليزية',
    titleEn: 'English Essay & Composition',
    badge: 'English Writing (20 pts)',
    maxScore: 20,
    subjectMatch: 'اللغة الإنجليزية',
    html: `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:left;" dir="ltr">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; width:26%;">Criterion & Weight</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; width:18.5%;">Exemplary (100%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; width:18.5%;">Proficient (80%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; width:18.5%;">Developing (60%)</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; width:18.5%;">Beginning (40%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. Focus & Ideas (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Sharp, insightful thesis; exceptionally well-supported with concrete details (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Clear central idea; well-developed arguments with relevant evidence (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Basic ideas with vague support; occasional digressions from main topic (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Lacks focus or clear thesis; ideas are superficial or off-topic (2).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. Organization & Structure (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Flawless flow, compelling hook, strong transitions, and purposeful conclusion (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Logical paragraph sequence with clear transitions and concluding thought (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Basic paragraphing; some abrupt transitions between ideas (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Disorganized; lack of transitions and confusing structure (2).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. Lexical Resource & Style (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Sophisticated academic vocabulary; vivid imagery and diverse sentence variety (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Appropriate and varied vocabulary; natural phrasing throughout (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Repetitive word choice; simple vocabulary with occasional informalities (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Extremely limited vocabulary; severe spelling errors hinder meaning (2).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. Grammatical Range & Accuracy (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Wide range of complex structures; virtually error-free punctuation (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Mix of simple and complex sentences; occasional minor errors (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Frequent grammatical errors in tenses, agreement, or punctuation (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Persistent systemic grammar errors that distort comprehension (2).</td>
    </tr>
  </tbody>
</table>`,
  },
];

const INITIAL_CUSTOM_CRITERIA: CustomCriterionItem[] = [
  { id: '1', name: 'المحتوى والأفكار والعمق المعرفي', points: 5, descriptor: 'استيعاب كامل للمطلوب وعمق في الطرح ودقة في المعلومات المعروضة' },
  { id: '2', name: 'المنهجية وتسلسل خطوات الحل', points: 5, descriptor: 'ترتيب منطقي وسليم للخطوات والتطبيق العلمي المحكم' },
  { id: '3', name: 'الدقة العلمية والصحة التامة', points: 5, descriptor: 'خلو الإجابة من الأخطاء وسلامة النتائج والتحليل' },
  { id: '4', name: 'التنظيم وحسن العرض وجودة التعبير', points: 5, descriptor: 'وضوح التعبير، سلامة الصياغة، ونظافة وترتيب الإجابة' },
];

export default function GraderPage({ onBack, onOpenResult, uiLang }: GraderPageProps) {
  const isAr = uiLang === 'ar';
  const grades = isAr ? GRADES_AR : GRADES_EN;

  const [image, setImage] = useState<UploadedFile | null>(null);
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [institution, setInstitution] = useState<InstitutionId>('sahlah');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [rubric, setRubric] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [loading, setLoading] = useState(false);
  const [generatingRubric, setGeneratingRubric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // نظام تحديد واختيار المعايير
  const [rubricSourceMode, setRubricSourceMode] = useState<RubricSourceMode>('preset');
  const [rubricViewMode, setRubricViewMode] = useState<'preview' | 'edit'>('preview');
  const [activeRubricLabel, setActiveRubricLabel] = useState<string>('');

  // حالة منشئ المعايير الخاصة بالمعلم
  const [customStyle, setCustomStyle] = useState<CustomInputStyle>('interactive');
  const [customItems, setCustomItems] = useState<CustomCriterionItem[]>(INITIAL_CUSTOM_CRITERIA);
  const [customFreeformText, setCustomFreeformText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith('image/')) {
      setError(isAr ? 'يرجى رفع ملف صورة (JPG, PNG, WebP) لخط اليد' : 'Please upload an image file (JPG, PNG)');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage({
        id: uid(),
        name: file.name,
        type: 'image',
        dataUrl: reader.result as string,
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  // 1. اختيار معيار جاهز
  function applyPreset(preset: RubricPreset) {
    setRubric(preset.html);
    setMaxScore(String(preset.maxScore));
    setRubricViewMode('preview');
    setActiveRubricLabel(isAr ? `قالب جاهز: ${preset.titleAr}` : `Preset: ${preset.titleEn}`);
    setError(null);
    setSuccessNotice(isAr ? `تم تفعيل قالب "${preset.titleAr}" بنجاح!` : `Preset "${preset.titleEn}" activated!`);
    setTimeout(() => setSuccessNotice(null), 3000);
    if (!subject && preset.subjectMatch) {
      setSubject(preset.subjectMatch);
    }
  }

  // 2. استنباط معايير بالذكاء الاصطناعي (مع دعم قراءة الورقة المرفوعة)
  async function handleAutoGenerateRubric() {
    if (!assignmentTitle.trim() && !subject && !image) {
      setError(
        isAr
          ? 'يرجى إرفاق ورقة الأسئلة في الأعلى، أو كتابة عنوان السؤال وتحديد المادة ليستنبط الذكاء الاصطناعي الـ Rubric المناسب'
          : 'Please upload the question paper or enter question title / subject first'
      );
      return;
    }

    setGeneratingRubric(true);
    setError(null);

    try {
      const generated = await generateRubricForAssignment({
        subject,
        grade,
        assignmentTitle,
        maxScore: Number(maxScore) || 20,
        lang: isAr ? 'ar' : 'en',
        imageFile: image ? { base64: image.dataUrl, mimeType: image.mimeType } : null,
      });
      setRubric(generated);
      setRubricViewMode('preview');
      setActiveRubricLabel(
        image
          ? (isAr ? 'مستنبط بالذكاء الاصطناعي من الورقة المرفوعة' : 'AI-Extracted from Uploaded Sheet')
          : (isAr ? 'مستنبط بالذكاء الاصطناعي وفق موضوع السؤال' : 'AI-Generated from Assignment Prompt')
      );
      setSuccessNotice(
        image
          ? (isAr ? 'تم استنباط معايير التقييم بنجاح من ورقة الأسئلة المرفوعة!' : 'Rubric extracted from question paper!')
          : (isAr ? 'تم توليد سلم التقدير اللفظي بالذكاء الاصطناعي بنجاح!' : 'AI Rubric generated successfully!')
      );
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'فشل استنباط سلم التقدير، يرجى المحاولة ثانية' : 'Failed to generate rubric'));
    } finally {
      setGeneratingRubric(false);
    }
  }

  // 3. إدارة معايير المعلم المخصصة
  const customSum = customItems.reduce((acc, it) => acc + (Number(it.points) || 0), 0);
  const targetMax = Number(maxScore) || 20;

  function handleAddCustomCriterion() {
    const nextNum = customItems.length + 1;
    setCustomItems([
      ...customItems,
      {
        id: String(Date.now()),
        name: isAr ? `معيار جديد ${nextNum}` : `New Criterion ${nextNum}`,
        points: 5,
        descriptor: isAr ? 'إتقان متطلبات المعيار بدقة ووضوح' : 'Demonstrates proficiency in this standard',
      },
    ]);
  }

  function handleUpdateCustomCriterion(id: string, updates: Partial<CustomCriterionItem>) {
    setCustomItems(customItems.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function handleRemoveCustomCriterion(id: string) {
    if (customItems.length <= 1) {
      setError(isAr ? 'يجب أن يحتوي سلم التقدير على معيار واحد على الأقل' : 'At least one criterion is required');
      return;
    }
    setCustomItems(customItems.filter((c) => c.id !== id));
  }

  // موازنة أوزان معايير المعلم تلقائياً لتطابق الدرجة الكلية
  function handleBalanceCustomWeights() {
    if (customItems.length === 0) return;
    const count = customItems.length;
    const basePts = Math.floor(targetMax / count);
    const remainder = targetMax - basePts * count;

    const balanced = customItems.map((item, idx) => ({
      ...item,
      points: idx < remainder ? basePts + 1 : basePts,
    }));

    setCustomItems(balanced);
    setSuccessNotice(isAr ? `تمت موازنة درجات المعايير تلقائياً لتساوي ${targetMax} درجة تماماً!` : `Weights balanced to sum to ${targetMax}!`);
    setTimeout(() => setSuccessNotice(null), 3000);
  }

  // تحويل معايير المعلم التفاعلية إلى جدول روبريك رسمي HTML
  function handleApplyCustomInteractiveTable() {
    if (customItems.length === 0) {
      setError(isAr ? 'يرجى إضافة معيار واحد على الأقل' : 'Please add at least one criterion');
      return;
    }

    const tableRows = customItems
      .map((item, idx) => {
        const p = Number(item.points) || 1;
        const p100 = p;
        const p80 = Math.round(p * 0.8 * 10) / 10;
        const p60 = Math.round(p * 0.6 * 10) / 10;
        const p40 = Math.round(p * 0.4 * 10) / 10;

        return `    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">${idx + 1}. ${item.name} (${p} ${isAr ? 'درجات' : 'pts'})</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">${item.descriptor || (isAr ? 'إتقان تام للمعايير المطلوبة واستيفاء كافة الشروط بدقة عالية' : 'Exemplary execution of criteria with high accuracy')} (${p100} د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">${isAr ? 'أداء متقدم ومتقن مع ملاحظات يسيرة لا تخل بالمضمون الأساسي' : 'Proficient performance with minor negligible notes'} (${p80} د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">${isAr ? 'استيفاء المتطلبات الأساسية مع وجود بعض الفجوات في التطبيق أو الدقة' : 'Developing performance meeting basic threshold with noticeable gaps'} (${p60} د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">${isAr ? 'ضعف في الأداء أو نقص ملحوظ يتطلب دعماً وتدريباً علاجياً' : 'Beginning performance needing remediation'} (${p40} د أو أقل).</td>
    </tr>`;
      })
      .join('\n');

    const html = `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:12.5px; text-align:${isAr ? 'right' : 'left'};">
  <thead>
    <tr style="background:#1e3a8a; color:#ffffff;">
      <th style="padding:10px 12px; border:1px solid #cbd5e1; text-align:${isAr ? 'right' : 'left'}; font-weight:800; width:26%;">${isAr ? 'الْمِعْيَارُ وَالْوَزْنُ المخصص' : 'Criterion & Weight'}</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">${isAr ? 'مُتَمَيِّزٌ (100%)' : 'Exemplary (100%)'}</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">${isAr ? 'مُتَقَدِّمٌ (80%)' : 'Proficient (80%)'}</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">${isAr ? 'مَقْبُولٌ (60%)' : 'Developing (60%)'}</th>
      <th style="padding:10px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; width:18.5%;">${isAr ? 'بِحَاجَةٍ لِدَعْمٍ (40%)' : 'Beginning (40%)'}</th>
    </tr>
  </thead>
  <tbody>
${tableRows}
  </tbody>
</table>`;

    setRubric(html);
    setMaxScore(String(customSum));
    setRubricViewMode('preview');
    setActiveRubricLabel(isAr ? 'معايير المعلم الخاصة (تصميم تفاعلي)' : 'Teacher Custom Rubric (Interactive)');
    setError(null);
    setSuccessNotice(isAr ? 'تم بناء جدول المعايير المخصص وتفعيله بنجاح!' : 'Custom rubric table built successfully!');
    setTimeout(() => setSuccessNotice(null), 3000);
  }

  // تحويل نصوص المعلم الحرة إلى روبريك رسمي بالذكاء الاصطناعي
  async function handleAiFormatCustomText() {
    if (!customFreeformText.trim()) {
      setError(isAr ? 'يرجى كتابة معاييرك أو عناصر الإجابة في الصندوق أولاً' : 'Please type your custom criteria first');
      return;
    }

    setGeneratingRubric(true);
    setError(null);

    try {
      const generated = await generateRubricForAssignment({
        subject,
        grade,
        assignmentTitle,
        maxScore: Number(maxScore) || 20,
        lang: isAr ? 'ar' : 'en',
        customCriteriaText: customFreeformText,
        imageFile: image ? { base64: image.dataUrl, mimeType: image.mimeType } : null,
      });
      setRubric(generated);
      setRubricViewMode('preview');
      setActiveRubricLabel(isAr ? 'معايير المعلم الخاصة (مصاغة بالذكاء الاصطناعي)' : 'Teacher Custom Rubric (AI Formatted)');
      setSuccessNotice(isAr ? 'تمت صياغة معاييرك وتنسيقها في جدول روبريك رسمي بنجاح!' : 'Custom criteria formatted into official rubric!');
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'فشلت معالجة المعايير المخصصة' : 'Failed to format custom criteria'));
    } finally {
      setGeneratingRubric(false);
    }
  }

  // 4. إطلاق عملية التصحيح الذكي
  async function handleGrade() {
    if (!image) {
      setError(isAr ? 'يرجى إرفاق صورة ورقة الإجابة أولاً' : 'Please upload the student submission image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const html = await gradeHandwrittenSubmission(image, {
        subject,
        grade,
        assignmentTitle: studentName.trim()
          ? `${assignmentTitle || (isAr ? 'واجب' : 'Task')} (الطالب: ${studentName.trim()})`
          : assignmentTitle,
        rubricOrModelAnswer: rubric,
        maxScore: Number(maxScore) || 20,
        lang: isAr ? 'ar' : 'en',
      });

      // إضافة ترويسة الشعار الخاصة بالمؤسسة المحددة
      const logoImg = (logo: string, alt: string) =>
        `<img src="${logo}" alt="${alt}" style="max-height:55px; width:auto; object-fit:contain; vertical-align:middle;" />`;

      let instHeader = '';
      if (institution === 'sahlah') {
        instHeader = `<div style="text-align:center; margin-bottom:16px;">${logoImg(INSTITUTIONS.sahlah.logo, 'سهلة')}<p style="font-weight:bold; font-size:1rem; margin-top:4px;">${isAr ? INSTITUTIONS.sahlah.ar : INSTITUTIONS.sahlah.en}</p></div>`;
      } else if (institution === 'furqan') {
        instHeader = `<div style="text-align:center; margin-bottom:16px;">${logoImg(INSTITUTIONS.furqan.logo, 'الفرقان')}<p style="font-weight:bold; font-size:1rem; margin-top:4px;">${isAr ? INSTITUTIONS.furqan.ar : INSTITUTIONS.furqan.en}</p></div>`;
      } else {
        instHeader = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">${logoImg(INSTITUTIONS.sahlah.logo, 'سهلة')}<div style="text-align:center; font-weight:bold; font-size:0.95rem;">${isAr ? 'منظومة التصحيح والتقويم المعتمدة' : 'Official Grading System'}</div>${logoImg(INSTITUTIONS.furqan.logo, 'الفرقان')}</div>`;
      }

      const fullHtml = `<div>${instHeader}${html}</div>`;

      const result: GenerationResult = {
        id: uid(),
        title: studentName.trim()
          ? `${isAr ? 'تقرير تصحيح للطالب' : 'Grading Report:'} ${studentName.trim()}`
          : (isAr ? 'تقرير تصحيح الواجب والاختبار' : 'Assignment Grading Report'),
        subject: subject || (isAr ? 'عام' : 'General'),
        grade: grade || '',
        contentHtml: fullHtml,
        html: fullHtml,
        createdAt: new Date().toISOString(),
        institution,
      };

      onOpenResult(result, 'worksheet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'حدث خطأ أثناء تصحيح الورقة. يرجى التأكد من وضوح الصورة والمحاولة مجدداً.' : 'Failed to grade submission'));
    } finally {
      setLoading(false);
    }
  }

  const hasRubricHtml = rubric && /<table/i.test(rubric);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* رأس الصفحة والملاحة */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700 transition font-medium"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
        </button>
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
          {isAr ? '✨ نظام التصحيح والتقويم الذكي المتطور' : 'Smart Handwritten AI Grader'}
        </span>
      </div>

      {/* بطاقة العنوان */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isAr ? 'مصحح الواجبات والاختبارات التحريرية الذكي' : 'Handwritten Assessment & Exam Grader'}
            </h1>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              {isAr
                ? 'ارفع صورة ورقة الطالب المكتوبة بخط اليد؛ واختر معاييرك: إما قوالب معتمدة جاهزة، أو استنباط تلقائي من الورقة بالذكاء الاصطناعي، أو صمم معاييرك الخاصة بالدرجات والمؤشرات.'
                : 'Upload handwritten student work and choose your rubric: pre-made presets, auto-extraction from the paper, or your own custom criteria.'}
            </p>
          </div>
        </div>
      </div>

      {/* تنبيه الأخطاء أو الإشعارات */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="font-bold leading-relaxed">{successNotice}</p>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="p-1 text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* 1. رفع صورة الورقة */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {isAr ? '1. صورة ورقة الطالب أو ورقة الامتحان (خط اليد)' : '1. Student Handwritten Sheet Image'}
          </label>
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-slate-50/50"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isAr ? 'اضغط لاختيار صورة، أو اسحب الصورة وأفلتها هنا' : 'Click to select or drag and drop image here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr ? 'ندعم صور الهاتف، المستندات الممسوحة ضوئياً (JPG, PNG, WebP)' : 'Supports JPG, PNG, WebP up to 15MB'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{image.name}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAr ? 'تم تحميل الصورة بنجاح (جاهزة للتصحيح والاستنباط)' : 'Image loaded (Ready for grading & rubric)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition"
                title={isAr ? 'حذف الصورة' : 'Remove image'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
        </div>

        {/* 2. بيانات المهمة والطالب */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'اسم الطالب (اختياري)' : 'Student Name (Optional)'}
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. John Smith'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'عنوان السؤال أو موضوع التعبير' : 'Question / Essay Prompt'}
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={isAr ? 'مثال: كتابة فقرة إقناعية عن أهمية الوقت وحسن إدارته' : 'e.g. Persuasive essay on time management'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'المادة الدراسية' : 'Subject'}
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
            >
              <option value="">{isAr ? 'اختر المادة' : 'Select Subject'}</option>
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub.id} value={isAr ? sub.ar : sub.en}>
                  {isAr ? sub.ar : sub.en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'الصف الدراسي' : 'Grade'}
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
            >
              <option value="">{isAr ? 'اختر الصف' : 'Select Grade'}</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'الدرجة الكلية المستحقة' : 'Max Score'}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isAr ? 'شعار التقرير (المؤسسة)' : 'Institution'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInstitution('sahlah')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'sahlah' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                سهلة
              </button>
              <button
                type="button"
                onClick={() => setInstitution('furqan')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'furqan' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                الفرقان
              </button>
              <button
                type="button"
                onClick={() => setInstitution('both')}
                className={`p-2 rounded-xl text-xs font-semibold border transition ${
                  institution === 'both' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                كلاهما
              </button>
            </div>
          </div>
        </div>

        {/* 3. مركز معايير التقييم وسلالم التقدير (3 اختيارات كاملة للمعلم) */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/60 via-teal-50/30 to-slate-50 rounded-2xl border border-emerald-200 space-y-4">
          
          {/* رأس قسم المعايير مع إيضاح الخيارات */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                  {isAr ? 'معايير التقييم وسلالم التقدير اللفظي (Rubric Studio)' : 'Grading Rubric Studio'}
                </label>
                <p className="text-[11px] text-slate-500">
                  {isAr
                    ? 'اختر الطريقة الأنسب لك: معايير جاهزة، استنباط ذكي من الورقة، أو كتابة معاييرك الخاصة'
                    : 'Choose your method: pre-made presets, AI extraction from paper, or build custom criteria'}
                </p>
              </div>
            </div>

            {/* شارة المعايير النشطة حالياً */}
            {activeRubricLabel && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-xs">{activeRubricLabel}</span>
              </div>
            )}
          </div>

          {/* تبويبات الاختيار الثلاثة الصريحة للمعلم */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-200/70 rounded-2xl border border-slate-300">
            <button
              type="button"
              onClick={() => setRubricSourceMode('preset')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                rubricSourceMode === 'preset'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <TableIcon className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? '1. اختيار معايير جاهزة' : '1. Pre-made Presets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRubricSourceMode('ai_extract')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                rubricSourceMode === 'ai_extract'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-500" />
              <span>{isAr ? '2. استنباط من الورقة / السؤال' : '2. AI Extraction'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRubricSourceMode('custom_builder')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
                rubricSourceMode === 'custom_builder'
                  ? 'bg-white text-emerald-900 shadow-sm border border-emerald-300/80'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PenTool className="w-4 h-4 text-indigo-600" />
              <span>{isAr ? '3. كتابة وتصميم معاييري الخاصة' : '3. Custom Criteria Builder'}</span>
            </button>
          </div>

          {/* محتوى التبويب 1: اختيار معايير جاهزة */}
          {rubricSourceMode === 'preset' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {isAr ? '⭐ اختر قالباً معتمداً مسبقاً بنقرة واحدة:' : '⭐ Select an approved preset rubric:'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isAr ? 'موزونة وفق نواتج التعلم الدولية' : 'Calibrated to international learning standards'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {RUBRIC_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="flex flex-col items-start p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 bg-white text-right transition group shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700">
                        {isAr ? p.titleAr : p.titleEn}
                      </span>
                      <TableIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                      {p.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* محتوى التبويب 2: استنباط معايير بالذكاء الاصطناعي */}
          {rubricSourceMode === 'ai_extract' && (
            <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-slate-900">
                    {isAr ? 'استنباط معايير ذكية من ورقة الاختبار أو نص السؤال' : 'Smart AI Rubric Synthesis'}
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {image ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isAr
                          ? '📸 صورة الورقة متصلة: سيقوم الذكاء الاصطناعي بقراءة أسئلة الورقة وتحليل المطالب واستنباط روبريك مخصص لها مباشرة!'
                          : 'Sheet image attached: AI will read the questions and tailor the rubric directly to the paper!'}
                      </span>
                    ) : (
                      <span>
                        {isAr
                          ? 'سيستنبط الذكاء الاصطناعي المعايير استناداً إلى عنوان السؤال والمادة والصف والدرجة الكلية. (أو ارفع ورقة الأسئلة في الخطوة 1 أعلاه ليقرأها مباشرة).'
                          : 'AI will synthesize criteria based on question prompt, subject, grade and max score. (Or upload question paper in Step 1 to extract from it).'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoGenerateRubric}
                  disabled={generatingRubric}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60 active:scale-95"
                >
                  {generatingRubric ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جاري قراءة الورقة واستنباط المعايير التربوية...' : 'Extracting from paper & synthesizing...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-amber-300" />
                      <span>
                        {image
                          ? (isAr ? 'استنباط الـ Rubric من الورقة المرفوعة الآن' : 'Extract Rubric from Uploaded Sheet')
                          : (isAr ? 'استنباط الـ Rubric وفق عنوان السؤال والمادة' : 'Auto-Generate Rubric from Prompt')}
                      </span>
                    </>
                  )}
                </button>

                <span className="text-[11px] text-slate-400">
                  {isAr ? `الدرجة المستهدفة: ${maxScore} درجة` : `Target: ${maxScore} pts`}
                </span>
              </div>
            </div>
          )}

          {/* محتوى التبويب 3: كتابة وتصميم معاييري الخاصة (Custom Builder) */}
          {rubricSourceMode === 'custom_builder' && (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-indigo-100 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'تصميم معايير المعلم المخصصة' : 'Teacher Custom Rubric Studio'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isAr
                      ? 'حدد المعايير وأوزان درجاتها بنفسك، أو اكتب عناصر الإجابة بحرية'
                      : 'Define criteria and point weights yourself, or type freeform answer points'}
                  </p>
                </div>

                {/* نمط الإدخال: تفاعلي بالصفوف أو كتابة حرة */}
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCustomStyle('interactive')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      customStyle === 'interactive' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isAr ? 'منشئ المعايير (صفوف تفاعلية)' : 'Interactive Rows'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomStyle('freeform')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                      customStyle === 'freeform' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isAr ? 'كتابة حرة / بنقاط' : 'Freeform Text'}
                  </button>
                </div>
              </div>

              {/* النمط أ: منشئ المعايير التفاعلي بالصفوف */}
              {customStyle === 'interactive' ? (
                <div className="space-y-3">
                  <div className="space-y-2.5">
                    {customItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 transition"
                      >
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* اسم المعيار */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateCustomCriterion(item.id, { name: e.target.value })}
                            placeholder={isAr ? 'اسم المعيار (مثال: المحتوى والأفكار)' : 'Criterion Name'}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                          />
                        </div>

                        {/* وصف أو مؤشر الإتقان */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.descriptor}
                            onChange={(e) => handleUpdateCustomCriterion(item.id, { descriptor: e.target.value })}
                            placeholder={isAr ? 'مؤشر الإتقان أو المطلوب (اختياري)' : 'Performance descriptor (optional)'}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-600"
                          />
                        </div>

                        {/* الدرجة */}
                        <div className="w-24 flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={item.points}
                            onChange={(e) => handleUpdateCustomCriterion(item.id, { points: Number(e.target.value) || 0 })}
                            className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-center text-indigo-900"
                          />
                          <span className="text-[11px] font-bold text-slate-500">
                            {isAr ? 'درجات' : 'pts'}
                          </span>
                        </div>

                        {/* زر حذف المعيار */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomCriterion(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                          title={isAr ? 'حذف هذا المعيار' : 'Remove criterion'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* شريط الدرجات والتحكم */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddCustomCriterion}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 text-xs font-bold shadow-2xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إضافة معيار جديد' : 'Add Criterion'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBalanceCustomWeights}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 text-slate-700 text-xs font-bold shadow-2xs transition"
                        title={isAr ? 'موازنة أوزان المعايير تلقائياً لتطابق الدرجة الكلية' : 'Auto balance weights to match total score'}
                      >
                        <Scale className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isAr ? 'موازنة الدرجات تلقائياً' : 'Auto Balance'}</span>
                      </button>
                    </div>

                    {/* عداد مجموع الدرجات */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">
                        {isAr ? 'مجموع معاييرك:' : 'Sum of criteria:'}
                      </span>
                      <span className={`font-black px-2 py-0.5 rounded-md ${
                        customSum === targetMax ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {customSum} / {targetMax} {isAr ? 'درجة' : 'pts'}
                      </span>
                      {customSum === targetMax ? (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" />
                          {isAr ? 'متطابق' : 'Matched'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-medium">
                          {isAr ? `(يختلف بمقدار ${Math.abs(targetMax - customSum)})` : 'Mismatch'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* زر بناء واعتماد الجدول */}
                  <div className="pt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApplyCustomInteractiveTable}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-700 hover:from-indigo-700 hover:to-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isAr ? 'اعتماد وبناء جدول المعايير المخصص' : 'Build & Apply Custom Rubric Table'}</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {isAr ? 'ينشئ جدول روبريك رسمي بـ 4 مستويات أداء فورياً' : 'Generates a 4-level rubric table instantly'}
                    </span>
                  </div>
                </div>
              ) : (
                /* النمط ب: كتابة حرة وسريعة */
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isAr
                      ? 'اكتب معاييرك أو عناصر الإجابة والدرجات بأي طريقة تناسبك (نقاط، أسطر، ملاحظات المعلم)، وسيتولى الذكاء الاصطناعي تحويلها إلى جدول سلم تقدير رسمي معتمد:'
                      : 'Type your criteria, answer keys, or notes freely. AI will transform them into an official analytic rubric:'}
                  </p>
                  <textarea
                    rows={5}
                    value={customFreeformText}
                    onChange={(e) => setCustomFreeformText(e.target.value)}
                    placeholder={
                      isAr
                        ? `مثال:
1. حل المعادلة التربيعية باستخدام القانون العام (6 درجات)
2. كتابة خطوات التعويض وحساب المميز بدقة (5 درجات)
3. الرسم البياني للدالة وتحديد نقطة الرأس ومحور التماثل (5 درجات)
4. نظافة الورقة ودقة العمليات الحسابية (4 درجات)`
                        : `e.g.
1. Thesis Statement & Arguments (6 pts)
2. Evidence & Textual Citations (5 pts)
3. Grammar and Mechanics (5 pts)
4. Vocabulary and Academic Style (4 pts)`
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-slate-50/50 leading-relaxed font-sans"
                  />

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleAiFormatCustomText}
                      disabled={generatingRubric || !customFreeformText.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-700 hover:from-indigo-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 active:scale-95"
                    >
                      {generatingRubric ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isAr ? 'جاري صياغة المعايير كجدول روبريك رسمي...' : 'Formatting into rubric...'}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-amber-300" />
                          <span>{isAr ? 'تحويل وصياغة معاييري كجدول روبريك رسمي' : 'Format My Criteria into Official Rubric'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRubric(customFreeformText);
                        setRubricViewMode('edit');
                        setActiveRubricLabel(isAr ? 'معايير المعلم النصية المباشرة' : 'Teacher Direct Notes');
                        setSuccessNotice(isAr ? 'تم تطبيق المعايير النصية مباشرة!' : 'Criteria applied directly!');
                        setTimeout(() => setSuccessNotice(null), 3000);
                      }}
                      disabled={!customFreeformText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isAr ? 'تطبيق كنص مباشر دون جدول' : 'Use Direct Text'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* شريط أدوات المعاينة والتعديل المباشر */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {isAr ? 'عرض سلم التقدير النشط للتصحيح:' : 'Active Rubric Display for Grading:'}
              </span>
              {rubric && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  {isAr ? `${maxScore} درجة` : `${maxScore} pts`}
                </span>
              )}
            </div>

            {rubric && (
              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 bg-slate-200 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setRubricViewMode('preview')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      rubricViewMode === 'preview'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? 'معاينة الجدول' : 'Table View'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRubricViewMode('edit')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      rubricViewMode === 'edit'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل نصي' : 'Edit Text'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRubric('');
                    setActiveRubricLabel('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title={isAr ? 'مسح وتفريغ المعايير' : 'Clear Rubric'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* عرض سلم التقدير: جدول أو نص محرر */}
          {rubric ? (
            rubricViewMode === 'preview' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAr ? 'معاينة سلم التقدير اللفظي المعتمد للتصحيح' : 'Active Rubric Preview (Used for grading)'}
                  </span>
                  <span>{isAr ? `الدرجة الكلية: ${maxScore} درجة` : `Total Marks: ${maxScore}`}</span>
                </div>

                {hasRubricHtml ? (
                  <div
                    className="rte-content overflow-x-auto rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                    dir={isAr ? 'rtl' : 'ltr'}
                    dangerouslySetInnerHTML={{ __html: rubric }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 bg-white p-4 rounded-xl border border-slate-200 leading-relaxed shadow-2xs">
                    {rubric}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>{isAr ? 'يمكنك تحرير المعايير أو كود الـ HTML بحرية:' : 'Edit criteria or HTML freely:'}</span>
                  <button
                    type="button"
                    onClick={() => setRubricViewMode('preview')}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    {isAr ? 'العودة لمعاينة الجدول ←' : 'Back to Table View →'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  placeholder={
                    isAr
                      ? 'اكتب المعايير ونموذج الإجابة المخصص هنا...'
                      : 'Type custom criteria or model answer here...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white leading-relaxed font-mono"
                />
              </div>
            )
          ) : (
            <div className="p-4 bg-white/70 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              {isAr
                ? 'لم يتم تحديد معايير بعد. اختر قالباً جاهزاً من التبويب 1، أو اضغط استنباط من التبويب 2، أو صمم معاييرك من التبويب 3.'
                : 'No rubric selected yet. Choose a preset, extract with AI, or design your own criteria above.'}
            </div>
          )}
        </div>

        {/* 4. زر إطلاق التصحيح الذكي واستخراج تقرير الدرجات */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGrade}
            disabled={loading || !image}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 hover:from-emerald-700 hover:via-teal-800 hover:to-emerald-900 text-white rounded-2xl font-black text-sm sm:text-base shadow-md hover:shadow-lg transition flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isAr ? 'جاري فحص خط اليد وتطبيق المعايير ورصد الدرجات...' : 'Grading & Analyzing Handwriting...'}</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-5 h-5" />
                <span>{isAr ? 'بدء التصحيح الذكي واستخراج تقرير الدرجات المعتمد' : 'Start AI Grading & Generate Official Report'}</span>
              </>
            )}
          </button>
          {!image && (
            <p className="text-center text-xs text-slate-400 mt-2">
              {isAr ? 'يرجى تحميل صورة ورقة الطالب في الخطوة الأولى لتفعيل زر التصحيح' : 'Upload student sheet image in step 1 to enable grading'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
