'use client';

import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexPreviewProps {
  content: string;
  alwaysShow?: boolean;
}

export const LatexPreview: React.FC<LatexPreviewProps> = ({ content, alwaysShow = false }) => {
  if (!content || !content.trim()) return null;

  // Kiểm tra xem nội dung có chứa ký hiệu LaTeX ($...$ hoặc $$...$$) không
  const hasLatex = /\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/.test(content);
  if (!hasLatex && !alwaysShow) return null;

  // Tách nội dung theo cú pháp $$...$$ (block) và $...$ (inline)
  const renderParts = () => {
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={index}
              className="my-1.5 overflow-x-auto text-center py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block mx-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      }
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="my-2 p-2.5 bg-slate-100/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] leading-relaxed max-h-48 overflow-y-auto transition-all shadow-xs">
      <div className="text-[10px] font-semibold text-cyan-700 dark:text-sky-400 mb-1 uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span>👁️ Xem trước công thức Toán (KaTeX)</span>
        </span>
      </div>
      <div className="font-sans break-words [word-break:break-word]">
        {renderParts()}
      </div>
    </div>
  );
};

export default LatexPreview;
