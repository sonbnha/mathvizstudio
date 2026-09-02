import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';

/**
 * Clean math LaTeX syntax to readable plain text for docx runs
 */
function cleanLatexForWord(text: string): string {
  return text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\degree/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\in/g, '∈')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftrightarrow/g, '⇔')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathit\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\$+/g, '');
}

/**
 * Parse inline markdown text (bold, italic, math) into docx TextRuns
 */
function parseInlineTextRuns(rawText: string, baseSize = 26): TextRun[] {
  const runs: TextRun[] = [];
  const cleaned = cleanLatexForWord(rawText);

  // Regex for bold **text** or italic *text*
  const tokens = cleaned.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          bold: true,
          font: 'Times New Roman',
          size: baseSize,
          color: '000000',
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          italics: true,
          font: 'Times New Roman',
          size: baseSize,
          color: '000000',
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: token,
          font: 'Times New Roman',
          size: baseSize,
          color: '000000',
        })
      );
    }
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text: ' ',
        font: 'Times New Roman',
        size: baseSize,
      })
    );
  }

  return runs;
}

/**
 * Export Markdown Lesson Plan to a genuine .docx file
 */
export async function exportToDocx(markdown: string, filename: string = 'Ke_Hoach_Bai_Day_5512'): Promise<void> {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;

    const docxRows: TableRow[] = tableRows.map((rowCells, rowIndex) => {
      const isHeader = rowIndex === 0;
      return new TableRow({
        tableHeader: isHeader,
        children: rowCells.map(
          (cellText) =>
            new TableCell({
              width: {
                size: Math.floor(100 / (rowCells.length || 1)),
                type: WidthType.PERCENTAGE,
              },
              shading: isHeader
                ? {
                    fill: 'F2F2F2',
                  }
                : undefined,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              },
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: parseInlineTextRuns(cellText, 24), // 12pt
                  spacing: { before: 80, after: 80, line: 260 },
                }),
              ],
            })
        ),
      });
    });

    children.push(
      new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: docxRows,
      })
    );

    // Empty space after table
    children.push(
      new Paragraph({
        spacing: { after: 120 },
      })
    );

    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table Row Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (/^\|(\s*[-:]+[-| :]*)\|$/.test(trimmed)) {
        continue; // Skip separator line |---|---|
      }
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Divider ---
    if (/^---+$/.test(trimmed)) {
      children.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B0B0B0' },
          },
          spacing: { before: 120, after: 120 },
        })
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 140 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(2)).toUpperCase(),
              bold: true,
              font: 'Times New Roman',
              size: 32, // 16pt
              color: '000000',
            }),
          ],
        })
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(3)),
              bold: true,
              font: 'Times New Roman',
              size: 28, // 14pt
              color: '002060',
            }),
          ],
        })
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(4)),
              bold: true,
              font: 'Times New Roman',
              size: 26, // 13pt
              color: '000000',
            }),
          ],
        })
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(5)),
              bold: true,
              italics: true,
              font: 'Times New Roman',
              size: 26, // 13pt
              color: '000000',
            }),
          ],
        })
      );
      continue;
    }

    // Lists (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40, line: 280 },
          alignment: AlignmentType.BOTH,
          children: parseInlineTextRuns(trimmed.slice(2), 26),
        })
      );
      continue;
    }

    // Numbered Lists (1., 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 40, line: 280 },
          alignment: AlignmentType.BOTH,
          children: parseInlineTextRuns(`${numMatch[1]}. ${numMatch[2]}`, 26),
        })
      );
      continue;
    }

    // Empty Line
    if (!trimmed) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
        })
      );
      continue;
    }

    // Regular Paragraph
    children.push(
      new Paragraph({
        alignment: AlignmentType.BOTH,
        spacing: { before: 40, after: 60, line: 280 },
        children: parseInlineTextRuns(trimmed, 26),
      })
    );
  }

  if (inTable) {
    flushTable();
  }

  // Create Document with standard A4 margins (20mm = 1134 twips)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1134, // 20mm
              bottom: 1134, // 20mm
              left: 1134, // 20mm
              right: 1134, // 20mm
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = filename.replace(/[\s/\\?%*:|"<>]+/g, '_');
  link.download = `${cleanName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
