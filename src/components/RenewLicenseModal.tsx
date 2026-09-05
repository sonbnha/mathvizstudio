'use client';

import React, { useState } from 'react';
import { Key, Sparkles, X, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RenewLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any | null;
  onSuccess?: (data: any) => void;
  isNearExpiry?: boolean;
  customTitle?: string;
  customDescription?: string;
}

export default function RenewLicenseModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  isNearExpiry = false,
  customTitle,
  customDescription,
}: RenewLicenseModalProps) {
  const [keyCode, setKeyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const title = customTitle || (
    isNearExpiry
      ? 'Gia hạn gói VIP Bản quyền ⭐'
      : 'Tài khoản đã hết lượt sử dụng hoặc hết hạn VIP'
  );

  const description = customDescription || (
    isNearExpiry
      ? 'Gói bản quyền của bạn sắp hết hạn hoặc sắp hết lượt tạo. Vui lòng nhập License Key mới để gia hạn và cộng dồn thời gian sử dụng liên tục không gián đoạn.'
      : 'Vui lòng nhập mã License Key mới để tiếp tục tạo hình minh họa toán học và soạn giáo án không giới hạn.'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyCode.trim().toUpperCase();
    if (!cleanKey) {
      setErrorMsg('Vui lòng nhập mã License Key.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (currentUser) {
        // Tài khoản đã đăng nhập: Gọi API kích hoạt & liên kết / gia hạn vào DB Neon
        const res = await fetch('/api/license/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyCode: cleanKey }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || 'Mã key không hợp lệ hoặc không thể kích hoạt.');
        }

        setSuccessMsg(data.message || '🎉 Gia hạn bản quyền VIP thành công!');
        if (onSuccess) {
          onSuccess(data.user);
        }

        setTimeout(() => {
          setKeyCode('');
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        // Khách vãng lai: Kiểm tra key qua API check và lưu tạm vào localStorage
        const res = await fetch('/api/license/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: cleanKey }),
        });

        const data = await res.json();
        if (!res.ok || !data.valid) {
          throw new Error(data.message || 'Mã License Key không hợp lệ hoặc đã hết lượt.');
        }

        localStorage.setItem('mathviz_license_key', cleanKey);
        if (data.customerName) {
          localStorage.setItem('mathviz_customer_name', data.customerName);
        }

        setSuccessMsg('🎉 Kích hoạt License Key thành công!');
        if (onSuccess) {
          onSuccess({ key: cleanKey, licenseStatus: data });
        }

        setTimeout(() => {
          setKeyCode('');
          setSuccessMsg(null);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi kiểm tra mã key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút Đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            isNearExpiry 
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400' 
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}>
            {isNearExpiry ? (
              <Zap className="w-6 h-6 fill-amber-500/30" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div className="pr-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Thông báo Thành công / Thất bại */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form nhập Key */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Mã License Key gia hạn</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyCode}
                onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                placeholder="Ví dụ: MV-VIP-XXXX-XXXX"
                disabled={loading}
                autoFocus
                className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono uppercase font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
              <Sparkles className="w-4 h-4 text-amber-500/60 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 font-medium">
              <span>⚡ Hệ thống sẽ tự động cộng dồn thời hạn sử dụng và số lượt tạo hình vào tài khoản hiện tại của bạn.</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="submit"
              disabled={loading || !keyCode.trim()}
              className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>Kích hoạt / Gia hạn ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
