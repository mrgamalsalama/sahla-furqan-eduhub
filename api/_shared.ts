import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

// Clean Institution Headers
function getInstitutionHeader(settings: any): string {
  const isAr = settings.contentLanguage === 'ar';
  const inst = settings.institution;

  const titleText =
    inst === 'sahlah'
      ? (isAr ? 'أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ' : 'Sahlah Academy')
      : inst === 'furqan'
      ? (isAr ? 'مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ' : 'Al-Furqan International School')
      : (isAr ? 'أَكَادِيمِيَّةُ سَهْلَةَ الدَّوْلِيَّةُ & مَدْرَسَةُ الْفُرْقَانِ الْعَالَمِيَّةُ' : 'Sahlah Academy & Al-Furqan International School');

  return `<div style="text-align:center; margin-bottom:18px; padding-bottom:12px; border-bottom:2px solid #e2e8f0;">
    <h2 style="font-size:1.35rem; font-weight:800; color:#1e3a8a; margin:0 0 4px 0;">${titleText}</h2>
  </div>`;
}

export function getApiKey(): string | undefined {
  let key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.startsWith('MY_')) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envText = fs.readFileSync(envPath, 'utf-8');
        const match = envText.match(/GEMINI_API_KEY=([^\r\n]+)/);
        if (match && match[1].trim() && !match[1].startsWith('MY_')) {
          key = match[1].trim();
        }
      }
    } catch {
      // ignore
    }
  }
  return key && !key.startsWith('MY_') ? key.trim() : undefined;
}

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

export async function callGemini(contents: any) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error(
      'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ في بيئة Vercel. يرجى إضافة GEMINI_API_KEY في Project Settings > Environment Variables.'
    );
    (err as any).statusCode = 401;
    throw err;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let lastError: any;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });
        return response;
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        const isTransient =
          errMessage.includes('503') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('429') ||
          errMessage.includes('high demand');
        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        console.warn(`Model ${model} failed, trying next:`, errMessage);
        lastError = err;
        break;
      }
    }
  }
  throw lastError;
}

export function formatApiError(error: any): { status: number; message: string } {
  const rawMessage = error?.message || String(error);
  const customStatus = error?.statusCode;
  if (customStatus) {
    return { status: customStatus, message: rawMessage };
  }

  if (
    rawMessage.includes('API key not valid') ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('401') ||
    rawMessage.includes('Unauthorized') ||
    rawMessage.includes('غير مهيأ') ||
    rawMessage.includes('ACCOUNT_STATE_INVALID')
  ) {
    return {
      status: 401,
      message: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير صالح أو تم إلغاؤه في Google Cloud. يرجى توليد مفتاح جديد وضبطه في Vercel.',
    };
  }

  if (
    rawMessage.includes('503') ||
    rawMessage.includes('UNAVAILABLE') ||
    rawMessage.includes('high demand')
  ) {
    return {
      status: 503,
      message: 'خدمة الذكاء الاصطناعي تشهد ضغطاً مؤقتاً، يرجى إعادة المحاولة بعد لحظات.',
    };
  }

  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'تم تجاوز الحد المسموح به من الطلبات مؤقتاً، يرجى الانتظار دقيقة واحدة.',
    };
  }

  return {
    status: 500,
    message: rawMessage || 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.',
  };
}

export function extractHtml(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```html\s*/i, '');
  cleaned = cleaned.replace(/^```xml\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  return cleaned.trim();
}

function isNonNativeSubject(subject?: string): boolean {
  if (!subject) return false;
  const s = subject.toLowerCase();
  return (
    s.includes('nonnative') ||
    s.includes('non-native') ||
    s.includes('غير الناطقين') ||
    s.includes('afl') ||
    s.includes('foreign')
  );
}

function buildSubjectGuidance(settings: any): string {
  const isAr = settings.contentLanguage === 'ar';
  const nonNative = isNonNativeSubject(settings.subject);
  if (nonNative) {
    return isAr
      ? `\n\nتَوْجِيهَاتٌ خَاصَّةٌ: الْمَادَّةُ مُخَصَّصَةٌ لِغَيْرِ النَّاطِقِينَ بِاللُّغَةِ (AFL). يَجِبُ تَبْسِيطُ التَّرَاكِيبِ اللُّغَوِيَّةِ، وَاقْتِرَاحُ وَسَائِلَ بَصَرِيَّةٍ وَمُعْجَمٍ مُسَاعِدٍ لِلْمُصْطَلَحَاتِ، وَتَكْيِيفُ الْأَسْئِلَةِ لِتُنَاسِبَ مُتَعَلِّمِي اللُّغَةِ الثَّانِيَةِ مَعَ التَّشْكِيلِ التَّامِ.`
      : `\n\nSpecial guidance: This subject is designed for non-native speakers (AFL / Second Language Learners). Simplify language structures, include visual supports and bilingual glossaries, and calibrate difficulty accordingly.`;
  }
  return isAr
    ? `\n\nتَوْجِيهَاتٌ خَاصَّةٌ: الْمَادَّةُ مُخَصَّصَةٌ لِلنَّاطِقِينَ بِاللُّغَةِ. رَكِّزْ عَلَى الْمَهَارَاتِ التَّحْلِيلِيَّةِ وَالْبَلَاغِيَّةِ وَالتَّعْبِيرِ الْعَمِيقِ الْمُنَاسِبِ لِلْمَرْحَلَةِ الْعُمْرِيَّةِ وَالْمَعَايِيرِ الْوَطَنِيَّةِ وَالدَّوْلِيَّةِ.`
    : `\n\nSpecial guidance: Designed for native-level learners. Focus on higher-order analytical, literary, and evaluative competencies appropriate for the grade level.`;
}

function getLmsXmlSchemaDirective(lmsTarget?: string, isAr: boolean = true): string {
  const isSahlah = lmsTarget === 'sahlah_cypher';
  if (isSahlah) {
    return isAr
      ? `\nتَنْبِيهٌ إِصْدَارِ QTI لِأَكَادِيمِيَّةِ سَهْلَةَ (QTI v1.2 ZIP):
يَجِبُ أَنْ يَكُونَ كُودُ XML مُتَوَافِقاً مَعَ مِعْيَارِ IMS QTI v1.2 القياسي مع استخدام وسوم:
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="SAHLAH_ASSESSMENT_01" title="...">
    <section ident="root_section">
      <item ident="Q_01" title="...">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material><mattext texttype="text/html"><![CDATA[نص السؤال المشكول كاملاً]]></mattext></material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
              <response_label ident="A"><material><mattext texttype="text/plain">الخيار الأول</mattext></material></response_label>
              <response_label ident="B"><material><mattext texttype="text/plain">الخيار الثاني</mattext></material></response_label>
              <response_label ident="C"><material><mattext texttype="text/plain">الخيار الثالث</mattext></material></response_label>
              <response_label ident="D"><material><mattext texttype="text/plain">الخيار الرابع</mattext></material></response_label>
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes><decvar varname="SCORE" vartype="Decimal" defaultval="0"/></outcomes>
          <respcondition continue="No">
            <conditionvar><varequal respident="response1">A</varequal></conditionvar>
            <setvar action="Set" varname="SCORE">100</setvar>
          </respcondition>
        </resprocessing>
      </item>
    </section>
  </assessment>
</questestinterop>`
      : `\nQTI Schema Directive for Sahlah Academy (QTI v1.2): Use IMS QTI v1.2 <questestinterop> with <assessment>, <section>, and <item> format.`;
  }

  // Furqan International School (QTI v2.1)
  return isAr
    ? `\nتَنْبِيهٌ إِصْدَارِ QTI لِمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ (QTI v2.1 ZIP):
يَجِبُ أَنْ يَكُونَ كُودُ XML مُتَوَافِقاً مَعَ مِعْيَارِ IMS QTI v2.1 القياسي مع استخدام وسوم:
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" identifier="Q_01" title="..." adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>A</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"><defaultValue><value>0</value></defaultValue></outcomeDeclaration>
  <itemBody>
    <prompt>نص السؤال المشكول كاملاً</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
      <simpleChoice identifier="A">الخيار الأول</simpleChoice>
      <simpleChoice identifier="B">الخيار الثاني</simpleChoice>
      <simpleChoice identifier="C">الخيار الثالث</simpleChoice>
      <simpleChoice identifier="D">الخيار الرابع</simpleChoice>
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`
    : `\nQTI Schema Directive for Al-Furqan International School (QTI v2.1): Use IMS QTI v2.1 XML items with <assessmentItem>, <responseDeclaration>, <itemBody>, and <choiceInteraction>.`;
}

function buildStandardizedPrompt(settings: any, isAr: boolean, ctx: string): string {
  const fw = settings.standardFramework || 'abt';
  const sourceText = settings.sourceText?.trim();
  const isAllMcq = settings.questionFormat === 'all-mcq';
  const lmsTarget = settings.lmsTarget || 'sahlah_cypher';

  let sourceDirective = '';
  if (sourceText) {
    sourceDirective = isAr
      ? `\n\nالْمَادَّةُ الْعِلْمِيَّةُ / النَّصُّ الْمَصْدَرِيُّ الْإِلْزَامِيُّ لِلِاخْتِبَارِ:\n"""\n${sourceText}\n"""\nقَاعِدَةٌ صَارِمَةٌ جِدّاً: يَجِبُ أَنْ تَكُونَ جَمِيعُ أَسْئِلَةِ الِاخْتِبَارِ وَالْفَهْمِ مُسْتَخْرَجَةً حَصْراً مِنْ هَذَا النَّصِّ الْمُرْفَقِ أَعْلَاهُ.`
      : `\n\nMandatory Source Text / Material:\n"""\n${sourceText}\n"""\nStrict rule: All assessment questions must be derived directly from this provided text.`;
  } else {
    sourceDirective = isAr
      ? `\n\nلَمْ يَتِمَّ إِرْفَاقُ نَصٍّ مَصْدَرِيٍّ مُحَدَّدٍ، لِذَلِكَ قُمْ بِتَوْلِيدِ نَصٍّ قِرَائِيٍّ أَوْ سِيَاقٍ عِلْمِيٍّ أَصِيلٍ وَمُلْهِمٍ مُنَاسِبٍ لِلصَّفِّ وَالْمَرْحَلَةِ، وَاضْبِطْهُ بِالشَّكْلِ التَّامِّ ثُمَّ ابْنِ الْأَسْئِلَةَ عَلَيْهِ.`
      : `\n\nNo source text was provided. Generate an authentic, grade-appropriate context/passage and base the assessment upon it.`;
  }

  const formatDirectiveAr = isAllMcq
    ? `\nتَوْجِيهٌ إِلْزَامِيٌّ لِصِيغَةِ الْأَسْئِلَةِ: طَلَبَ الْمُعَلِّمُ صَرَاحَةً نَمَطَ "اخْتِيَارٌ مِنْ مُتَعَدِّدٍ فَقَطْ (All MCQ)". جَمِيعُ الْأَسْئِلَةِ بِلَا اسْتِثْنَاءِ (15 إِلَى 20 سُؤَالاً) يَجِبُ أَنْ تَكُونَ مِنْ نَوْعِ الِاخْتِيَارِ مِنْ مُتَعَدِّدٍ مَعَ 4 بَدَائِلَ (أ، ب، ج، د)، وَمَعَ كُلِّ سُؤَالٍ اكْتُبِ اسْمَ الْمِعْيَارِ الْمَقَاسِ. لَا تَضَعْ أَيَّ أَسْئِلَةٍ مَقَالِيَّةٍ أَوْ مَهَمَّةِ تَعْبِيرٍ فِي هَذَا النَّمَطِ، وَاكْتَفِ بِأَسْئِلَةِ الِاخْتِيَارِ مِنْ مُتَعَدِّدٍ وَمَصْفُوفَةِ الْمَعَايِيرِ وَنَمُوذَجِ الْإِجَابَةِ.`
    : `\nتَوْجِيهٌ لِصِيغَةِ الْأَسْئِلَةِ: اعْتَمِدِ النَّمَطَ الْمُتَنَوِّعَ الشَّامِلَ الْأَصْلِيَّ تَمَاماً (أَسْئِلَةُ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ، وَأَسْئِلَةُ فَهْمٍ وَتَحْلِيلٍ مَقَالِيَّةٍ، وَمَهَمَّةُ إِنْتَاجٍ كِتَابِيٍّ/تَعْبِيرٍ، وَمَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ).`;

  const formatDirectiveEn = isAllMcq
    ? `\nMandatory Question Format: The teacher specified "Multiple Choice Only (All MCQ)". All questions (15 to 20 items) must strictly be 4-option multiple choice items mapped to standards without essay questions.`
    : `\nQuestion Format: Keep the authentic mixed format (MCQs + in-depth analytical questions + writing production task + benchmark matrix).`;

  const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, isAr);

  if (isAr) {
    let frameworkDetails = '';
    if (fw === 'diagnostic_gap' || fw === 'diagnostic') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الِاخْتِبَارُ التَّشْخِيصِيُّ وَمَصْفُوفَةُ رَصْدِ الْفَجَوَاتِ (Diagnostic & Learning Gap Analysis).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ جَاهِزِيَّةِ الطَّالِبِ لِلصَّفِّ الْحَالِيِّ عَبْرَ اخْتِبَارِ الْمَهَارَاتِ الْقَبْلِيَّةِ التَّرَاكُمِيَّةِ (Prerequisite Skills) لِكَشْفِ الْفَاقِدِ التَّعْلِيمِيِّ.
عَنَاصِرُ الْإِطَارِ:
- أَسْئِلَةٌ تَشْخِيصِيَّةٌ مُعَيَّرَةٌ مَعَ مُشَتَّتَاتٍ مَبْنِيَّةٍ عَلَى أَخْطَاءٍ مَفَاهِيمِيَّةٍ شَائِعَةٍ.
- جَدْوَلُ مَصْفُوفَةِ تَشْخِيصِ الْفَجَوَاتِ (Diagnostic Gap Matrix): رَقْمُ السُّؤَالِ | الْمَهَارَةُ الْقَبْلِيَّةُ | سَبَبُ الْخَطَأِ الْمُتَوَقَّعِ | نَوْعُ الْفَجْوَةِ | مُسْتَوَى التَّمَكُّنِ (مُتْقَنٌ / حَرِجٌ).
- الْخُطَّةُ الْعِلَاجِيَّةُ وَالتَّدَخُّلَاتُ التَّدْرِيسِيَّةُ الْمُبَاشِرَةُ لِلْمُعَلِّمِ (Targeted Remediation Plan).`;
    } else if (fw === 'map_growth') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَقَايِيسُ التَّقَدُّمِ الدَّوْلِيَّةِ (MAP Growth / RIT Benchmarks).
الْهَدَفُ التَّرْبَوِيُّ: اخْتِبَارٌ مُتَدَرِّجٌ صُعُوبِيّاً مُعَيَّرٌ وِفْقَ نِطَاقَاتِ RIT Score Bands (مِنَ الْمُسْتَوَى التَّأْسِيسِيِّ إِلَى الْمُتَقَدِّمِ).
عَنَاصِرُ الْإِطَارِ:
- تَصْنِيفُ كُلِّ سُؤَالٍ حَسَبَ نِطَاقِ RIT الْمُسْتَهْدَفِ وَمُؤَشِّرِ النُّمُوِّ.
- مَصْفُوفَةُ نِطَاقَاتِ الرِّيت (RIT Proficiency Bands Matrix): دُونَ الْمُسْتَوَى | قَرِيبٌ مِنَ الْمُسْتَوَى | فِي الْمُسْتَوَى | مُتَفَوِّقٌ.
- خُطَّةُ تَفْرِيدِ التَّعَلُّمِ وَالتَّمَايُزِ بِنَاءً عَلَى نَتَائِجِ MAP Growth.`;
    } else if (fw === 'ib_criteria' || fw === 'ib') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ تَقْيِيمِ الْبَكَالُورْيَا الدَّوْلِيَّةِ (IB Assessment Criteria A, B, C, D).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ كَفَايَاتِ الطَّالِبِ التَّحْلِيلِيَّةِ وَالتَّنْظِيمِيَّةِ وَاللُّغَوِيَّةِ وِفْقَ سَلَالِمِ IB (من 1 إلى 8 دَرَجَاتٍ):
- الْمِعْيَارُ أ (Criterion A: Analysing / التَّحْلِيلُ).
- الْمِعْيَارُ ب (Criterion B: Organising / التَّنْظِيمُ).
- الْمِعْيَارُ ج (Criterion C: Producing Text / إِنْتَاجُ النَّصِّ وَالْمُحْتَوَى).
- الْمِعْيَارُ د (Criterion D: Using Language / اسْتِخْدَامُ اللُّغَةِ).
عَنَاصِرُ الْإِطَارِ:
- أَسْئِلَةٌ مُصَنَّفَةٌ صَرَاحَةً تَحْتَ كُلِّ مِعْيَارٍ مَعَ سُلَّمِ تَقْدِيرٍ لَفْظِيٍّ شَامِلٍ (IB Analytical Rubric 1-8).`;
    } else if (fw === 'cambridge_igcse') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ كَامْبِرِيدْج وَإِدِكْسِل الدَّوْلِيَّةُ (Cambridge IGCSE & Checkpoint Mark Scheme).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ أَهْدَافِ التَّقْيِيمِ الثَّلَاثَةِ:
- AO1: الْمَعْرِفَةُ وَالْفَهْمُ الصَّرِيحُ (Knowledge & Understanding).
- AO2: التَّحْلِيلُ وَالتَّفْسِيرُ وَالتَّطْبِيقُ (Analysis & Interpretation).
- AO3: التَّقْيِيمُ وَالِاسْتِنْتَاجُ وَإِبْدَاءُ الرَّأْيِ (Evaluation & Critical Judgement).
عَنَاصِرُ الْإِطَارِ:
- جَدْوَلُ مُوَاصَفَاتِ كَامْبِرِيدْج (Mark Scheme Grid) يُحَدِّدُ مُخَصَّصَاتِ الدَّرَجَاتِ لِكُلِّ سُؤَالٍ مَعَ مَعَايِيرِ قَبُولِ الْإِجَابَاتِ.`;
    } else if (fw === 'us_common_core') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْمَعَايِيرُ الْأَمْرِيكِيَّةُ الْمُشْتَرَكَةُ (US Common Core / CCSS Standards).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ مَعَايِيرِ الْقِرَاءَةِ وَالْكِتَابَةِ وَالرِّيَاضِيَّاتِ وِفْقَ مُسْتَوَيَاتِ عُمْقِ الْمَعْرِفَةِ (Webb's DOK Levels 1-4):
- تَصْنِيفُ كُلِّ سُؤَالٍ وِفْقَ كُودِ الْمِعْيَارِ الدَّقِيقِ (CCSS Strand Code).
- مَصْفُوفَةُ تَوَافُقِ الْمَعَايِيرِ (CCSS Standards Crosswalk Matrix).`;
    } else if (fw === 'cefr_languages' || fw === 'cefr') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْإِطَارُ الْأُورُوبِّيُّ الْمَرْجِعِيُّ لِلُّغَاتِ (CEFR Framework A1 - C2).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ الْكَفَايَاتِ اللُّغَوِيَّةِ التَّوَاصُلِيَّةِ:
- الْمُسْتَوَى التَّأْسِيسِيُّ (A1 / A2) | الْمُسْتَوَى الْمُسْتَقِلُّ (B1 / B2) | مُسْتَوَى الْإِتْقَانِ وَالْكَمَالِ (C1 / C2).
- جَدْوَلُ تَصْنِيفِ الْكَفَايَاتِ الْمُعْجَمِيَّةِ وَالنَّحْوِيَّةِ وَالِاسْتِيعَابِيَّةِ.`;
    } else if (fw === 'pirls_pisa') {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: الْمَعَايِيرُ الدَّوْلِيَّةُ لِلْقِرَاءَةِ وَالْعُلُومِ (PIRLS / PISA Aligned Literacy).
الْهَدَفُ التَّرْبَوِيُّ: قِيَاسُ مَهَارَاتِ التَّفْكِيرِ الْعُلْيَا وَحَلِّ الْمُشْكِلَاتِ فِي سِيَاقَاتِ الْحَيَاةِ الْوَاقِعِيَّةِ:
- الِاسْتِرْجَاعُ وَالْوُصُولُ إِلَى الْمَعْلُومَاتِ الصَّرِيحَةِ.
- الِاسْتِدْلَالُ الْمُبَاشِرُ وَالِاسْتِنْبَاطُ.
- تَفْسِيرُ وَدَمْجُ الْأَفْكَارِ وَالْمَعْلُومَاتِ.
- فَحْصُ وَتَقْيِيمُ الْمُحْتَوَى وَاللُّغَةِ وَالْعَنَاصِرِ النَّصِّيَّةِ.
- مَصْفُوفَةُ مُؤَشِّرَاتِ PISA/PIRLS الدَّوْلِيَّةِ.`;
    } else if (fw === 'abt') {
      const isArabicA = settings.abtTrack !== 'arabic-b';
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: اخْتِبَارُ الْقِيَاسِ الْمِعْيَارِيِّ لِلُّغَةِ الْعَرَبِيَّةِ (ABT - Arabic Benchmark Test) - مَسَارُ: ${
        isArabicA ? 'Arabic A (لِلنَّاطِقِينَ بِاللُّغَةِ الْعَرَبِيَّةِ)' : 'Arabic B (لِغَيْرِ النَّاطِقِينَ بِهَا)'
      }.
أَقْسَامُ الِاخْتِبَارِ: فَهْمُ الْمَقْرُوءِ، قَوَاعِدُ اللُّغَةِ وَالتَّرَاكِيبُ، التَّطْبِيقُ الْبَلَاغِيُّ، مَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ، وَسُلَّمُ التَّقْدِيرِ.`;
    } else {
      frameworkDetails = `الْإِطَارُ الْمُعْتَمَدُ: مَعَايِيرُ خَاصَّةٌ حَدَّدَهَا الْمُعَلِّمُ:
"""\n${settings.customStandards || 'نَوَاتِجُ التَّعَلُّمِ الْمِعْيَارِيَّةُ لِلْمَنْهَجِ'}\n"""`;
    }

    const subCriteriaText = settings.selectedSubCriteria && settings.selectedSubCriteria.length > 0
      ? `\nالْمَعَايِيرُ وَالْمُؤَشِّرَاتُ الْفَرْعِيَّةُ التَّخَصُّصِيَّةُ الْمُخْتَارَةُ مِنَ الْمُعَلِّمِ (يَجِبُ التَّرْكِيزُ عَلَيْهَا فِي الْأَسْئِلَةِ):\n${settings.selectedSubCriteria.map((c) => `- ${c}`).join('\n')}`
      : '';

    const teacherCustomStandardsText = settings.customStandards?.trim()
      ? `\nمَعَايِيرُ إِضَافِيَّةٌ خَاصَّةٌ مَكْتُوبَةٌ بِمَعْرِفَةِ الْمُعَلِّمِ (تَضْمِينٌ إِجْبَارِيٌّ):\n"""\n${settings.customStandards.trim()}\n"""`
      : '';

    return `${ctx}${sourceDirective}${formatDirectiveAr}
المَطْلُوبُ: تَوْلِيدُ "اخْتِبَارٍ مِعْيَارِيٍّ / تَشْخِيصِيٍّ مُتَكَامِلٍ" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ تَشْكِيلاً تَامّاً (100%) عَلَى شَكْلِ HTML احْتِرَافِيٍّ جَاهِزٍ لِلْعَرْضِ وَالطِّبَاعَةِ وَالتَّصْدِيرِ لِلِاعْتِمَادِ التَّرْبَوِيِّ.
تَفَاصِيلُ الْإِطَارِ الْمِعْيَارِيِّ الْمُسْتَهْدَفِ:
${frameworkDetails}
${subCriteriaText}
${teacherCustomStandardsText}

الْهَيْكَلُ الْإِلْزَامِيُّ لِلْمُخْرَجِ (HTML Structure):
1. تَرْوِيسَةُ الِاخْتِبَارِ الْمِعْيَارِيِّ (Assessment Header): بَيَانَاتُ الْمَادَّةِ، الصَّفِّ، نَوْعِ الْإِطَارِ الْمِعْيَارِيِّ، زَمَنِ الِاخْتِبَارِ، وَالدَّرَجَةِ الْكُلِّيَّةِ.
2. نَصُّ الِانْطِلَاقِ / الْمَادَّةُ الْمَصْدَرِيَّةُ (Stimulus Text): فِي إِطَارٍ بَصَرِيٍّ مُمَيَّزٍ وَمَشْكُولٍ 100%.
3. بَنْكُ الْأَسْئِلَةِ الْمِعْيَارِيَّةِ (Item Bank): كُلُّ سُؤَالٍ مَكْتُوبٌ بِوُضُوحٍ وَمُوَضَّحٌ بِجَانِبِهِ اسْمُ الْمِعْيَارِ الْمَقَاسِ وَمُسْتَوَاهُ الْمَعْرِفِيُّ.
4. مَصْفُوفَةُ مُؤَشِّرَاتِ الْأَدَاءِ وَالتَّحْلِيلِ الْمِعْيَارِيِّ (Rubric & Standards Assessment Matrix):
   جَدْوَلٌ رَسْمِيٌّ تَفْصِيلِيٌّ لِلْإِشْرَافِ التَّرْبَوِيِّ يَشْمَلُ الْأَعْمِدَةَ:
   (رَقْمُ السُّؤَالِ | كُودُ وَاسْمُ الْمِعْيَارِ الْمُسْتَهْدَفِ | مُسْتَوَى التَّفْكِيرِ / عُمْقِ الْمَعْرِفَةِ | مُؤَشِّرُ الْأَدَاءِ الْمِعْيَارِيِّ وَدَرَجَةُ الْإِتْقَانِ | الْإِجْرَاءُ التَّدْرِيسِيُّ وَالْخُطَّةُ الْعِلَاجِيَّةُ الْمُقْتَرَحَةُ عِنْدَ الْخَطَأِ).
5. الْخُطَّةُ الْعِلَاجِيَّةُ وَالتَّدَخُّلَاتُ التَّدْرِيسِيَّةُ الْمُبَاشِرَةُ (Remediation & Enrichment Plan).
6. نَمُوذَجُ الْإِجَابَاتِ النَّمُوذَجِيَّةِ وَسُلَّمُ التَّقْدِيرِ اللَّفْظِيِّ (Answer Key & Scoring Rubrics).
7. فِي نِهَايَةِ الْمُخْرَجِ تَمَاماً: كُودُ QTI XML الْكَامِلُ لِلْأَسْئِلَةِ دَاخِلَ:${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- كود QTI XML الصالح هنا -->
]]></div>
اسْتَخْدِمْ وُسُومَ HTML الْقِيَاسِيَّةَ فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.
لَا تَسْتَخْدِمْ وُسُومَ <html> أَوْ <body> أَوْ <style>.`;
  } else {
    let frameworkDetails = '';
    if (fw === 'diagnostic_gap' || fw === 'diagnostic') {
      frameworkDetails = `Framework: Diagnostic Assessment & Learning Gap Analysis.
Key Components:
1. Stimulus / Context text.
2. Diagnostic Item Bank (prerequisite skills testing with diagnostic distractors).
3. Diagnostic Gap Matrix (Item # | Prerequisite Skill | Error Cause | Severity: Mastered / Needs Support / Critical Gap).
4. Targeted Remediation Action Plan for the teacher.
5. Answer Key & Scoring Guide.`;
    } else if (fw === 'map_growth') {
      frameworkDetails = `Framework: MAP Growth / RIT Benchmarks.
Key Components:
1. Calibrated items aligned with RIT score bands (from Below Basic to Advanced).
2. Competency and Growth Indicator tagged per question.
3. RIT Proficiency Bands Matrix (Low, Low Average, Average, High Average, High).
4. Differentiated instructional strategy for each band.
5. Answer Key & Rationale.`;
    } else if (fw === 'ib_criteria' || fw === 'ib') {
      frameworkDetails = `Framework: IB Assessment Criteria (MYP / DP Criteria A, B, C, D with 1-8 Rubrics).
Key Components:
1. Items grouped explicitly under Criteria:
   - Criterion A: Analysing
   - Criterion B: Organising
   - Criterion C: Producing Text / Content
   - Criterion D: Using Language
2. Comprehensive 1-8 achievement level descriptors (Analytical Rubrics).
3. Exemplars and benchmark descriptors.`;
    } else if (fw === 'cambridge_igcse') {
      frameworkDetails = `Framework: Cambridge IGCSE & Checkpoint Mark Scheme.
Key Components:
1. Assessment Objectives: AO1 (Knowledge & Understanding), AO2 (Analysis & Application), AO3 (Evaluation & Judgment).
2. Official Cambridge-style Mark Scheme Table with grade boundaries and criteria for award of marks.`;
    } else if (fw === 'us_common_core') {
      frameworkDetails = `Framework: US Common Core (CCSS Standards) & Webb's Depth of Knowledge (DOK 1-4).
Key Components:
1. Tag each item with specific CCSS strand code and DOK level.
2. CCSS Standards Alignment Crosswalk Table.
3. Formative performance rubric.`;
    } else if (fw === 'cefr_languages' || fw === 'cefr') {
      frameworkDetails = `Framework: CEFR Framework (Levels A1 to C2).
Key Components:
1. Lexical, grammatical, and reading comprehension competency bands.
2. CEFR Can-Do descriptors table and level classification (A1-C2).`;
    } else if (fw === 'pirls_pisa') {
      frameworkDetails = `Framework: PIRLS / PISA Aligned Reading Literacy & Higher-Order Problem Solving.
Key Components:
1. Authentic multi-paragraph stimulus text.
2. Cognitive processes: Retrieve Explicit Information, Straightforward Inferences, Interpret & Integrate, Examine & Evaluate.
3. PISA proficiency scale matrix and holistic rubric.`;
    } else if (fw === 'abt') {
      frameworkDetails = `Framework: Language Benchmark Test (ABT Style).
Key Components: Reading Comprehension, Language Mechanics, Standards Grid, and Assessment Rubric.`;
    } else {
      frameworkDetails = `Framework: Custom Teacher Standards:"""\n${settings.customStandards || 'Align with lesson outcomes'}\n"""`;
    }

    return `${ctx}${sourceDirective}${formatDirectiveEn}
Task: Generate a comprehensive "Standardized / Diagnostic Assessment" strictly in professional academic English formatted in clean HTML ready for display.
Bypass Arabic diacritics rules. Use standard international terminology.
Framework details:
${frameworkDetails}

Required HTML Structure:
1. Assessment Header (Subject, Grade, Framework Type, Duration, Total Marks).
2. Stimulus Text / Context (in an elegant container).
3. Item Bank (each item clearly tagged with target standard / competency).
4. Standards Measurement or Learning Gap Matrix Table.
5. Targeted Remediation Action Plan (Actionable classroom interventions).
6. Official Answer Key & Analytical Rubric.
7. Complete QTI XML payload at the very end inside:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- Valid QTI XML here -->
]]></div>
Use only standard HTML tags: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <blockquote>, <div>.`;
  }
}

function buildBasePrompt(settings: any, outputType: string): string {
  const isAr = settings.contentLanguage === 'ar';
  const subjectGuidance = buildSubjectGuidance(settings);
  const lmsTarget = settings.lmsTarget || 'sahlah_cypher';

  let customStandardsText = '';
  if (settings.customStandards?.trim()) {
    customStandardsText = isAr
      ? `\n- الْمَعَايِيرُ وَالْمُؤَشِّرَاتُ الْإِلْزَامِيَّةُ الْمُحَدَّدَةُ:\n"""\n${settings.customStandards.trim()}\n"""`
      : `\n- Custom Standards/Outcomes to enforce:\n"""\n${settings.customStandards.trim()}\n"""`;
  }

  let teacherPromptText = '';
  if (settings.teacherPrompt?.trim()) {
    teacherPromptText = isAr
      ? `\n\n⚠️ تَوْجِيهَاتٌ وَمُتَطَلَّبَاتٌ خَاصَّةٌ جِدّاً مِنَ الْمُعَلِّمِ (أَوْلَوِيَّةٌ قُصْوَى وَالْتِزَامٌ إِجْبَارِيٌّ 100%):\n"""\n${settings.teacherPrompt.trim()}\n"""\nقَاعِدَةٌ صَارِمَةٌ: هَذِهِ التَّوْجِيهَاتُ كَتَبَهَا الْمُعَلِّمُ بِنَفْسِهِ لِتَحْدِيدِ مَا يُرِيدُهُ بِدِقَّةٍ. يَجِبُ عَلَيْكَ الِالْتِزَامُ التَّامُّ وَالْحَرْفِيُّ بِكُلِّ مَا وَرَدَ فِيهَا، وَتَقْدِيمُهَا عَلَى أَيِّ خِيَارَاتٍ افْتِرَاضِيَّةٍ أَوْ نَمَطِيَّةٍ.`
      : `\n\n⚠️ SPECIAL TEACHER INSTRUCTIONS (STRICT HIGHEST PRIORITY - 100% MANDATORY):\n"""\n${settings.teacherPrompt.trim()}\n"""\nStrict rule: These instructions were explicitly provided by the teacher. You MUST strictly comply with every single requirement, constraint, or emphasis mentioned here above any default options.`;
  }

  if (isAr) {
    const ctx = `أَنْتَ مُعَلِّمٌ خَبِيرٌ وَمُسَاعِدٌ تَرْبَوِيٌّ مُتَقَدِّمٌ لِإِعْدَادِ الدُّرُوسِ وَالْمَنَاهِجِ التَّعْلِيمِيَّةِ التَّابِعَةِ لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ، وَخَبِيرٌ مُتَمَرِّسٌ فِي التَّدْرِيسِ وَالتَّقْيِيمِ لِلُّغَةِ الْعَرَبِيَّةِ وَالْمَنَاهِجِ الدَّوْلِيَّةِ.

قَاعِدَةٌ لُغَوِيَّةٌ إِلْزَامِيَّةٌ وَصَارِمَةٌ:
يَجِبُ تَشْكِيلُ وَضَبْطُ جَمِيعِ النُّصُوصِ، الْعَنَاوِينِ، الْفِقْرَاتِ، الْأَسْئِلَةِ، وَالْخِيَارَاتِ الْمَكْتُوبَةِ بِاللُّغَةِ الْعَرَبِيَّةِ تَشْكِيلاً تَامّاً وَكَامِلاً (حَرَكَاتُ الْإِعْرَابِ وَالْبِنْيَةِ: الْفَتْحَةُ، الضَّمَّةُ، الْكَسْرَةُ، السُّكُونُ، التَّنْوِينُ، وَالشَّدَّةُ) ضَبْطاً نَحْوِيّاً وَصَرْفِيّاً دَقِيقاً بِنِسْبَةِ 100%. لَا تَتْرُكْ أَيَّ كَلِمَةٍ عَرَبِيَّةٍ دُونَ تَشْكِيلٍ تَامٍّ.

مَعْلُومَاتُ الدَّرْسِ:
- الْمَادَّةُ: ${settings.subject || 'غَيْرُ مُحَدَّدٍ'}
- الصَّفُّ الدِّرَاسِيُّ: ${settings.grade || 'غَيْرُ مُحَدَّدٍ'}
- مُدَّةُ الدَّرْسِ: ${settings.duration || 'غَيْرُ مُحَدَّدٍ'}
- مُسْتَوَى الطُّلَّابِ: ${settings.studentLevel || 'غَيْرُ مُحَدَّدٍ'}
- اسْمُ الْمُعَلِّمِ: ${settings.teacherName || 'غَيْرُ مُحَدَّدٍ'}
- عُنْوَانُ الدَّرْسِ: ${settings.lessonTitle || 'سَيَتِمُّ اسْتِنْتَاجُهُ مِنَ الْمُحْتَوَى'}
${subjectGuidance}
${customStandardsText}
${teacherPromptText}`;

    switch (outputType) {
      case 'standardized-test':
        return buildStandardizedPrompt(settings, true, ctx);

      case 'lesson-plan':
        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "خُطَّةِ دَرْسٍ مُعْتَمَدَةٍ" كَامِلَةٍ بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولَةٍ تَشْكِيلاً تَامّاً (100%) عَلَى شَكْلِ HTML مُنَسَّقٍ وَجَاهِزٍ لِلْعَرْضِ وَالطِّبَاعَةِ.

يَجِبُ أَنْ يَحْتَوِيَ HTML عَلَى جَدَاوِلَ مُنَظَّمَةٍ تَمَاماً بِالشَّكْلِ التَّالِي:
1. جَدْوَلُ التَّرْوِيسَةِ: اسْمُ الْمُعَلِّمِ (${settings.teacherName || '—'})، الْمَادَّةُ (${settings.subject || '—'})، الصَّفُّ (${settings.grade || '—'})، عُنْوَانُ الدَّرْسِ (${settings.lessonTitle || '—'})، التَّارِيخُ: —، مُدَّةُ الدَّرْسِ (${settings.duration || '—'}).
2. جَدْوَلُ "الْأَسَاسِيَّاتِ": الْأَهْدَافُ الْعَامَّةُ وَالْخَاصَّةُ، الْمَعَايِيرُ التَّعْلِيمِيَّةُ، الْقِيَمُ الْإِسْلَامِيَّةُ، الْمَصَادِرُ وَتَطْبِيقُ التِّكْنُولُوجِيَا، وَالْمَهَارَاتُ الْحَيَاتِيَّةُ.
3. جَدْوَلُ "خَطَوَاتِ الدَّرْسِ" بِـ 4 أَعْمِدَةٍ: (النَّشَاطُ | الْمُدَّةُ الزَّمَنِيَّةُ | الْوَصْفُ | أَسَالِيبُ التَّقْيِيمِ) وَيَحْتَوِي عَلَى 5 صُفُوفٍ: (النَّشَاطُ التَّحْفِيزِيُّ، الشَّرْحُ الْمُبَاشِرُ، التَّطْبِيقُ الْمُوَجَّهُ، الْعَمَلُ الْفَرْدِيُّ، تَذْكِرَةُ الْخُرُوجِ).
4. جَدْوَلُ "التَّقْيِيمِ".
5. جَدْوَلُ "التَّمَايُزِ وَمُرَاعَاةِ الْفُرُوقِ الْفَرْدِيَّةِ".
6. جَدْوَلُ "مُلَاحَظَاتِ الْمُعَلِّمِ".

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <ul>, <li>, <strong>.
لَا تَسْتَخْدِمْ وُسُومَ <html> أَوْ <body> أَوْ <style>.`;

      case 'worksheet': {
        const ws = settings.worksheetSettings || {};
        const pageCount = ws.pageCount || 2;
        const teacherNotes = ws.teacherCustomPrompt?.trim() || '';
        const standardsSel = ws.standardsSelection?.trim() || '';
        const themeStyle = ws.themeStyle || 'classic';
        const isAutoPilot = ws.aiAutoPilot !== false;

        let themeDirective = '';
        if (themeStyle === 'modern') {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ عَصْرِيٌّ جَذَّابٌ مَعَ إِطَارَاتٍ نَاعِمَةٍ وَبِطَاقَاتٍ لِلْأَنْشِطَةِ وَأَيْقُونَاتٍ تَوْضِيحِيَّةٍ نَصِّيَّةٍ.';
        } else if (themeStyle === 'minimal') {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ أَحَادِيٌّ بَسِيطٌ وَعَالِي الْوُضُوحِ أَبْيَضُ وَأَسْوَدُ مُوَفِّرٌ لِلْحِبْرِ وَمِثَالِيٌّ لِلطِّبَاعَةِ.';
        } else {
          themeDirective = 'التَّنْسِيقُ الْمَرْئِيُّ: نَمَطٌ أَكَادِيمِيٌّ كَلَاسِيكِيٌّ مُحْكَمٌ يَتَضَمَّنُ جَدَاوِلَ وَإِطَارَاتٍ أَنِيقَةً.';
        }

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "وَرَقَةِ عَمَلٍ تَفَاعُلِيَّةٍ مَبْنِيَّةٍ عَلَى هَرَمِ بِلُومَ الْمَعْرِفِيِّ" جَاهِزَةٍ لِلطِّبَاعَةِ بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولَةٍ بِالْكَامِلِ (100%) عَلَى شَكْلِ HTML.

تَخْصِيصَاتُ الْمُعَلِّمِ لِوَرَقَةِ الْعَمَلِ:
- عَدَدُ الصَّفَحَاتِ الْمَطْلُوبَةِ: ${pageCount} صَفَحَاتٍ.
${themeDirective}
${standardsSel ? `- الْمَعَايِيرُ الْمُسْتَهْدَفَةُ: ${standardsSel}` : ''}
${teacherNotes ? `- تَوْجِيهَاتُ وَمُلَاحَظَاتُ الْمُعَلِّمِ الْإِلْزَامِيَّةُ: """\n${teacherNotes}\n"""` : ''}
${isAutoPilot ? '- نِظَامُ الطَّيَّارِ الْآلِيِّ (AI AutoPilot): مُفَعَّلٌ - قُمْ بِتَوْزِيعِ الْأَسْئِلَةِ وَالْأَنْشِطَةِ بِشَكْلٍ مِثَالِيٍّ يَتَدَرَّجُ مِنْ مُسْتَوَيَاتِ التَّذَكُّرِ حَتَّى الِابْتِكَارِ.' : ''}

هَيْكَلُ وَرَقَةِ الْعَمَلِ الْمُتَدَرِّجَةِ حَسَبَ هَرَمِ بِلُومَ:
1. تَرْوِيسَةُ وَرَقَةِ الْعَمَلِ (اسْمُ الطَّالِبِ، الصَّفُّ، التَّارِيخُ، الْمَادَّةُ، الْعُنْوَانُ، الدَّرَجَةُ).
2. الْقِسْمُ الْأَوَّلُ - مُسْتَوَى التَّذَكُّرِ وَالْفَهْمِ (Remembering & Understanding):
   - أَنْشِطَةُ اسْتِرْجَاعِ الْمَفَاهِيمِ الْأَسَاسِيَّةِ، اخْتِيَارٌ مِنْ مُتَعَدِّدٍ، صَحٌّ أَوْ خَطَأٌ مَعَ التَّعْلِيلِ، إِكْمَالُ الْفَرَاغِ.
3. الْقِسْمُ الثَّانِي - مُسْتَوَى التَّطْبِيقِ وَالتَّحْلِيلِ (Applying & Analyzing):
   - مَسَائِلُ تَطْبِيقِيَّةٌ، تَحْلِيلُ فِقْرَةٍ أَوْ شَكْلٍ تَوْضِيحِيٍّ، مُقَارَنَةٌ فِي جَدْوَلٍ، اسْتِنْتَاجُ الْعَلَاقَاتِ.
4. الْقِسْمُ الثَّالِثُ - مُسْتَوَى التَّقْوِيمِ وَالِابْتِكَارِ (Evaluating & Creating):
   - سُؤَالُ تَفْكِيرٍ نَاقِدٍ وَحَلِّ مُشْكِلَاتٍ، إِبْدَاءُ رَأْيٍ مُعَلَّلٍ، تَصْمِيمُ نَشَاطٍ أَوْ إِعَادَةُ صِيَاغَةٍ إِبْدَاعِيَّةٍ.

فَوَاصِلُ الصَّفَحَاتِ:
لِتَوْزِيعِ الْمُحْتَوَى عَلَى ${pageCount} صَفَحَاتٍ، يَجِبُ وَضْعُ فَاصِلِ صَفْحَةٍ بَيْنَ الْأَقْسَامِ عِنْدَ اكْتِمَالِ كُلِّ صَفْحَةٍ بِالصِّيغَةِ التَّالِيَةِ:
<div class="page-break" style="page-break-after: always; break-after: page; margin: 30px 0; border-top: 2px dashed #94a3b8; text-align: center; color: #64748b; font-size: 12px; padding-top: 8px;">--- فَاصِلُ صَفْحَةٍ (Page Break) ---</div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;
      }

      case 'slides': {
        const ps = settings.presentationSettings || {};
        const slideCount = ps.slideCount || 10;
        const depthLevel = ps.depthLevel || 'detailed';
        const visualTheme = ps.visualTheme || 'tech_blue';

        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "عَرْضِ شَرَائِحَ تَقْدِيمِيٍّ حَدِيثٍ عَلَى طَرِيقَةِ GAMMA AI (Gamma-Style Fluid Presentation Deck)" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ (100%)، مُوَزَّعٍ عَلَى ${slideCount} شَرَائِحَ / بِطَاقَاتٍ عَرِيضَةٍ (16:9) جَذَّابَةٍ بَصَرِيّاً وَتَفَاعُلِيّاً.

مَبَادِئُ تَصْمِيمِ شَرَائِحِ GAMMA AI:
1. تَنَوُّعُ أَنْمَاطِ الْبِطَاقَاتِ بَيْنَ الشَّرَائِحِ (Card Layout Variety):
   - الشَّرِيحَةُ الْأُولَى (Hero Cover): عُنْوَانٌ رَئِيسٌ كَبِيرٌ وَمُلْهِمٌ، عُنْوَانٌ فَرْعِيٌّ شَارِحٌ، نَوَاتِجُ التَّعَلُّمِ الْجَوْهَرِيَّةُ، وَبَيَانَاتُ الْمُعَلِّمِ وَالْمَدْرَسَةِ.
   - شَرَائِحُ الْمَفَاهِيمِ وَالْمُقَارَنَاتِ (Split / Columns): عَمُودَانِ (مَفْهُومٌ مُقَابِلَ أَمْثِلَةٍ تَطْبِيقِيَّةٍ، قَاعِدَةٌ مُقَابِلَ نَمُوذَجٍ، أَوْ جَدْوَلٌ بَصَرِيٌّ مُقَارِنٌ).
   - شَرَائِحُ الْأَرْكَانِ وَالْمَحَاوِرِ (3-Column Grid): 3 كُرُوتٍ صَغِيرَةٍ مُتَجَاوِرَةٍ بِأَيْقُونَاتٍ تَعْبِيرِيَّةٍ وَخُلَاصَاتٍ مُرَكَّزَةٍ.
   - شَرَائِحُ التَّسَلْسُلِ وَالْمَرَاحِلِ (Timeline / Step Flow): خُطُوَاتٌ مُرَقَّمَةٌ مُتَتَابِعَةٌ (الْخُطْوَةُ 1 ➔ الْخُطْوَةُ 2 ➔ الْخُطْوَةُ 3).
   - شَرَائِحُ التَّحَدِّي وَالنِّقَاشِ (Interactive Check & Quiz): سُؤَالُ تَفْكِيرٍ نَاقِدٍ أَوْ اخْتِبَارٌ قَصِيرٌ مَعَ إِجَابَةٍ نَمُوذَجِيَّةٍ مُعَلَّلَةٍ.
   - الشَّرِيحَةُ الْخِتَامِيَّةُ (Summary & Takeaways): أَهَمُّ 4 خُلَاصَاتٍ جَوْهَرِيَّةٍ وَتَكْلِيفٌ إِبْدَاعِيٌّ مُرَافِقٌ.

2. دَلِيلُ الْمُعَلِّمِ وَسِينَارْيُو الشَّرْحِ (Teacher Speaker Notes):
   فِي كُلِّ شَرِيحَةٍ دُونَ اسْتِثْنَاءٍ، يَجِبُ تَضْمِينُ صُنْدُوقٍ خَاصٍّ بـ:
   <div class="teacher-notes" style="background:#f8fafc; border-right:4px solid #0284c7; padding:12px 16px; margin-top:16px; border-radius:10px; font-size:0.9em;">
     <strong style="color:#0369a1;">🎙️ دَلِيلُ وَسِينَارْيُو الْمُعَلِّمِ (Speaker Script):</strong>
     <p style="margin:6px 0 8px 0; color:#334155;">نَصُّ مَا يَقُولُهُ الْمُعَلِّمُ لِلطُّلَّابِ لِشَرْحِ هَذِهِ الشَّرِيحَةِ بِأُسْلُوبٍ شَيِّقٍ.</p>
     <strong style="color:#b45309;">❓ سُؤَالُ تَحْفِيزِ النِّقَاشِ:</strong> <span style="color:#475569;">سُؤَالٌ تَفَاعُلِيٌّ مُوَجَّهٌ لِلْفَصْلِ لِإِشْرَاكِ الطُّلَّابِ.</span>
   </div>

3. الْهَيْكَلُ الصَّارِمُ لِكُلِّ شَرِيحَةٍ (Strict Slide Container):
<div class="slide" data-slide-index="N" data-layout="hero|split|grid|timeline|quiz|summary" style="border:1px solid #e2e8f0; border-radius:16px; padding:28px; margin-bottom:28px; background:#ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:16px;">
    <h2 style="color:#0f172a; margin:0; font-size:1.4rem;">عُنْوَانُ الشَّرِيحَةِ الْمَشْكُولُ</h2>
    <span style="background:#f0fdf4; color:#166534; padding:3px 12px; border-radius:12px; font-size:0.85em; font-weight:700;">الشَّرِيحَةُ N مِنْ ${slideCount}</span>
  </div>
  <div class="slide-content">
    <!-- نِقَاطُ الْمُحْتَوَى، أَعْمِدَةُ الْمُقَارَنَةِ، أَوْ شَبَكَةُ الْبِطَاقَاتِ الْمُصَنَّفَةِ -->
  </div>
  <div class="teacher-notes">
    <!-- دَلِيلُ الشَّرْحِ الصَّفِّيِّ لِلْمُعَلِّمِ -->
  </div>
</div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <div>.`;
      }

      case 'quiz': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, true);
        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "اخْتِبَارٍ قَصِيرٍ شَامِلٍ (QTI)" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ (100%) عَلَى شَكْلِ HTML.

قَوَاعِدُ الِاخْتِبَارِ:
- عَدَدُ الْأَسْئِلَةِ: 10 أَسْئِلَةِ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ فَقَطْ.
- كُلُّ سُؤَالٍ يَتَضَمَّنُ 4 خِيَارَاتٍ مُحَدَّدَةً بِوُضُوحٍ (أ، ب، ج، د).
- نَمُوذَجُ الْإِجَابَةِ الْمُعَلَّلِ (Answer Key & Rationale).
- فِي نِهَايَةِ الْمُخْرَجِ تَمَاماً: كُودُ QTI XML الصَّالِحُ لِجَمِيعِ الْأَسْئِلَةِ الْعَشَرَةِ دَاخِلَ الْوَسْمِ:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- كُودُ QTI XML لِلْأَسْئِلَةِ مِنْ Q_01 إِلَى Q_10 -->
]]></div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;
      }

      case 'qti-exam': {
        const lmsXmlDirective = getLmsXmlSchemaDirective(lmsTarget, true);
        return `${ctx}
الْمَطْلُوبُ: تَوْلِيدُ "امْتِحَانِ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ شَامِلٍ (50 سُؤَال QTI)" بِاللُّغَةِ الْعَرَبِيَّةِ وَمَشْكُولٍ بِالْكَامِلِ (100%) عَلَى شَكْلِ HTML.

قَوَاعِدُ الِامْتِحَانِ الشَّامِلِ:
- 50 سُؤَالَ اخْتِيَارٍ مِنْ مُتَعَدِّدٍ فَقَطْ (4 بَدَائِلَ لِكُلِّ سُؤَالٍ: أ، ب، ج، د).
- التَّوْزِيعُ الْمَعْرِفِيُّ الْمُحْكَمُ حَسَبَ هَرَمِ بِلُومَ:
  * 15 سُؤَالاً: التَّذَكُّرُ وَالْفَهْمُ (Q01 - Q15).
  * 20 سُؤَالاً: التَّطْبِيقُ وَالتَّحْلِيلُ (Q16 - Q35).
  * 15 سُؤَالاً: التَّقْوِيمُ وَالِابْتِكَارُ وَالتَّفْكِيرُ الْعُلْيَا (Q36 - Q50).
- مَصْفُوفَةُ نَوَاتِجِ التَّعَلُّمِ وَجَدْوَلُ الْمُوَاصَفَاتِ.
- نَمُوذَجُ الْإِجَابَةِ الْمُعْتَمَدُ لِجَمِيعِ الْأَسْئِلَةِ الْخَمْسِينَ.
- فِي نِهَايَةِ الْمُخْرَجِ تَمَاماً: كُودُ QTI XML الْكَامِلُ لِلْـ 50 سُؤَالاً دَاخِلَ:
${lmsXmlDirective}
<div id="qti-xml-payload" style="display:none;"><![CDATA[
<!-- كُودُ QTI XML الصَّالِحُ لِجَمِيعِ الْأَسْئِلَةِ مِنْ Q_01 إِلَى Q_50 -->
]]></div>

اسْتَخْدِمْ وُسُومَ HTML فَقَطْ: <h1>, <h2>, <h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>, <strong>, <ol>, <div>.`;
      }

      default:
        return ctx;
    }
  } else {
    // English context
    const ctx = `You are an expert curriculum developer and master teacher assistant for Sahlah Academy and Al-Furqan International School.

LANGUAGE & TERMINOLOGY MANDATE:
Generate the entire educational deliverable strictly in professional academic English. Bypass Arabic diacritics rules. Use standard international terminology (Lesson Objectives, Guided Practice, Formative Assessment, Rubric, Exit Ticket, Differentiation).

Lesson Information:
- Subject: ${settings.subject || 'Not specified'}
- Grade: ${settings.grade || 'Not specified'}
- Duration: ${settings.duration || 'Not specified'}
- Student Level: ${settings.studentLevel || 'Not specified'}
- Teacher Name: ${settings.teacherName || 'Not specified'}
- Lesson Title: ${settings.lessonTitle || 'To be inferred from content'}
${subjectGuidance}
${customStandardsText}`;

    switch (outputType) {
      case 'standardized-test':
        return buildStandardizedPrompt(settings, false, ctx);

      case 'lesson-plan':
        return `${ctx}
Task: Generate a complete "Approved Lesson Plan" in English formatted in clean semantic HTML tables.
Include:
1. Header Table (Teacher, Subject, Grade, Title, Duration, Date).
2. Essentials Table (General & Specific Objectives, Standards, Islamic Values, Tech & Life Skills).
3. Lesson Procedure Table (4 columns: Activity | Duration | Description | Assessment across 5 phases: Warmup, Direct Instruction, Guided Practice, Independent Work, Exit Ticket).
4. Assessment Table.
5. Differentiation Table.
6. Teacher Notes Table.
Use standard HTML tags only.`;

      case 'worksheet': {
        const ws = settings.worksheetSettings || {};
        return `${ctx}
Task: Generate an "Interactive Bloom-Aligned Worksheet" in English formatted in clean HTML ready for printing.
- Page Count: ${ws.pageCount || 2} pages with <div class="page-break" style="page-break-after: always; break-after: page; margin: 30px 0; border-top: 2px dashed #94a3b8; text-align: center; color: #64748b; font-size: 12px; padding-top: 8px;">--- Page Break ---</div>.
- Progressive Bloom Levels: Remembering & Understanding -> Applying & Analyzing -> Evaluating & Creating.
${ws.teacherCustomPrompt ? `- Teacher Instructions: ${ws.teacherCustomPrompt}` : ''}
Use clean HTML tags only.`;
      }

      case 'slides': {
        const ps = settings.presentationSettings || {};
        const slideCount = ps.slideCount || 10;
        return `${ctx}
Task: Generate a comprehensive "Slide Deck" in English as HTML for ${slideCount} slides.
Enclose each slide inside <div class="slide" data-slide-index="N"> with title, content cards, and teacher notes.`;
      }

      case 'quiz':
        return `${ctx}
Task: Generate a "Short Quiz" with 10 multiple-choice questions in English as HTML with Answer Key and QTI XML payload inside <div id="qti-xml-payload" style="display:none;"><![CDATA[...]]></div>.`;

      case 'qti-exam':
        return `${ctx}
Task: Generate a comprehensive "50-Question Bloom Exam (QTI)" in English with full QTI XML payload inside <div id="qti-xml-payload" style="display:none;"><![CDATA[...]]></div>.`;

      default:
        return ctx;
    }
  }
}

// Handler for Generate
export async function executeGenerate(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { settings = {}, outputType = 'lesson-plan', files = [] } = body || {};

    let prompt = buildBasePrompt(settings, outputType);
    const isAr = settings.contentLanguage === 'ar';

    // 1. Process files with text content (Word .docx, PowerPoint .pptx, Text .txt, etc.)
    if (Array.isArray(files) && files.length > 0) {
      const textFiles = files.filter((f: any) => f.textContent && f.textContent.trim().length > 0);
      if (textFiles.length > 0) {
        prompt += isAr
          ? `\n\n📚 مُسْتَنَدَاتٌ وَمَلَفَّاتٌ مَصْدَرِيَّةٌ مُرْفَقَةٌ مِنَ الْمُعَلِّمِ (Word / PowerPoint / PDF / Text):
قَاعِدَةٌ إِلْزَامِيَّةٌ حَوْلَ الْمَلَفَّاتِ الْمُرْفَقَةِ: هَذِهِ الْمَلَفَّاتُ هِيَ الْمَصْدَرُ الْأَسَاسِيُّ لِلدَّرْسِ أَوْ الِاخْتِبَارِ. اعْتَمِدْ عَلَيْهَا كُلِّيّاً فِي اسْتِخْرَاجِ الْمَفَاهِيمِ وَالْأَمْثِلَةِ وَالْأَسْئِلَةِ وَالتَّطْبِيقَاتِ:\n`
          : `\n\n📚 ATTACHED SOURCE DOCUMENTS & MATERIALS (Word / PowerPoint / PDF / Text):
Strict rule: Use the attached content below as the primary reference for this generation:\n`;

        textFiles.forEach((file: any, idx: number) => {
          const fileTypeLabel = (file.type || 'DOCUMENT').toUpperCase();
          prompt += `\n--- مَلَفٌّ ${idx + 1} [${fileTypeLabel}]: ${file.name} ---\n${file.textContent}\n`;
        });
      }
    }

    // 2. Process binary files (PDFs and Images) passed to Gemini inlineData
    const binaryMediaFiles = Array.isArray(files)
      ? files.filter(
          (f: any) =>
            f.base64 &&
            (f.type === 'image' ||
              f.type === 'pdf' ||
              f.mimeType?.startsWith('image/') ||
              f.mimeType === 'application/pdf')
        )
      : [];

    let response;
    if (binaryMediaFiles.length > 0) {
      const parts: any[] = [];
      binaryMediaFiles.forEach((media: any) => {
        const cleanBase64 = media.base64?.replace(/^data:[^;]+;base64,/, '') || '';
        if (cleanBase64) {
          parts.push({
            inlineData: {
              mimeType: media.mimeType || (media.type === 'pdf' ? 'application/pdf' : 'image/png'),
              data: cleanBase64,
            },
          });
        }
      });
      parts.push({ text: prompt });
      response = await callGemini(parts);
    } else {
      response = await callGemini(prompt);
    }

    const text = response.text || '';
    const htmlContent = extractHtml(text);
    const institutionHeader = getInstitutionHeader(settings);

    const isAr = settings.contentLanguage === 'ar';
    const direction = isAr ? 'rtl' : 'ltr';
    const alignment = isAr ? 'right' : 'left';

    const fullHtml = `<div dir="${direction}" lang="${settings.contentLanguage || 'ar'}" style="direction: ${direction}; text-align: ${alignment}; font-family: inherit;">${institutionHeader}${htmlContent}</div>`;

    const titlePrefix =
      outputType === 'worksheet'
        ? (isAr ? 'وَرَقَةُ عَمَلٍ تَفَاعُلِيَّةٌ' : 'Interactive Worksheet')
        : outputType === 'slides'
        ? (isAr ? 'عَرْضُ شَرَائِحَ تَعْلِيمِيٌّ' : 'Slide Deck')
        : outputType === 'quiz'
        ? (isAr ? 'اخْتِبَارٌ قَصِيرٌ' : 'Short Quiz')
        : outputType === 'qti-exam'
        ? (isAr ? 'امْتِحَانُ بِلُومَ الشَّامِلُ' : 'Comprehensive Bloom Exam')
        : outputType === 'standardized-test'
        ? (isAr ? 'اخْتِبَارٌ مِعْيَارِيٌّ / تَشْخِيصِيٌّ' : 'Benchmark Assessment')
        : (isAr ? 'خُطَّةُ دَرْسٍ مُعْتَمَدَةٌ' : 'Approved Lesson Plan');

    const title = settings.lessonTitle
      ? `${titlePrefix} - ${settings.lessonTitle}`
      : `${titlePrefix} - ${settings.subject || ''} - ${settings.grade || ''}`;

    return res.status(200).json({ contentHtml: fullHtml, title });
  } catch (error: any) {
    console.error('executeGenerate error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

// Handler for Question-to-QTI Converter
export async function executeConvertQti(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { rawText = '', lmsTarget = 'sahlah_cypher', title = 'اختبار مستورد', subject = '', grade = '' } = body || {};

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'يرجى لصق نص الأسئلة المراد تحويلها.' });
    }

    const lmsDirective = getLmsXmlSchemaDirective(lmsTarget, true);

    const prompt = `أنت مهندس اختبارات وأنظمة تعليمية خبير في معايير IMS QTI لمنصات LMS (أكاديمية سهلة Cypher، ومدارس الفرقان Canvas).
أمامك نص غير منظم لأسئلة كتبها أو نسخها المعلم:

"""
${rawText}
"""

المطلوب بدقة:
1. تحليل واستخراج كل سؤال بدقة:
   - نص السؤال كاملاً مع تشكيله تشكيلاً تاماً بنسبة 100%.
   - الخيارات الأربعة (أ، ب، ج، د / A, B, C, D) مشكولة تماماً.
   - تحديد الإجابة الصحيحة الصريحة بدقة.
   - تحديد درجة السؤال (Default 1 mark).
   - كتابة تعليل تربوي موجز لسبب صحة الخيار.

2. إخراج المخرجين معاً:
   المخرج الأول: جدول HTML منسق وأنيق لمعاينة الأسئلة ومراجعتها (نص السؤال، الخيارات مع تمييز الإجابة الصحيحة بلون أخضر، التعليل، والدرجة).
   المخرج الثاني: كود QTI XML صالح تماماً ومطابق لمعايير منصة المستهدفة (${lmsTarget})، مشكول بنسبة 100% ومغلف داخل:
   <div id="qti-xml-payload" style="display:none;"><![CDATA[
   <!-- كود XML الصالح هنا -->
   ]]></div>

${lmsDirective}

أخرج كود HTML فقط بدون أسوار markdown (\`\`\`html).`;

    const response = await callGemini(prompt);
    const text = response.text || '';
    const cleanedHtml = extractHtml(text);

    // Extract XML payload
    let qtiXml = '';
    const xmlMatch = cleanedHtml.match(/<div id="qti-xml-payload"[^>]*>([\s\S]*?)<\/div>/i);
    if (xmlMatch && xmlMatch[1]) {
      qtiXml = xmlMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
    }

    return res.status(200).json({
      previewHtml: cleanedHtml,
      qtiXml: qtiXml || '<!-- تم تضمين الأسئلة في المعاينة أعلاه -->',
      title: title || `اختبار QTI - ${subject} ${grade}`.trim(),
    });
  } catch (error: any) {
    console.error('executeConvertQti error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

// Advisor Prompt constants
const ADVISOR_PROMPT_AR = `أَنْتَ "الْمُسْتَشَارُ التَّرْبَوِيُّ الذَّكِيُّ" لِأَكَادِيمِيَّةِ سَهْلَةَ الدَّوْلِيَّةِ وَمَدْرَسَةِ الْفُرْقَانِ الْعَالَمِيَّةِ.
دَوْرُكَ تَقْدِيمُ اسْتِشَارَاتٍ دَقِيقَةٍ وَعَمَلِيَّةٍ لِلْمُعَلِّمِينَ فِي:
- اسْتِرَاتِيجِيَّاتِ التَّدْرِيسِ الْحَدِيثَةِ (التَّعَلُّمِ النَّشِطِ، الصَّفِّ الْمَقْلُوبِ، الِاسْتِقْصَاءِ، التَّمَايُزِ الحَقِيقِيِّ).
- إِدَارَةِ الصَّفِّ وَضَبْطِ السُّلُوكِ وَالدَّافِعِيَّةِ وَتَصْمِيمِ الْأَنْشِطَةِ وَالْمَشَارِيعِ.
- صِيَاغَةِ الْأَسْئِلَةِ وَفْقَ مُسْتَوَيَاتِ بِلُومَ وَبُنُوكِ الْأَسْئِلَةِ.
- تَعْلِيمِ اللُّغَةِ الْعَرَبِيَّةِ لِلنَّاطِقِينَ بِغَيْرِهَا (AFL).
كُنْ دَاعِماً، مِهْنِيّاً، وَقَدِّمْ أَمْثِلَةً عَمَلِيَّةً وَقَابِلَةً لِلتَّطْبِيقِ الْفَوْرِيِّ مَعَ ضَبْطِ الْإِجَابَاتِ بِالشَّكْلِ التَّامِّ.`;

const ADVISOR_PROMPT_EN = `You are the "Smart Pedagogical Advisor" for Sahlah Academy and Al-Furqan School.
Provide practical, pedagogical guidance on active learning, differentiation, assessment design, classroom management, and curriculum enrichment.
Be supportive, professional, and practical.`;

export async function executeAdvisor(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { history = [], newMessage, lang = 'ar' } = body || {};
    const isAr = lang === 'ar';
    const systemPrompt = isAr ? ADVISOR_PROMPT_AR : ADVISOR_PROMPT_EN;
    const userTag = isAr ? 'الْمُعَلِّمُ' : 'Teacher';
    const advisorTag = isAr ? 'الْمُسْتَشَارُ' : 'Advisor';

    const promptParts: string[] = [systemPrompt];
    (history || []).forEach((msg: any) => {
      const roleTag = msg.role === 'user' ? userTag : advisorTag;
      promptParts.push(`${roleTag}: ${msg.content}`);
    });
    promptParts.push(`${userTag}: ${newMessage}\n${advisorTag}:`);

    const fullPrompt = promptParts.join('\n\n');
    const response = await callGemini(fullPrompt);

    return res.status(200).json({ text: response.text || '' });
  } catch (error: any) {
    console.error('executeAdvisor error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

export async function executeRubric(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { subject, grade, assignmentTitle, maxScore, lang = 'ar' } = body || {};
    const isAr = lang !== 'en';
    const total = maxScore || 20;

    const prompt = isAr
      ? `أَنْتَ خَبِيرُ قِيَاسٍ وَتَقْوِيمٍ تَرْبَوِيٍّ وَإِعْدَادِ مَعَايِيرِ تَقْيِيمٍ وَمَنَاهِجَ.
قُمْ بِصِيَاغَةِ "سُلَّمِ تَقْدِيرٍ لَفْظِيٍّ تَحْلِيلِيٍّ (Analytic Rubric)" مُفَصَّلٍ وَمُحْكَمٍ لِتَقْيِيمِ الْمَهَمَّةِ التَّالِيَةِ:
- الْمَادَّةُ: ${subject || 'عَامٌّ'}
- الصَّفُّ: ${grade || 'غَيْرُ مُحَدَّدٍ'}
- عُنْوَانُ السُّؤَالِ أَوْ الْمَهَمَّةِ: ${assignmentTitle || 'تَقْيِيمٌ كِتَابِيٌّ / أَدَائِيٌّ'}
- الدَّرَجَةُ الْإِجْمَالِيَّةُ الْكُلِّيَّةُ: ${total} دَرَجَةً.

الْمَطْلُوبُ:
جَدْوَلٌ تَحْلِيلِيٌّ كَامِلٌ بِمَعَايِيرَ وَاضِحَةٍ وَمُسْتَوَيَاتِ أَدَاءٍ (مُمْتَازٌ، جَيِّدٌ جِدّاً، مَقْبُولٌ، يَحْتَاجُ تَحْسِيناً) مَعَ تَشْكِيلِ النُّصُوصِ كَامِلَةً (100%).
أَخْرِجْ كُودَ HTML فَقَطْ بِدُونِ أَسْوَارِ كُودِ markdown.`
      : `You are an expert educational assessment specialist.
Create an analytic grading rubric for:
- Subject: ${subject || 'General'}
- Grade: ${grade || 'Unspecified'}
- Assignment Title: ${assignmentTitle || 'Written / Performance Task'}
- Total Max Score: ${total} points.
Return clean HTML table only without markdown fences.`;

    const response = await callGemini(prompt);
    const rubric = extractHtml(response.text || '');
    return res.status(200).json({ rubric });
  } catch (error: any) {
    console.error('executeRubric error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}

export async function executeGrade(req: any, res: any) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageFile, context } = body || {};
    const { subject, grade, assignmentTitle, rubricOrModelAnswer, maxScore = 20, lang = 'ar' } = context || {};
    const isAr = lang !== 'en';

    if (!imageFile || !imageFile.base64) {
      return res.status(400).json({ error: 'ملف الصورة غير موجود أو تالف.' });
    }

    const cleanBase64 = imageFile.base64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = isAr
      ? `أَنْتَ مُعَلِّمٌ خَبِيرٌ فِي التَّصْحِيحِ وَالتَّقْوِيمِ التَّرْبَوِيِّ الدَّقِيقِ.
أَمَامَكَ صُورَةٌ لِإِجَابَةِ طَالِبٍ مَكْتُوبَةٍ بِخَطِّ الْيَدِ.
مَعْلُومَاتُ التَّكْلِيفِ:
- الْمَادَّةُ: ${subject}
- الصَّفُّ: ${grade}
- عُنْوَانُ التَّكْلِيفِ / الِاخْتِبَارِ: ${assignmentTitle}
- الدَّرَجَةُ الْقُصْوَى: ${maxScore}
${rubricOrModelAnswer ? `- سُلَّمُ التَّقْدِيرِ / الْإِجَابَةُ النَّمُوذَجِيَّةُ الْمَرْجِعِيَّةُ:\n${rubricOrModelAnswer}` : ''}

قُمْ بِقِرَاءَةِ خَطِّ الْيَدِ بِدِقَّةٍ مُتَنَاهِيَةٍ، وَتَصْحِيحِ كُلِّ جُزْءٍ وَتَقْدِيمِ التَّغْذِيَةِ الرَّاجِعَةِ وَالدَّرَجَةِ الْمُسْتَحَقَّةِ وَتَوْصِيَاتٍ عِلَاجِيَّةٍ مَشْكُولَةٍ تَشْكِيلاً تَامّاً (100%).
أَخْرِجِ النَّتِيجَةَ كُودَ HTML نَظِيفٍ فَقَطْ بِدُونِ وُسُومِ markdown.`
      : `You are an expert teacher grading a student handwritten submission.
Context:
- Subject: ${subject}
- Grade: ${grade}
- Assignment: ${assignmentTitle}
- Max Score: ${maxScore}
${rubricOrModelAnswer ? `- Reference Rubric / Answer Key:\n${rubricOrModelAnswer}` : ''}

Transcribe the handwriting carefully, grade each question, provide constructive feedback, calculate total score out of ${maxScore}, and suggest next steps.
Return clean HTML only without markdown fences.`;

    const response = await callGemini([
      {
        inlineData: {
          mimeType: imageFile.mimeType || 'image/png',
          data: cleanBase64,
        },
      },
      { text: prompt },
    ]);

    const html = extractHtml(response.text || '');
    return res.status(200).json({ html });
  } catch (error: any) {
    console.error('executeGrade error:', error);
    const { status, message } = formatApiError(error);
    return res.status(status).json({ error: message, details: error?.message });
  }
}
