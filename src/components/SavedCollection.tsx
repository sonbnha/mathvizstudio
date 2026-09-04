'use client';

import React from 'react';

export interface SavedItem {
  id: string;
  title: string;
  svgContent?: string;
  previewUrl?: string;
  createdAt?: string;
}

export interface SavedCollectionProps {
  items: SavedItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectItem: (item: SavedItem) => void;
  onDeleteItem?: (id: string) => void;
  onClearAll?: () => void;
}

export const SavedCollection: React.FC<SavedCollectionProps> = ({
  items = [],
  isOpen = true,
  onClose,
  onSelectItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 h-full flex flex-col bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs overflow-hidden transition-all animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Tiêu đề & Nút thao tác nhanh */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">🗂️</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            Bộ sưu tập ({items.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {items.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-rose-500 hover:text-rose-600 hover:underline font-medium cursor-pointer px-1 py-0.5"
              title="Xóa toàn bộ bộ sưu tập"
            >
              Xóa hết
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Ẩn thanh bên bộ sưu tập"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Danh sách thẻ cuộn dọc (1 cột các thumbnail) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {items.length === 0 ? (
          <div className="text-center py-12 px-2 text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
            <span className="text-2xl opacity-60">📁</span>
            <p className="font-medium">Chưa có hình nào</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Hình vẽ sau khi tạo sẽ được lưu tự động tại đây.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="group relative p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 hover:border-sky-500/50 cursor-pointer transition-all flex flex-col gap-1.5 shadow-2xs hover:shadow-xs"
            >
              {/* Thumbnail hình vẽ */}
              <div className="w-full h-28 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                {item.svgContent ? (
                  <div
                    className="w-full h-full p-2 flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: item.svgContent }}
                  />
                ) : item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt={item.title} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Không có hình</span>
                )}

                {/* Nút xóa nhanh góc trên phải của thumbnail */}
                {onDeleteItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 bg-black/70 hover:bg-rose-500 text-white rounded flex items-center justify-center text-[10px] transition-opacity cursor-pointer z-10"
                    title="Xóa khỏi bộ sưu tập"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Tiêu đề và ngày tạo */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400"
                  title={item.title}
                >
                  {item.title || 'Hình không tên'}
                </span>
                {item.createdAt && (
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {item.createdAt}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default SavedCollection;
