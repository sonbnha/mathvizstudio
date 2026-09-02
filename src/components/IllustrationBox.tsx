'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface IllustrationBoxProps {
  description: string;
}

export const IllustrationBox: React.FC<IllustrationBoxProps> = ({ description }) => {
  const router = useRouter();

  const handleCreateSVG = () => {
    try {
      // Lưu mô tả để module vẽ hình đọc
      sessionStorage.setItem('pending_geometry_prompt', description);
    } catch (e) {
      console.error(e);
    }

    // Kích hoạt sự kiện và chuyển sang tab geometry
    window.dispatchEvent(new CustomEvent('switch-to-geometry', { detail: { prompt: description } }));
    router.replace('?tab=geometry', { scroll: false });
  };

  return (
    <div className="my-4 p-4 rounded-xl border border-slate-300 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none font-sans not-prose shadow-xs">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex flex-col items-center gap-1 mt-0.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-500/30 uppercase tracking-wide">
            Hình vẽ
          </span>
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-medium">
          {description}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreateSVG}
        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
        title="Chuyển sang tab Vẽ hình và nạp mô tả này vào ô nhập"
      >
        <span>+ Tạo hình SVG cho bài này</span>
      </button>
    </div>
  );
};
