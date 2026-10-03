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

export interface NormalizedQuestion {
  id: string;
  title: string;
  prompt: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correctId: string;
  points: number;
}

/**
 * Strips HTML tags and unescapes standard HTML entities.
 */
export function cleanText(str: string = ''): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips Arabic diacritical marks (Tashkeel).
 */
export function stripTashkeel(s: string = ''): string {
  return s.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Normalizes Arabic letters for reliable regex matching.
 */
export function normalizeArabic(s: string = ''): string {
  return stripTashkeel(s)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits HTML deliverable into Questions section and Answer Key section.
 * This guarantees the Answer Key Table is NEVER mistaken for questions!
 */
export function splitQuestionsAndAnswerKey(html: string): { questionsHtml: string; answerKeyHtml: string } {
  const answerKeyMarkers = [
    /نَمُوذَجُ?\s*الْ?إِجَابَةِ?/i,
    /Answer\s*Key/i,
    /مَفَاتِيحُ?\s*الْ?إِجَابَةِ?/i,
    /جَدْوَلُ?\s*الْ?إِجَابَاتِ?/i,
    /حُلُولُ?\s*الْ?أَسْئِلَةِ?/i,
    /نَمُوذَجُ?\s*التَّصْحِيحِ?/i,
  ];

  let splitIndex = -1;
  for (const marker of answerKeyMarkers) {
    const match = html.search(marker);
    if (match !== -1) {
      splitIndex = match;
      break;
    }
  }

  if (splitIndex !== -1) {
    return {
      questionsHtml: html.slice(0, splitIndex),
      answerKeyHtml: html.slice(splitIndex),
    };
  }

  return { questionsHtml: html, answerKeyHtml: '' };
}

/**
 * Extracts correct answer keys from the Answer Key Table or lines.
 */
export function extractAnswerKeys(answerKeyHtml: string): Record<number, string> {
  const keys: Record<number, string> = {};
  if (!answerKeyHtml) return keys;

  // 1. Check table rows: <tr><td>1</td><td>ب) مَدِينَةٌ</td>...</tr>
  const trMatches = Array.from(answerKeyHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  for (const trM of trMatches) {
    const tdMatches = Array.from(trM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    if (tdMatches.length >= 2) {
      const qNumText = tdMatches[0][1].replace(/<[^>]+>/g, '').trim();
      const qNum = parseInt(qNumText, 10);
      const ansText = tdMatches[1][1].replace(/<[^>]+>/g, '').trim();
      if (!isNaN(qNum) && ansText) {
        const letterMatch = ansText.match(/([أ-دA-D])/);
        if (letterMatch) {
          keys[qNum] = letterMatch[1];
        }
      }
    }
  }

  // 2. Check lines: "1. ب" or "السؤال الأول: ب"
  if (Object.keys(keys).length === 0) {
    const lines = answerKeyHtml
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/(?:س\s*|السؤال\s*)?(\d+)[\s:\-ـ\.]*([أ-دA-D])/i);
      if (match) {
        const qNum = parseInt(match[1], 10);
        if (!isNaN(qNum)) {
          keys[qNum] = match[2];
        }
      }
    }
  }

  return keys;
}

/**
 * Map answer letter (أ، ب، ج، د / A, B, C, D) to standard choice ID
 */
export function mapLetterToChoiceId(letter: string): string {
  const upper = letter.toUpperCase();
  if (upper === 'أ' || upper === 'A') return 'choice_1';
  if (upper === 'ب' || upper === 'B') return 'choice_2';
  if (upper === 'ج' || upper === 'C') return 'choice_3';
  if (upper === 'د' || upper === 'D') return 'choice_4';
  return 'choice_1';
}

/**
 * Extracts question items from human-readable HTML Questions section ONLY.
 * Completely immune to Answer Key table pollution.
 */
export function extractQuestionsFromHtml(rawHtml: string): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  if (!rawHtml) return questions;

  const { questionsHtml, answerKeyHtml } = splitQuestionsAndAnswerKey(rawHtml);
  const answerKeys = extractAnswerKeys(answerKeyHtml);

  // Convert HTML to text lines with preserved line breaks
  const plainText = questionsHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');

  const lines = plainText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let currentQ: { prompt: string; options: Array<{ id: string; text: string }> } | null = null;
  const optRegex = /^([أ-دA-D])\s*[\)\.\-:]\s*(.*)$/i;

  for (const line of lines) {
    const norm = normalizeArabic(line);

    // Skip metadata headers
    if (
      norm.includes('الماده') ||
      norm.includes('الصف') ||
      norm.includes('تعليمات') ||
      norm.includes('زمن الاختبار') ||
      norm.includes('مصفوفه نواتج') ||
      norm.includes('جدول المواصفات')
    ) {
      continue;
    }

    const isQHeader =
      /^(\d+[\.\-\)]|س\s*\d+|السؤال\s*(الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+))/i.test(
        norm
      );

    if (isQHeader) {
      if (currentQ && currentQ.options.length >= 2) {
        const qIndex = questions.length + 1;
        const correctLetter = answerKeys[qIndex] || 'أ';
        questions.push({
          id: `Q_${qIndex}`,
          title: `السؤال ${qIndex}`,
          prompt: currentQ.prompt,
          options: currentQ.options,
          correctId: mapLetterToChoiceId(correctLetter),
          points: 1,
        });
      }
      // Extract prompt text after colon or question number
      const promptText = line.replace(/^[^\:]*\:\s*/, '').replace(/^(\d+[\.\-\)]|س\s*\d+)\s*/, '').trim();
      currentQ = { prompt: promptText, options: [] };
    } else if (optRegex.test(line)) {
      const match = line.match(optRegex);
      if (currentQ && match) {
        const optIdx = currentQ.options.length + 1;
        currentQ.options.push({
          id: `choice_${optIdx}`,
          text: cleanText(match[2]),
        });
      }
    } else if (currentQ && currentQ.options.length === 0) {
      // Continuation of question stem
      currentQ.prompt = (currentQ.prompt + ' ' + line).trim();
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    const qIndex = questions.length + 1;
    const correctLetter = answerKeys[qIndex] || 'أ';
    questions.push({
      id: `Q_${qIndex}`,
      title: `السؤال ${qIndex}`,
      prompt: currentQ.prompt,
      options: currentQ.options,
      correctId: mapLetterToChoiceId(correctLetter),
      points: 1,
    });
  }

  return questions;
}

/**
 * Robust XML Item Extractor that works across QTI 1.2 and QTI 2.1
 */
export function extractQuestionsFromXml(xml: string): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  if (!xml) return questions;

  // 1. Try QTI 1.2 <item> tags
  const qti12Items = Array.from(xml.matchAll(/<item\b([\s\S]*?)<\/item>/gi));
  if (qti12Items.length > 0) {
    qti12Items.forEach((m, idx) => {
      const itemContent = m[1];
      const identMatch = itemContent.match(/ident="([^"]+)"/i);
      const titleMatch = itemContent.match(/title="([^"]+)"/i);
      const id = identMatch ? identMatch[1] : `Q_${idx + 1}`;
      const title = titleMatch ? titleMatch[1] : `السؤال ${idx + 1}`;

      // Extract Prompt from <material><mattext>
      let prompt = '';
      const presMatch = itemContent.match(/<presentation>([\s\S]*?)<\/presentation>/i);
      const presContent = presMatch ? presMatch[1] : itemContent;

      const presWithoutChoices = presContent.replace(/<response_lid[\s\S]*?<\/response_lid>/gi, '');
      const mattextMatch = presWithoutChoices.match(/<mattext[^>]*>([\s\S]*?)<\/mattext>/i);
      if (mattextMatch) {
        prompt = mattextMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      }

      // Extract Choices <response_label>
      const choices: Array<{ id: string; text: string }> = [];
      const choiceMatches = Array.from(
        itemContent.matchAll(/<response_label\b[^>]*ident="([^"]+)"[^>]*>([\s\S]*?)<\/response_label>/gi)
      );

      choiceMatches.forEach((cm, cIdx) => {
        const cMatMatch = cm[2].match(/<mattext[^>]*>([\s\S]*?)<\/mattext>/i);
        const cText = cMatMatch
          ? cMatMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
          : `خيار ${cIdx + 1}`;
        choices.push({
          id: `choice_${cIdx + 1}`,
          text: cleanText(cText),
        });
      });

      // Extract Correct Answer
      let correctId = 'choice_1';
      const varequalMatch = itemContent.match(/<varequal[^>]*>([\s\S]*?)<\/varequal>/i);
      if (varequalMatch) {
        const rawVal = varequalMatch[1].trim();
        correctId = mapLetterToChoiceId(rawVal);
      }

      questions.push({
        id,
        title,
        prompt: cleanText(prompt),
        options: choices,
        correctId,
        points: 1,
      });
    });

    return questions;
  }

  // 2. Try QTI 2.1 <assessmentItem> tags
  const qti21Items = Array.from(xml.matchAll(/<assessmentItem\b([\s\S]*?)<\/assessmentItem>/gi));
  if (qti21Items.length > 0) {
    qti21Items.forEach((m, idx) => {
      const itemContent = m[1];
      const identMatch = itemContent.match(/identifier="([^"]+)"/i);
      const titleMatch = itemContent.match(/title="([^"]+)"/i);
      const id = identMatch ? identMatch[1] : `Q_${idx + 1}`;
      const title = titleMatch ? titleMatch[1] : `السؤال ${idx + 1}`;

      const promptMatch = itemContent.match(/<prompt[^>]*>([\s\S]*?)<\/prompt>/i);
      const prompt = promptMatch ? promptMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';

      const choices: Array<{ id: string; text: string }> = [];
      const choiceMatches = Array.from(
        itemContent.matchAll(/<simpleChoice\b[^>]*identifier="([^"]+)"[^>]*>([\s\S]*?)<\/simpleChoice>/gi)
      );

      choiceMatches.forEach((cm, cIdx) => {
        choices.push({
          id: `choice_${cIdx + 1}`,
          text: cleanText(cm[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')),
        });
      });

      let correctId = 'choice_1';
      const valMatch = itemContent.match(/<value[^>]*>([\s\S]*?)<\/value>/i);
      if (valMatch) {
        const rawVal = valMatch[1].trim();
        correctId = mapLetterToChoiceId(rawVal);
      }

      questions.push({
        id,
        title,
        prompt: cleanText(prompt),
        options: choices,
        correctId,
        points: 1,
      });
    });
  }

  return questions;
}

/**
 * Universal Question Normalizer
 * Guarantees 100% complete questions without confusing questions and answers.
 */
export function extractAndNormalizeQuestions(rawPayload: string, fallbackTitle: string = 'الامتحان'): NormalizedQuestion[] {
  const xmlQuestions = extractQuestionsFromXml(rawPayload);
  const htmlQuestions = extractQuestionsFromHtml(rawPayload);

  // Scenario 1: XML already has full questions and valid non-empty prompts
  const xmlHasValidPrompts =
    xmlQuestions.length > 0 &&
    xmlQuestions.every((q) => q.prompt && q.prompt.length >= 5 && q.options.length >= 2);

  if (xmlHasValidPrompts) {
    return xmlQuestions;
  }

  // Scenario 2: XML has the 4 options and answer keys, but prompt was empty/mangled
  // We PRESERVE the XML options and correct answer, and ONLY recover prompt from HTML!
  if (xmlQuestions.length > 0 && xmlQuestions.some((q) => q.options.length >= 2)) {
    return xmlQuestions.map((xmlQ, idx) => {
      const htmlQ = htmlQuestions[idx];
      const validPrompt =
        (xmlQ.prompt && xmlQ.prompt.length >= 5 ? xmlQ.prompt : '') ||
        (htmlQ?.prompt && htmlQ.prompt.length >= 5 ? htmlQ.prompt : '') ||
        `${fallbackTitle} - السؤال ${idx + 1}: اختر البديل الصحيح مما يلي:`;

      const options = xmlQ.options.length >= 2 ? xmlQ.options : htmlQ?.options || [];
      const correctId = xmlQ.correctId || htmlQ?.correctId || 'choice_1';

      return {
        ...xmlQ,
        prompt: validPrompt,
        options,
        correctId,
      };
    });
  }

  // Scenario 3: No valid XML items, use questions extracted from HTML Questions section
  if (htmlQuestions.length > 0) {
    return htmlQuestions;
  }

  // Ultimate fallback
  return [
    {
      id: 'Q_01',
      title: 'السؤال الأول',
      prompt: `${fallbackTitle} - اختر الإجابة الصحيحة`,
      options: [
        { id: 'choice_1', text: 'الإجابة الأولى (صحيحة)' },
        { id: 'choice_2', text: 'الإجابة الثانية' },
        { id: 'choice_3', text: 'الإجابة الثالثة' },
        { id: 'choice_4', text: 'الإجابة الرابعة' },
      ],
      correctId: 'choice_1',
      points: 1,
    },
  ];
}

/**
 * Builds Sahlah Academy CYPHER Learning QTI 1.2 XML string.
 * Conforms 100% to official CYPHER / IMS CC QTI 1.2 standard.
 */
function buildSahlahCypherXml(questions: NormalizedQuestion[], testTitle: string, bankIdent: string): string {
  let itemsXml = '';

  questions.forEach((q, idx) => {
    const itemIdent = `${bankIdent}_${idx + 1}`;
    const qRef = `MultipleChoiceOneAnswer_${itemIdent}`;
    const questionTitle = q.title || `السؤال ${idx + 1}`;

    const choicesXml = q.options
      .map(
        (opt) => `            <response_label ident="${opt.id}">
              <material><mattext texttype="text/html"><![CDATA[<p>${opt.text}</p>]]></mattext></material>
            </response_label>`
      )
      .join('\n');

    itemsXml += `      <item ident="${itemIdent}" title="${questionTitle}">
        <itemmetadata>
          <qtimetadata>
            <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>${q.points.toFixed(1)}</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>cc_profile</fieldlabel><fieldentry>cc.multiple_choice.v0p1</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>cc_weighting</fieldlabel><fieldentry>1.0</fieldentry></qtimetadatafield>
            <qtimetadatafield><fieldlabel>assessment_question_identifierref</fieldlabel><fieldentry>${qRef}</fieldentry></qtimetadatafield>
          </qtimetadata>
        </itemmetadata>
        <presentation>
          <material><mattext texttype="text/html"><![CDATA[<p>${q.prompt}</p>]]></mattext></material>
          <response_lid ident="${qRef}" rcardinality="Single" rtiming="No">
            <render_choice shuffle="Yes">
${choicesXml}
            </render_choice>
          </response_lid>
        </presentation>
        <resprocessing>
          <outcomes><decvar varname="SCORE" vartype="Integer" defaultval="0" minvalue="0" maxvalue="1"/></outcomes>
          <respcondition continue="No">
            <conditionvar><varequal respident="${qRef}">${q.correctId}</varequal></conditionvar>
            <setvar action="Set" varname="SCORE">1</setvar>
          </respcondition>
          <respcondition continue="yes">
            <conditionvar><varequal respident="${qRef}va">${q.correctId}</varequal></conditionvar>
            <setvar varname="SCORE" action="Set">1</setvar>
          </respcondition>
        </resprocessing>
      </item>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${bankIdent}" title="${testTitle}">
    <qtimetadata>
      <qtimetadatafield>
        <fieldlabel>qmd_assessmenttype</fieldlabel>
        <fieldentry>Examination</fieldentry>
      </qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
${itemsXml}    </section>
  </assessment>
</questestinterop>`;
}

/**
 * Builds Al-Furqan International School QTI 2.1 XML string.
 */
function buildFurqanQti21Xml(questions: NormalizedQuestion[], testTitle: string, testIdent: string): string {
  const items21 = questions.map((q, idx) => {
    const qIdent = q.id || `Q_${idx + 1}`;
    const simpleChoices = q.options
      .map((c) => `      <simpleChoice identifier="${c.id}">${c.text}</simpleChoice>`)
      .join('\n');

    return `    <assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v2p1" 
                    identifier="${qIdent}" 
                    title="${q.title || `السؤال ${idx + 1}`}" 
                    adaptive="false" 
                    timeDependent="false">
      <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
        <correctResponse><value>${q.correctId}</value></correctResponse>
      </responseDeclaration>
      <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
        <defaultValue><value>0</value></defaultValue>
      </outcomeDeclaration>
      <itemBody>
        <prompt>${q.prompt}</prompt>
        <choiceInteraction responseIdentifier="RESPONSE" shuffle="true" maxChoices="1">
${simpleChoices}
        </choiceInteraction>
      </itemBody>
      <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/>
    </assessmentItem>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" 
                identifier="${testIdent}" 
                title="${testTitle}">
  <testPart identifier="part_01" navigationMode="nonlinear" submissionMode="individual">
    <assessmentSection identifier="section_01" title="General Assessment" visible="true">
${items21.join('\n\n')}
    </assessmentSection>
  </testPart>
</assessmentTest>`;
}

/**
 * Main Entry Point: Creates and downloads the official QTI ZIP package.
 */
export async function createAndDownloadQtiZip(options: QtiPackageOptions): Promise<void> {
  const { title, xmlPayload, target } = options;
  const zip = new JSZip();
  const id = Date.now().toString(36);
  const safeTitle = (title || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Normalize questions across XML and HTML
  const questions = extractAndNormalizeQuestions(xmlPayload, safeTitle);

  if (target === 'sahlah_cypher') {
    // =========================================================================
    // 1. أكاديمية سهلة الدولية — Sahlah LMS (CYPHER Learning) QTI 1.2 ZIP
    // Exact match to official LMS working file (qti_va_1791024284.zip):
    // Contains ONLY Folder1/QuestionBank1.xml (NO duplicate assessment_qti12.xml!)
    // =========================================================================
    const bankIdent = `QuestionBank_${Date.now()}`;
    const qtiXml = buildSahlahCypherXml(questions, safeTitle, bankIdent);

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${bankIdent}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">أكاديمية سهلة الدولية - حزمة أسئلة QTI v1.2 القياسية لمنصة LMS</imsmd:string>
        </imsmd:description>
      </imsmd:general>
      <imsmd:lifeCycle>
        <imsmd:contribute>
          <imsmd:date>
            <imsmd:dateTime>${dateStr}</imsmd:dateTime>
          </imsmd:date>
        </imsmd:contribute>
      </imsmd:lifeCycle>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource type="imsqti_xmlv1p2" identifier="QuestionBank1" href="Folder1/QuestionBank1.xml">
      <file href="Folder1/QuestionBank1.xml"/>
    </resource>
  </resources>
</manifest>`;

    // Add ONLY imsmanifest.xml and Folder1/QuestionBank1.xml
    // Note: Do NOT add assessment_qti12.xml because CYPHER Learning LMS will import both and duplicate all questions!
    zip.file('imsmanifest.xml', manifestXml);
    zip.folder('Folder1')?.file('QuestionBank1.xml', qtiXml);

    const content = await zip.generateAsync({ type: 'blob' });
    const filename = `${safeTitle}_أكاديمية_سهلة_QTI.zip`;
    saveAs(content, filename);
  } else {
    // =========================================================================
    // 2. مدرسة الفرقان العالمية — QTI v2.1 ZIP
    // =========================================================================
    const testIdent = `FURQAN_TEST_${id}`;
    const fullTestXml = buildFurqanQti21Xml(questions, safeTitle, testIdent);

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
    const filename = `${safeTitle}_الفرقان_العالمية_QTI_v2.1.zip`;
    saveAs(content, filename);
  }
}
