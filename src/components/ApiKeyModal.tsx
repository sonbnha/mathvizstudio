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
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isApiKeyModalOpen) {
      setInputKey(customApiKey || '');
      setTestResult(null);
      setSaveFeedback(null);
    }
  }, [isApiKeyModalOpen, customApiKey]);

  if (!isApiKeyModalOpen) return null;

  /** Test the key without saving */
  const handleTestKey = async () => {
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setTestResult({ type: 'error', text: 'Vui lòng nhập Gemini API Key trước khi kiểm tra.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSaveFeedback(null);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const rawText = await res.text();
      let data: any = {};
      try { data = JSON.parse(rawText); } catch { /* ignore */ }

      if (res.ok && data.success) {
        setTestResult({
          type: 'success',
          text: '✓ API Key hợp lệ và hoạt động tốt! Bấm "Lưu Key" để sử dụng.',
        });
      } else if (res.status === 429) {
        setTestResult({
          type: 'warning',
          text: 'Key có vẻ hợp lệ nhưng đang bị giới hạn hạn mức (429 / Quota). Bạn vẫn có thể lưu và thử lại sau.',
        });
      } else {
        setTestResult({
          type: 'error',
          text: data.error || 'API Key không hợp lệ hoặc không có quyền truy cập Gemini API.',
        });
      }
    } catch {
      setTestResult({
        type: 'warning',
        text: 'Không thể kết nối máy chủ kiểm tra lúc này. Bạn vẫn có thể lưu Key và thử tạo hình/soạn bài.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  /** Save the key directly (without mandatory test) */
  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();

    if (!cleanKey) {
      setSaveFeedback({ type: 'error', text: 'Vui lòng nhập Gemini API Key trước khi lưu.' });
      return;
    }

    setCustomApiKey(cleanKey);
    setSaveFeedback({
      type: 'success',
      text: 'Đã lưu Key cá nhân vào trình duyệt. Tất cả yêu cầu tiếp theo sẽ dùng Key này.',
    });
    setTimeout(() => {
      closeApiKeyModal();
    }, 1000);
  };

  const handleRemoveKey = () => {
    removeCustomApiKey();
    setInputKey('');
    setTestResult(null);
    setSaveFeedback({
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
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs shadow-xs w-full overflow-hidden">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 leading-relaxed break-words [word-break:break-word]">
                  <strong>Hệ thống phát hiện quá tải lượt gọi miễn phí!</strong>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                    Vui lòng cấu hình Gemini API Key cá nhân bên dưới để tiếp tục sử dụng không bị gián đoạn.
                  </p>
                  {rateLimitNotice.length > 60 && (
                    <details className="mt-1.5">
                      <summary className="text-[11px] text-amber-500/80 dark:text-amber-400/70 cursor-pointer hover:text-amber-600 dark:hover:text-amber-300 transition select-none">
                        Xem chi tiết mã lỗi kỹ thuật
                      </summary>
                      <pre className="mt-1 text-[11px] p-2 bg-black/10 dark:bg-black/40 rounded-lg overflow-x-auto break-all whitespace-pre-wrap text-amber-800 dark:text-amber-200 max-h-24">
                        {rateLimitNotice}
                      </pre>
                    </details>
                  )}
                </div>
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
          <form onSubmit={handleSaveKey} className="space-y-3">
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

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  testResult.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : testResult.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {testResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : testResult.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                )}
                <span className="break-words [word-break:break-word]">{testResult.text}</span>
              </div>
            )}

            {/* Save Feedback */}
            {saveFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : saveFeedback.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
              >
                {saveFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : saveFeedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                ) : (
                  <Zap className="w-4 h-4 shrink-0 text-blue-500" />
                )}
                <span>{saveFeedback.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Test Key button */}
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={isTesting || !inputKey.trim()}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Kiểm tra Key</span>
                    </>
                  )}
                </button>

                {/* Save Key button */}
                <button
                  type="submit"
                  disabled={isSaving || !inputKey.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Lưu Key</span>
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
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="text-base">📖</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  Hướng dẫn lấy API Key{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(1 phút)</span>
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-md border border-sky-500/20 dark:border-sky-500/30 transition-colors"
              >
                <span>Mở AI Studio</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
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
