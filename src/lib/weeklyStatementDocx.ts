import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  Packer,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { WeeklyStatementDocument } from '@/types';
import { getDaysForGrade } from './academicCalendar';

const TEAL_COLOR = '136F84';
const BLACK_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '222222',
};

const CELL_BORDERS = {
  top: BLACK_BORDER,
  bottom: BLACK_BORDER,
  left: BLACK_BORDER,
  right: BLACK_BORDER,
};

const CELL_MARGINS = {
  top: 100,
  bottom: 100,
  left: 140,
  right: 140,
};

export async function generateWeeklyStatementDocxBlob(docData: WeeklyStatementDocument): Promise<Blob> {
  const tableRows: TableRow[] = [];

  // 1. Table Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Day', bold: true, color: 'FFFFFF', size: 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Subject', bold: true, color: 'FFFFFF', size: 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 4800, type: WidthType.DXA },
          shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Content/Topic', bold: true, color: 'FFFFFF', size: 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Homework', bold: true, color: 'FFFFFF', size: 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 1600, type: WidthType.DXA },
          shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Optional/\nEnrichment', bold: true, color: 'FFFFFF', size: 18 }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // 2. Data Rows for Grade-Specific Days (KG-G8: 4 days, G9-G12: 5 days)
  const gradeDays = getDaysForGrade(docData.grade);
  for (const dayItem of gradeDays) {
    const day = dayItem.dayNumber;
    const subjects = docData.days[day] || [];
    if (subjects.length === 0) continue;

    subjects.forEach((item, index) => {
      const cells: TableCell[] = [];

      // Day cell with rowSpan across all subjects for that day
      if (index === 0) {
        cells.push(
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            rowSpan: subjects.length,
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_MARGINS,
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Day ${day}`, bold: true, color: '136F84', size: 20 }),
                  new TextRun({ text: `\n(${dayItem.shortEn})`, bold: false, color: '64748B', size: 16 }),
                ],
              }),
            ],
          })
        );
      }

      // Subject cell
      cells.push(
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: item.subjectName, bold: true, size: 18 }),
              ],
            }),
          ],
        })
      );

      // Content/Topic cell
      const topicParagraphs = (item.contentTopic || (item.isNoSession ? (item.noSessionNote || 'No Session') : ''))
        .split('\n')
        .map((line) => {
          const isArabic = /[\u0600-\u06FF]/.test(line);
          const isUrl = line.startsWith('http://') || line.startsWith('https://');

          return new Paragraph({
            alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: line,
                color: isUrl ? '0066CC' : '111827',
                underline: isUrl ? {} : undefined,
                bold: line.startsWith('Girls:') || line.startsWith('Boys:') || line.startsWith('اللغة') || line.startsWith('Recorded'),
                size: 18,
              }),
            ],
          });
        });

      cells.push(
        new TableCell({
          width: { size: 4800, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: topicParagraphs.length > 0 ? topicParagraphs : [new Paragraph({ text: '' })],
        })
      );

      // Homework cell
      const hwParagraphs = (item.homework || '')
        .split('\n')
        .map((line) => {
          const isArabic = /[\u0600-\u06FF]/.test(line);
          return new Paragraph({
            alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: line,
                bold: line === 'No HW' || line.includes('HW:'),
                size: 18,
              }),
            ],
          });
        });

      cells.push(
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: hwParagraphs.length > 0 ? hwParagraphs : [new Paragraph({ text: '' })],
        })
      );

      // Optional/Enrichment cell
      const optParagraphs = (item.optionalEnrichment || '')
        .split('\n')
        .map((line) => {
          const isPbl = line.includes('Project-Based') || line.includes('PBL');
          return new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: isPbl || line.includes('Reading Booklet') || line.includes('Optional Quiz'),
                color: line.includes('Reading') ? 'B91C1C' : '111827',
                size: 17,
              }),
            ],
          });
        });

      cells.push(
        new TableCell({
          width: { size: 1600, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: CELL_MARGINS,
          borders: CELL_BORDERS,
          children: optParagraphs.length > 0 ? optParagraphs : [new Paragraph({ text: '' })],
        })
      );

      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: cells,
        })
      );
    });
  }

  // Main Projection Table
  const projectionTable = new Table({
    width: { size: 10200, type: WidthType.DXA },
    rows: tableRows,
  });

  // Weekly Quiz Schedule Table (if any quizzes exist)
  let quizTable: Table | null = null;
  if (docData.quizzes && docData.quizzes.length > 0) {
    const quizRows: TableRow[] = [];

    // Title Row
    quizRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 10200, type: WidthType.DXA },
            columnSpan: 3,
            shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_MARGINS,
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Weekly Quiz Schedule', bold: true, color: 'FFFFFF', size: 22 }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Columns Header
    quizRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_MARGINS,
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Date', bold: true, color: 'FFFFFF', size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_MARGINS,
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Subject', bold: true, color: 'FFFFFF', size: 20 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 5200, type: WidthType.DXA },
            shading: { fill: TEAL_COLOR, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_MARGINS,
            borders: CELL_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Topics/Lesson to be Covered/ Materials', bold: true, color: 'FFFFFF', size: 20 }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    // Data rows
    docData.quizzes.forEach((quiz) => {
      const isArabicSub = /[\u0600-\u06FF]/.test(quiz.subject);
      const isArabicTopic = /[\u0600-\u06FF]/.test(quiz.topics);

      quizRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: CELL_MARGINS,
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: quiz.date, bold: true, size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: CELL_MARGINS,
              borders: CELL_BORDERS,
              shading: { fill: 'E0F7FA', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  alignment: isArabicSub ? AlignmentType.RIGHT : AlignmentType.CENTER,
                  children: [new TextRun({ text: quiz.subject, bold: true, color: '006064', size: 19 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 5200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: CELL_MARGINS,
              borders: CELL_BORDERS,
              children: [
                new Paragraph({
                  alignment: isArabicTopic ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: [
                    new TextRun({ text: quiz.topics, bold: true, size: 19 }),
                    ...(quiz.materials ? [new TextRun({ text: `\n${quiz.materials}`, size: 17, color: '555555' })] : []),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });

    quizTable = new Table({
      width: { size: 10200, type: WidthType.DXA },
      rows: quizRows,
    });
  }

  // Create complete Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Noble Basmala
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '﷽',
                bold: true,
                size: 28,
                color: '1E293B',
                font: 'Traditional Arabic',
              }),
            ],
            spacing: { after: 100 },
          }),

          // Institutional Brand Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'SAHLAH',
                bold: true,
                size: 38,
                color: '1E293B',
                font: 'Arial',
              }),
            ],
            spacing: { after: 120 },
          }),

          // Date | Term | Shift | SY Metadata line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Date: ${docData.weekDateHeader}       `, bold: true, size: 20 }),
              new TextRun({ text: `Term: ${docData.term}       `, bold: true, size: 20 }),
              new TextRun({ text: `Shift: ${docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}       `, bold: true, size: 20, color: '136F84' }),
              new TextRun({ text: `${docData.schoolYear}`, bold: true, size: 20 }),
            ],
            spacing: { after: 200 },
          }),

          // Salutation & Subtitle
          new Paragraph({
            children: [
              new TextRun({ text: `Dear ${docData.grade} Parents,`, bold: true, size: 20 }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Please find below the academic projection for ${docData.grade} (${docData.shift === 'us' ? 'US Shift' : 'MENA Shift'}) for the week of ${docData.weekRangeText}.`,
                bold: true,
                underline: {},
                size: 20,
              }),
            ],
            spacing: { after: 240 },
          }),

          // Main Table
          projectionTable,

          // Space & Quiz Schedule (if present)
          ...(quizTable
            ? [
                new Paragraph({ text: '', spacing: { before: 300, after: 100 } }),
                quizTable,
              ]
            : []),

          // Weekly Educational & Moral Core Value (if present)
          ...(docData.weeklyEducationalValue
            ? [
                new Paragraph({ text: '', spacing: { before: 240, after: 60 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '🌿 قِيمَةُ الْأُسْبُوعِ التَّرْبَوِيَّةِ / Weekly Educational Value\n',
                      bold: true,
                      size: 20,
                      color: '166534',
                    }),
                    new TextRun({
                      text: docData.weeklyEducationalValue,
                      bold: true,
                      size: 22,
                      color: '14532D',
                      font: 'Traditional Arabic',
                    }),
                  ],
                  spacing: { before: 100, after: 100 },
                }),
              ]
            : []),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function exportWeeklyStatementToDocx(docData: WeeklyStatementDocument): Promise<void> {
  const blob = await generateWeeklyStatementDocxBlob(docData);
  const shiftSuffix = docData.shift === 'us' ? 'US_Shift' : 'MENA_Shift';
  const cleanFileName = `Weekly_Statement_${docData.grade.replace(/\s+/g, '_')}_${shiftSuffix}_${docData.weekRangeText.replace(/[\s,]+/g, '_')}.docx`;
  saveAs(blob, cleanFileName);
}
