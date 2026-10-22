import { useState } from 'react';
import {
  Wand2, Loader2, Target, AlertCircle, ArrowLeft, ArrowRight,
  Lightbulb, Compass
} from 'lucide-react';
import type {
  LessonSettings, OutputType, GenerationResult, UploadedFile,
  ContentLang, InstitutionId
} from '@/types';
import { SUBJECT_OPTIONS, GRADES_AR, GRADES_EN } from '@/types';
import type { UILang } from '@/lib/i18n';
import SourceMaterialUpload from './SourceMaterialUpload';
import AiLoadingDhikr from './AiLoadingDhikr';
import { generateContent } from '@/lib/gemini';

interface PerformanceTaskStudioProps {
  onOpenResult: (result: GenerationResult, outputType: OutputType) => void;
  uiLang: UILang;
}

const PRESET_PBL_PROJECTS = [
  {
    topicAr: 'تصميم مدينة ذكية مستدامة خالية من الكربون (Eco-City 2030)',
    topicEn: 'Design an Eco-Smart Carbon-Neutral City (Eco-City 2030)',
    subject: 'science',
    grade: 'الصف التاسع',
    duration: 'أسبوعان (8 حصص)',
    deliverableType: 'prototype',
    goalAr: 'تصميم نموذج لمدينة ذكية تعتمد بنسبة 100% على الطاقة المتجددة وتدوير المياه.',
    roleAr: 'مهندسون بيئيون ومخططو مدن معتمدون لدى الأمم المتحدة.',
    audienceAr: 'لجنة التحكيم المدرسية، ممثلو وزارة البيئة والمجتمع المحلي.',
    situationAr: 'تعاني المدينة من التلوث والازدحام ويُطلب من فريقكم ابتكار خطة تنموية مستدامة.',
    productAr: 'مجسم ثلاثي الأبعاد أو مخطط رقمي تفاعلي مع تقرير دراسة جدوى وملصق علمي.',
    standardsAr: 'معايير الطاقة النظيفة، دقة الحسابات، مهارات العرض والإقناع، والعمل التعاوني.',
  },
  {
    topicAr: 'المحكمة اللغوية الاستقصائية: دفاع عن الفصحى والإعلام الرقمي',
    topicEn: 'Investigative Language Court: Modern Media & Arabic Heritage',
    subject: 'arabic-native',
    grade: 'الصف العاشر',
    duration: 'أسبوع (4 حصص)',
    deliverableType: 'campaign',
    goalAr: 'تقييم تأثير المحتوى الرقمي ووسائل التواصل على الفصاحة والبلاغة وابتكار معجم رقمي شبابي.',
    roleAr: 'محامون استقصائيون وباحثون لغويون وصناع محتوى رقمي.',
    audienceAr: 'إدارة المدرسة، أولياء الأمور، ومجلس طلاب المرحلة الثانوية.',
    situationAr: 'مؤتمر مدرسي للنقاش حول الحفاظ على الهوية اللغوية ومواجهة الركاكة في الإعلانات.',
    productAr: 'محاكاة جلسة محاكمة صفية، كتيّب إلكتروني "دليل الفصاحة الرقمية"، وحملة إنفوجرافيك.',
    standardsAr: 'الفصاحة وضبط الإعراب 100%، الحجج المنطقية، جودة الإخراج، ومهارات الحوار.',
  },
  {
    topicAr: 'تأسيس مشروع ريادي لحل مشكلة هدر الطعام وتدوير الموارد',
    topicEn: 'Entrepreneurial Startup: Zero-Food-Waste Initiative',
    subject: 'social-studies',
    grade: 'الصف الثامن',
    duration: 'أسبوعان',
    deliverableType: 'advisory_report',
    goalAr: 'بناء خطة مشروع ناشئ يربط فائض الأطعمة بالفئات المستحقة ويدور النفايات العضوية إلى سماد.',
    roleAr: 'رواد أعمال شباب ومستشارو استدامة غذائية.',
    audienceAr: 'لجنة دعم المشاريع الصغيرة، أصحاب المطاعم، والجمعيات الخيرية.',
    situationAr: 'تزايد هدر الطعام في المناسبات بنسبة 35% مع الحاجة لحل رقمي لوجستي مستدام.',
    productAr: 'خطة عمل استثمارية، نموذج تطبيق هاتف مقترح، وعرض تقديمي للمستثمرين (Pitch Deck).',
    standardsAr: 'الجدوى الاقتصادية، الأثر المجتمعي، التفكير النقدي، والعمل بروح الفريق.',
  },
];

export default function PerformanceTaskStudio({
  onOpenResult,
  uiLang,
}: PerformanceTaskStudioProps) {
  const isAr = uiLang === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [subject, setSubject] = useState('science');
  const [grade, setGrade] = useState('الصف التاسع');
  const [projectTopic, setProjectTopic] = useState('');
  const [duration, setDuration] = useState('أسبوعان');
  const [teamFormat, setTeamFormat] = useState<'collaborative' | 'individual'>('collaborative');
  const [deliverableType, setDeliverableType] = useState<any>('prototype');

  // GRASPS
  const [graspsGoal, setGraspsGoal] = useState('');
  const [graspsRole, setGraspsRole] = useState('');
  const [graspsAudience, setGraspsAudience] = useState('');
  const [graspsSituation, setGraspsSituation] = useState('');
  const [graspsProduct, setGraspsProduct] = useState('');
  const [graspsStandards, setGraspsStandards] = useState('');

  const [teacherName, setTeacherName] = useState('');
  const [contentLanguage, setContentLanguage] = useState<ContentLang>('ar');
  const [institution, setInstitution] = useState<InstitutionId>('sahlah');
  const [teacherPrompt, setTeacherPrompt] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadPreset(p: typeof PRESET_PBL_PROJECTS[0]) {
    setProjectTopic(isAr ? p.topicAr : p.topicEn);
    setSubject(p.subject);
    setGrade(p.grade);
    setDuration(p.duration);
    setDeliverableType(p.deliverableType);
    setGraspsGoal(p.goalAr);
    setGraspsRole(p.roleAr);
    setGraspsAudience(p.audienceAr);
    setGraspsSituation(p.situationAr);
    setGraspsProduct(p.productAr);
    setGraspsStandards(p.standardsAr);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!projectTopic.trim()) {
      setError(isAr ? 'يرجى إدخال عنوان المشروع أو التحدي أولاً.' : 'Please enter the project topic.');
      return;
    }

    setLoading(true);
    setError(null);

    const settings: LessonSettings = {
      subject,
      grade,
      duration,
      studentLevel: isAr ? 'مستويات متفاوتة' : 'Mixed levels',
      teacherName: teacherName || (isAr ? 'المعلم الفاضل' : 'Teacher'),
      lessonTitle: projectTopic,
      contentLanguage,
      institution,
      teacherPrompt,
      performanceTaskSettings: {
        projectTopic,
        duration,
        teamFormat,
        deliverableType,
        graspsGoal: graspsGoal || undefined,
        graspsRole: graspsRole || undefined,
        graspsAudience: graspsAudience || undefined,
        graspsSituation: graspsSituation || undefined,
        graspsProduct: graspsProduct || undefined,
        graspsStandards: graspsStandards || undefined,
      },
    };

    try {
      const result = await generateContent(settings, 'performance-task', files);
      onOpenResult(result, 'performance-task');
    } catch (err: any) {
      console.error('PBL Generation error:', err);
      setError(err?.message || (isAr ? 'فشل توليد المهمة الأدائية والمشروع.' : 'Failed to generate performance task.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Studio Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900 text-white p-6 sm:p-8 mb-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-bold mb-3">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'التعلم القائم على المشاريع (PBL) & إطار GRASPS المعياري' : 'Project-Based Learning (PBL) Studio'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">
            {isAr ? 'استوديو المهام الأدائية ومشاريع الطلاب الواقعية' : 'Performance Tasks & Authentic PBL Generator'}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-medium">
            {isAr
              ? 'توليد مشاريع تعليمية أصيلة وفق إطار GRASPS المعتمد (الهدف، الدور، الجمهور، السياق، المنتج، والمعايير) مع مراحل تسليم مجدولة، وميثاق فريق، وسلالم تقييم تحليلية رباعية المستويات (Rubrics) للمنتج والعرض والعمل الجماعي.'
              : 'Generate comprehensive authentic projects with GRASPS framework, student milestones, cooperative charters, and 4-level analytical rubrics.'}
          </p>
        </div>
      </div>

      {/* Preset Inspiration Chips */}
      <div className="mb-8 space-y-2">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>{isAr ? 'أفكار مشاريع ملهمة جاهزة للتعبئة الفورية بنقرة زر:' : 'Inspirational PBL Project Templates:'}</span>
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PBL_PROJECTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadPreset(preset)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition text-start shadow-xs group"
            >
              <div className="flex items-center justify-between font-extrabold text-xs text-slate-900 group-hover:text-indigo-900 mb-1">
                <span>{isAr ? preset.topicAr : preset.topicEn}</span>
                <Arrow className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-800 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {isAr ? preset.goalAr : preset.topicEn}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 🌿 دعاء بداية التحضير وتجديد النية */}
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

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Core Settings Box */}
        <div className="card p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-700" />
            <span>{isAr ? '1. البيانات الأساسية للمشروع والتحدي:' : '1. Core Project Metadata:'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'المادة الدراسية:' : 'Subject:'}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field w-full text-xs"
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {isAr ? opt.ar : opt.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'الصف الدراسي:' : 'Grade Level:'}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="input-field w-full text-xs"
              >
                {(isAr ? GRADES_AR : GRADES_EN).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'المدة الزمنية للمشروع:' : 'Project Duration:'}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-field w-full text-xs"
              >
                <option value="أسبوع (4 حصص)">{isAr ? 'أسبوع واحد (4 حصص)' : '1 Week'}</option>
                <option value="أسبوعان (8 حصص)">{isAr ? 'أسبوعان (8 حصص)' : '2 Weeks'}</option>
                <option value="ثلاثة أسابيع">{isAr ? 'ثلاثة أسابيع' : '3 Weeks'}</option>
                <option value="شهر كامل (مشروع فصلي)">{isAr ? 'شهر كامل (مشروع فصلي)' : '1 Month (Term Project)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نمط العمل الطلابي:' : 'Team Organization:'}
              </label>
              <select
                value={teamFormat}
                onChange={(e) => setTeamFormat(e.target.value as any)}
                className="input-field w-full text-xs"
              >
                <option value="collaborative">{isAr ? 'مجموعات تعاونية (3-4 طلاب مع ميثاق وأدوار)' : 'Collaborative Teams (3-4 students)'}</option>
                <option value="individual">{isAr ? 'فردي (مسؤولية وبحث مستقل)' : 'Individual Task'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'نوع المُنتَج النهائي المطلوب:' : 'Deliverable Type:'}
              </label>
              <select
                value={deliverableType}
                onChange={(e) => setDeliverableType(e.target.value)}
                className="input-field w-full text-xs"
              >
                <option value="prototype">{isAr ? 'نموذج أولي / مجسم / منتج تطبيقي' : 'Working Prototype / Model'}</option>
                <option value="campaign">{isAr ? 'حملة توعوية رقمية وملصقات ومحتوى' : 'Awareness Campaign & Media'}</option>
                <option value="advisory_report">{isAr ? 'تقرير استشاري ودراسة حالة وتوصيات' : 'Advisory Case Study Report'}</option>
                <option value="scientific_inquiry">{isAr ? 'بحث علمي ميداني وتجربة موثقة' : 'Field Investigation & Experiment'}</option>
                <option value="multimedia">{isAr ? 'بودكاست / فيلم وثائقي / معرض تفاعلي' : 'Podcast / Documentary / Exhibit'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isAr ? 'المدرسة / الشعار الرسمي:' : 'School Header:'}
              </label>
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value as any)}
                className="input-field w-full text-xs"
              >
                <option value="sahlah">{isAr ? 'أكاديمية سهلة الدولية' : 'Sahlah Academy'}</option>
                <option value="furqan">{isAr ? 'مدرسة الفرقان العالمية' : 'Al-Furqan School'}</option>
                <option value="both">{isAr ? 'كلا المدرستين معاً' : 'Both Schools'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isAr ? 'عنوان المشروع أو التحدي الواقعي:*' : 'Project / Challenge Title:*'}
            </label>
            <input
              type="text"
              required
              value={projectTopic}
              onChange={(e) => setProjectTopic(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تصميم مدينة ذكية مستدامة بيئياً خالية من الانبعاثات (Eco-City 2030)'
                  : 'e.g. Design a Carbon-Neutral Smart City Prototype'
              }
              className="input-field w-full text-xs font-semibold"
            />
          </div>
        </div>

        {/* GRASPS Framework Section */}
        <div className="card p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-600" />
              <span>{isAr ? '2. تفصيل إطار GRASPS المعياري (يمكنك تركه للذكاء الاصطناعي أو تخصيصه):' : '2. GRASPS Framework Breakdown (Optional Customization):'}</span>
            </h3>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              G - R - A - S - P - S
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'G - الهدف المحوري (Goal):' : 'G - Goal:'}
              </label>
              <textarea
                rows={2}
                value={graspsGoal}
                onChange={(e) => setGraspsGoal(e.target.value)}
                placeholder={isAr ? 'الهدف التعليمي وحل المشكلة الواقعية...' : 'The authentic problem solving goal...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'R - دور الطالب المحاكي للواقع (Role):' : 'R - Role:'}
              </label>
              <textarea
                rows={2}
                value={graspsRole}
                onChange={(e) => setGraspsRole(e.target.value)}
                placeholder={isAr ? 'مثال: مهندس بيئي، صحفي استقصائي، رائد أعمال، مستشار طبي...' : 'e.g. Environmental Engineer, Investigative Journalist...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'A - الجمهور المستهدف (Audience):' : 'A - Audience:'}
              </label>
              <textarea
                rows={2}
                value={graspsAudience}
                onChange={(e) => setGraspsAudience(e.target.value)}
                placeholder={isAr ? 'مثال: لجنة التحكيم المدرسية، وزارة البيئة، عملاء محتملون...' : 'e.g. Judging Panel, Municipal Council, Peers...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'S - السياق والموقف الواقعي (Situation):' : 'S - Situation:'}
              </label>
              <textarea
                rows={2}
                value={graspsSituation}
                onChange={(e) => setGraspsSituation(e.target.value)}
                placeholder={isAr ? 'الأزمة المحفزة أو التحدي المعاصر في المدينة أو المجتمع...' : 'The engaging contemporary challenge or crisis...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'P - المنتج أو الأداء (Product/Performance):' : 'P - Product/Performance:'}
              </label>
              <textarea
                rows={2}
                value={graspsProduct}
                onChange={(e) => setGraspsProduct(e.target.value)}
                placeholder={isAr ? 'مواصفات المخرج النهائي وملف التوثيق...' : 'Specifications of the final tangible deliverable...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? 'S - المعايير وسلالم التقييم (Standards & Rubric):' : 'S - Standards & Rubric:'}
              </label>
              <textarea
                rows={2}
                value={graspsStandards}
                onChange={(e) => setGraspsStandards(e.target.value)}
                placeholder={isAr ? 'معايير الإتقان الأكاديمي، جودة العرض، والعمل الجماعي...' : 'Rubric criteria for product, presentation, and teamwork...'}
                className="input-field w-full text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Source Files Upload (Optional) */}
        <SourceMaterialUpload
          files={files}
          onFilesChange={setFiles}
          uiLang={uiLang}
        />

        {/* Custom Teacher Instructions */}
        <div className="card p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            {isAr ? 'توجيهات إضافية خاصة من المعلم (اختياري):' : 'Additional Teacher Directives (Optional):'}
          </label>
          <textarea
            rows={2}
            value={teacherPrompt}
            onChange={(e) => setTeacherPrompt(e.target.value)}
            placeholder={
              isAr
                ? 'مثال: التركيز على أدوات الذكاء الاصطناعي، إضافة متطلب تقييم أقران متبادل، واختيار معايير كامبريدج أو IB...'
                : 'e.g. Include peer-critique protocol, integrate digital portfolio requirements...'
            }
            className="input-field w-full text-xs resize-none"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary py-3 px-8 rounded-2xl text-sm font-extrabold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isAr ? 'جارٍ بناء المهمة الأدائية وسلم التقييم الرباعي...' : 'Generating Performance Task & Rubric...'}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 text-amber-300" />
                <span>{isAr ? 'توليد المهمة الأدائية ومشروع PBL الآن' : 'Generate Authentic PBL Project'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 🌿 شاشة انتظار الذكاء الاصطناعي مع الأذكار والصلاة على النبي ﷺ */}
      <AiLoadingDhikr
        loading={loading}
        message={isAr ? 'جارٍ بناء المهمة الأدائية ومشاريع الطلاب وسلم التقييم الرباعي...' : 'Generating Performance Task & Rubric...'}
        uiLang={uiLang}
      />
    </div>
  );
}
