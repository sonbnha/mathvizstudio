import katex from 'katex';

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

  // 1. Process Block LaTeX: $$...$$
  let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-3 overflow-x-auto py-1">${rendered}</div>`;
    } catch {
      return `<div class="font-mono text-cyan-600 dark:text-cyan-400 my-2">$$${math}$$</div>`;
    }
  });

  // 2. Process Inline LaTeX: $...$ (ensure not double $)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<span class="font-mono text-cyan-600 dark:text-cyan-400">$${math}$</span>`;
    }
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
          '<div class="overflow-x-auto my-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"><table class="w-full text-left text-sm border-collapse">'
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
        htmlLines.push('<thead class="bg-slate-100 dark:bg-slate-900/80 font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800"><tr>');
        for (const cell of cells) {
          htmlLines.push(`<th class="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0">${cell}</th>`);
        }
        htmlLines.push('</tr></thead><tbody>');
      } else {
        htmlLines.push('<tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/40">');
        for (const cell of cells) {
          htmlLines.push(`<td class="px-4 py-2.5 border-r border-slate-200/60 dark:border-slate-800/60 last:border-r-0 text-slate-700 dark:text-slate-300">${cell}</td>`);
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
      htmlLines.push('<hr class="my-6 border-slate-200 dark:border-slate-800" />');
      continue;
    }

    // Headings #, ##, ###, ####
    if (trimmed.startsWith('# ')) {
      htmlLines.push(
        `<h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">${formatInline(
          trimmed.slice(2)
        )}</h1>`
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      htmlLines.push(
        `<h2 class="text-lg md:text-xl font-bold text-cyan-700 dark:text-cyan-400 mt-5 mb-2.5 flex items-center gap-2">${formatInline(
          trimmed.slice(3)
        )}</h2>`
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      htmlLines.push(
        `<h3 class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">${formatInline(
          trimmed.slice(4)
        )}</h3>`
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      htmlLines.push(
        `<h4 class="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1.5">${formatInline(
          trimmed.slice(5)
        )}</h4>`
      );
      continue;
    }

    // Bullet points / lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      htmlLines.push(
        `<li class="ml-5 list-disc text-slate-700 dark:text-slate-300 leading-relaxed my-1">${formatInline(
          trimmed.slice(2)
        )}</li>`
      );
      continue;
    }

    // Numbered lists 1., 2., etc.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      htmlLines.push(
        `<li class="ml-5 list-decimal text-slate-700 dark:text-slate-300 leading-relaxed my-1" value="${numMatch[1]}">${formatInline(
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
    htmlLines.push(`<p class="text-slate-700 dark:text-slate-300 leading-relaxed my-1.5">${formatInline(trimmed)}</p>`);
  }

  if (inTable) {
    htmlLines.push('</tbody></table></div>');
  }

  return htmlLines.join('\n');
}

/**
 * Format inline bold **text** and italic *text*
 */
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-slate-100">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-800 dark:text-slate-200">$1</em>');
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
