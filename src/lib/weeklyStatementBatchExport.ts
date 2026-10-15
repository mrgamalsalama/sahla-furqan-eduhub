import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ShiftType, WeeklyStatementDocument } from '@/types';
import { GRADES_EN } from '@/types';
import { loadWeeklyStatement } from './weeklyStatementStorage';
import { getAcademicWeekForGrade } from './academicCalendar';
import { generateWeeklyStatementDocxBlob } from './weeklyStatementDocx';
import { generateWeeklyStatementHtml } from './weeklyStatementHtml';

export async function generateWeeklyStatementPdfBlob(docData: WeeklyStatementDocument): Promise<Blob> {
  const html = generateWeeklyStatementHtml(docData);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.style.padding = '24px';
  container.style.background = '#ffffff';
  container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.color = '#111827';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.8,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    let heightLeft = contentHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf.output('blob');
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export interface BatchExportProgress {
  current: number;
  total: number;
  grade: string;
  statusText: string;
}

/**
 * Exports all stages/grades for the selected week into a single organized ZIP folder.
 * Each stage is placed inside its own dedicated folder containing:
 * - Separate Word file (.docx)
 * - Separate PDF file (.pdf)
 */
export async function exportAllStagesBatchZip(
  weekNumber: number,
  shiftChoice: ShiftType | 'both',
  onProgress?: (progress: BatchExportProgress) => void
): Promise<void> {
  const zip = new JSZip();
  const grades = GRADES_EN; // Kindergarten, Grade 1 .. Grade 12
  const total = grades.length;
  const shifts: ShiftType[] = shiftChoice === 'both' ? ['mena', 'us'] : [shiftChoice];

  for (let i = 0; i < grades.length; i++) {
    const grade = grades[i];
    const safeFolderName = grade.replace(/\s+/g, '_');
    const gradeFolder = zip.folder(safeFolderName) || zip;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        grade,
        statusText: `جاري إنشاء ملفات Word و PDF لمرحلة ${grade}...`,
      });
    }

    for (const shift of shifts) {
      const doc = loadWeeklyStatement(grade, weekNumber, shift);
      const weekInfo = getAcademicWeekForGrade(weekNumber, grade);
      doc.term = weekInfo.term;
      doc.weekDateHeader = weekInfo.headerDate;
      doc.weekRangeText = weekInfo.rangeText;

      const shiftLabel = shift === 'us' ? 'US_Shift' : 'MENA_Shift';
      const fileBaseName = `Weekly_Statement_${safeFolderName}_${shiftLabel}_Week${weekNumber}`;

      // 1. Generate DOCX Blob
      try {
        const docxBlob = await generateWeeklyStatementDocxBlob(doc);
        gradeFolder.file(`${fileBaseName}.docx`, docxBlob);
      } catch (err) {
        console.error(`Error generating docx for ${grade} ${shift}:`, err);
      }

      // 2. Generate PDF Blob
      try {
        const pdfBlob = await generateWeeklyStatementPdfBlob(doc);
        gradeFolder.file(`${fileBaseName}.pdf`, pdfBlob);
      } catch (err) {
        console.error(`Error generating pdf for ${grade} ${shift}:`, err);
      }
    }
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      grade: 'الكل',
      statusText: 'جاري ضغط الفولدر وتجهيز التحميل النهائي...',
    });
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress({
          current: total,
          total,
          grade: 'ضغط الملفات',
          statusText: `جاري إنشاء حزمة الأرشيف (${Math.round(metadata.percent)}%)...`,
        });
      }
    }
  );

  const shiftTag = shiftChoice === 'both' ? 'All_Shifts' : shiftChoice.toUpperCase();
  const zipFileName = `Weekly_Statements_All_Stages_Week_${weekNumber}_${shiftTag}.zip`;
  saveAs(zipBlob, zipFileName);
}
