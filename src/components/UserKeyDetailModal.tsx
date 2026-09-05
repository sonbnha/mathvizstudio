'use client';

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  Clock, 
  Zap, 
  Copy, 
  Check, 
  Calendar,
  Sparkles,
  Crown
} from 'lucide-react';
import { formatFullDateTimeVN, formatDateTimeVN } from '@/config/version';

export interface UserKeyDetailData {
  user: {
    id?: string;
    name?: string;
    username?: string;
    email?: string;
    role?: string;
    is_vip?: boolean;
    isVip?: boolean;
    vip_expires_at?: string | Date | null;
    vipExpiresAt?: string | Date | null;
    remaining_quota?: number | null;
    remainingQuota?: number | null;
    max_quota?: number | null;
    maxQuota?: number | null;
  };
  key: {
    id: string;
    key: string;
    usedAt?: string | Date | null;
    used_at?: string | Date | null;
    durationDays?: number;
    duration_days?: number;
    maxUsage?: number;
    max_usage?: number;
    totalCredits?: number;
    total_credits?: number;
    status?: string;
  };
}

interface UserKeyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UserKeyDetailData | null;
}

export default function UserKeyDetailModal({ isOpen, onClose, data }: UserKeyDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen || !data) return null;

  const { user, key } = data;

  const handleCopy = () => {
    if (!key.key) return;
    navigator.clipboard.writeText(key.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const roleLower = (user.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';
  const isVip = Boolean(user.is_vip ?? user.isVip) || roleLower === 'vip';
  const duration = key.durationDays ?? key.duration_days ?? 30;
  const usage = key.maxUsage ?? key.max_usage ?? key.totalCredits ?? key.total_credits ?? 50;

  const durationStr = duration === 0 ? 'Vĩnh viễn (∞)' : `+${duration} ngày`;
  const usageStr = usage === -1 ? '+∞ lượt' : `+${usage} lượt`;

  const remainingQuota = user.remaining_quota ?? user.remainingQuota;
  const isUnlimitedQuota = isAdmin || remainingQuota === null || remainingQuota === -1;
  const quotaStr = isUnlimitedQuota ? '∞ lượt' : `${remainingQuota ?? 0} lượt`;

  const vipExpiresAt = user.vip_expires_at || user.vipExpiresAt;
  const vipExpiresStr = vipExpiresAt 
    ? formatDateTimeVN(vipExpiresAt) 
    : (isAdmin || isVip ? 'Vĩnh viễn (∞)' : 'Hết hạn / Free');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thông tin tài khoản kích hoạt
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chi tiết tài khoản người dùng và thông số nạp License Key
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* PHẦN 1: Thông tin tài khoản */}
          <div className="flex flex-col gap-3 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Phần 1 • Tài khoản người dùng</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Tên hiển thị:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {user.name || user.username || 'Chưa đặt tên'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Tên đăng nhập (Username):</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  @{user.username || '—'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Email tài khoản:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user.email || 'Chưa cập nhật email'}
                </span>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Vai trò tài khoản:</span>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Quản trị viên (Admin)
                  </span>
                ) : isVip ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> VIP
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Thành viên (Free)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PHẦN 2: Thông tin nạp License Key */}
          <div className="flex flex-col gap-3 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/60 rounded-xl p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Phần 2 • Thông tin License Key đã kích hoạt</span>
            </h4>

            <div className="flex flex-col gap-2.5 text-xs">
              {/* Mã Key */}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Mã License Key:</span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-300 tracking-wider">
                    {key.key}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 text-[11px] font-medium"
                    title="Sao chép mã Key"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Thời gian kích hoạt */}
              <div className="flex items-center justify-between py-1 border-b border-cyan-200/60 dark:border-cyan-800/40">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Thời gian kích hoạt:
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {key.usedAt || key.used_at ? formatFullDateTimeVN(key.usedAt || key.used_at) : 'Không rõ'}
                </span>
              </div>

              {/* Hạn mức được cấp từ key */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Hạn mức được cấp từ key:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px]">
                  {durationStr} • {usageStr}
                </span>
              </div>
            </div>
          </div>

          {/* PHẦN 3: Trạng thái hiện tại của tài khoản */}
          <div className="flex flex-col gap-3 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Phần 3 • Trạng thái hiện tại của tài khoản</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Lượt tạo còn lại:</span>
                <span className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400">
                  {quotaStr}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Hạn sử dụng VIP:</span>
                <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-200 truncate" title={vipExpiresStr}>
                  {vipExpiresStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
