'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface IllustrationBoxProps {
  description: string;
  figureId: string;
}

export const IllustrationBox: React.FC<IllustrationBoxProps> = ({ description, figureId }) => {
  const router = useRouter();
  const [svgCode, setSvgCode] = useState<string | null>(null);

  // Load existing inserted SVG figure from localStorage & listen for updates
  useEffect(() => {
    const loadFigure = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('lesson_plan_figures') || '{}');
        if (stored[figureId]) {
          setSvgCode(stored[figureId]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadFigure();

    const handleUpdate = (e: any) => {
      if (e.detail?.figureId === figureId && e.detail?.svgCode) {
        setSvgCode(e.detail.svgCode);
      }
    };

    window.addEventListener('lesson-plan-figure-updated', handleUpdate);
    return () => window.removeEventListener('lesson-plan-figure-updated', handleUpdate);
  }, [figureId]);

  const handleCreateSVG = () => {
    try {
      sessionStorage.setItem('pending_geometry_prompt', description);
      sessionStorage.setItem('pending_target_figure_id', figureId);
    } catch (e) {
      console.error(e);
    }

    window.dispatchEvent(
      new CustomEvent('switch-to-geometry', {
        detail: { prompt: description, figureId },
      })
    );
    router.replace('?tab=geometry', { scroll: false });
  };

  const handleRemoveFigure = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('lesson_plan_figures') || '{}');
      delete stored[figureId];
      localStorage.setItem('lesson_plan_figures', JSON.stringify(stored));
      setSvgCode(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. If SVG figure is already inserted:
  if (svgCode) {
    return (
      <div className="my-5 flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm not-prose select-none group">
        <div
          dangerouslySetInnerHTML={{ __html: svgCode }}
          className="max-w-[460px] w-full flex justify-center [&>svg]:max-h-[340px] [&>svg]:w-auto [&>svg]:h-auto transition-transform"
        />
        <div className="flex items-center justify-between w-full max-w-[460px] pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="italic truncate mr-2" title={description}>
            Hình minh họa: {description}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateSVG}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium cursor-pointer"
              title="Vẽ lại hình này trong tab Vẽ hình học"
            >
              Vẽ lại
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleRemoveFigure}
              className="text-rose-500 hover:underline font-medium cursor-pointer"
              title="Gỡ hình này và quay về khung mô tả"
            >
              Gỡ hình
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If no SVG figure yet, show placeholder + action button
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
