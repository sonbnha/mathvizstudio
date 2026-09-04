'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  X,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'ctv' | 'user' | string;
  is_active: boolean;
  created_at: string;
  saved_diagrams_count: number;
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'ctv' | 'user'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const url = search.trim()
        ? `/api/admin/users?search=${encodeURIComponent(search.trim())}`
        : '/api/admin/users';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setMessage({ type: 'error', text: data.error || 'Không thể tải danh sách người dùng.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ.' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  // Lọc theo vai trò
  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'all') return true;
    return (u.role || 'user').toLowerCase() === roleFilter;
  });

  // Cập nhật vai trò
  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật vai trò thất bại.');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setMessage({ type: 'success', text: `Đã đổi quyền thành ${newRole.toUpperCase()}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUserId) {
      alert('Bạn không thể tự khóa tài khoản quản trị của chính mình.');
      return;
    }

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại.');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      setMessage({
        type: 'success',
        text: currentStatus ? 'Đã tạm khóa tài khoản.' : 'Đã mở khóa tài khoản.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset mật khẩu tạm thời
  const handleResetPassword = async (userId: string, email: string) => {
    const tempPass = `MV@${Math.floor(100000 + Math.random() * 900000)}`;
    const confirm = window.confirm(
      `Đặt lại mật khẩu tạm thời cho tài khoản ${email} thành:\n\n${tempPass}\n\nBạn có muốn tiếp tục?`
    );
    if (!confirm) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: tempPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đặt lại mật khẩu thất bại.');

      navigator.clipboard.writeText(tempPass);
      setCopiedPass(tempPass);
      setMessage({
        type: 'success',
        text: `Mật khẩu mới đã đổi thành "${tempPass}" (Đã sao chép vào clipboard).`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xóa toàn bộ hình vẽ vi phạm
  const handleClearDiagrams = async (userId: string, email: string) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn xóa TOÀN BỘ hình vẽ trong bộ sưu tập của ${email}?`
    );
    if (!confirm) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}?action=clear_diagrams`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể xóa hình vẽ.');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, saved_diagrams_count: 0 } : u))
      );
      setMessage({ type: 'success', text: 'Đã xóa sạch hình vẽ của người dùng.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xóa tài khoản
  const handleDeleteUser = async (userId: string, email: string) => {
    if (userId === currentUserId) {
      alert('Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }

    const confirm = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản ${email}? Hành động này sẽ xóa toàn bộ hình vẽ liên quan và không thể hoàn tác.`
    );
    if (!confirm) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xóa tài khoản thất bại.');

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setMessage({ type: 'success', text: `Đã xóa tài khoản ${email} thành công.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderRoleBadge = (u: AdminUserItem) => {
    const role = (u.role || 'user').toLowerCase();
    const isLoading = actionLoadingId === u.id;

    const badgeStyle =
      role === 'admin'
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
        : role === 'ctv'
        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
        : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';

    return (
      <div className="relative inline-block">
        <select
          value={role}
          disabled={isLoading || u.id === currentUserId}
          onChange={(e) => handleRoleChange(u.id, e.target.value)}
          className={`appearance-none font-bold text-[11px] px-2.5 py-1 pr-6 rounded-full border cursor-pointer transition-all outline-none disabled:opacity-60 ${badgeStyle}`}
          title="Bấm để thay đổi vai trò"
        >
          <option value="user">User (Người dùng)</option>
          <option value="ctv">CTV (Cộng tác viên)</option>
          <option value="admin">Admin (Quản trị viên)</option>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] opacity-60">
          ▼
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Quản trị Người dùng Hệ thống (Admin Panel)
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {users.length} tài khoản
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quản lý phân quyền, kiểm soát bộ sưu tập hình vẽ và bảo mật Neon Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Đi tới trang Quản trị toàn diện (License Key, Changelog...)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Trang Admin toàn diện</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Role filter + Refresh */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Tìm kiếm theo tên hoặc email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['all', 'admin', 'ctv', 'user'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {r === 'all' ? 'Tất cả' : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span className="text-xs">Đang tải danh sách người dùng từ Neon Database...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {search ? 'Không tìm thấy người dùng nào phù hợp với từ khóa.' : 'Chưa có người dùng nào.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="sticky top-0 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[11px] z-10">
                  <th className="py-3 px-4 whitespace-nowrap">Người Dùng</th>
                  <th className="py-3 px-4 whitespace-nowrap">Vai Trò</th>
                  <th className="py-3 px-4 whitespace-nowrap">Bộ Sưu Tập</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUserId;
                  const isBusy = actionLoadingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              {u.email}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Tham gia: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-3.5 px-4">{renderRoleBadge(u)}</td>

                      {/* Saved Diagrams Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              u.saved_diagrams_count > 0
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            📐 {u.saved_diagrams_count} hình
                          </span>

                          {u.saved_diagrams_count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearDiagrams(u.id, u.email)}
                              disabled={isBusy}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Xóa toàn bộ hình vẽ vi phạm trong bộ sưu tập"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          disabled={isBusy || isCurrent}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title={
                            isCurrent
                              ? 'Không thể khóa chính mình'
                              : u.is_active
                              ? 'Bấm để khóa tài khoản'
                              : 'Bấm để mở khóa tài khoản'
                          }
                        >
                          {u.is_active ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Hoạt động</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Đã khóa</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.id, u.email)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                            title="Đặt lại mật khẩu tạm thời"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={isBusy || isCurrent}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition cursor-pointer disabled:opacity-30"
                            title={isCurrent ? 'Không thể tự xóa chính mình' : 'Xóa tài khoản vĩnh viễn'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <span>
            Đang hiển thị {filteredUsers.length} / {users.length} người dùng
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersModal;
