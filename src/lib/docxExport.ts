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
 * Enhanced LaTeX math cleaner for Microsoft Word docx output
 */
function cleanLatexForWord(text: string): string {
  return text
    // Fractions: \frac{a}{b} -> (a)/(b)
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    // Square roots: \sqrt[n]{x} or \sqrt{x}
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    // Angles and Triangles
    .replace(/\\widehat\{([^}]+)\}/g, '∠$1')
    .replace(/\\Delta\s*([A-Z]{3})/g, 'Δ$1')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\angle/g, '∠')
    // Vectors
    .replace(/\\vec\{([^}]+)\}/g, 'vector($1)')
    .replace(/\\overrightarrow\{([^}]+)\}/g, 'vector($1)')
    // Superscripts
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\^n\b/g, 'ⁿ')
    .replace(/\^0\b/g, '⁰')
    .replace(/\^1\b/g, '¹')
    .replace(/\^\{([^}]+)\}/g, '^($1)')
    // Subscripts
    .replace(/_1\b/g, '₁')
    .replace(/_2\b/g, '₂')
    .replace(/_3\b/g, '₃')
    .replace(/_0\b/g, '₀')
    .replace(/_n\b/g, 'ₙ')
    .replace(/_\{([^}]+)\}/g, '_($1)')
    // Common Math Operators and Symbols
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\degree/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\pi/g, 'π')
    .replace(/\\omega/g, 'ω')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\equiv/g, '≡')
    .replace(/\\sim/g, '∼')
    .replace(/\\cong/g, '≅')
    .replace(/\\parallel/g, '∥')
    .replace(/\\perp/g, '⊥')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')
    .replace(/\\subset/g, '⊂')
    .replace(/\\subseteq/g, '⊆')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\emptyset/g, '∅')
    .replace(/\\infty/g, '∞')
    .replace(/\\Rightarrow/g, ' ⇒ ')
    .replace(/\\Leftrightarrow/g, ' ⇔ ')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathit\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    // Clean remaining dollar signs
    .replace(/\$+/g, '');
}

/**
 * Parse inline markdown text (bold, italic, math) into docx TextRuns with Times New Roman font
 */
function parseInlineTextRuns(rawText: string, baseSize = 26, isItalicDefault = false): TextRun[] {
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
          italics: isItalicDefault,
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
          italics: isItalicDefault,
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
 * Conforms to Official Dispatch 5512/BGDĐT & Decree 30/2020/NĐ-CP formatting standards
 */
export async function exportToDocx(markdown: string, filename: string = 'Ke_Hoach_Bai_Day_5512'): Promise<void> {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;

    const colCount = Math.max(...tableRows.map((r) => r.length), 1);
    
    // Proportional column sizing: 2 columns -> 38% / 62%; otherwise equal distribution
    const colWidths =
      colCount === 2
        ? [38, 62]
        : Array.from({ length: colCount }, () => Math.floor(100 / colCount));

    const docxRows: TableRow[] = tableRows.map((rowCells, rowIndex) => {
      const isHeader = rowIndex === 0;

      return new TableRow({
        tableHeader: isHeader,
        cantSplit: true,
        children: rowCells.map(
          (cellText, colIndex) =>
            new TableCell({
              width: {
                size: colWidths[colIndex] || Math.floor(100 / colCount),
                type: WidthType.PERCENTAGE,
              },
              shading: isHeader
                ? {
                    fill: 'F1F5F9', // Subtle elegant light grey-blue header background
                  }
                : undefined,
              margins: {
                top: 120, // 6pt cell padding
                bottom: 120,
                left: 160, // 8pt cell padding
                right: 160,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
                left: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
                right: { style: BorderStyle.SINGLE, size: 6, color: '333333' },
              },
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: parseInlineTextRuns(cellText, 24), // 12pt
                  spacing: { before: 40, after: 40, line: 270 },
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

    // Subtle space after table
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 100 },
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
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
          },
          spacing: { before: 100, after: 100 },
        })
      );
      continue;
    }

    // Heading 1: TÊN BÀI DẠY (15pt, Bold, Center, Black)
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 120, line: 300 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(2)).toUpperCase(),
              bold: true,
              font: 'Times New Roman',
              size: 30, // 15pt
              color: '000000',
            }),
          ],
        })
      );
      continue;
    }

    // Heading 2: CÁC MỤC LỚN I, II, III, IV (13.5pt, Bold, Navy #1A365D, Uppercase)
    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 80, line: 280 },
          children: [
            new TextRun({
              text: cleanLatexForWord(trimmed.slice(3)),
              bold: true,
              font: 'Times New Roman',
              size: 27, // 13.5pt
              color: '1A365D', // Dark Navy Accent
            }),
          ],
        })
      );
      continue;
    }

    // Heading 3: TIỂU MỤC 1. VỀ KIẾN THỨC, A. BẢNG TỔNG QUAN... (13pt, Bold)
    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 140, after: 60, line: 280 },
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

    // Heading 4: CÁC HOẠT ĐỘNG 1, 2, 3, 4 (13pt, Bold, Accent Shading Bar)
    if (trimmed.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_4,
          shading: {
            fill: 'F1F5F9', // Subtle grey-blue highlight bar for activity headers
          },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: '1A365D' },
          },
          spacing: { before: 180, after: 80, line: 280 },
          indent: { left: 140 },
          children: [
            new TextRun({
              text: ` ${cleanLatexForWord(trimmed.slice(5))} `,
              bold: true,
              font: 'Times New Roman',
              size: 26, // 13pt
              color: '1A365D',
            }),
          ],
        })
      );
      continue;
    }

    // Filter code blocks (blocks residual ASCII art)
    if (trimmed.startsWith('```')) {
      continue;
    }

    // Illustration placeholder: [HÌNH MINH HỌA: ...]
    const illustMatch = trimmed.match(/\[HÌNH MINH HỌA:\s*([^\]]+)\]/i);
    if (illustMatch) {
      const desc = illustMatch[1].trim();
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 140, line: 280 },
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
            bottom: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
            left: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
            right: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
          },
          children: [
            new TextRun({
              text: '[KHUNG VỊ TRÍ HÌNH MINH HỌA SƯ PHẠM]',
              bold: true,
              font: 'Times New Roman',
              size: 24,
              color: '475569',
            }),
            new TextRun({
              text: `\nMô tả chi tiết: ${desc}`,
              italics: true,
              font: 'Times New Roman',
              size: 24,
              color: '1E293B',
            }),
          ],
        })
      );
      continue;
    }

    // Sub-items a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện (Bold Italic)
    const subItemMatch = trimmed.match(/^-\s+\*\*([a-d]\))\s+([^:]+):?\*\*(.*)$/i);
    if (subItemMatch) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40, line: 280 },
          alignment: AlignmentType.BOTH,
          indent: { left: 280 },
          children: [
            new TextRun({
              text: `${subItemMatch[1]} ${subItemMatch[2]}: `,
              bold: true,
              italics: true,
              font: 'Times New Roman',
              size: 26,
              color: '000000',
            }),
            ...parseInlineTextRuns((subItemMatch[3] || '').trim(), 26),
          ],
        })
      );
      continue;
    }

    // Steps: * Bước 1: Chuyển giao nhiệm vụ...
    const stepMatch = trimmed.match(/^\*\s+\*\*Bước\s+(\d+):?\s*([^*]+)\*\*(.*)$/i);
    if (stepMatch) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 40, line: 280 },
          alignment: AlignmentType.BOTH,
          indent: { left: 420 },
          children: [
            new TextRun({
              text: `• Bước ${stepMatch[1]}: ${stepMatch[2].trim()}`,
              bold: true,
              font: 'Times New Roman',
              size: 26,
              color: '000000',
            }),
            ...parseInlineTextRuns(stepMatch[3] ? ` ${stepMatch[3].trim()}` : '', 26),
          ],
        })
      );
      continue;
    }

    // Bullet Lists (- or *)
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
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Regular Paragraph (Times New Roman 13pt, 1.25x line spacing, 3pt/5pt paragraph spacing, Justified)
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

  // Create Document adhering strictly to Decree 30/2020/NĐ-CP & CV 5512
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26, // 13pt
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: 280, // ~1.25 - 1.3 lines
              before: 60, // 3pt
              after: 100, // 5pt
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1134, // 20mm (Decree 30/2020/NĐ-CP)
              bottom: 1134, // 20mm
              left: 1701, // 30mm (standard left binding margin)
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
