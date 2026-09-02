'use client';

import React, { useState } from 'react';
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
  Lightbulb,
} from 'lucide-react';
import {
  LESSON_PLAN_PRESETS,
  LessonPlanPreset,
  renderMarkdownWithKatex,
  exportToWordDocument,
  exportToDocx,
} from '@/lib/lessonPlanUtils';

interface LessonPlanViewProps {
  licenseKey?: string;
}

export default function LessonPlanView({ licenseKey: parentKey = '' }: LessonPlanViewProps) {
  // Form states
  const [topic, setTopic] = useState('Định lý Pythagore (Pytago) và ứng dụng thực tế');
  const [grade, setGrade] = useState('Lớp 8');
  const [duration, setDuration] = useState('2 tiết (90 phút)');
  const [style, setStyle] = useState('Chuẩn 5512');
  const [notes, setNotes] = useState(
    'Thiết kế hoạt động trải nghiệm cắt ghép hình khối để phát hiện định lý và bài toán thực tế tính độ dài thang dựa tường.'
  );
  const [customKey, setCustomKey] = useState('');
  const [isKeyExpanded, setIsKeyExpanded] = useState(false);

  // Default Universal Textbook Series
  const BOOK_SERIES = 'Bộ sách Thống nhất';

  // Generation & Result states
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [lessonPlan, setLessonPlan] = useState('');
  const [activeTab, setActiveTab] = useState<'rendered' | 'editor'>('rendered');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Effective key
  const effectiveKey = customKey.trim() || parentKey.trim();

  // Preset Selection
  const applyPreset = (preset: LessonPlanPreset) => {
    setTopic(preset.topic);
    setGrade(preset.grade);
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

    if (customKey.trim()) {
      localStorage.setItem('mathviz_license_key', customKey.trim().toUpperCase());
    }

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
          book: BOOK_SERIES,
          duration,
          style,
          notes,
          licenseKey: effectiveKey,
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

  // Export Word Action (.docx / .doc)
  const handleExportWord = async () => {
    if (!lessonPlan) return;
    setIsExporting(true);
    const cleanTitle = `Giao_An_${grade}_${topic}`.replace(/[\s/\\?%*:|"<>]+/g, '_').slice(0, 45);
    try {
      await exportToDocx(lessonPlan, cleanTitle);
    } catch (e) {
      console.warn('Lỗi xuất .docx, chuyển sang định dạng Word tiêu chuẩn:', e);
      exportToWordDocument(lessonPlan, cleanTitle);
    } finally {
      setIsExporting(false);
    }
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
    <div className="w-full h-full flex flex-col md:flex-row gap-4 p-3 md:p-4 overflow-hidden">
      {/* Print CSS Stylesheet */}
      <style jsx global>{`
        @media print {
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, footer, .sidebar-form, .action-bar, .print-hidden {
            display: none !important;
          }
          .a4-paper-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            min-height: auto !important;
          }
          .preview-container {
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* LEFT COLUMN: Input Form & Lesson Configuration */}
      <div className="sidebar-form w-full md:w-[380px] xl:w-[420px] shrink-0 h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Soạn Giáo Án 5512</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chuẩn Bộ GD&ĐT • Xuất file Word (.docx)
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Preset Quick Chips */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý bài dạy mẫu (Bấm để nạp nhanh):</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LESSON_PLAN_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-[11px] border border-slate-200 dark:border-slate-700/60 transition cursor-pointer"
                >
                  {p.grade}: {p.topic.split(' và ')[0].slice(0, 25)}...
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-3.5">
            {/* Topic Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>Tên Bài học / Chủ đề</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ví dụ: Định lý Pythagore, Tỉ số lượng giác góc nhọn, Góc nội tiếp..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs resize-none shadow-xs"
                required
              />
            </div>

            {/* Row 1: Grade & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Khối lớp</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer shadow-xs"
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
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Thời lượng</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer shadow-xs"
                >
                  <option value="1 tiết (45 phút)">1 tiết (45 phút)</option>
                  <option value="2 tiết (90 phút)">2 tiết (90 phút)</option>
                  <option value="3 tiết (135 phút)">3 tiết (135 phút)</option>
                  <option value="4 tiết (180 phút)">4 tiết (180 phút)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Style & Universal Curriculum Badge */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Định hướng</span>
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs cursor-pointer shadow-xs"
                >
                  <option value="Chuẩn 5512">Chuẩn CV 5512</option>
                  <option value="Tích hợp STEM & Trải nghiệm thực tế">Tích hợp STEM / Thực tế</option>
                  <option value="Nâng cao & Học sinh giỏi">Nâng cao & Bồi dưỡng</option>
                  <option value="Ôn tập & Luyện thi">Ôn tập & Luyện thi</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Chương trình</span>
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs h-[38px]">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate font-semibold">Bộ sách Thống nhất</span>
                </div>
              </div>
            </div>

            {/* Notes / Pedagogical Requirements */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Ghi chú & Yêu cầu trọng tâm của giáo viên</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Tùy chọn</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Thiết kế trò chơi khởi động, bài toán thực tiễn tính chiều cao cây, tích hợp liên môn..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium text-xs resize-none shadow-xs"
              />
            </div>

            {/* Custom License Key Accordion */}
            <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsKeyExpanded(!isKeyExpanded)}
                className="w-full flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition py-1 text-xs cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Key className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Mã kích hoạt VIP riêng</span>
                </span>
                {isKeyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isKeyExpanded && (
                <div className="mt-2 pt-1">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Nhập mã MV-VIP-xxxx nếu có..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 uppercase shadow-xs"
                  />
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
      </div>

      {/* RIGHT COLUMN: Lesson Plan Output Viewer (Word-like Virtual A4 Preview) */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Sticky Action Bar & Mode Switcher */}
        <div className="action-bar p-3 md:p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setActiveTab('rendered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'rendered'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Trang Word A4</span>
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
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
                Đã sẵn sàng in / nộp
              </span>
            )}
          </div>

          {/* Action Buttons: Copy, Word (.docx), Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!lessonPlan}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              title="Sao chép toàn bộ nội dung"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã chép</span>
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
              disabled={!lessonPlan || isExporting}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs shadow-blue-500/20"
              title="Tải file Microsoft Word (.docx chuẩn mực)"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo .docx...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Tải file .docx</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={!lessonPlan}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              title="In trực tiếp hoặc Lưu dưới dạng file PDF chuẩn A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Xuất PDF</span>
            </button>
          </div>
        </div>

        {/* Content Body: Word-like A4 Virtual Paper Preview */}
        <div className="preview-container flex-1 overflow-y-auto bg-slate-200/80 dark:bg-slate-950 p-4 sm:p-6 md:p-8 flex flex-col items-center">
          {loading ? (
            /* Animated Loading inside A4 Sheet */
            <div className="w-full max-w-[800px] min-h-[680px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8 sm:p-12 shadow-2xl rounded-xs border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center gap-5 text-center my-4 font-sans">
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
              /* Virtual A4 Paper Sheet */
              <div className="w-full max-w-[800px] min-h-[1100px] bg-white text-black p-8 sm:p-12 md:p-16 shadow-2xl rounded-xs border border-slate-300 dark:border-slate-800 font-serif text-[14px] leading-relaxed select-text my-4 relative transition-all a4-paper-sheet">
                {/* Decorative Word A4 Sheet Header Marker */}
                <div className="text-[11px] text-slate-400 font-sans mb-6 pb-2 border-b border-slate-200 flex items-center justify-between select-none print:hidden">
                  <span className="font-semibold tracking-wider text-slate-500">
                    KẾ HOẠCH BÀI DẠY THEO CÔNG VĂN 5512/BGDĐT-GDTrH
                  </span>
                  <span>MÔN TOÁN • BỘ SÁCH THỐNG NHẤT</span>
                </div>
                <article
                  className="max-w-none text-black leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownWithKatex(lessonPlan) }}
                />
              </div>
            ) : (
              /* Raw Markdown Editor */
              <div className="w-full max-w-[800px] h-full flex-1 my-4 flex flex-col">
                <textarea
                  value={lessonPlan}
                  onChange={(e) => setLessonPlan(e.target.value)}
                  rows={28}
                  className="w-full flex-1 font-mono text-xs p-5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 leading-relaxed resize-none shadow-md"
                />
              </div>
            )
          ) : (
            /* Empty Initial Guide View */
            <div className="w-full max-w-[800px] min-h-[600px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-8 sm:p-12 shadow-xl rounded-xs border border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center gap-6 text-center my-4 font-sans">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-2 max-w-md">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  Trợ Lý Soạn Giáo Án Toán Học AI (CV 5512)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Điền thông tin bài học ở cột bên trái và bấm nút <strong>"Tạo Giáo Án Tự Động"</strong> để nhận Kế hoạch bài dạy chuẩn mực hiển thị trực quan trong khung xem trước tờ giấy A4 chuẩn Word.
                </p>
              </div>

              {/* Highlights Grid */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md text-left text-xs mt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-1.5">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Xem trước chuẩn A4
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mô phỏng chân thực từng trang Word với Times New Roman và bảng hoạt động 5512.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-1.5">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <FileDown className="w-3.5 h-3.5" />
                    Xuất File .docx
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Định dạng chuẩn lề 2cm, sẵn sàng để nộp ban giám hiệu và in ấn trực tiếp.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
