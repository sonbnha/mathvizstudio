'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  BookOpen,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import LessonPlanView from '@/components/LessonPlanView';
import { useRenewModal } from '@/context/RenewModalContext';

export default function LessonPlanPage() {
  const { openRenewModal, licenseInfo } = useRenewModal();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="shrink-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base md:text-lg bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  MathViz Studio
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {APP_VERSION.fullString}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Soạn giáo án tự động theo chuẩn Công văn 5512/BGDĐT
              </p>
            </div>
          </Link>

          {/* Module Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
            <Link
              href="/?tab=geometry"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vẽ hình học</span>
            </Link>
            <Link
              href="/soan-giao-an"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/80 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Soạn giáo án 5512</span>
            </Link>
          </nav>
        </div>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-2">
          {/* Nút ⚡ Gia hạn key khi sắp hết hạn / sắp hết lượt hoặc đã hết */}
          {(licenseInfo.isNearExpiry || licenseInfo.isFullyExpired) && (
            <button
              type="button"
              onClick={() => openRenewModal()}
              className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:brightness-110 flex items-center gap-1 animate-pulse cursor-pointer shrink-0"
              title="Gói bản quyền của bạn sắp hết hạn hoặc đã hết lượt tạo. Bấm để gia hạn ngay!"
            >
              <span>⚡ Gia hạn key</span>
            </button>
          )}

          <Link
            href="/admin"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5"
            title="Trang quản trị License & Changelog"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Quản trị</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 w-full px-4 md:px-6 py-3 overflow-hidden flex flex-col">
        <LessonPlanView />
      </main>
    </div>
  );
}
