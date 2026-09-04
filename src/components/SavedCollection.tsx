'use client';

import React, { useState, useEffect } from 'react';

export interface SavedItem {
  id: string;
  title: string;
  svgContent?: string;
  previewUrl?: string;
  createdAt?: string;
}

export interface SavedCollectionProps {
  items: SavedItem[];
  onSelectItem: (item: SavedItem) => void;
  onDeleteItem?: (id: string) => void;
  onClearAll?: () => void;
}

export const SavedCollection: React.FC<SavedCollectionProps> = ({
  items = [],
  onSelectItem,
  onDeleteItem,
  onClearAll,
}) => {
  // Mặc định thu gọn để ưu tiên không gian Canvas vẽ hình rộng rãi
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_collection_collapsed');
      if (saved !== null) {
        setIsOpen(saved === 'false');
      }
    } catch (e) {
      console.warn('Lỗi đọc localStorage saved_collection_collapsed:', e);
    }
  }, []);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem('saved_collection_collapsed', String(!next));
    } catch {}
  };

  return (
    <div className="w-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 rounded-xl overflow-hidden mb-2 transition-all shadow-xs shrink-0">
      {/* 1. Thanh tiêu đề điều khiển thu gọn / mở rộng */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🗂️</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bộ sưu tập đã lưu
          </span>
          <span className="text-[11px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-sky-600 dark:text-sky-400 rounded-md border border-slate-300/60 dark:border-slate-700/60 font-medium">
            {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {isOpen && items.length > 0 && onClearAll && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-[11px] text-rose-500 hover:text-rose-600 hover:underline mr-1.5 font-medium cursor-pointer"
            >
              Xóa tất cả
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{isOpen ? 'Thu gọn' : 'Mở rộng'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* 2. Nội dung danh sách phẳng (Không còn tab hay phân loại theo lớp / thực tế) */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen
            ? 'max-h-[380px] opacity-100 p-3 border-t border-slate-200 dark:border-slate-800'
            : 'max-h-0 opacity-0 p-0'
        }`}
      >
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Chưa có hình vẽ nào được lưu vào bộ sưu tập.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group relative flex flex-col p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 hover:border-sky-500/50 cursor-pointer transition-all shadow-xs"
              >
                {/* Preview hình thu nhỏ */}
                <div className="w-full h-24 rounded bg-white dark:bg-slate-950/80 flex items-center justify-center overflow-hidden mb-1.5 border border-slate-200 dark:border-slate-700/30">
                  {item.svgContent ? (
                    <div
                      className="w-full h-full p-1 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto pointer-events-none"
                      dangerouslySetInnerHTML={{ __html: item.svgContent }}
                    />
                  ) : item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt={item.title} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">No preview</span>
                  )}
                </div>

                {/* Tiêu đề ngắn */}
                <span
                  className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400"
                  title={item.title}
                >
                  {item.title || 'Hình không tên'}
                </span>

                {/* Nút xóa nhanh */}
                {onDeleteItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 bg-black/70 hover:bg-rose-500 text-white rounded flex items-center justify-center text-[10px] transition-opacity cursor-pointer z-10"
                    title="Xóa khỏi bộ sưu tập"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCollection;
