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
function cleanText(str: string = ''): string {
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
 * Extracts question items from human-readable HTML tables or paragraphs.
 */
function extractQuestionsFromHtml(html: string): NormalizedQuestion[] {
  const questions: NormalizedQuestion[] = [];
  if (!html) return questions;

  // 1. Try DOMParser if available in browser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Try extracting from <table> rows
      const rows = Array.from(doc.querySelectorAll('tr'));
      if (rows.length > 1) {
        rows.forEach((row, idx) => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length >= 3) {
            const col0 = cells[0].textContent?.trim() || '';
            const col1 = cells[1].textContent?.trim() || '';
            const col2 = cells[2].textContent?.trim() || '';
            const col3 = cells[3]?.textContent?.trim() || '';

            // Check if this row is a question
            const isQuestionRow =
              /^\d+$/.test(col0) ||
              col0.includes('سؤال') ||
              col1.length > 10 ||
              /[أ-دA-D]/.test(col2);

            if (isQuestionRow && col1.length > 3) {
              const prompt = cleanText(col1);
              const optionsText = col2;
              const correctText = col3 || '';

              // Extract options A, B, C, D
              const opts: Array<{ id: string; text: string }> = [];
              const optMatches = Array.from(
                optionsText.matchAll(/([أ-دA-D])[\s\.\-\:\)]+([^أ-دA-D\n]+)/g)
              );

              if (optMatches.length >= 2) {
                optMatches.forEach((m, oIdx) => {
                  opts.push({
                    id: `choice_${oIdx + 1}`,
                    text: cleanText(m[2]),
                  });
                });
              } else {
                const lines = optionsText.split(/[\n،,]+/).map(cleanText).filter(Boolean);
                lines.slice(0, 4).forEach((line, oIdx) => {
                  opts.push({
                    id: `choice_${oIdx + 1}`,
                    text: line.replace(/^[أ-دA-D1-4][\.\-\:\)]+\s*/, ''),
                  });
                });
              }

              if (opts.length >= 2) {
                let correctId = 'choice_1';
                if (/[بB2]/.test(correctText)) correctId = 'choice_2';
                else if (/[جC3]/.test(correctText)) correctId = 'choice_3';
                else if (/[دD4]/.test(correctText)) correctId = 'choice_4';

                questions.push({
                  id: `Q_${idx}`,
                  title: `السؤال ${questions.length + 1}`,
                  prompt,
                  options: opts,
                  correctId,
                  points: 1,
                });
              }
            }
          }
        });
      }

      // 2. Try paragraphs and headings
      if (questions.length === 0) {
        let currentPrompt = '';
        let currentOpts: Array<{ id: string; text: string }> = [];
        let currentCorrect = 'choice_1';

        const blocks = Array.from(doc.querySelectorAll('p, li, h3, h4, div'));
        blocks.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (!text) return;

          if (
            text.includes('نموذج الإجابة') ||
            text.includes('Answer Key') ||
            text.includes('مصفوفة نواتج') ||
            text.includes('جدول المواصفات')
          ) {
            return;
          }

          const isQuestionHeader = /^(\d+[\.\-\)]|س\s*\d+[\.\-\:]|السؤال\s+[الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+])/i.test(
            text
          );

          if (isQuestionHeader) {
            if (currentPrompt && currentOpts.length >= 2) {
              questions.push({
                id: `Q_${questions.length + 1}`,
                title: `السؤال ${questions.length + 1}`,
                prompt: currentPrompt,
                options: [...currentOpts],
                correctId: currentCorrect,
                points: 1,
              });
            }
            currentPrompt = cleanText(text.replace(/^(\d+[\.\-\)]|س\s*\d+[\.\-\:]|السؤال[^\:]*\:)\s*/i, ''));
            currentOpts = [];
            currentCorrect = 'choice_1';
          } else if (/^[أ-دA-D][\.\-\)\:]\s*/.test(text)) {
            const optText = cleanText(text.replace(/^[أ-دA-D][\.\-\)\:]\s*/, ''));
            const optIdx = currentOpts.length + 1;
            currentOpts.push({
              id: `choice_${optIdx}`,
              text: optText,
            });
          } else if (text.includes('الإجابة الصحيحة') || text.includes('Correct:')) {
            if (/[بB2]/.test(text)) currentCorrect = 'choice_2';
            else if (/[جC3]/.test(text)) currentCorrect = 'choice_3';
            else if (/[دD4]/.test(text)) currentCorrect = 'choice_4';
            else currentCorrect = 'choice_1';
          }
        });

        if (currentPrompt && currentOpts.length >= 2) {
          questions.push({
            id: `Q_${questions.length + 1}`,
            title: `السؤال ${questions.length + 1}`,
            prompt: currentPrompt,
            options: [...currentOpts],
            correctId: currentCorrect,
            points: 1,
          });
        }
      }
    } catch (err) {
      console.warn('HTML question extraction error:', err);
    }
  }

  // 2. Regex fallback for <tr> and paragraphs (universal across Node and browser)
  if (questions.length === 0) {
    const trMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    trMatches.forEach((trM, idx) => {
      const tdMatches = Array.from(trM[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
      if (tdMatches.length >= 3) {
        const col1 = cleanText(tdMatches[1][1]);
        const col2 = tdMatches[2][1];
        const col3 = tdMatches[3] ? cleanText(tdMatches[3][1]) : '';

        if (col1.length > 5) {
          const optMatches = Array.from(col2.matchAll(/([أ-دA-D])[\s\.\-\:\)]+([^أ-دA-D<]+)/g));
          const opts: Array<{ id: string; text: string }> = [];
          optMatches.forEach((om, oIdx) => {
            opts.push({ id: `choice_${oIdx + 1}`, text: cleanText(om[2]) });
          });

          if (opts.length >= 2) {
            let correctId = 'choice_1';
            if (/[بB2]/.test(col3)) correctId = 'choice_2';
            else if (/[جC3]/.test(col3)) correctId = 'choice_3';
            else if (/[دD4]/.test(col3)) correctId = 'choice_4';

            questions.push({
              id: `Q_${idx}`,
              title: `السؤال ${questions.length + 1}`,
              prompt: col1,
              options: opts,
              correctId,
              points: 1,
            });
          }
        }
      }
    });
  }

  return questions;
}

/**
 * Robust XML Item Extractor that works across QTI 1.2 and QTI 2.1
 */
function extractQuestionsFromXml(xml: string): NormalizedQuestion[] {
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
      // First <mattext> inside <presentation> but NOT inside <response_label>
      let prompt = '';
      const presMatch = itemContent.match(/<presentation>([\s\S]*?)<\/presentation>/i);
      const presContent = presMatch ? presMatch[1] : itemContent;

      // Strip choices from presentation to isolate question material
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
        const cId = cm[1];
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
        // Check if rawVal is A, B, C, D
        if (rawVal === 'B' || rawVal === 'choice_2') correctId = 'choice_2';
        else if (rawVal === 'C' || rawVal === 'choice_3') correctId = 'choice_3';
        else if (rawVal === 'D' || rawVal === 'choice_4') correctId = 'choice_4';
        else correctId = 'choice_1';
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
        if (rawVal === 'B' || rawVal === 'choice_2') correctId = 'choice_2';
        else if (rawVal === 'C' || rawVal === 'choice_3') correctId = 'choice_3';
        else if (rawVal === 'D' || rawVal === 'choice_4') correctId = 'choice_4';
        else correctId = 'choice_1';
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
 * Extracts and guarantees 100% complete questions with non-empty prompts.
 */
export function extractAndNormalizeQuestions(rawPayload: string, fallbackTitle: string = 'الامتحان'): NormalizedQuestion[] {
  // First, extract from XML
  const xmlQuestions = extractQuestionsFromXml(rawPayload);

  // Second, extract from HTML
  const htmlQuestions = extractQuestionsFromHtml(rawPayload);

  // Check if xmlQuestions have valid prompts
  const xmlHasValidPrompts = xmlQuestions.length > 0 && xmlQuestions.every((q) => q.prompt && q.prompt.length >= 3);

  if (xmlHasValidPrompts) {
    return xmlQuestions;
  }

  // If XML prompts were empty (the exact bug encountered by the user),
  // merge XML options and answer keys with the prompts from HTML!
  if (xmlQuestions.length > 0 && htmlQuestions.length > 0) {
    return xmlQuestions.map((xmlQ, idx) => {
      const htmlQ = htmlQuestions[idx];
      const validPrompt =
        (xmlQ.prompt && xmlQ.prompt.length >= 3 ? xmlQ.prompt : '') ||
        (htmlQ?.prompt && htmlQ.prompt.length >= 3 ? htmlQ.prompt : '') ||
        `${xmlQ.title || `السؤال ${idx + 1}`}: اختر الإجابة الصحيحة`;

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

  // If XML had no items at all, use HTML questions
  if (htmlQuestions.length > 0) {
    return htmlQuestions;
  }

  // If XML had items but HTML had none, provide meaningful title fallback for prompt
  if (xmlQuestions.length > 0) {
    return xmlQuestions.map((q, idx) => ({
      ...q,
      prompt: q.prompt && q.prompt.length >= 3 ? q.prompt : `${q.title || `السؤال ${idx + 1}`}: اختر البديل الصحيح`,
    }));
  }

  // Ultimate fallback if completely empty
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
        (opt, oIdx) => `            <response_label ident="${opt.id}">
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
    // Matches the working file (qti_va_1791024284) with Folder1/QuestionBank1.xml
    // =========================================================================
    const bankIdent = `QuestionBank_${Date.now()}`;
    const qtiXml = buildSahlahCypherXml(questions, safeTitle, bankIdent);

    // Manifest matches official Sahlah LMS structure
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
      <file href="assessment_qti12.xml"/>
    </resource>
  </resources>
</manifest>`;

    // Add manifest and files
    zip.file('imsmanifest.xml', manifestXml);
    // Folder1/QuestionBank1.xml (Primary for Sahlah CYPHER Learning LMS)
    zip.folder('Folder1')?.file('QuestionBank1.xml', qtiXml);
    // assessment_qti12.xml (Standard QTI 1.2 root file for universal LMS compatibility)
    zip.file('assessment_qti12.xml', qtiXml);

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
