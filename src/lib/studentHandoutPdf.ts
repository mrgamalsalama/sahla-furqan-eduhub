import { jsPDF } from 'jspdf';
import type { GammaSlide } from './gammaPptx';

interface HandoutMetadata {
  lessonTitle: string;
  subject: string;
  grade: string;
  institution?: string;
  teacherName?: string;
}

/**
 * Generate a printable Cornell Notes Student Handout PDF
 * Layout: 2 slides per A4 page with guided note-taking lines, cues, and summary area.
 */
export async function generateStudentHandoutPdf(
  slides: GammaSlide[],
  metadata: HandoutMetadata
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Clean title
  const title = metadata.lessonTitle || 'مذكرة الدرس التعليمية';
  const subject = metadata.subject || 'العلوم';
  const grade = metadata.grade || 'المرحلة الدراسية';

  // Group slides 2 per page
  const slidesPerPage = 2;
  const totalPages = Math.ceil(slides.length / slidesPerPage) || 1;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage();

    let y = margin;

    // Header Box with Institution Title
    doc.setDrawColor(2, 132, 199); // Teal/Royal blue
    doc.setLineWidth(0.8);
    doc.line(margin, y + 16, pageWidth - margin, y + 16);

    // Title & Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`Al-Furqan & Sahlah Schools - Guided Student Handout`, margin, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Subject: ${subject}  |  Grade: ${grade}  |  Topic: ${title}`, margin, y + 11);

    // Student fields header (Name, Class, Date)
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Student Name: _______________________    Class: _________    Date: ___/___/2026', pageWidth - margin - 120, y + 11);

    y += 22;

    // Slice 2 slides for current page
    const pageSlides = slides.slice(pageIdx * slidesPerPage, pageIdx * slidesPerPage + slidesPerPage);

    pageSlides.forEach((slide, sIdx) => {
      const slideGlobalIdx = pageIdx * slidesPerPage + sIdx + 1;
      const cardHeight = 100;

      // Card outer container
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.setLineWidth(0.4);
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.roundedRect(margin, y, contentWidth, cardHeight, 3, 3, 'FD');

      // Slide Title Banner
      doc.setFillColor(2, 132, 199);
      doc.roundedRect(margin, y, contentWidth, 9, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`[Slide ${slideGlobalIdx}] ${slide.title || 'Slide Topic'} (${slide.category || 'Core Concept'})`, margin + 4, y + 6.5);

      // Two Columns inside Card: Left (Slide Concept Summary) | Right (Cornell Student Notes)
      const colWidth = (contentWidth - 6) / 2;
      const innerY = y + 13;

      // Column 1: Key Slide Points
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Key Concepts & Visual Points:', margin + 4, innerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      let pointY = innerY + 6;
      if (slide.points && slide.points.length > 0) {
        slide.points.slice(0, 4).forEach((pt) => {
          const cleanPt = pt.replace(/[\r\n]+/g, ' ').slice(0, 110);
          doc.text(`- ${cleanPt}`, margin + 6, pointY, { maxWidth: colWidth - 8 });
          pointY += 12;
        });
      } else {
        doc.text('(Review key concepts explained by teacher)', margin + 6, pointY);
      }

      // Divider between columns
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin + colWidth + 3, innerY - 2, margin + colWidth + 3, y + cardHeight - 4);

      // Column 2: Cornell Note-taking lines for student
      const col2X = margin + colWidth + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(13, 148, 136); // Teal
      doc.text('Student Notes & Inquiry Reflections:', col2X, innerY);

      // Ruled note lines
      let lineY = innerY + 7;
      for (let l = 0; l < 6; l++) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(col2X, lineY, margin + contentWidth - 4, lineY);
        lineY += 10;
      }

      y += cardHeight + 8;
    });

    // Bottom Cornell Summary Box on every page
    const summaryBoxY = pageHeight - margin - 20;
    doc.setDrawColor(180, 83, 9); // Amber
    doc.setLineWidth(0.3);
    doc.setFillColor(254, 252, 232); // Amber-50
    doc.roundedRect(margin, summaryBoxY, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    doc.text('Cornell Lesson Summary (What did you learn today?):', margin + 4, summaryBoxY + 5);

    doc.setDrawColor(253, 230, 138);
    doc.line(margin + 4, summaryBoxY + 11, margin + contentWidth - 4, summaryBoxY + 11);
    doc.line(margin + 4, summaryBoxY + 16, margin + contentWidth - 4, summaryBoxY + 16);

    // Footer Page Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${pageIdx + 1} of ${totalPages} - Sahlah & Al-Furqan Interactive Presentation Handout`, margin, pageHeight - margin + 2);
  }

  return doc.output('blob');
}
