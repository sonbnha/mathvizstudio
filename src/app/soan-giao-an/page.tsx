'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Copy,
  Check,
  FileDown,
  Printer,
  Edit3,
  Eye,
  RefreshCw,
  Clock,
  GraduationCap,
  Layers,
  Key,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Moon,
  Sun,
  Compass,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import {
  LESSON_PLAN_PRESETS,
  LessonPlanPreset,
  renderMarkdownWithKatex,
  exportToWordDocument,
} from '@/lib/lessonPlanUtils';

export default function LessonPlanPage() {
  // Theme state
  const [isDark, setIsDark] = useState(false);

  // Form states
  const [topic, setTopic] = useState('Định lý Pythagore (Pytago) và ứng dụng thực tế');
  const [grade, setGrade] = useState('Lớp 8');
  const [book, setBook] = useState('Kết Nối Tri Thức Với Cuộc Sống');
  const [duration, setDuration] = useState('2 tiết (90 phút)');
  const [style, setStyle] = useState('Chuẩn 5512');
  const [notes, setNotes] = useState(
    'Thiết kế hoạt động trải nghiệm cắt ghép hình khối để phát hiện định lý và bài toán thực tế tính độ dài thang dựa tường.'
  );
  const [licenseKey, setLicenseKey] = useState('');
  const [isKeyExpanded, setIsKeyExpanded] = useState(false);

  // Generation & Result states
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [lessonPlan, setLessonPlan] = useState('');
  const [activeTab, setActiveTab] = useState<'rendered' | 'editor'>('rendered');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creditsInfo, setCreditsInfo] = useState<number | null>(null);

  // Initialize theme and license key
  useEffect(() => {
    const savedTheme = localStorage.getItem('mathviz_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedKey = localStorage.getItem('mathviz_license_key');
    if (savedKey) {
      setLicenseKey(savedKey);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mathviz_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mathviz_theme', 'light');
    }
  };

  // Preset Selection
  const applyPreset = (preset: LessonPlanPreset) => {
    setTopic(preset.topic);
    setGrade(preset.grade);
    setBook(preset.book);
    setDuration(preset.duration);
    setStyle(preset.style);
    setNotes(preset.notes);
  };

  // Submit Generation
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg('Vui lòng nhập Tên bài học / Chủ đề trước khi bắt đầu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setProgressStep(1);

    // Save key to local storage if entered
    if (licenseKey.trim()) {
      localStorage.setItem('mathviz_license_key', licenseKey.trim().toUpperCase());
    }

    // Step simulator for UX
    const stepTimer = setInterval(() => {
      setProgressStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 3500);

    try {
      const res = await fetch('/api/generate-lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          grade,
          book,
          duration,
          style,
          notes,
          licenseKey: licenseKey.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Phản hồi máy chủ không hợp lệ: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
      }

      if (data.lessonPlan) {
        setLessonPlan(data.lessonPlan);
        setActiveTab('rendered');
        if (data.remainingCredits !== undefined) {
          setCreditsInfo(data.remainingCredits);
        }
      } else {
        throw new Error('Không nhận được nội dung kế hoạch bài dạy từ AI.');
      }
    } catch (err: any) {
      console.error('Lỗi sinh giáo án:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra trong quá trình soạn giáo án.');
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setProgressStep(0);
    }
  };

  // Copy Action
  const handleCopy = () => {
    if (!lessonPlan) return;
    navigator.clipboard.writeText(lessonPlan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Word Action
  const handleExportWord = () => {
    if (!lessonPlan) return;
    const cleanTitle = `Giao_An_${grade}_${topic}`.replace(/\s+/g, '_');
    exportToWordDocument(lessonPlan, cleanTitle);
  };

  // Print Action
  const handlePrint = () => {
    if (!lessonPlan) return;
    window.print();
  };

  const stepsText = [
    'Khởi tạo khung sư phạm Công văn 5512...',
    'Xây dựng mục tiêu và tiến trình 4 hoạt động...',
    'Biên soạn bài tập thực hành & Công thức toán học LaTeX...',
    'Hoàn thiện hồ sơ dạy học và phiếu bài tập...',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* KaTeX CDN Stylesheet */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
        crossOrigin="anonymous"
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs print:hidden">
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
              href="/"
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
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form Panel (5 Cols on LG) */}
        <div className="lg:col-span-5 flex flex-col gap-5 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Thông Tin Bài Học (Công văn 5512)
                </h2>
              </div>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium px-2 py-0.5 rounded-md bg-cyan-500/10">
                Toán THCS & THPT
              </span>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4 text-xs">
              {/* Topic Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Tên bài học / Chủ đề bài giảng <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Định lý Pythagore và ứng dụng"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all font-medium text-xs"
                />
              </div>

              {/* Row: Grade & Book */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Khối lớp</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer"
                  >
                    <option value="Lớp 6">Lớp 6</option>
                    <option value="Lớp 7">Lớp 7</option>
                    <option value="Lớp 8">Lớp 8</option>
                    <option value="Lớp 9">Lớp 9</option>
                    <option value="Lớp 10">Lớp 10</option>
                    <option value="Lớp 11">Lớp 11</option>
                    <option value="Lớp 12">Lớp 12</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Bộ sách</span>
                  </label>
                  <select
                    value={book}
                    onChange={(e) => setBook(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer"
                  >
                    <option value="Kết Nối Tri Thức Với Cuộc Sống">Kết Nối Tri Thức</option>
                    <option value="Cánh Diều">Cánh Diều</option>
                    <option value="Chân Trời Sáng Tạo">Chân Trời Sáng Tạo</option>
                    <option value="Cùng Khám Phá">Cùng Khám Phá</option>
                  </select>
                </div>
              </div>

              {/* Row: Duration & Style */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Thời lượng</span>
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer"
                  >
                    <option value="1 tiết (45 phút)">1 tiết (45 phút)</option>
                    <option value="2 tiết (90 phút)">2 tiết (90 phút)</option>
                    <option value="3 tiết (135 phút)">3 tiết (135 phút)</option>
                    <option value="4 tiết (180 phút)">4 tiết (180 phút)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Định hướng</span>
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer"
                  >
                    <option value="Chuẩn 5512">Chuẩn CV 5512</option>
                    <option value="Tích hợp STEM & Trải nghiệm thực tế">Tích hợp STEM / Thực tế</option>
                    <option value="Nâng cao & Học sinh giỏi">Nâng cao & Bồi dưỡng</option>
                    <option value="Ôn tập & Luyện thi">Ôn tập & Luyện thi</option>
                  </select>
                </div>
              </div>

              {/* Notes / Pedagogical Requirements */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Ghi chú & Yêu cầu trọng tâm của giáo viên</span>
                  <span className="text-[10px] text-slate-400">Tùy chọn</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Thiết kế phiếu học tập nhóm, tích hợp bài toán đo khoảng cách thực tế..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all font-normal text-xs resize-none"
                />
              </div>

              {/* License Key Section (Collapsible) */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsKeyExpanded(!isKeyExpanded)}
                  className="w-full py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mã bản quyền / License Key</span>
                    {licenseKey && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Đã nhập
                      </span>
                    )}
                  </span>
                  {isKeyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isKeyExpanded && (
                  <div className="mt-2.5 flex flex-col gap-1">
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      placeholder="VD: MATH-PRO-XXXX-XXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 font-mono text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200"
                    />
                    <p className="text-[10px] text-slate-400">
                      Nếu để trống, hệ thống sẽ sử dụng lượt dùng tiêu chuẩn hoặc tài khoản hiện tại.
                    </p>
                  </div>
                )}
              </div>

              {/* Error Notification */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang soạn giáo án ({stepsText[progressStep - 1] || 'Đang xử lý...'})</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo Giáo Án Tự Động (Chuẩn 5512)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Preset Topics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Chủ đề bài giảng gợi ý mẫu</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LESSON_PLAN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="text-left px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-cyan-50 dark:bg-slate-950/60 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 text-xs transition-colors flex items-center gap-1.5"
                >
                  <span className="font-semibold text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    {preset.grade}
                  </span>
                  <span className="truncate max-w-[200px]">{preset.topic}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Lesson Plan Output Viewer (7 Cols on LG) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col min-h-[640px] overflow-hidden">
            {/* Action Bar & Mode Switcher */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('rendered')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'rendered'
                        ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem chuẩn 5512</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'editor'
                        ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa Markdown</span>
                  </button>
                </div>

                {lessonPlan && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg hidden sm:inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã hoàn thành
                  </span>
                )}
              </div>

              {/* Action Buttons: Copy, Word, Print */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!lessonPlan}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Sao chép toàn bộ nội dung"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportWord}
                  disabled={!lessonPlan}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Xuất file Microsoft Word (.doc/.docx)"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Xuất file Word</span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={!lessonPlan}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="In hoặc tải định dạng PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / PDF</span>
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                /* Animated Loading Skeleton */
                <div className="py-16 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 animate-pulse">
                      <Sparkles className="w-8 h-8 animate-spin" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 max-w-md">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      Đang soạn kế hoạch bài dạy theo Công văn 5512
                    </h3>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                      {stepsText[progressStep - 1] || 'Đang triển khai chi tiết 4 hoạt động sư phạm...'}
                    </p>
                    <div className="w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500 rounded-full"
                        style={{ width: `${progressStep * 25}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : lessonPlan ? (
                activeTab === 'rendered' ? (
                  /* Rendered HTML + KaTeX View */
                  <article
                    className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownWithKatex(lessonPlan) }}
                  />
                ) : (
                  /* Raw Markdown Editor */
                  <textarea
                    value={lessonPlan}
                    onChange={(e) => setLessonPlan(e.target.value)}
                    rows={28}
                    className="w-full h-full font-mono text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 leading-relaxed resize-none"
                  />
                )
              ) : (
                /* Empty Initial Guide View */
                <div className="py-14 flex flex-col items-center justify-center gap-6 text-center max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      Trợ Lý Soạn Giáo Án Toán Học AI (CV 5512)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Điền thông tin bài học ở cột bên trái và bấm nút <strong>"Tạo Giáo Án Tự Động"</strong> để nhận Kế hoạch bài dạy chuẩn mực 4 hoạt động của Bộ GD&ĐT kèm công thức Toán LaTeX và phiếu học tập.
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-3 w-full text-left text-xs mt-2">
                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-1.5">
                      <span className="font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đúng chuẩn 4 Hoạt động
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Mở đầu &rarr; Kiến thức mới &rarr; Luyện tập &rarr; Vận dụng với quy trình 4 bước sư phạm.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-1.5">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <FileDown className="w-3.5 h-3.5" />
                        Xuất Word (.doc/.docx)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Định dạng Times New Roman 13pt, lề chuẩn 2cm, sẵn sàng để nộp duyệt và in ấn.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
