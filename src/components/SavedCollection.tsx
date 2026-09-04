'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  // Trạng thái thu gọn / mở rộng (Lưu vào localStorage)
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_collection_collapsed');
      if (saved !== null) {
        setIsExpanded(saved === 'false');
      }
    } catch (e) {
      console.warn('Lỗi đọc localStorage saved_collection_collapsed:', e);
    }
  }, []);

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      localStorage.setItem('saved_collection_collapsed', String(!next));
    } catch {}
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="w-full mt-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden transition-all shrink-0">
      {/* Thanh Header toàn vùng bấm được */}
      <div
        onClick={toggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs">🗂️</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            Bộ sưu tập ({items.length})
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal hidden sm:inline">
            {isExpanded ? '(Bấm để thu gọn)' : '(Bấm để xem danh sách)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {isExpanded && items.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-[11px] text-rose-500 hover:text-rose-600 hover:underline font-medium cursor-pointer mr-1"
              title="Xóa tất cả hình đã lưu"
            >
              Xóa tất cả
            </button>
          )}
          <span
            className={`transform transition-transform duration-200 text-[10px] inline-block ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Băng trượt ngang khi mở (Single-row Horizontal Scroll Carousel) */}
      {isExpanded && (
        <div className="relative px-2 py-2 border-t border-slate-100 dark:border-slate-800/80 group/carousel">
          {items.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
              Chưa có hình vẽ nào được lưu vào bộ sưu tập.
            </div>
          ) : (
            <>
              {/* Nút lùi trái */}
              <button
                type="button"
                onClick={() => scroll('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs transition-opacity opacity-75 hover:opacity-100 cursor-pointer"
                title="Cuộn sang trái"
              >
                ‹
              </button>

              {/* Vùng trượt ngang */}
              <div
                ref={scrollContainerRef}
                onWheel={handleWheel}
                className="flex items-center gap-2.5 overflow-x-auto scroll-smooth py-1 px-5 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className="w-28 flex-shrink-0 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-xs bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/90 cursor-pointer transition-all flex flex-col items-center group/card relative"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-14 rounded bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1 relative [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto">
                      {item.svgContent ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: item.svgContent }}
                          className="w-full h-full flex items-center justify-center pointer-events-none"
                        />
                      ) : item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">Không có hình</span>
                      )}

                      {/* Nút xóa nhanh */}
                      {onDeleteItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item.id);
                          }}
                          className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 w-4 h-4 bg-black/70 hover:bg-rose-500 text-white rounded flex items-center justify-center text-[9px] transition-opacity cursor-pointer z-10"
                          title="Xóa khỏi bộ sưu tập"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Tiêu đề ngắn */}
                    <span
                      className="w-full text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate text-center mt-1 group-hover/card:text-cyan-600 dark:group-hover/card:text-cyan-400"
                      title={item.title}
                    >
                      {item.title || 'Hình không tên'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nút tiến phải */}
              <button
                type="button"
                onClick={() => scroll('right')}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs transition-opacity opacity-75 hover:opacity-100 cursor-pointer"
                title="Cuộn sang phải"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedCollection;
