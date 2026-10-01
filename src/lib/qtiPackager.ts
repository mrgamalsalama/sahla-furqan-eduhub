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

export async function createAndDownloadQtiZip(options: QtiPackageOptions): Promise<void> {
  const { title, xmlPayload, target, subject, grade } = options;
  const zip = new JSZip();
  const id = Date.now().toString(36);
  const safeTitle = (title || 'Assessment').replace(/[\\/:*?"<>|]/g, '_');

  let cleanXml = xmlPayload
    .replace(/<div id="qti-xml-payload"[^>]*>/i, '')
    .replace(/<\/div>/i, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();

  if (target === 'sahlah_cypher') {
    // Sahlah Academy: Cypher / NEO LMS IMS QTI v2.1 Package
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" 
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" 
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1" 
          identifier="MANIFEST_SAHLAH_${id}">
  <metadata>
    <schema>QTIv2.1</schema>
    <schemaversion>2.1</schemaversion>
    <imsmd:lom>
      <imsmd:general>
        <imsmd:title>
          <imsmd:string language="ar">${safeTitle}</imsmd:string>
        </imsmd:title>
        <imsmd:description>
          <imsmd:string language="ar">أكاديمية سهلة الدولية - حزمة أسئلة QTI v2.1 لمنصة Cypher / NEO LMS</imsmd:string>
        </imsmd:description>
      </imsmd:general>
    </imsmd:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="RES_SAHLAH_${id}" type="imsqti_test_xmlv2p1" href="assessment.xml">
      <file href="assessment.xml"/>
    </resource>
  </resources>
</manifest>`;

    let fullTestXml = cleanXml;
    if (!cleanXml.includes('<assessmentTest') && !cleanXml.includes('<?xml')) {
      fullTestXml = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentTest xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" 
                identifier="SAHLAH_TEST_${id}" 
                title="${safeTitle}">
  <testPart identifier="part_01" navigationMode="nonlinear" submissionMode="individual">
    <assessmentSection identifier="section_01" title="General Assessment" visible="true">
      ${cleanXml}
    </assessmentSection>
  </testPart>
</assessmentTest>`;
    }

    zip.file('imsmanifest.xml', manifestXml);
    zip.file('assessment.xml', fullTestXml);
  } else {
    // Furqan School: Canvas LMS / Classera Standard QTI 1.2/2.1 Package
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="FURQAN_MANIFEST_${id}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="assessment_meta_${id}" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="assessment_meta.xml">
      <file href="assessment_meta.xml"/>
    </resource>
    <resource identifier="assessment_qti_${id}" type="imsqti_xmlv1p2/imscc_xmlv1p1/assessment-xmlv1p2" href="assessment_qti.xml">
      <file href="assessment_qti.xml"/>
    </resource>
  </resources>
</manifest>`;

    const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz identifier="FURQAN_QUIZ_${id}" xmlns="http://canvas.instructure.com/xsd/cccv1p0">
  <title>${safeTitle}</title>
  <description>مدارس الفرقان العالمية - اختبار إلكتروني موحد لمنصة Canvas / Classera</description>
  <quiz_type>assignment</quiz_type>
  <scoring_policy>keep_highest</scoring_policy>
  <allowed_attempts>1</allowed_attempts>
</quiz>`;

    let fullCanvasQtiXml = cleanXml;
    if (!cleanXml.includes('<questestinterop') && !cleanXml.includes('<?xml')) {
      fullCanvasQtiXml = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="FURQAN_ASSESSMENT_${id}" title="${safeTitle}">
    <qtimetadata>
      <qtimetadatafield>
        <fieldlabel>qmd_assessmenttype</fieldlabel>
        <fieldentry>Examination</fieldentry>
      </qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
      ${cleanXml}
    </section>
  </assessment>
</questestinterop>`;
    }

    zip.file('imsmanifest.xml', manifestXml);
    zip.file('assessment_meta.xml', metaXml);
    zip.file('assessment_qti.xml', fullCanvasQtiXml);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `${safeTitle}_${target}_QTI.zip`;
  saveAs(content, filename);
}
