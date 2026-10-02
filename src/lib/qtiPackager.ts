import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { LmsTarget } from '@/types';

export interface QtiPackageOptions {
  title: string;
  xmlPayload: string;
  target: LmsTarget;
  subject?: string;
  grade?: string;
}

// تنظيف وتجريد أي شوائب أو علامات CDATA أو Markdown مكسورة
function sanitizeRawXml(raw: string): string {
  let cleaned = raw.trim();
  // إزالة وسوم كتل الماركداون
  cleaned = cleaned.replace(/^```(?:xml)?\s*/i, '').replace(/```$/i, '').trim();
  // إزالة وسوم الحاويات النصية إن وجدت
  cleaned = cleaned.replace(/<div id="qti-xml-payload"[^>]*>/gi, '').replace(/<\/div>/gi, '');
  // تنظيف علامات CDATA التالفة أو المسبوقة بتعليقات مهملة
  cleaned = cleaned.replace(/<!--\[CDATA\[/gi, '');
  cleaned = cleaned.replace(/<!\[CDATA\[/gi, '');   cleaned = cleaned.replace(/\]\]>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, (match) => {
    // الحفاظ على تعليقات أرقام الأسئلة مثل <!-- السؤال 1 --> وإزالة التعليقات المشبوهة
    return match.includes('<questestinterop') ? '' : match;
  });
  return cleaned.trim();
}

// Convert QTI 2.1 item to QTI 1.2 item
function convertQti21To12(qti21Xml: string): string {
  const itemMatches = qti21Xml.match(/<assessmentItem[\s\S]*?<\/assessmentItem>/gi);
  if (!itemMatches || itemMatches.length === 0) {
    return qti21Xml;
  }

  const items12 = itemMatches.map((item, index) => {
    const identMatch = item.match(/identifier="([^"]+)"/i);
    const qIdent = identMatch ? identMatch[1] : `Q_${String(index + 1).padStart(2, '0')}`;
    
    const promptMatch = item.match(/<prompt>([\s\S]*?)<\/prompt>/i);
    const prompt = promptMatch ? promptMatch[1].trim() : 'سؤال';

    const correctMatch = item.match(/<correctResponse>\s*<value>([^<]+)<\/value>\s*<\/correctResponse>/i);
    const correctVal = correctMatch ? correctMatch[1].trim() : 'A';

    const choiceRegex = /<simpleChoice\s+identifier="([^"]+)">([\s\S]*?)<\/simpleChoice>/gi;
    let choiceMatch;
    const choices: { id: string; text: string }[] = [];
    while ((choiceMatch = choiceRegex.exec(item)) !== null) {
      choices.push({ id: choiceMatch[1], text: choiceMatch[2].trim() });
    }

    const renderChoices = choices.map(c => 
      `              <response_label ident="${c.id}">
                <material><mattext texttype="text/plain">${c.text}</mattext></material>
              </response_label>`
    ).join('\n');

    return `      <!-- السؤال ${index + 1} -->
      <item ident="${qIdent}" title="السؤال ${index + 1}">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material><mattext texttype="text/html">${prompt}</mattext></material>
          <response_lid ident="response1" rcardinality="Single">
            <render_choice>
${renderChoices}
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes><decvar varname="SCORE" vartype="Decimal" defaultval="0"/></outcomes>
          <respcondition continue="No">
            <conditionvar><varequal respident="response1">${correctVal}</varequal></conditionvar>
            <setvar action="Set" varname="SCORE">1</setvar>
          </respcondition>
        </resprocessing>
        <itemfeedback ident="general_feedback">
          <flow_mat>
            <material>
              <mattext texttype="text/html">إجابة صحيحة وفق معايير الاختبار المعتمدة.</mattext>
            </material>
          </flow_mat>
        </itemfeedback>
      </item>`;
  });

  return items12.join('\n\n');
}

// Convert QTI 1.2 item to QTI 2.1 assessmentItem
function convertQti12To21(qti12Xml: string): string {
  const itemMatches = qti12Xml.match(/<item[\s\S]*?<\/item>/gi);
  if (!itemMatches || itemMatches.length === 0) {
    return qti12Xml;
  }

  const items21 = itemMatches.map((item, index) => {
    const identMatch = item.match(/ident="([^"]+)"/i);
    const qIdent = identMatch ? identMatch[1] : `Q_${String(index + 1).padStart(2, '0')}`;

    const promptMatch = item.match(/<mattext[^>]*>([\s\S]*?)<\/mattext>/i);
    let prompt = promptMatch ? promptMatch[1].trim() : 'سؤال';
    prompt = prompt.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

    const correctMatch = item.match(/<varequal[^>]*>([^<]+)<\/varequal>/i);
    const correctVal = correctMatch ? correctMatch[1].trim() : 'A';

    const labelRegex = /<response_label\s+ident="([^"]+)">[\s\S]*?<mattext[^>]*>([\s\S]*?)<\/mattext>[\s\S]*?<\/response_label>/gi;
    let labelMatch;
    const choices: { id: string; text: string }[] = [];
    while ((labelMatch = labelRegex.exec(item)) !== null) {
      choices.push({ id: labelMatch[1], text: labelMatch[2].trim() });
    }

    const simpleChoices = choices.map(c => 
      `      <simpleChoice identifier="${c.id}">${c.text}</simpleChoice>`
    ).join('\n');

    return `<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" 
                identifier="${qIdent}" 
                title="Question ${index + 1}" 
                adaptive="false" 
                timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>${correctVal}</value></correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>
  <itemBody>
    <prompt>${prompt}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
${simpleChoices}
    </choiceInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
</assessmentItem>`;
  });

  return items21.join('\n\n');
}

export async function createAndDownloadQtiZip(options: QtiPackageOptions): Promise<void> {
  const { title, xmlPayload, target } = options;
  const zip = new JSZip();
  const id = Math.random().toString(36).substring(2, 10);
  const safeTitle = (title || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');

  const cleanXml = sanitizeRawXml(xmlPayload);

  if (target === 'sahlah_cypher') {
    // ==========================================
    // 1. أكاديمية سهلة الدولية — QTI v1.2 ZIP المعتمدة
    // ==========================================
    let itemsBlock = cleanXml;

    // استخلاص محتوى عناصر <item> إذا كان النص يحتوي بالفعل على وسم القسم أو المستند
    const sectionMatch = cleanXml.match(/<section[^>]*>([\s\S]*?)<\/section>/i);
    if (sectionMatch) {
      itemsBlock = sectionMatch[1].trim();
    } else if (cleanXml.includes('<assessmentItem')) {
      itemsBlock = convertQti21To12(cleanXml);
    } else {
      // إزالة أي وسوم questestinterop أو assessment قديمة مشوهة للحصول على الأسئلة فقط
      itemsBlock = itemsBlock
        .replace(/<\/?questestinterop[^>]*>/gi, '')
        .replace(/<\/?assessment[^>]*>/gi, '')
        .trim();
    }

    // بناء الهيكل القياسي النظيف المتطابق 100% مع نموذج سهلة الشغال
    const fullQti12Xml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2.xsd">
  <assessment ident="SAHLAH_ASSESSMENT_${id}" title="${safeTitle}">
    <section ident="root_section">
${itemsBlock}
    </section>
  </assessment>
</questestinterop>`;

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_SAHLAH_QTI12_${id}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">
  <metadata>
    <schema>IMS QTI</schema>
    <schemaversion>1.2</schemaversion>
    <imsmd:lom xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2">
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">أكاديمية سهلة الدولية - حزمة أسئلة QTI v1.2 القياسية لمنصة LMS</imsmd:string>
        </imsmd:description>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="RES_SAHLAH_QTI12" type="imsqti_xmlv1p2" href="assessment_qti12.xml">
      <file href="assessment_qti12.xml"/>
      <file href="Folder1/QuestionBank1.xml"/>
    </resource>
  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);
    zip.file('assessment_qti12.xml', fullQti12Xml);
    zip.folder('Folder1')?.file('QuestionBank1.xml', fullQti12Xml);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${safeTitle}_أكاديمية_سهلة_QTI_v1.2.zip`);
  } else {
    // ==========================================
    // 2. مدرسة الفرقان العالمية — QTI v2.1 ZIP
    // ==========================================
    const hasQti21Items = cleanXml.includes('<assessmentItem');
    let qti21ItemsXml = cleanXml;
    if (!hasQti21Items && (cleanXml.includes('<item ') || cleanXml.includes('<item>'))) {
      qti21ItemsXml = convertQti12To21(cleanXml);
    }

    let fullTestXml = qti21ItemsXml;
    if (!cleanXml.includes('<assessmentTest')) {
      fullTestXml = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" 
                identifier="FURQAN_TEST_${id}" 
                title="${safeTitle}">
  <testPart identifier="part_01" navigationMode="nonlinear" submissionMode="individual">
    <assessmentSection identifier="section_01" title="General Assessment" visible="true">
${qti21ItemsXml}
    </assessmentSection>
  </testPart>
</assessmentTest>`;
    }

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" 
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" 
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1" 
          identifier="MANIFEST_FURQAN_QTI21_${id}">
  <metadata>
    <schema>QTIv2.1</schema>
    <schemaversion>2.1</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">مدرسة الفرقان العالمية - حزمة اختبار QTI v2.1 القياسية المعتمدة</imsmd:string>
        </imsmd:description>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="RES_FURQAN_QTI21" type="imsqti_test_xmlv2p1" href="assessment_qti21.xml">
      <file href="assessment_qti21.xml"/>
    </resource>
  </resources>
</manifest>`;

    zip.file('imsmanifest.xml', manifestXml);
    zip.file('assessment_qti21.xml', fullTestXml);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${safeTitle}_الفرقان_العالمية_QTI_v2.1.zip`);
  }
}
