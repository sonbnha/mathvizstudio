'use client';

import React, { useState, useRef } from 'react';
import { renderMarkdownWithKatex, exportToDocx } from '@/lib/lessonPlanUtils';
import { IllustrationBox } from './IllustrationBox';

interface LessonPlanWordPreviewProps {
  markdown: string;
  isStreaming?: boolean;
  topic?: string;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  onCopyMarkdown?: () => void;
  isCopied?: boolean;
  isMaxTokensReached?: boolean;
  onContinue?: () => void;
  isContinuing?: boolean;
}

export const LessonPlanWordPreview: React.FC<LessonPlanWordPreviewProps> = ({
  markdown,
  isStreaming = false,
  topic = 'Ke_Hoach_Bai_Day_5512',
  onExportDocx,
  onExportPdf,
  onCopyMarkdown,
  isCopied = false,
  isMaxTokensReached = false,
  onContinue,
  isContinuing = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'word' | 'raw'>('word');
  const previewRef = useRef<HTMLDivElement>(null);

  // Parse markdown into interleaved segments of formatted HTML and IllustrationBox React components
  const segments = React.useMemo(() => {
    if (!markdown) return [];
    const list: Array<{ type: 'html' | 'illustration'; content: string }> = [];
    const regex = /\[HÌNH MINH HỌA:\s*([^\]]+)\]/gi;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(markdown)) !== null) {
      if (match.index > lastIdx) {
        const textChunk = markdown.slice(lastIdx, match.index);
        if (textChunk.trim()) {
          try {
            list.push({ type: 'html', content: renderMarkdownWithKatex(textChunk) });
          } catch (e) {
            list.push({ type: 'html', content: `<div class="whitespace-pre-wrap">${textChunk}</div>` });
          }
        }
      }
      list.push({ type: 'illustration', content: match[1].trim() });
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < markdown.length) {
      const remaining = markdown.slice(lastIdx);
      if (remaining.trim()) {
        try {
          list.push({ type: 'html', content: renderMarkdownWithKatex(remaining) });
        } catch (e) {
          list.push({ type: 'html', content: `<div class="whitespace-pre-wrap">${remaining}</div>` });
        }
      }
    }

    return list;
  }, [markdown]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 60));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f3f2f1] dark:bg-slate-950 select-text">
      {/* 1. Word Document Toolbar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs z-10">
        {/* Document Info */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#2b579a] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Word A4 Viewer
              </span>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Chuẩn 5512 & NĐ 30/2020
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Times New Roman 13pt • Lề 3-2-2-2 cm
            </p>
          </div>
        </div>

        {/* Action Buttons & Zoom Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Mode Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('word')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'word'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📄 Trang Word
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                viewMode === 'raw'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📝 Mã Markdown
            </button>
          </div>

          {/* Toggle Ruler */}
          <button
            onClick={() => setShowRuler(!showRuler)}
            title="Bật/Tắt thước kẻ căn lề"
            className={`hidden sm:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              showRuler
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            📏 Thước kẻ
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 60}
              className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Thu nhỏ"
            >
              −
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded"
              title="Đặt lại 100%"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 150}
              className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 disabled:opacity-40"
              title="Phóng to"
            >
              +
            </button>
          </div>

          {/* Export / Print Actions */}
          <button
            onClick={handlePrint}
            title="In hoặc Lưu thành file PDF chuẩn A4"
            className="hidden sm:flex items-center gap-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium transition-all"
          >
            🖨️ In / PDF
          </button>

          <button
            onClick={onExportDocx || (() => exportToDocx(markdown, topic))}
            className="flex items-center gap-1.5 text-xs bg-[#2b579a] hover:bg-[#1e3f73] text-white px-3.5 py-1.5 rounded-lg font-semibold shadow-xs transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Tải .docx
          </button>
        </div>
      </div>

      {/* 2. Word Viewer Canvas */}
      <div
        ref={previewRef}
        className="flex-1 w-full overflow-y-auto overflow-x-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {viewMode === 'raw' ? (
          <div className="w-full max-w-4xl bg-slate-900 text-slate-100 rounded-xl p-6 font-mono text-xs leading-relaxed border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <span className="text-slate-400 font-semibold">Nội dung Markdown thô (Dữ liệu nguồn)</span>
              {onCopyMarkdown && (
                <button
                  onClick={onCopyMarkdown}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-sans font-medium transition-all"
                >
                  {isCopied ? '✓ Đã sao chép' : 'Sao chép Markdown'}
                </button>
              )}
            </div>
            <pre className="whitespace-pre-wrap select-all font-mono">{markdown}</pre>
          </div>
        ) : (
          <div
            className="flex flex-col items-center transition-transform duration-150 ease-out origin-top"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Horizontal Simulated Ruler Bar */}
            {showRuler && (
              <div className="w-[794px] h-7 bg-[#e8e6e4] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-t-sm flex items-center shadow-xs select-none mb-1 text-[9px] font-mono text-slate-600 dark:text-slate-400">
                {/* Left Margin: 3cm (~113px) */}
                <div className="w-[113px] h-full bg-[#d0cecb] dark:bg-slate-700 border-r border-slate-400 flex items-center justify-center relative">
                  <span className="text-[8.5px] font-semibold text-slate-600 dark:text-slate-300">
                    Lề Trái: 3cm
                  </span>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 opacity-60"></div>
                </div>

                {/* Body Area: 16cm (~606px) */}
                <div className="flex-1 h-full bg-white dark:bg-slate-900 flex items-center justify-between px-2 relative">
                  <div className="absolute inset-x-0 bottom-0 h-1.5 flex justify-between px-1">
                    {Array.from({ length: 17 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <span className="text-[8px] leading-none mb-0.5">{idx}</span>
                        <div className="w-px h-1 bg-slate-400"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Margin: 2cm (~75px) */}
                <div className="w-[75px] h-full bg-[#d0cecb] dark:bg-slate-700 border-l border-slate-400 flex items-center justify-center relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-60"></div>
                  <span className="text-[8.5px] font-semibold text-slate-600 dark:text-slate-300">
                    2cm
                  </span>
                </div>
              </div>
            )}

            {/* A4 Sheet Container (Word-like Virtual Paper) */}
            <div
              className="w-[794px] min-h-[1123px] bg-white text-black shadow-[0_6px_24px_rgba(0,0,0,0.18)] rounded-xs border border-slate-300 font-['Times_New_Roman',Times,serif] select-text relative"
              style={{
                paddingTop: '75px', // 20mm
                paddingBottom: '75px', // 20mm
                paddingLeft: '113px', // 30mm (standard left binding margin)
                paddingRight: '75px', // 20mm
              }}
            >
              {/* Top Document Formal Header */}
              <div className="grid grid-cols-2 gap-4 pb-4 mb-5 border-b border-slate-300 text-black text-[12pt] leading-tight">
                <div className="text-center font-bold uppercase">
                  <div>BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
                  <div className="text-[11pt] font-normal tracking-wide mt-0.5">TRƯỜNG THCS / THPT</div>
                  <div className="w-16 h-px bg-black mx-auto mt-1"></div>
                </div>
                <div className="text-center">
                  <div className="font-bold uppercase text-[11pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[11pt] mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="w-24 h-px bg-black mx-auto mt-1"></div>
                </div>
              </div>

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="mb-4 p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs flex items-center gap-2 font-sans animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
                  <span>AI đang soạn thảo Kế hoạch bài dạy theo chuẩn Công văn 5512...</span>
                </div>
              )}

              {/* Main Rendered HTML Document Content & React Components */}
              <div className="space-y-2">
                {segments.map((seg, sIdx) => {
                  if (seg.type === 'illustration') {
                    return (
                      <IllustrationBox
                        key={`illust-${sIdx}`}
                        description={seg.content}
                      />
                    );
                  }
                  return (
                    <div
                      key={`content-${sIdx}`}
                      className="lesson-plan-word-body text-black text-[13pt] leading-[1.38] text-justify space-y-1 [&_*]:text-black"
                      dangerouslySetInnerHTML={{ __html: seg.content }}
                    />
                  );
                })}
              </div>

              {/* Continuation Callout / Button at bottom of Word paper */}
              {(isMaxTokensReached || (onContinue && !isStreaming && markdown && markdown.length > 800)) && (
                <div className="mt-8 p-4 bg-amber-50/90 border border-amber-300/80 rounded-xl text-amber-900 font-sans shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <span>{isMaxTokensReached ? '⚠️ Đã chạm giới hạn độ dài 1 lượt' : '💡 Soạn thảo thêm'}</span>
                        <span>
                          {isMaxTokensReached
                            ? 'Giáo án có dung lượng lớn và đã chạm giới hạn 8.192 token của một lượt sinh.'
                            : 'Bạn muốn viết tiếp các hoạt động dạy học hoặc phụ lục còn lại?'}
                        </span>
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        Bấm nút <strong>"Viết tiếp nội dung"</strong> để AI viết nối tiếp ngay từ điểm dừng mà không mất dữ liệu đã có.
                      </p>
                    </div>
                    {onContinue && (
                      <button
                        type="button"
                        onClick={onContinue}
                        disabled={isContinuing || isStreaming}
                        className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
                      >
                        {isContinuing ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Đang viết tiếp...</span>
                          </>
                        ) : (
                          <>
                            <span>✍️</span>
                            <span>Viết tiếp nội dung</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Document Page Number */}
              <div className="pt-8 mt-12 border-t border-slate-200 text-center text-[11pt] text-slate-500 font-['Times_New_Roman',serif]">
                — Kế hoạch bài dạy theo Công văn 5512/BGDĐT-GDTrH • Bộ sách Thống nhất —
              </div>
            </div>

            {/* Space between pages indicator */}
            <div className="my-6 flex items-center gap-2 text-xs text-slate-400 font-sans">
              <div className="w-12 h-px bg-slate-300 dark:bg-slate-700"></div>
              <span>Hết trang A4</span>
              <div className="w-12 h-px bg-slate-300 dark:bg-slate-700"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
