'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ExportDropdownProps {
  svgElement?: SVGSVGElement | null;
  svgString: string;
  tikzCode?: string;
  onExportTikz?: () => void;
  fileName?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  svgElement,
  svgString,
  tikzCode = '',
  onExportTikz,
  fileName = 'mathviz-diagram',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState<number>(2); // Mặc định 2x cho sắc nét
  const [isCopying, setIsCopying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài hoặc nhấn phím ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 1. Sao chép mã SVG vào Clipboard
  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopying(true);
      setTimeout(() => {
        setIsCopying(false);
        setIsOpen(false);
      }, 1500);
    } catch (e) {
      console.error('Lỗi khi sao chép mã SVG:', e);
    }
  };

  // 2. Tải file dạng văn bản (SVG / TikZ)
  const downloadTextFile = (content: string, ext: string, mime: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // 3. Tải định dạng Raster (PNG, JPG, WebP) theo độ phân giải tùy chọn (1x, 2x, 3x)
  const exportRasterImage = (format: 'image/png' | 'image/jpeg' | 'image/webp', ext: string) => {
    if (!svgString) return;

    // Tìm element SVG trong canvas nếu prop chưa truyền
    const targetSvg =
      svgElement ||
      (document.querySelector('#svgMount svg') as SVGSVGElement | null) ||
      (document.querySelector('#previewContainer svg') as SVGSVGElement | null);

    const viewBox = targetSvg?.viewBox?.baseVal;
    const baseWidth =
      viewBox && viewBox.width > 0
        ? viewBox.width
        : targetSvg?.getBoundingClientRect().width || 650;
    const baseHeight =
      viewBox && viewBox.height > 0
        ? viewBox.height
        : targetSvg?.getBoundingClientRect().height || 450;
    const minX = viewBox ? viewBox.x : 0;
    const minY = viewBox ? viewBox.y : 0;

    const width = Math.round(baseWidth * scale);
    const height = Math.round(baseHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nếu là JPG, vẽ nền trắng để tránh bị đen viền trong suốt
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // Ép kích thước viewBox tuyệt đối để rasterization chuẩn và nét
    let cleanSvg = svgString;
    if (targetSvg) {
      const clonedSvg = targetSvg.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('width', String(baseWidth));
      clonedSvg.setAttribute('height', String(baseHeight));
      if (!clonedSvg.getAttribute('viewBox')) {
        clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${baseWidth} ${baseHeight}`);
      }
      cleanSvg = new XMLSerializer().serializeToString(clonedSvg);
    }

    const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URLObject.revokeObjectURL(blobURL);

      const quality = format === 'image/png' ? 1.0 : 0.95;
      const dataUrl = canvas.toDataURL(format, quality);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileName}_${scale}x-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsOpen(false);
    };
    img.src = blobURL;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Nút kích hoạt Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="px-2.5 py-1.5 text-xs font-medium bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-300/80 dark:border-sky-700/60 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        title="Tùy chọn xuất hình ảnh (SVG, PNG, JPG, WebP, TikZ)"
      >
        <span>📥 Xuất hình ảnh</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu xổ xuống */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-68 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in duration-100 divide-y divide-slate-100 dark:divide-slate-800">
          {/* 1. Tùy chọn Độ phân giải (Raster Scale) */}
          <div className="px-2 py-1.5 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                Độ phân giải (Raster)
              </span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800">
                {scale}x
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: '1x (Web)', val: 1 },
                { label: '2x (HD)', val: 2 },
                { label: '3x (Siêu nét)', val: 3 },
              ].map((res) => (
                <button
                  key={res.val}
                  type="button"
                  onClick={() => setScale(res.val)}
                  className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    scale === res.val
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Nhóm định dạng Ảnh Raster (Bitmap) */}
          <div className="py-1.5 space-y-0.5">
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider block">
              Tải ảnh Bitmap
            </span>
            <button
              type="button"
              onClick={() => exportRasterImage('image/png', 'png')}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 font-medium">
                <span>🖼️</span>
                <span>Tải PNG (Nền trong suốt)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                {scale}x
              </span>
            </button>
            <button
              type="button"
              onClick={() => exportRasterImage('image/jpeg', 'jpg')}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 font-medium">
                <span>🖼️</span>
                <span>Tải JPG (Nền trắng in ấn)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                {scale}x
              </span>
            </button>
            <button
              type="button"
              onClick={() => exportRasterImage('image/webp', 'webp')}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 font-medium">
                <span>🌐</span>
                <span>Tải WebP (Dung lượng nhẹ)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                {scale}x
              </span>
            </button>
          </div>

          {/* 3. Nhóm Định dạng Vector & Mã nguồn */}
          <div className="pt-1.5 space-y-0.5">
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider block">
              Vector & Mã nguồn
            </span>
            <button
              type="button"
              onClick={() => downloadTextFile(svgString, 'svg', 'image/svg+xml')}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 font-medium">
                <span>📐</span>
                <span>Tải file SVG gốc</span>
              </span>
              <span className="text-[10px] text-slate-400">.svg</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopy(svgString)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 font-medium">
                <span>📋</span>
                <span>Copy mã SVG</span>
              </span>
              {isCopying ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Đã chép!</span>
              ) : (
                <span className="text-[10px] text-slate-400">Clipboard</span>
              )}
            </button>
            {onExportTikz && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExportTikz();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                  <span>📜</span>
                  <span>Xuất mã TikZ (LaTeX)</span>
                </span>
                <span className="text-[10px] text-indigo-500/80">LaTeX</span>
              </button>
            )}
            {tikzCode && (
              <button
                type="button"
                onClick={() => downloadTextFile(tikzCode, 'tex', 'text/x-tex')}
                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span>💾</span>
                  <span>Tải file TikZ (.tex)</span>
                </span>
                <span className="text-[10px] text-amber-500/80">.tex</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
