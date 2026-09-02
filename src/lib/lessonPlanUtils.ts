import katex from 'katex';
export { exportToDocx } from './docxExport';

export interface LessonPlanPreset {
  id: string;
  topic: string;
  grade: string;
  book?: string;
  duration: string;
  style: string;
  notes: string;
}

export const LESSON_PLAN_PRESETS: LessonPlanPreset[] = [
  {
    id: 'pytago-8',
    topic: 'Định lý Pythagore (Pytago) và ứng dụng',
    grade: 'Lớp 8',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Chuẩn 5512',
    notes: 'Nhấn mạnh hoạt động trải nghiệm cắt ghép hình vuông để phát hiện định lý và ứng dụng tính độ dài thực tế.',
  },
  {
    id: 'tiso-9',
    topic: 'Tỉ số lượng giác của góc nhọn',
    grade: 'Lớp 9',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Tích hợp STEM & Trải nghiệm thực tế',
    notes: 'Liên hệ bài toán đo chiều cao cây, ngọn hải đăng, góc nghiêng của thang dựa tường.',
  },
  {
    id: 'goc-noi-tiep-9',
    topic: 'Góc ở tâm và Góc nội tiếp đường tròn',
    grade: 'Lớp 9',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Chuẩn 5512',
    notes: 'Sử dụng mô hình trực quan hoặc phần mềm hình học để học sinh dự đoán mối quan hệ giữa số đo góc và cung bị chắn.',
  },
  {
    id: 'pt-bac-hai-9',
    topic: 'Phương trình bậc hai một ẩn và Định lý Vi-ét',
    grade: 'Lớp 9',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Nâng cao & Học sinh giỏi',
    notes: 'Rèn luyện kỹ năng nhẩm nghiệm và bài toán tìm tham số m để phương trình có hai nghiệm thỏa mãn điều kiện.',
  },
  {
    id: 'dao-ham-11',
    topic: 'Định nghĩa và ý nghĩa hình học của Đạo hàm',
    grade: 'Lớp 11',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Chuẩn 5512',
    notes: 'Tiếp cận qua bài toán vận tốc tức thời và bài toán tiếp tuyến của đường cong.',
  },
  {
    id: 'khao-sat-12',
    topic: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc ba',
    grade: 'Lớp 12',
    book: 'Bộ sách Thống nhất',
    duration: '2 tiết (90 phút)',
    style: 'Ôn tập & Luyện thi',
    notes: 'Đầy đủ bảng biến thiên, tìm cực trị, điểm uốn và nhận dạng đồ thị phục vụ thi tốt nghiệp THPT.',
  },
];

/**
 * Render Markdown text containing LaTeX formulas ($...$ and $$...$$) into sanitized HTML
 */
export function renderMarkdownWithKatex(markdown: string): string {
  if (!markdown) return '';

  try {
    const mathPlaceholders: { token: string; html: string }[] = [];
    let tokenCounter = 0;

    // 1. Extract and render Block LaTeX: $$...$$ with output: 'html'
    let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const token = `%%KATEX_BLOCK_${tokenCounter++}%%`;
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
          strict: false,
        });
        mathPlaceholders.push({
          token,
          html: `<div class="my-3 overflow-x-auto py-1 text-center">${rendered}</div>`,
        });
      } catch {
        mathPlaceholders.push({
          token,
          html: `<div class="font-mono text-cyan-600 dark:text-cyan-400 my-2">$$${math}$$</div>`,
        });
      }
      return token;
    });

    // 2. Extract and render Inline LaTeX: $...$ with output: 'html'
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      const token = `%%KATEX_INLINE_${tokenCounter++}%%`;
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
          strict: false,
        });
        mathPlaceholders.push({
          token,
          html: rendered,
        });
      } catch {
        mathPlaceholders.push({
          token,
          html: `<span class="font-mono text-cyan-600 dark:text-cyan-400">$${math}$</span>`,
        });
      }
      return token;
    });

    // 3. Process Markdown Headings, Tables, Lists, Bold, Italics, Horizontal Rules
    const lines = processed.split('\n');
    const htmlLines: string[] = [];
    let inTable = false;
    let tableHeaderParsed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table Row detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHeaderParsed = false;
          htmlLines.push(
            '<div class="overflow-x-auto my-4"><table class="w-full text-left text-[12.5px] border-collapse border border-black shadow-xs">'
          );
        }

        // Check separator line |---|---|
        if (/^\|(\s*[-:]+[-| :]*)\|$/.test(trimmed)) {
          tableHeaderParsed = true;
          continue;
        }

        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        if (!tableHeaderParsed) {
          htmlLines.push('<thead class="bg-[#f2f2f2] font-bold text-black border-b border-black"><tr>');
          for (const cell of cells) {
            htmlLines.push(`<th class="p-2 border border-black text-center font-bold text-[12.5px] align-middle">${formatInline(cell)}</th>`);
          }
          htmlLines.push('</tr></thead><tbody>');
        } else {
          htmlLines.push('<tr class="border-b border-black">');
          for (const cell of cells) {
            htmlLines.push(`<td class="p-2 border border-black text-black text-[12.5px] align-top leading-snug">${formatInline(cell)}</td>`);
          }
          htmlLines.push('</tr>');
        }
        continue;
      } else if (inTable) {
        inTable = false;
        htmlLines.push('</tbody></table></div>');
      }

      // Horizontal divider ---
      if (/^---+$/.test(trimmed)) {
        htmlLines.push('<hr class="my-5 border-t border-slate-300" />');
        continue;
      }

      // Headings #, ##, ###, ####
      if (trimmed.startsWith('# ')) {
        htmlLines.push(
          `<h1 class="text-[15pt] font-bold text-black text-center uppercase tracking-normal mt-4 mb-3 pb-2 border-b border-black leading-snug">${formatInline(
            trimmed.slice(2)
          )}</h1>`
        );
        continue;
      }
      if (trimmed.startsWith('## ')) {
        htmlLines.push(
          `<h2 class="text-[13.5pt] font-bold text-[#1A365D] uppercase mt-5 mb-2 pb-1 border-b border-slate-200 leading-snug">${formatInline(
            trimmed.slice(3)
          )}</h2>`
        );
        continue;
      }
      if (trimmed.startsWith('### ')) {
        htmlLines.push(
          `<h3 class="text-[13pt] font-bold text-black mt-3.5 mb-1.5 leading-snug">${formatInline(
            trimmed.slice(4)
          )}</h3>`
        );
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        htmlLines.push(
          `<h4 class="text-[13pt] font-bold text-[#1A365D] bg-[#F1F5F9] border-l-4 border-[#1A365D] px-3 py-1.5 my-3 rounded-xs leading-snug">${formatInline(
            trimmed.slice(5)
          )}</h4>`
        );
        continue;
      }

      // Sub-items a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện
      const subItemMatch = trimmed.match(/^-\s+\*\*([a-d]\))\s+([^:]+):?\*\*(.*)$/i);
      if (subItemMatch) {
        htmlLines.push(
          `<p class="text-black text-[13pt] leading-relaxed text-justify my-1 pl-4"><strong class="font-bold italic text-black">${subItemMatch[1]} ${subItemMatch[2]}: </strong>${formatInline(
            (subItemMatch[3] || '').trim()
          )}</p>`
        );
        continue;
      }

      // Steps: * Bước 1: Chuyển giao nhiệm vụ...
      const stepMatch = trimmed.match(/^\*\s+\*\*Bước\s+(\d+):?\s*([^*]+)\*\*(.*)$/i);
      if (stepMatch) {
        htmlLines.push(
          `<p class="text-black text-[13pt] leading-relaxed text-justify my-1 pl-8"><strong class="font-bold text-black">• Bước ${stepMatch[1]}: ${stepMatch[2].trim()}</strong>${
            stepMatch[3] ? ` ${formatInline(stepMatch[3].trim())}` : ''
          }</p>`
        );
        continue;
      }

      // Bullet points / lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        htmlLines.push(
          `<li class="ml-6 list-disc text-black text-[13pt] leading-relaxed text-justify my-1">${formatInline(
            trimmed.slice(2)
          )}</li>`
        );
        continue;
      }

      // Numbered lists 1., 2., etc.
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        htmlLines.push(
          `<li class="ml-6 list-decimal text-black text-[13pt] leading-relaxed text-justify my-1" value="${numMatch[1]}">${formatInline(
            numMatch[2]
          )}</li>`
        );
        continue;
      }

      // Empty line
      if (!trimmed) {
        htmlLines.push('<div class="h-2"></div>');
        continue;
      }

      // Regular paragraph
      htmlLines.push(`<p class="text-black text-[13pt] leading-[1.38] text-justify my-1.5">${formatInline(trimmed)}</p>`);
    }

    if (inTable) {
      htmlLines.push('</tbody></table></div>');
    }

    let finalHtml = htmlLines.join('\n');

    // 4. Safely restore all KaTeX rendered HTML without interference from markdown delimiters
    for (const item of mathPlaceholders) {
      finalHtml = finalHtml.replaceAll(item.token, item.html);
    }

    return finalHtml;
  } catch (renderError) {
    console.warn('renderMarkdownWithKatex partial render fallback:', renderError);
    return `<div class="whitespace-pre-wrap font-['Times_New_Roman',serif] text-[13pt] leading-relaxed">${markdown
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</div>`;
  }
}

/**
 * Format inline bold **text** and italic *text*
 */
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-black">$1</em>');
}

/**
 * Export Markdown content to a clean, professionally styled Microsoft Word document (.doc)
 */
export function exportToWordDocument(markdown: string, title: string = 'Ke_Hoach_Bai_Day_5512') {
  const htmlBody = renderMarkdownWithKatex(markdown);

  const wordTemplate = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 20mm 20mm 20mm 20mm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.35;
    color: #000000;
  }
  h1 {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    margin-top: 18pt;
    margin-bottom: 8pt;
  }
  h2 {
    font-size: 14pt;
    font-weight: bold;
    color: #002060;
    margin-top: 14pt;
    margin-bottom: 6pt;
  }
  h3 {
    font-size: 13pt;
    font-weight: bold;
    margin-top: 10pt;
    margin-bottom: 4pt;
  }
  h4 {
    font-size: 13pt;
    font-weight: bold;
    font-style: italic;
    margin-top: 8pt;
    margin-bottom: 4pt;
  }
  p {
    margin-top: 3pt;
    margin-bottom: 3pt;
    text-align: justify;
  }
  ul, ol {
    margin-top: 3pt;
    margin-bottom: 3pt;
    padding-left: 24pt;
  }
  li {
    margin-bottom: 2pt;
    text-align: justify;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8pt;
    margin-bottom: 8pt;
  }
  th, td {
    border: 1pt solid #000000;
    padding: 6pt;
    font-size: 12pt;
    vertical-align: top;
  }
  th {
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: center;
  }
  hr {
    border: none;
    border-top: 1pt solid #cccccc;
    margin: 12pt 0;
  }
  .katex {
    font-family: 'Times New Roman', serif;
  }
</style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + wordTemplate], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[\s/\\?%*:|"<>]+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
