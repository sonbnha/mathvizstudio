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
  // Trạng thái thu gọn / mở rộng (Lưu vào localStorage)
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <div className="w-full mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-4 shadow-sm shrink-0 transition-all">
      {/* Thanh tiêu đề & nút thu gọn / mở rộng */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm">🗂️</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Bộ sưu tập đã lưu ({items.length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isExpanded && items.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-medium cursor-pointer"
              title="Xóa tất cả hình đã lưu"
            >
              Xóa tất cả
            </button>
          )}
          <button
            type="button"
            onClick={toggleExpand}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
            <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </div>
      </div>

      {/* Danh sách thẻ dạng Grid ngang khi mở rộng */}
      {isExpanded && (
        <div className="pt-3">
          {items.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
              Chưa có hình vẽ nào được lưu vào bộ sưu tập.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group relative flex flex-col p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 hover:border-cyan-500/50 cursor-pointer transition-all shadow-xs hover:shadow-sm"
                >
                  {/* Thumbnail hình vẽ */}
                  <div className="w-full h-24 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden mb-1.5 border border-slate-200 dark:border-slate-800 relative">
                    {item.svgContent ? (
                      <div
                        className="w-full h-full p-1.5 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: item.svgContent }}
                      />
                    ) : item.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt={item.title} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">Không có hình</span>
                    )}

                    {/* Nút xóa nhanh */}
                    {onDeleteItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 bg-black/70 hover:bg-rose-500 text-white rounded-md flex items-center justify-center text-[10px] transition-opacity cursor-pointer z-10"
                        title="Xóa khỏi bộ sưu tập"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Tiêu đề và ngày tạo */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400"
                      title={item.title}
                    >
                      {item.title || 'Hình không tên'}
                    </span>
                    {item.createdAt && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {item.createdAt}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedCollection;
