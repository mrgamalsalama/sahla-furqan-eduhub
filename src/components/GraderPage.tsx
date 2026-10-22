import { useState, useRef } from 'react';
import {
  FileCheck2, ArrowRight, ArrowLeft, X, Loader2,
  AlertCircle, Sparkles, BookOpen, Wand2, Eye, Edit3, Trash2,
  CheckCircle2, Table as TableIcon
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
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. صِحَّةُ رَسْمِ الْهَمَزَاتِ وَالتَّاءِ (5 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">تطبيق متقن 100% لقواعد الهمزات والتاء المربوطة والمفتوحة (5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خطأ واحد نادر في قاعدة فرعية مع إتقان القواعد الرئيسة (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خطآن إلى ثلاثة أخطاء في كتابة الهمزات أو التنوين (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">أخطاء متعددة في التمييز بين همزتي الوصل والقطع والتاء المربوطة (2 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. الضَّبْطُ بِالشَّكْلِ وَالْإِعْرَابُ (4 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ضبط دقيق وتام لأواخر الكلمات وحروف العلة والحركات الإعرابية (4 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">ضبط سليم لمعظم الكلمات مع خطأ طفيف في موضع واحد (3.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إهمال الضبط في عدة مواضع أو أخطاء في الحركات الأساسية (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">غياب شبه كامل للتشكيل أو أخطاء إعرابية مستمرة (1.5 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. جَوْدَةُ الْخَطِّ وَرَسْمُ الْحُرُوفِ (3 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط نسخ/رقعة متقن، الحروف مستقرة على السطر بمسافات منتظمة (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط واضح وسهل القراءة مع التزام جيد بالسطر والمسافات (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط مقروء بصعوبة مع تفاوت في أحجام الحروف والمسافات (2 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">خط غير مقروء، وتداخل عشوائي للحروف وميلان غير سليم (1 د).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">4. عَلَامَاتُ التَّرْقِيمِ وَالتَّرْتِيبُ (3 دَرَجَاتٍ)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">توظيف نموذجي لعلامات الترقيم، وورقة مرتبة خالية من الشطب (3 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">توظيف جيد لعلامات الترقيم الأساسية مع ورقة نظيفة (2.5 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">إهمال بعض علامات الترقيم مع وجود شطب طفيف (2 د).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">غياب تام للترقيم وكثرة الشطب وتشتت الورقة (1 د).</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'math_science',
    titleAr: 'مسألة رياضية / تجربة علمية',
    titleEn: 'Math & Science Problem Solving',
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
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">1. Task Achievement (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Fully addresses all prompt parts with insightful ideas and evidence (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Addresses all main parts with relevant supporting points (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Addresses prompt partially with limited development (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Inadequate response; off-topic or superficial (2 or below).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">2. Coherence & Cohesion (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Clear logical progression, seamless transition words, and well-structured paragraphs (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Organized paragraphs with clear transitions and logical flow (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Some awkward transitions; repetitive linking phrases (3).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Lacks paragraph structure; ideas disjointed and confusing (2).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; border:1px solid #cbd5e1; font-weight:bold; background:#f8fafc; color:#1e3a8a;">3. Lexical Resource (5 pts)</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Sophisticated academic vocabulary, natural collocations, and expressive style (5).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Varied vocabulary used appropriately with minor word choice slips (4).</td>
      <td style="padding:8px 10px; border:1px solid #cbd5e1;">Basic vocabulary; frequent repetition of common words (3).</td>
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
  const [rubricViewMode, setRubricViewMode] = useState<'preview' | 'edit'>('preview');

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

  function applyPreset(preset: RubricPreset) {
    setRubric(preset.html);
    setMaxScore(String(preset.maxScore));
    setRubricViewMode('preview');
    setError(null);
    if (!subject && preset.subjectMatch) {
      setSubject(preset.subjectMatch);
    }
  }

  async function handleAutoGenerateRubric() {
    if (!assignmentTitle.trim() && !subject) {
      setError(isAr ? 'يرجى كتابة عنوان السؤال أو تحديد المادة أولاً ليستنبط الذكاء الاصطناعي الـ Rubric المناسب' : 'Please enter question title or select subject first');
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
      });
      setRubric(generated);
      setRubricViewMode('preview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'فشل استنباط سلم التقدير، يرجى المحاولة ثانية' : 'Failed to generate rubric'));
    } finally {
      setGeneratingRubric(false);
    }
  }

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
        instHeader = `<div style="text-align:center; margin-bottom:16px; display:flex; gap:16px; justify-content:center; align-items:center;">${logoImg(INSTITUTIONS.sahlah.logo, 'سهلة')}${logoImg(INSTITUTIONS.furqan.logo, 'الفرقان')}</div>`;
      }

      const fullHtml = `<div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family: inherit;">${instHeader}${html}</div>`;

      onOpenResult(
        {
          contentHtml: fullHtml,
          title: studentName.trim()
            ? `${isAr ? 'تقرير تصحيح' : 'Grading Report'} - ${studentName.trim()}`
            : (assignmentTitle || (isAr ? 'تقرير تصحيح خط اليد' : 'Handwriting Grading Report')),
        },
        'worksheet'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : undefined;
      setError(msg || (isAr ? 'حدث خطأ أثناء فحص وتصحيح الصورة' : 'Error grading submission'));
    } finally {
      setLoading(false);
    }
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const hasRubricHtml = Boolean(rubric && (rubric.includes('<table') || rubric.includes('<div')));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900 mb-6 transition-colors"
      >
        <BackIcon className="w-4 h-4" />
        {isAr ? 'العودة للرئيسية' : 'Back to Home'}
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-xs font-bold mb-3 shadow-xs">
          <FileCheck2 className="w-4 h-4 text-teal-600" />
          {isAr ? 'المُصحح الذكي لخط اليد والأوراق الامتحانية' : 'Smart Handwritten Assessment & OCR Grader'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {isAr ? 'تصحيح إجابات ومقالات الطلاب آلياً بسلم تقدير معتمد' : 'Automated Student Submission Grading'}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm font-medium">
          {isAr
            ? 'ارفع صورة واضحة لورقة إجابة الطالب بخط اليد، واستنبط سلم التقدير اللفظي (Rubric) بضغطة زر ليقوم الذكاء الاصطناعي برصد الدرجات وتصويب الأخطاء وتقديم التغذية الراجعة.'
            : 'Upload student handwriting photo, auto-generate an analytic grading rubric, and obtain automated grading with corrective feedback.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. رفع الصورة */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            {isAr ? 'صورة ورقة إجابة الطالب (بخط اليد) *' : 'Student Handwriting Submission Image *'}
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
                    {isAr ? 'تم تحميل الصورة بنجاح' : 'Image loaded'}
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
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

        {/* 3. سلم التقدير اللفظي المعتمد (Rubric Studio Section) */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 rounded-2xl border border-emerald-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-900 block">
                  {isAr ? 'سلم التقدير اللفظي ونموذج الإجابة المعتمد (Analytic Rubric)' : 'Analytic Rubric & Model Answer'}
                </label>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'معايير تقييم نوعية واضحة وموزعة الدرجات بدقة' : 'Domain-specific qualitative criteria with exact weight breakdown'}
                </p>
              </div>
            </div>

            {/* أزرار التحكم بالاستنباط والتنقل */}
            <div className="flex items-center gap-2">
              {rubric && (
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-xl border border-slate-300">
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
              )}

              {/* زر استنباط الـ Rubric بالذكاء الاصطناعي */}
              <button
                type="button"
                onClick={handleAutoGenerateRubric}
                disabled={generatingRubric}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60 active:scale-95"
              >
                {generatingRubric ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isAr ? 'جاري الاستنباط التربوي...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isAr ? 'استنباط Rubric بالذكاء الاصطناعي' : 'Auto-Generate Rubric'}</span>
                  </>
                )}
              </button>

              {rubric && (
                <button
                  type="button"
                  onClick={() => setRubric('')}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title={isAr ? 'مسح وتفريغ المعايير' : 'Clear Rubric'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* نماذج تربوية جاهزة بنقرة واحدة */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-slate-600">
                {isAr ? '⚡ نماذج وسلالم معتمدة جاهزة (بنقرة واحدة):' : '⚡ 1-Click Approved Rubric Presets:'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {RUBRIC_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 text-xs font-bold text-slate-800 shadow-2xs transition active:scale-95"
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? p.titleAr : p.titleEn}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* محتوى سلم التقدير: عرض الجدول المنسق أو مربع التعديل النصي */}
          {rubric ? (
            rubricViewMode === 'preview' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isAr ? 'معاينة سلم التقدير اللفظي المعتمد (جاهز للتقييم)' : 'Approved Rubric Preview (Active for grading)'}
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
                  <span>{isAr ? 'يمكنك تحرير معايير التقييم أو كتابة نموذج إجابة مخصص:' : 'Edit criteria or type custom answer key:'}</span>
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
            <div className="p-6 bg-white/80 rounded-xl border border-dashed border-emerald-200 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">
                {isAr
                  ? 'لم يتم تحديد سلم تقدير بعد. اختر قالباً جاهزاً من الأعلى أو اضغط "استنباط Rubric بالذكاء الاصطناعي".'
                  : 'No rubric selected yet. Pick a 1-click preset above or click "Auto-Generate Rubric".'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                {isAr
                  ? 'يضمن سلم التقدير دقة التصحيح وتوزيع الدرجات بالتساوي على معايير المحتوى، والأسلوب، والصحة النحوية والإملائية.'
                  : 'Rubric guarantees transparent grading distributed across content depth, grammar, and mechanics.'}
              </p>
            </div>
          )}
        </div>

        {/* 4. زر بدء التصحيح النهائي */}
        <button
          type="button"
          onClick={handleGrade}
          disabled={loading || !image}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري قراءة خط اليد وتدقيق الإجابة واحتساب درجات السلم...' : 'Reading Handwriting & Grading...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{isAr ? 'بدء التصحيح الذكي وإصدار التقرير الرسمي' : 'Grade Submission Now'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
