import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 transition-colors font-sans">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white border-b sm:border-b-0 sm:border-r border-slate-300 dark:border-slate-800 pb-3 sm:pb-0 sm:pr-6">
          404
        </h1>
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">
            Không tìm thấy trang này
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã bị di chuyển.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm transition"
        >
          <span>Quay lại trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
