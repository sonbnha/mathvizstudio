'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useApiKey } from '@/context/ApiKeyContext';

export const ApiKeyModal: React.FC = () => {
  const {
    customApiKey,
    isCustomKeyActive,
    isApiKeyModalOpen,
    rateLimitNotice,
    setCustomApiKey,
    removeCustomApiKey,
    closeApiKeyModal,
  } = useApiKey();

  const [inputKey, setInputKey] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isApiKeyModalOpen) {
      setInputKey(customApiKey || '');
      setFeedback(null);
    }
  }, [isApiKeyModalOpen, customApiKey]);

  if (!isApiKeyModalOpen) return null;

  const handleValidateAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();

    if (!cleanKey) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập Gemini API Key trước khi lưu.' });
      return;
    }

    setIsValidating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCustomApiKey(cleanKey);
        setFeedback({
          type: 'success',
          text: 'Xác thực Gemini API Key thành công! Đã lưu vào trình duyệt của bạn.',
        });
        setTimeout(() => {
          closeApiKeyModal();
        }, 1200);
      } else {
        // Still save if user insists, but warn them
        setCustomApiKey(cleanKey);
        setFeedback({
          type: 'info',
          text: data.error || 'Đã lưu key vào trình duyệt. Hãy thử tạo hình hoặc soạn bài dạy để kiểm tra.',
        });
      }
    } catch {
      // Offline or network error
      setCustomApiKey(cleanKey);
      setFeedback({
        type: 'info',
        text: 'Đã lưu key vào trình duyệt (không thể ping máy chủ kiểm tra kết nối lúc này).',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = () => {
    removeCustomApiKey();
    setInputKey('');
    setFeedback({
      type: 'info',
      text: 'Đã xóa Key cá nhân. Hệ thống sẽ sử dụng lại Gemini Key mặc định.',
    });
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Accent */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md shadow-xs">
              <Key className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cấu hình Gemini API Key Cá Nhân</h3>
              <p className="text-xs text-blue-100 mt-0.5">Tăng tốc xử lý & không giới hạn lượt gọi AI</p>
            </div>
          </div>
          <button
            onClick={closeApiKeyModal}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Overload / Rate Limit Notice if triggered */}
          {rateLimitNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-xs animate-pulse">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Hệ thống phát hiện quá tải lượt gọi miễn phí!</strong>
                <p className="mt-0.5">{rateLimitNotice}</p>
              </div>
            </div>
          )}

          {/* Current Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Trạng thái hiện tại:</span>
            {isCustomKeyActive ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Đang dùng Key cá nhân ({maskKey(customApiKey)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5" />
                Đang dùng Key mặc định hệ thống
              </span>
            )}
          </div>

          {/* Key Input Form */}
          <form onSubmit={handleValidateAndSave} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nhập mã Gemini API Key của bạn (Google AI Studio):
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-20 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-xs"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showPassword ? 'Ẩn key' : 'Hiện key'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : feedback.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                ) : (
                  <Zap className="w-4 h-4 shrink-0 text-blue-500" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isValidating || !inputKey.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Lưu Key Cá Nhân</span>
                    </>
                  )}
                </button>

                {isCustomKeyActive && (
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-800/60 transition flex items-center gap-1 cursor-pointer"
                    title="Xóa key cá nhân và dùng lại key mặc định"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dùng lại mặc định</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={closeApiKeyModal}
                className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </form>

          {/* Step-by-Step Guide Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                📖 Hướng dẫn lấy Gemini API Key Miễn Phí (1 phút):
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Mở Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
              <li>
                Truy cập{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline font-mono"
                >
                  aistudio.google.com/app/apikey
                </a>{' '}
                và đăng nhập bằng tài khoản Google.
              </li>
              <li>
                Bấm nút <strong className="text-slate-900 dark:text-slate-100">"Create API key"</strong> (Tạo khóa
                API) và chọn project bất kỳ.
              </li>
              <li>
                Sao chép chuỗi ký tự vừa tạo (bắt đầu bằng <code className="font-mono text-blue-600">AIzaSy...</code>)
                và dán vào ô bên trên.
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                Key được lưu an toàn trên trình duyệt của bạn (localStorage), không gửi lưu trên server và hoàn toàn
                miễn phí.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
