'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  PlusCircle,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Sparkles,
  Users,
  CreditCard,
  Lock,
  LogOut,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  UserPlus,
  User,
  Compass,
  BarChart3,
  Search,
  Loader2,
  Edit,
  X,
  CheckCircle2,
  Shield,
  Filter,
  FileText,
  Send,
  PartyPopper,
  Globe,
  Zap,
  ExternalLink,
  History,
  Share2,
  Tag,
  Calendar,
  Eye,
  EyeOff,
  LayoutDashboard,
  Menu,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { APP_VERSION, formatDateVN } from '@/config/version';
import { CHANGELOG } from '@/config/changelog';

export interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feat' | 'fix' | 'improve';
    description: string;
  }[];
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | string;
  maxCredits: number;
  isActive: boolean;
  createdKeysCount?: number;
}

interface LicenseKeyItem {
  id: string;
  key: string;
  customerName: string | null;
  totalCredits: number;
  usedCredits: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdById?: string | null;
  createdBy?: {
    id: string;
    username: string;
    name: string;
    role: string;
  } | null;
}

interface UserAccountItem {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  status?: string;
  maxCredits?: number;
  isActive: boolean;
  is_active?: boolean;
  api_key?: string | null;
  apiKey?: string | null;
  saved_diagrams_count?: number;
  savedDiagramsCount?: number;
  createdAt: string;
  created_at?: string;
  _count?: {
    keys: number;
  };
}

export default function UnifiedAdminPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // 1. Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 2. Login Form State (Active when currentUser === null)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 3. Dashboard State (Active when currentUser !== null)
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'users' | 'changelog'>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // License Keys State
  const [keys, setKeys] = useState<LicenseKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [createKeyLoading, setCreateKeyLoading] = useState(false);
  const [keyActionError, setKeyActionError] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedCustomerKeyId, setCopiedCustomerKeyId] = useState<string | null>(null);
  const [keySearch, setKeySearch] = useState('');
  const [creatorFilter, setCreatorFilter] = useState<string>('ALL');
  const [revealedKeyIds, setRevealedKeyIds] = useState<Set<string>>(new Set());

  const toggleRevealKey = (id: string) => {
    setRevealedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // New Key Form State
  const [keyPackageType, setKeyPackageType] = useState<'VIP' | 'TRIAL'>('VIP');
  const [customerName, setCustomerName] = useState('');
  const [isUnlimitedCredits, setIsUnlimitedCredits] = useState(false);
  const [customCreditCount, setCustomCreditCount] = useState<number>(50);
  const [durationDays, setDurationDays] = useState<number>(0); // 0 (Never), 30, 365
  const [keyNote, setKeyNote] = useState('');

  // Created Key Success Modal State
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<LicenseKeyItem | null>(null);
  const [copiedSuccessKey, setCopiedSuccessKey] = useState(false);
  const [copiedCustomerMessage, setCopiedCustomerMessage] = useState(false);

  // User Accounts Management State (Admin Only)
  const [userAccounts, setUserAccounts] = useState<UserAccountItem[]>([]);
  const [userAccountsLoading, setUserAccountsLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Create User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState('');
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccRole, setNewAccRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isNewAccUnlimitedCredits, setIsNewAccUnlimitedCredits] = useState(false);
  const [newAccMaxCredits, setNewAccMaxCredits] = useState<number>(50);

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccEmail, setEditAccEmail] = useState('');
  const [editAccPassword, setEditAccPassword] = useState('');
  const [editAccRole, setEditAccRole] = useState<'admin' | 'ctv' | 'user'>('user');
  const [editAccStatus, setEditAccStatus] = useState<'active' | 'banned'>('active');

  // Changelog Management State (Admin Only)
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [changelogsLoading, setChangelogsLoading] = useState(false);
  const [changelogSearch, setChangelogSearch] = useState('');
  const [isChangelogEditModalOpen, setIsChangelogEditModalOpen] = useState(false);
  const [editingChangelogId, setEditingChangelogId] = useState<string | null>(null);
  const [clVersion, setClVersion] = useState('');
  const [clDate, setClDate] = useState('');
  const [clTitle, setClTitle] = useState('');
  const [clChanges, setClChanges] = useState<{ type: 'feat' | 'fix' | 'improve'; description: string }[]>([]);
  const [clIsPublished, setClIsPublished] = useState<boolean>(true);
  const [clSaveLoading, setClSaveLoading] = useState(false);
  const [clError, setClError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string, duration = 3000) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, duration);
  }, []);

  // Initialize theme (Default to Light Mode)
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

  // Check Auth Session (Only allow ADMIN role, redirect unauthorized to home)
  const checkAuth = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setAuthLoading(true);
    }
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        const role = (data.user.role || '').toLowerCase();
        if (role === 'admin') {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          router.replace('/?error=unauthorized');
        }
      } else {
        setCurrentUser(null);
        router.replace('/?error=unauthorized');
      }
    } catch {
      setCurrentUser(null);
      router.replace('/?error=unauthorized');
    } finally {
      if (showLoading) {
        setAuthLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    checkAuth(true);
  }, [checkAuth]);

  // Client Guard: Immediately push to home if not admin after auth verification
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || (currentUser.role || '').toLowerCase() !== 'admin') {
        router.replace('/?error=unauthorized');
      }
    }
  }, [authLoading, currentUser, router]);

  // Fetch Keys (supports silent refresh)
  const fetchKeys = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setKeysLoading(true);
    }
    try {
      const res = await fetch('/api/admin/keys');
      const data = await res.json();
      if (res.ok && data.keys) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error('Lỗi tải keys:', err);
    } finally {
      if (showLoading) {
        setKeysLoading(false);
      }
    }
  }, []);

  // Fetch User Accounts (Admin Only)
  const fetchUserAccounts = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setUserAccountsLoading(true);
    }
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUserAccounts(data.users);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tài khoản:', err);
    } finally {
      if (showLoading) {
        setUserAccountsLoading(false);
      }
    }
  }, []);

  // Fetch Changelogs for Admin
  const fetchAdminChangelogs = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setChangelogsLoading(true);
    }
    try {
      const res = await fetch(`/api/admin/changelog?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.changelogs) {
        setChangelogs(data.changelogs);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách Changelog:', err);
    } finally {
      if (showLoading) {
        setChangelogsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchKeys(false);
      const role = (currentUser.role || '').toLowerCase();
      if (role === 'admin') {
        fetchUserAccounts(false);
        fetchAdminChangelogs(false);
      }
    }
  }, [currentUser?.id, currentUser?.role, fetchKeys, fetchUserAccounts, fetchAdminChangelogs]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại.');
      }

      setCurrentUser(data.user);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Lỗi kết nối khi đăng nhập.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setCurrentUser(null);
    setKeys([]);
    setUserAccounts([]);
    router.replace('/');
  };

  // Handle Create License Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyPackageType === 'VIP' && !customerName.trim()) {
      setKeyActionError('Vui lòng nhập tên khách hàng / học sinh cho Gói VIP.');
      return;
    }

    const defaultTrialName = `Trial_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const effectiveCustomerName = customerName.trim()
      ? customerName.trim()
      : keyPackageType === 'TRIAL'
      ? defaultTrialName
      : 'Khách hàng';

    setKeyActionError(null);
    setCreateKeyLoading(true);

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: effectiveCustomerName,
          keyType: keyPackageType,
          totalCredits: isUnlimitedCredits
            ? -1
            : Number(customCreditCount) || (keyPackageType === 'TRIAL' ? 15 : 50),
          durationDays,
          note: keyNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tạo License Key.');
      }

      // 1. Optimistic Update: Prepend key directly to state list
      if (data.key) {
        setKeys((prev) => [data.key, ...prev.filter((k) => k.id !== data.key.id)]);
      }

      // 2. Open Success Modal
      setNewlyCreatedKey(data.key);
      setCopiedSuccessKey(false);
      setCopiedCustomerMessage(false);

      // 3. Trigger Toast Notification
      showToast('Tạo License Key thành công!');

      // 4. Reset form
      setCustomerName('');
      setKeyNote('');
      setKeyPackageType('VIP');
      setIsUnlimitedCredits(false);
      setCustomCreditCount(50);
      setDurationDays(0);

      // 5. Silent background refresh (NO global full-screen spinner, NO page reload)
      fetchKeys(false);
      checkAuth(false);
    } catch (err: any) {
      setKeyActionError(err.message);
    } finally {
      setCreateKeyLoading(false);
    }
  };

  // Copy created key in modal
  const handleCopySuccessKey = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey.key);
    setCopiedSuccessKey(true);
    showToast('Đã sao chép mã Key!');
    setTimeout(() => setCopiedSuccessKey(false), 2500);
  };

  // Copy customer formatted message in modal
  const handleCopyCustomerMessage = () => {
    if (!newlyCreatedKey) return;

    const appUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const creditsStr =
      newlyCreatedKey.totalCredits === -1
        ? 'Không giới hạn (Vô hạn)'
        : `${newlyCreatedKey.totalCredits} lượt`;

    const expireStr = newlyCreatedKey.expiresAt
      ? new Date(newlyCreatedKey.expiresAt).toLocaleDateString('vi-VN')
      : 'Vĩnh viễn';

    const message = `🎉 KÍCH HOẠT BẢN QUYỀN MATHVIZ
- Mã License Key: ${newlyCreatedKey.key}
- Khách hàng: ${newlyCreatedKey.customerName || 'Quý khách'}
- Số lượt sử dụng: ${creditsStr}
- Hạn sử dụng: ${expireStr}
👉 Truy cập và sử dụng tại: ${appUrl}`;

    navigator.clipboard.writeText(message);
    setCopiedCustomerMessage(true);
    showToast('Đã sao chép tin nhắn bàn giao!');
    setTimeout(() => setCopiedCustomerMessage(false), 2500);
  };

  // Copy customer formatted message for an existing key in the table
  const handleCopyKeyCustomerMessage = (keyItem: LicenseKeyItem) => {
    const appUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const creditsStr =
      keyItem.totalCredits === -1
        ? 'Không giới hạn (Vô hạn)'
        : `${keyItem.totalCredits} lượt`;

    const expireStr = keyItem.expiresAt
      ? new Date(keyItem.expiresAt).toLocaleDateString('vi-VN')
      : 'Vĩnh viễn';

    const message = `🎉 KÍCH HOẠT BẢN QUYỀN MATHVIZ
- Mã License Key: ${keyItem.key}
- Khách hàng: ${keyItem.customerName || 'Quý khách'}
- Số lượt sử dụng: ${creditsStr}
- Hạn sử dụng: ${expireStr}
👉 Truy cập và sử dụng tại: ${appUrl}`;

    navigator.clipboard.writeText(message);
    setCopiedCustomerKeyId(keyItem.id);
    showToast('Đã sao chép tin nhắn bàn giao!');
    setTimeout(() => setCopiedCustomerKeyId(null), 2500);
  };

  // Handle Delete Key
  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa License Key này?')) return;
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        fetchKeys(false);
        checkAuth(false);
        showToast('Đã xóa License Key thành công!');
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể xóa License Key.');
      }
    } catch (err) {
      console.error('Lỗi khi xóa key:', err);
    }
  };

  // Handle Create User Account (Admin Only)
  const handleCreateUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountError(null);
    setCreateAccountLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccName.trim(),
          username: newAccUsername.trim(),
          password: newAccPassword.trim(),
          role: newAccRole,
          maxCredits:
            newAccRole === 'ADMIN' || isNewAccUnlimitedCredits
              ? -1
              : Number(newAccMaxCredits) || 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tạo tài khoản.');
      }

      await fetchUserAccounts(false);

      setNewAccName('');
      setNewAccUsername('');
      setNewAccPassword('');
      setNewAccRole('STAFF');
      setIsNewAccUnlimitedCredits(false);
      setNewAccMaxCredits(50);
      setIsCreateUserModalOpen(false);
      showToast('Thêm tài khoản CTV thành công!');
    } catch (err: any) {
      setCreateAccountError(err.message);
    } finally {
      setCreateAccountLoading(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUserModal = (userItem: UserAccountItem) => {
    setEditingUserId(userItem.id);
    setEditAccName(userItem.name || '');
    setEditAccEmail(userItem.email || userItem.username || '');
    const normRole = (userItem.role || '').toLowerCase();
    const validRole: 'admin' | 'ctv' | 'user' =
      normRole === 'admin' ? 'admin' : (normRole === 'ctv' || normRole === 'staff' ? 'ctv' : 'user');
    setEditAccRole(validRole);
    const isAct = userItem.isActive !== false && userItem.is_active !== false && userItem.status !== 'banned';
    setEditAccStatus(isAct ? 'active' : 'banned');
    setEditAccPassword('');
    setEditUserError(null);
    setIsEditUserModalOpen(true);
  };

  // Handle Save Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    if (!editAccName.trim()) {
      setEditUserError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!editAccEmail.trim()) {
      setEditUserError('Vui lòng nhập địa chỉ email.');
      return;
    }

    setEditUserError(null);
    setEditUserLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAccName.trim(),
          email: editAccEmail.trim().toLowerCase(),
          role: editAccRole,
          status: editAccStatus,
          newPassword: editAccPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể cập nhật tài khoản.');
      }

      await fetchUserAccounts(false);
      setIsEditUserModalOpen(false);
      showToast('Cập nhật thông tin tài khoản thành công!');
    } catch (err: any) {
      setEditUserError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setEditUserLoading(false);
    }
  };

  // Handle Toggle User Status (Quick Toggle in Table)
  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus ? 'active' : 'banned';
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, isActive: !currentStatus }),
      });
      if (res.ok) {
        setUserAccounts((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: nextStatus, isActive: !currentStatus, is_active: !currentStatus } : u))
        );
        showToast(!currentStatus ? 'Đã kích hoạt tài khoản!' : 'Đã khóa tài khoản!');
      }
    } catch (err) {
      console.error('Lỗi khi bật/tắt trạng thái tài khoản:', err);
    }
  };

  // Handle Delete User Account
  const handleDeleteUserAccount = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Không thể xóa tài khoản.');
        return;
      }
      setUserAccounts((prev) => prev.filter((u) => u.id !== id));
      showToast('Đã xóa tài khoản thành công!');
    } catch (err) {
      console.error('Lỗi khi xóa tài khoản:', err);
    }
  };

  const handleCopyKey = (keyStr: string, id: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // ----------------------------------------------------
  // Changelog Management Handlers (Admin Only)
  // ----------------------------------------------------
  const handleOpenCreateChangelogModal = () => {
    setEditingChangelogId(null);
    setClVersion('v0.1.3-alpha');
    setClDate(formatDateVN(new Date()));
    setClTitle('');
    setClChanges([
      { type: 'feat', description: '' },
    ]);
    setClIsPublished(true);
    setClError(null);
    setIsChangelogEditModalOpen(true);
  };

  const handleOpenEditChangelogModal = (item: ChangelogItem) => {
    setEditingChangelogId(item.id);
    setClVersion(item.version);
    setClDate(item.date);
    setClTitle(item.title);
    setClChanges(
      Array.isArray(item.changes) && item.changes.length > 0
        ? JSON.parse(JSON.stringify(item.changes))
        : [{ type: 'feat', description: '' }]
    );
    setClIsPublished(item.isPublished);
    setClError(null);
    setIsChangelogEditModalOpen(true);
  };

  const handleAddChangeRow = () => {
    setClChanges((prev) => [...prev, { type: 'improve', description: '' }]);
  };

  const handleRemoveChangeRow = (index: number) => {
    setClChanges((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next.length > 0 ? next : [{ type: 'feat', description: '' }];
    });
  };

  const handleChangeRowType = (index: number, type: 'feat' | 'fix' | 'improve') => {
    setClChanges((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], type };
      return next;
    });
  };

  const handleChangeRowDesc = (index: number, description: string) => {
    setClChanges((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], description };
      return next;
    });
  };

  const handleSaveChangelog = async (e: React.FormEvent) => {
    e.preventDefault();
    setClError(null);

    if (!clVersion.trim() || !clTitle.trim() || !clDate.trim()) {
      setClError('Vui lòng điền đầy đủ Phiên bản, Tiêu đề và Ngày áp dụng.');
      return;
    }

    const filteredChanges = clChanges.filter((c) => c.description.trim().length > 0);
    if (filteredChanges.length === 0) {
      setClError('Vui lòng thêm ít nhất 1 mục mô tả thay đổi.');
      return;
    }

    setClSaveLoading(true);
    try {
      const isEditing = Boolean(editingChangelogId);
      const url = isEditing
        ? `/api/admin/changelog/${editingChangelogId}`
        : '/api/admin/changelog';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: clVersion.trim(),
          date: clDate.trim(),
          title: clTitle.trim(),
          changes: filteredChanges,
          isPublished: clIsPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi lưu Changelog.');
      }

      await fetchAdminChangelogs(false);
      setIsChangelogEditModalOpen(false);
      showToast(isEditing ? 'Đã cập nhật phiên bản thành công!' : 'Đã thêm phiên bản mới thành công!');
    } catch (err: any) {
      setClError(err.message);
    } finally {
      setClSaveLoading(false);
    }
  };

  const handleToggleChangelogPublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/changelog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });
      if (res.ok) {
        setChangelogs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPublished: !currentStatus } : c))
        );
        showToast(!currentStatus ? 'Đã công khai phiên bản!' : 'Đã chuyển phiên bản về bản nháp!');
      }
    } catch (err) {
      console.error('Lỗi khi đổi trạng thái Changelog:', err);
    }
  };

  const handleDeleteChangelog = async (id: string, version: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bản ghi phiên bản "${version}" không?`)) return;
    try {
      const res = await fetch(`/api/admin/changelog/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Không thể xóa Changelog.');
        return;
      }
      setChangelogs((prev) => prev.filter((c) => c.id !== id));
      showToast(`Đã xóa phiên bản ${version} thành công!`);
    } catch (err) {
      console.error('Lỗi khi xóa Changelog:', err);
    }
  };

  // ----------------------------------------------------
  // SECURITY GUARD: Checking Auth Session or Unauthorized Access
  // ----------------------------------------------------
  if (authLoading || !currentUser || (currentUser.role || '').toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-600 dark:text-cyan-400" />
          <p className="text-xs font-medium">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 3: Unified Dashboard (When currentUser !== null)
  // ----------------------------------------------------
  const getKeyStatus = (k: { expiresAt: string | null; totalCredits: number; usedCredits: number }) => {
    if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) {
      return {
        label: 'Hết Hạn',
        className: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
        dotClass: 'bg-amber-500',
      };
    }
    if (k.totalCredits !== -1 && k.usedCredits >= k.totalCredits) {
      return {
        label: 'Hết Lượt',
        className: 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
        dotClass: 'bg-rose-500',
      };
    }
    return {
      label: 'Hoạt Động',
      className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500 animate-pulse',
    };
  };

  const totalKeys = keys.length;
  const activeKeysCount = keys.filter((k) => getKeyStatus(k).label === 'Hoạt Động').length;
  const totalGenerations = keys.reduce((acc, k) => acc + k.usedCredits, 0);

  const userRole = (currentUser.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff' || userRole === 'ctv';
  const staffCreatedCount = currentUser.createdKeysCount || keys.length;
  const isStaffUnlimited = currentUser.maxCredits === -1;
  const staffMaxCredits = currentUser.maxCredits;
  const staffQuotaPercent = isStaffUnlimited
    ? 100
    : Math.min(100, Math.round((staffCreatedCount / (staffMaxCredits || 50)) * 100));

  // Filter keys by search query AND creator filter (for Admin)
  const filteredKeys = keys.filter((k) => {
    if (creatorFilter !== 'ALL') {
      if (creatorFilter === 'SYSTEM') {
        if (k.createdById !== null && k.createdBy !== null) return false;
      } else if (creatorFilter === 'ADMIN') {
        if (!k.createdBy || (k.createdBy.role || '').toLowerCase() !== 'admin') return false;
      } else {
        if (k.createdById !== creatorFilter && k.createdBy?.id !== creatorFilter) return false;
      }
    }

    if (!keySearch.trim()) return true;
    const q = keySearch.toLowerCase();
    return (
      k.key.toLowerCase().includes(q) ||
      (k.customerName && k.customerName.toLowerCase().includes(q)) ||
      (k.createdBy?.name && k.createdBy.name.toLowerCase().includes(q)) ||
      (k.createdBy?.username && k.createdBy.username.toLowerCase().includes(q))
    );
  });

  const filteredUsers = userAccounts.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const adminUsers = userAccounts.filter((u) => (u.role || '').toLowerCase() === 'admin');
  const ctvUsers = userAccounts.filter((u) => (u.role || '').toLowerCase() === 'staff' || (u.role || '').toLowerCase() === 'ctv');
  const regularUsers = userAccounts.filter((u) => (u.role || '').toLowerCase() === 'user');

  const filteredChangelogs = changelogs.filter((cl) => {
    if (!changelogSearch.trim()) return true;
    const q = changelogSearch.toLowerCase();
    return (
      cl.version.toLowerCase().includes(q) ||
      cl.title.toLowerCase().includes(q) ||
      cl.date.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 antialiased">
      {/* 1. Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 2. Mobile Drawer Panel (Slide over from left) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-[#111622] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  MathViz
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isAdmin
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'CTV'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Quản trị & Phân quyền
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-6 text-xs">
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bảng Điều Khiển
            </span>

            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng Quan</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'overview' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('keys');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                activeTab === 'keys'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4" />
                <span>License Keys</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'keys'
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {keys.length}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'keys' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
              </div>
            </button>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Hệ Thống & Phân Quyền
              </span>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                  activeTab === 'users'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Quản lý tài khoản</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'users'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {userAccounts.length}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'users' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('changelog');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                  activeTab === 'changelog'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4" />
                  <span>Lịch Sử Phiên Bản</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'changelog'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {changelogs.length}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'changelog' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer Profile */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                @{currentUser.username}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <a
              href="/"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Desktop Sticky Sidebar (Flex item, sticky top-0 h-screen) */}
      <aside className="hidden lg:flex flex-col justify-between w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto bg-white dark:bg-[#111622] border-r border-slate-200 dark:border-slate-800/80 z-30">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                  MathViz
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isAdmin
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'CTV'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Quản trị & Phân quyền
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-6 text-xs">
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bảng Điều Khiển
            </span>

            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng Quan</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'overview' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('keys')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                activeTab === 'keys'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4" />
                <span>License Keys</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'keys'
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {keys.length}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'keys' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
              </div>
            </button>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Hệ Thống & Phân Quyền
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                  activeTab === 'users'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Quản lý tài khoản</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'users'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {userAccounts.length}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'users' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('changelog')}
                className={`w-full px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition-all duration-150 ${
                  activeTab === 'changelog'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-l-4 border-cyan-600 dark:border-cyan-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4" />
                  <span>Lịch Sử Phiên Bản</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'changelog'
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {changelogs.length}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'changelog' ? 'opacity-100 text-cyan-500' : 'opacity-0'}`} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer Profile */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                @{currentUser.username}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <a
              href="/"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 4. Main Content Wrapper (min-w-0 to prevent layout overflow) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 dark:bg-[#111622]/85 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 lg:hidden shrink-0"
              title="Mở menu quản trị"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="font-medium text-slate-900 dark:text-slate-200 truncate">
                {isAdmin ? 'Admin Portal' : 'CTV Portal'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-cyan-600 dark:text-cyan-400 capitalize truncate">
                {activeTab === 'overview'
                  ? 'Tổng Quan'
                  : activeTab === 'keys'
                  ? '🔑 Quản Lý API Key & Cấu Hình'
                  : activeTab === 'users'
                  ? '👥 Quản Lý Tài Khoản'
                  : '📜 Lịch Sử Phiên Bản (Changelog)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Changelog Version Button */}
            <button
              type="button"
              onClick={() => setIsChangelogOpen(true)}
              title="Bấm để xem lịch sử phiên bản (Changelog)"
              className="hidden sm:inline-flex text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 transition items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>{APP_VERSION.fullString}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-amber-400 transition shadow-xs"
              title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-0 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0 ${
            activeTab === 'keys'
              ? 'flex flex-col overflow-y-auto xl:overflow-hidden'
              : 'space-y-6 overflow-y-auto'
          }`}
        >
          {/* TAB 0: TỔNG QUAN (DASHBOARD OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Collaborator Quota Progress Banner (If CTV role) */}
              {isStaff && (
                <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Hạn mức License Keys được cấp
                      </span>
                    </div>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      {isStaffUnlimited
                        ? `∞ Không giới hạn (Đã tạo ${staffCreatedCount} keys)`
                        : `${staffCreatedCount} / ${staffMaxCredits} Key (${staffQuotaPercent}%)`}
                    </span>
                  </div>

                  {!isStaffUnlimited ? (
                    <>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${staffQuotaPercent}%` }}
                        ></div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Bạn còn được phép tạo thêm{' '}
                        <strong className="text-cyan-600 dark:text-cyan-400">
                          {Math.max(0, (staffMaxCredits || 50) - staffCreatedCount)}
                        </strong>{' '}
                        License Key.
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tài khoản của bạn được cấp quyền tạo key{' '}
                      <strong className="text-purple-600 dark:text-purple-400">∞ không giới hạn</strong>.
                    </p>
                  )}
                </div>
              )}

              {/* Database & Cloud Connection Status Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">Hệ Thống Dữ Liệu:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                      Neon Postgres (Cloud DB) - Đang Kết Nối
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Bảo mật RBAC: Active • Auto Sync
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('keys')}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-cyan-500/50 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {isStaff ? 'Keys Của Tôi' : 'Tổng License Keys'}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalKeys}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Key Hoạt Động</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeKeysCount}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lượt Đã Tạo Hình</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalGenerations}</p>
                  </div>
                </div>

                {!isStaff ? (
                  <div
                    onClick={() => setActiveTab('users')}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:border-rose-500/50 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quản Lý Tài Khoản</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{userAccounts.length}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hạn Mức Còn Lại</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {isStaffUnlimited ? '∞' : Math.max(0, (staffMaxCredits || 50) - staffCreatedCount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Banners */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab('keys')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/25 flex flex-col gap-2 hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-1 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">Tạo License Key Mới</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cấp mã bản quyền cho khách hàng, hỗ trợ in thẻ VIP Voucher và gửi tin nhắn bàn giao.
                  </p>
                </div>

                {isAdmin && (
                  <div
                    onClick={() => setIsCreateUserModalOpen(true)}
                    className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/25 flex flex-col gap-2 hover:border-rose-500 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">Thêm Tài Khoản Mới</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cấp tài khoản đăng nhập cho người dùng, cộng tác viên hoặc quản trị viên trên hệ thống.
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div
                    onClick={handleOpenCreateChangelogModal}
                    className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 flex flex-col gap-2 hover:border-indigo-500 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <History className="w-5 h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">Thêm Bản Phát Hành</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Viết thông báo cập nhật tính năng mới hiển thị trực tiếp trong Changelog Modal.
                    </p>
                  </div>
                )}
              </div>

              {/* Recent License Keys Summary Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      License Keys Tạo Gần Đây
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Danh sách các mã bản quyền mới nhất được tạo trong hệ thống
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('keys')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <span>Xem tất cả ({keys.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-2.5 px-4">License Key</th>
                        <th className="py-2.5 px-4">Khách Hàng</th>
                        <th className="py-2.5 px-4">Lượt Tạo</th>
                        <th className="py-2.5 px-4">Hạn Dùng</th>
                        <th className="py-2.5 px-4">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                      {keys.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Chưa có License Key nào.
                          </td>
                        </tr>
                      ) : (
                        keys.slice(0, 5).map((k) => (
                          <tr key={k.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50 transition">
                            <td className="py-2.5 px-4 font-mono text-xs whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                                {k.key.startsWith('MV-TR-') || k.key.includes('TRIAL') ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-bold">
                                    Trial
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold">
                                    VIP
                                  </span>
                                )}
                                <span
                                  onClick={() => toggleRevealKey(k.id)}
                                  title={revealedKeyIds.has(k.id) ? "Bấm để ẩn mã key" : `Mã Key: ${k.key} (Bấm để xem đầy đủ)`}
                                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono text-xs border border-slate-200/80 dark:border-slate-700/80 cursor-pointer select-all hover:bg-slate-200 dark:hover:bg-slate-700/80 transition"
                                >
                                  {revealedKeyIds.has(k.id) ? k.key : `...${k.key.slice(-4)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRevealKey(k.id)}
                                  title={revealedKeyIds.has(k.id) ? "Ẩn mã key" : "Xem toàn bộ mã key"}
                                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  {revealedKeyIds.has(k.id) ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(k.key, k.id)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                  title="Sao chép toàn bộ mã Key"
                                >
                                  {copiedKeyId === k.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                              {k.customerName || 'Khách hàng'}
                            </td>
                            <td className="py-2.5 px-4 font-mono">
                              <span className="font-semibold text-cyan-600 dark:text-cyan-400">{k.usedCredits}</span>
                              <span className="text-slate-400"> / {k.totalCredits === -1 ? '∞' : k.totalCredits}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                              {k.expiresAt ? formatDateVN(k.expiresAt) : 'Vĩnh viễn'}
                            </td>
                            <td className="py-2.5 px-4">
                              {(() => {
                                const status = getKeyStatus(k);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${status.className}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                    <span>{status.label}</span>
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: License Keys Management (Fixed Height & Internal Scroll Layout) */}
          {activeTab === 'keys' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start xl:h-full w-full">
              {/* Create Key Form (5 Cols on xl, 4 on 2xl, Sticky on desktop) */}
              <div className="xl:col-span-5 2xl:col-span-4 bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4.5 transition-colors xl:sticky xl:top-0 xl:overflow-y-auto xl:max-h-full flex-shrink-0">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5 flex-shrink-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <span>Tạo License Key Mới</span>
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400">Cấp mã trực tuyến</span>
                </div>

                <form onSubmit={handleCreateKey} className="flex flex-col gap-4.5">
                  {/* Phân Loại Gói Key: VIP vs Dùng thử (Trial) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Phân Loại Gói Bản Quyền</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setKeyPackageType('VIP');
                          if (customCreditCount === 15) setCustomCreditCount(50);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          keyPackageType === 'VIP'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>👑 Gói VIP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKeyPackageType('TRIAL');
                          setIsUnlimitedCredits(false);
                          setCustomCreditCount(15);
                          setDurationDays(7);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          keyPackageType === 'TRIAL'
                            ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>🧪 Gói Dùng Thử (Trial)</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Tên Người Dùng / Khách Hàng</span>
                      </label>
                      {keyPackageType === 'TRIAL' && (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                          (Tùy chọn: Mặc định Trial_[mã])
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={
                        keyPackageType === 'TRIAL'
                          ? 'Mặc định: Trial_[mã] (Để trống hệ thống tự sinh)'
                          : 'Ví dụ: Nguyễn Văn A hoặc THCS Lê Lợi'
                      }
                      className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition font-medium"
                      required={keyPackageType === 'VIP'}
                    />
                  </div>

                  {/* Credit Quota Selection with Toggle & Quick Chips */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Số Lượt Tạo Hình</span>
                      </label>

                      {/* Toggle Switch Không giới hạn */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isUnlimitedCredits}
                          onChange={(e) => setIsUnlimitedCredits(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                            isUnlimitedCredits ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white transition-transform ${
                              isUnlimitedCredits ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          ∞ Không giới hạn
                        </span>
                      </label>
                    </div>

                    {isUnlimitedCredits ? (
                      <div className="h-10 px-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Gói VIP - Không giới hạn
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 font-bold font-mono">
                          ∞ Vô hạn
                        </span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="number"
                          min={1}
                          max={99999}
                          value={customCreditCount}
                          onChange={(e) => setCustomCreditCount(Math.max(1, Number(e.target.value)))}
                          placeholder="Nhập số lượt (vd: 30, 50, 100...)"
                          className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition font-medium"
                          required
                        />

                        {/* Quick Preset Chips 4 Columns */}
                        <div className="grid grid-cols-4 gap-2 mt-0.5">
                          {[30, 50, 100, 200].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => {
                                setIsUnlimitedCredits(false);
                                setCustomCreditCount(count);
                              }}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                                !isUnlimitedCredits && customCreditCount === count
                                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              {count} lượt
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Duration Selection (Segmented 3 columns) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Thời Hạn Sử Dụng</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Vĩnh viễn', value: 0 },
                        { label: '30 Ngày', value: 30 },
                        { label: '1 Năm (365N)', value: 365 },
                      ].map((dur) => (
                        <button
                          key={dur.value}
                          type="button"
                          onClick={() => setDurationDays(dur.value)}
                          className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
                            durationDays === dur.value
                              ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ghi Chú Bổ Sung</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={keyNote}
                      onChange={(e) => setKeyNote(e.target.value)}
                      placeholder="Ví dụ: Lớp 9A2, Khách Zalo, Khóa học..."
                      className="w-full h-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition font-medium"
                    />
                  </div>

                  {keyActionError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{keyActionError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createKeyLoading || (isStaff && !isStaffUnlimited && staffCreatedCount >= (staffMaxCredits || 50))}
                    className="mt-1 w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {createKeyLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Đang sinh mã Key...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo License Key Mới</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Keys Table List (7 Cols on xl, 8 on 2xl, Internal Scroll) */}
              <div className="xl:col-span-7 2xl:col-span-8 bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs flex flex-col transition-colors min-w-0 xl:h-full xl:min-h-0 overflow-hidden">
                {/* Header Filter / Search */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>{isStaff ? 'License Keys Của Tôi' : 'Tất Cả License Keys'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {filteredKeys.length} keys
                    </span>
                  </h2>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Creator Filter Dropdown for ADMIN */}
                    {!isStaff && (
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          value={creatorFilter}
                          onChange={(e) => setCreatorFilter(e.target.value)}
                          className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-medium"
                        >
                          <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            Tất cả người tạo
                          </option>
                          <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            Chỉ key của Admin
                          </option>
                          <option value="SYSTEM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            Key Hệ thống (Cũ)
                          </option>
                          {ctvUsers.map((ctv) => (
                            <option
                              key={ctv.id}
                              value={ctv.id}
                              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            >
                              CTV: {ctv.name} ({ctv.username})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={keySearch}
                        onChange={(e) => setKeySearch(e.target.value)}
                        placeholder="Tìm theo mã key / tên..."
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-cyan-500 transition w-36 sm:w-48"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Scrollable Body (Independent scroll) */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full">
                  <table className="w-full min-w-[780px] table-auto border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#151c2c]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] shadow-xs">
                      <tr>
                        <th className="py-3 px-3.5">Khách hàng</th>
                        <th className="py-3 px-2.5">Mã Key</th>
                        <th className="py-3 px-2.5">Người Tạo</th>
                        <th className="py-3 px-2.5 text-center">Lượt Dùng</th>
                        <th className="py-3 px-2.5 text-center">Hạn Dùng</th>
                        <th className="py-3 px-2.5 text-center">Trạng Thái</th>
                        <th className="py-3 px-3 text-center sticky right-0 z-30 bg-slate-100 dark:bg-[#182030] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] w-24 min-w-[90px]">
                          Thao Tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                      {filteredKeys.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            {keySearch || creatorFilter !== 'ALL'
                              ? 'Không tìm thấy kết quả phù hợp.'
                              : 'Chưa có License Key nào.'}
                          </td>
                        </tr>
                      ) : (
                        filteredKeys.map((k) => (
                          <tr key={k.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                            {/* 1. Khách hàng */}
                            <td className="px-3.5 py-3 font-medium text-slate-900 dark:text-slate-200">
                              <span className="block max-w-[110px] sm:max-w-[140px] truncate" title={k.customerName || 'N/A'}>
                                {k.customerName || 'N/A'}
                              </span>
                            </td>

                            {/* 2. Mã Key (Masked Display & Toggle Reveal) */}
                            <td className="px-2.5 py-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs whitespace-nowrap">
                                {k.key.startsWith('MV-TR-') || k.key.includes('TRIAL') ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-bold">
                                    Trial
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold">
                                    VIP
                                  </span>
                                )}
                                <span
                                  onClick={() => toggleRevealKey(k.id)}
                                  title={revealedKeyIds.has(k.id) ? "Bấm để ẩn mã key" : `Mã Key: ${k.key} (Bấm để xem đầy đủ)`}
                                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono text-xs border border-slate-200/80 dark:border-slate-700/80 cursor-pointer select-all hover:bg-slate-200 dark:hover:bg-slate-700/80 transition"
                                >
                                  {revealedKeyIds.has(k.id) ? k.key : `...${k.key.slice(-4)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRevealKey(k.id)}
                                  title={revealedKeyIds.has(k.id) ? "Ẩn mã key" : "Xem toàn bộ mã key"}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                >
                                  {revealedKeyIds.has(k.id) ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(k.key, k.id)}
                                  title="Sao chép toàn bộ mã Key"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                                >
                                  {copiedKeyId === k.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 3. Người Tạo */}
                            <td className="px-2.5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {k.createdBy ? (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    (k.createdBy.role || '').toLowerCase() === 'admin'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {k.createdBy.name}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Hệ thống</span>
                              )}
                            </td>

                            {/* 4. Lượt Dùng */}
                            <td className="px-2.5 py-3 text-center whitespace-nowrap">
                              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                {k.usedCredits}
                              </span>
                              <span className="text-slate-400 font-mono"> / </span>
                              <span className="font-mono text-slate-500">
                                {k.totalCredits === -1 ? '∞' : k.totalCredits}
                              </span>
                            </td>

                            {/* 5. Hạn Dùng */}
                            <td className="px-2.5 py-3 text-center whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                              {k.expiresAt ? formatDateVN(k.expiresAt) : 'Vĩnh viễn'}
                            </td>

                            {/* 6. Trạng Thái */}
                            <td className="px-2.5 py-3 text-center whitespace-nowrap">
                              {(() => {
                                const status = getKeyStatus(k);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${status.className}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                    <span>{status.label}</span>
                                  </span>
                                );
                              })()}
                            </td>

                            {/* 7. Thao Tác (Ghim cố định bên phải - Sticky Right) */}
                            <td className="px-3 py-3 text-center whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#111622] dark:group-hover:bg-[#182030] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] w-24 min-w-[90px] transition-colors">
                              <div className="flex items-center justify-center gap-2">
                                {/* Copy Customer Handover Message Button */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyKeyCustomerMessage(k)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 transition shadow-2xs"
                                  title="Copy tin nhắn bàn giao gửi khách"
                                >
                                  {copiedCustomerKeyId === k.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Share2 className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Delete Key Button */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKey(k.id)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 transition shadow-2xs"
                                  title="Xóa Key vĩnh viễn"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Accounts Management (Admin, CTV & User) - STRICTLY ADMIN ONLY */}
        {isAdmin && activeTab === 'users' && (
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg flex flex-col gap-4 transition-colors">
            {/* Header with Search and "+ Thêm tài khoản mới" button */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Danh Sách Tài Khoản Hệ Thống (Admin, CTV & User)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {filteredUsers.length} tài khoản
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Phân quyền Admin toàn hệ thống, Cộng tác viên (CTV) hoặc Thành viên (User)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm theo tên / username / email..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-rose-500 transition w-44 sm:w-56"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreateAccountError(null);
                    setIsCreateUserModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-rose-950/30 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Thêm tài khoản</span>
                </button>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:border-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 whitespace-nowrap">Họ và Tên</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Tên Đăng Nhập / Email</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Vai Trò</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Hạn Mức Key / Bộ Sưu Tập</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Trạng Thái</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {userSearch ? 'Không tìm thấy tài khoản nào phù hợp.' : 'Chưa có tài khoản nào trong hệ thống.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const uRole = (u.role || 'user').toLowerCase();
                      const isUAdmin = uRole === 'admin';
                      const isUStaff = uRole === 'staff' || uRole === 'ctv';
                      const isUActive = u.isActive ?? u.is_active ?? (u.status === 'active');
                      const createdCount = u._count?.keys || 0;
                      const quotaPercent = isUAdmin
                        ? 100
                        : Math.min(100, Math.round((createdCount / (u.maxCredits || 50)) * 100));

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isUAdmin
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : isUStaff
                                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                              }`}
                            >
                              {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span>{u.name}</span>
                              {u.email && u.email !== u.username && (
                                <span className="text-[10px] text-slate-400 font-normal">{u.email}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {u.username || u.email}
                            {u.apiKey && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                                🔑 {u.apiKey}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                                isUAdmin
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : isUStaff
                                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                              }`}
                            >
                              {isUAdmin ? 'Quản trị viên (ADMIN)' : isUStaff ? 'Cộng tác viên (CTV)' : 'Người dùng (USER)'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            {isUAdmin ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px]">
                                ∞ Vô hạn (Admin)
                              </span>
                            ) : isUStaff ? (
                              u.maxCredits === -1 ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                                  ∞ Không giới hạn ({createdCount} key)
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1 min-w-[140px]">
                                  <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                                    <span>{createdCount} / {u.maxCredits || 50} key</span>
                                    <span className="font-semibold">{quotaPercent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                      style={{ width: `${quotaPercent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-medium text-[11px]">
                                🖼️ {u.saved_diagrams_count ?? u.savedDiagramsCount ?? 0} hình đã lưu
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isUActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {isUActive ? 'Hoạt động' : 'Đang khóa'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit / Reset Password Button */}
                              <button
                                onClick={() => handleOpenEditUserModal(u)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-transparent transition flex items-center gap-1"
                                title="Sửa thông tin hoặc Đổi mật khẩu"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sửa / Đổi MK</span>
                              </button>

                              {/* Toggle Active Button (except self) */}
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, isUActive)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title={isUActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                >
                                  {isUActive ? (
                                    <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                                  )}
                                </button>
                              )}

                              {/* Delete Button (except self) */}
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => handleDeleteUserAccount(u.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Changelog Management (Admin Only) */}
        {isAdmin && activeTab === 'changelog' && (
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg flex flex-col gap-4 transition-colors">
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Lịch Sử Phiên Bản & Cập Nhật
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                      {changelogs.length} bản ghi
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Quản lý các bản phát hành hiển thị trong cửa sổ Changelog của người dùng
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={changelogSearch}
                    onChange={(e) => setChangelogSearch(e.target.value)}
                    placeholder="Tìm theo version, tiêu đề..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-xs text-slate-900 dark:text-slate-200 outline-none w-48 sm:w-60 transition"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => fetchAdminChangelogs(true)}
                  disabled={changelogsLoading}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${changelogsLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Add New Release Button */}
                <button
                  type="button"
                  onClick={handleOpenCreateChangelogModal}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950/30 flex items-center gap-1.5 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Thêm Phiên Bản</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200/80 dark:border-slate-800/80">
              <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Phiên Bản</th>
                    <th className="py-3 px-4">Tiêu Đề Phát Hành</th>
                    <th className="py-3 px-4">Ngày Áp Dụng</th>
                    <th className="py-3 px-4">Mục Thay Đổi</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {changelogsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        <span>Đang tải danh sách phiên bản...</span>
                      </td>
                    </tr>
                  ) : filteredChangelogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Không tìm thấy phiên bản nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredChangelogs.map((cl) => {
                      const changesArr = Array.isArray(cl.changes) ? cl.changes : [];
                      return (
                        <tr key={cl.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50 transition">
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                              {cl.version}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                            {cl.title}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {cl.date}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {changesArr.length} mục
                              </span>
                              {changesArr.slice(0, 2).map((ch, chIdx) => (
                                <span
                                  key={chIdx}
                                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                    ch.type === 'feat'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : ch.type === 'fix'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  }`}
                                >
                                  {ch.type}
                                </span>
                              ))}
                              {changesArr.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{changesArr.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleChangelogPublish(cl.id, cl.isPublished)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition ${
                                cl.isPublished
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                              }`}
                              title={cl.isPublished ? 'Bấm để ẩn bản ghi này' : 'Bấm để xuất bản công khai'}
                            >
                              {cl.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{cl.isPublished ? 'Đã Xuất Bản' : 'Bản Nháp (Ẩn)'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditChangelogModal(cl)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-transparent transition flex items-center gap-1"
                                title="Chỉnh sửa phiên bản"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteChangelog(cl.id, cl.version)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                                title="Xóa phiên bản này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: TẠO KEY THÀNH CÔNG (THẺ VIP VOUCHER CARD)   */}
      {/* ---------------------------------------------------- */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/35 rounded-3xl shadow-2xl shadow-slate-950/20 dark:shadow-indigo-500/15 p-6 sm:p-7 flex flex-col gap-5 text-slate-900 dark:text-slate-100 transition-colors">
            {/* Modal Close Button */}
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Thẻ: Icon Huy Hiệu Sparkles + Tiêu đề VIP */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] tracking-widest font-bold text-indigo-600 dark:text-amber-400 uppercase">
                  Bản Quyền Kích Hoạt Trực Tuyến
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-wide uppercase">
                  KÍCH HOẠT BẢN QUYỀN MATHVIZ
                </h3>
              </div>
            </div>

            {/* Khung hiển thị Mã Key (Light Mode: Indigo Soft / Dark Mode: Slate & Amber Neon) */}
            <div className="bg-indigo-50/80 dark:bg-slate-950/80 border border-indigo-200/90 dark:border-indigo-500/40 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-1.5 shadow-inner relative overflow-hidden transition-colors">
              <div className="absolute -top-10 -left-10 w-28 h-28 bg-indigo-500/10 dark:bg-amber-500/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-blue-500/10 dark:bg-indigo-500/15 rounded-full blur-2xl"></div>
              
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600/80 dark:text-amber-400/80">
                MÃ LICENSE KEY
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-indigo-700 dark:text-amber-400 tracking-wider select-all dark:drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                {newlyCreatedKey.key}
              </span>
            </div>

            {/* Danh Sách Thông Tin Chi Tiết (List Info) */}
            <div className="flex flex-col gap-2.5 text-xs bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 transition-colors">
              {/* 👤 Khách hàng */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Khách hàng:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {newlyCreatedKey.customerName || 'Quý khách'}
                </span>
              </div>

              {/* ⚡ Số lượt dùng */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Số lượt sử dụng:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                    newlyCreatedKey.totalCredits === -1
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {newlyCreatedKey.totalCredits === -1
                    ? '∞ Không giới hạn (Vô hạn)'
                    : `${newlyCreatedKey.totalCredits} lượt`}
                </span>
              </div>

              {/* ⏳ Hạn sử dụng */}
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Hạn sử dụng:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {newlyCreatedKey.expiresAt
                    ? new Date(newlyCreatedKey.expiresAt).toLocaleDateString('vi-VN')
                    : 'Vĩnh viễn'}
                </span>
              </div>

              {/* 🌐 Link truy cập */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Link truy cập:
                </span>
                <a
                  href={typeof window !== 'undefined' ? window.location.origin : '/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline flex items-center gap-1 font-medium transition"
                >
                  <span className="truncate max-w-[200px]">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                  </span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            {/* Cụm Nút Bấm Thao Tác (Action Buttons) */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              {/* Nút 1: Sao chép mã Key */}
              <button
                type="button"
                onClick={handleCopySuccessKey}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {copiedSuccessKey ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                    <span>📋 Sao chép mã Key</span>
                  </>
                )}
              </button>

              {/* Nút 2: Sao chép nội dung gửi khách (Nổi bật) */}
              <button
                type="button"
                onClick={handleCopyCustomerMessage}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40"
              >
                {copiedCustomerMessage ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>✓ Đã sao chép tin nhắn!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>✨ Sao chép nội dung gửi khách</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: THÊM TÀI KHOẢN MỚI                          */}
      {/* ---------------------------------------------------- */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Thêm Tài Khoản Mới
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tạo tài khoản Quản trị viên hoặc Cộng tác viên
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserAccount} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Ví dụ: Thầy Nguyễn Văn A"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tên Đăng Nhập (Username)
                </label>
                <input
                  type="text"
                  value={newAccUsername}
                  onChange={(e) => setNewAccUsername(e.target.value)}
                  placeholder="ví dụ: ctv_toan_hn"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mật Khẩu Khởi Tạo
                </label>
                <input
                  type="password"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vai Trò (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccRole('ADMIN')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                      newAccRole === 'ADMIN'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Quản trị viên (ADMIN)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAccRole('STAFF')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                      newAccRole === 'STAFF'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Cộng tác viên (CTV)</span>
                  </button>
                </div>
              </div>

              {newAccRole === 'STAFF' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Hạn Mức Tạo Key Cấp Cho CTV
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isNewAccUnlimitedCredits}
                        onChange={(e) => setIsNewAccUnlimitedCredits(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                          isNewAccUnlimitedCredits ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full bg-white transition-transform ${
                            isNewAccUnlimitedCredits ? 'translate-x-3' : 'translate-x-0'
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                        ∞ Không giới hạn
                      </span>
                    </label>
                  </div>

                  {isNewAccUnlimitedCredits ? (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-between">
                      <span>Cấp quyền tạo key không giới hạn</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 font-bold font-mono">
                        ∞ Vô hạn
                      </span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={newAccMaxCredits}
                      onChange={(e) => setNewAccMaxCredits(Math.max(1, Number(e.target.value)))}
                      placeholder="Ví dụ: 20, 50, 100..."
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                      required
                    />
                  )}

                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Chọn nhanh:</span>
                    {[20, 50, 100, 200].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setIsNewAccUnlimitedCredits(false);
                          setNewAccMaxCredits(count);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition ${
                          !isNewAccUnlimitedCredits && newAccMaxCredits === count
                            ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {count} key
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsNewAccUnlimitedCredits(true)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                        isNewAccUnlimitedCredits
                          ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:border-purple-400'
                      }`}
                    >
                      ∞ Vô hạn
                    </button>
                  </div>
                </div>
              )}

              {createAccountError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{createAccountError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={createAccountLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-md shadow-rose-950/30 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createAccountLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Tạo Tài Khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: SỬA THÔNG TIN & ĐỔI MẬT KHẨU                */}
      {/* ---------------------------------------------------- */}
      {isEditUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Chỉnh Sửa Thông Tin Tài Khoản
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cập nhật quyền hạn, thông tin cá nhân và mật khẩu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditUserModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditUser} className="flex flex-col gap-3.5">
              {/* 1. Tên hiển thị */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Tên hiển thị</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A..."
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  required
                />
              </div>

              {/* 2. Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Địa chỉ Email</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={editAccEmail}
                  onChange={(e) => setEditAccEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  required
                />
              </div>

              {/* 3. Vai trò (Role): Dropdown chọn [Admin, CTV, User] */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vai trò (Role)
                </label>
                <div className="relative">
                  <select
                    value={editAccRole}
                    onChange={(e) => setEditAccRole(e.target.value as 'admin' | 'ctv' | 'user')}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none transition cursor-pointer pr-9 font-medium"
                  >
                    <option value="admin">Quản trị viên (Admin)</option>
                    <option value="ctv">Cộng tác viên (CTV)</option>
                    <option value="user">Người dùng (User)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 px-1">
                  {editAccRole === 'admin' && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">👑 Quản trị viên: Toàn quyền quản trị tài khoản, API key và phiên bản.</span>
                  )}
                  {editAccRole === 'ctv' && (
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">⭐ Cộng tác viên: Có quyền phát hành và quản lý License Key.</span>
                  )}
                  {editAccRole === 'user' && (
                    <span className="text-slate-500 font-medium">👤 Người dùng: Lưu trữ và đồng bộ bộ sưu tập hình vẽ lên Neon.</span>
                  )}
                </div>
              </div>

              {/* 4. Trạng thái (Status): Dropdown chọn [Hoạt động / Đang khóa] */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái (Status)
                </label>
                <div className="relative">
                  <select
                    value={editAccStatus}
                    onChange={(e) => setEditAccStatus(e.target.value as 'active' | 'banned')}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none transition cursor-pointer pr-9 font-medium"
                  >
                    <option value="active">🟢 Hoạt động (Active)</option>
                    <option value="banned">🔴 Đang khóa (Banned)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 5. Cấp lại / Đổi mật khẩu mới */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Cấp lại / Đổi mật khẩu mới</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Để trống nếu giữ nguyên)</span>
                </label>
                <input
                  type="password"
                  value={editAccPassword}
                  onChange={(e) => setEditAccPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  autoComplete="new-password"
                />
              </div>

              {/* Lỗi nếu có */}
              {editUserError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{editUserError}</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/30 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {editUserLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: THÊM / CHỈNH SỬA PHIÊN BẢN CHANGELOG       */}
      {/* ---------------------------------------------------- */}
      {isChangelogEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingChangelogId ? 'Chỉnh Sửa Phiên Bản' : 'Thêm Phiên Bản Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cập nhật các tính năng và sửa lỗi hiển thị trong Changelog
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChangelogEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveChangelog} className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-xs">
              {/* Row 1: Version + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Số Phiên Bản</span>
                  </label>
                  <input
                    type="text"
                    value={clVersion}
                    onChange={(e) => setClVersion(e.target.value)}
                    placeholder="Ví dụ: v0.1.3-alpha"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 font-mono outline-none transition"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ngày Áp Dụng (dd/MM/yyyy)</span>
                  </label>
                  <input
                    type="text"
                    value={clDate}
                    onChange={(e) => setClDate(e.target.value)}
                    placeholder="Ví dụ: 31/08/2026"
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 font-mono outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tiêu Đề Phát Hành
                </label>
                <input
                  type="text"
                  value={clTitle}
                  onChange={(e) => setClTitle(e.target.value)}
                  placeholder="Ví dụ: Tối ưu hóa tiến trình & Fix kẹt loading"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 outline-none transition"
                  required
                />
              </div>

              {/* Row 3: Dynamic Changes List */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Danh Sách Thay Đổi ({clChanges.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddChangeRow}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] transition flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Thêm Mục</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5">
                  {clChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center gap-2"
                    >
                      {/* Type Select */}
                      <select
                        value={change.type}
                        onChange={(e) => handleChangeRowType(idx, e.target.value as any)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border outline-none cursor-pointer uppercase ${
                          change.type === 'feat'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : change.type === 'fix'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <option value="feat">FEAT (Tính năng)</option>
                        <option value="fix">FIX (Sửa lỗi)</option>
                        <option value="improve">IMPROVE (Cải tiến)</option>
                      </select>

                      {/* Description Input */}
                      <input
                        type="text"
                        value={change.description}
                        onChange={(e) => handleChangeRowDesc(idx, e.target.value)}
                        placeholder="Mô tả chi tiết nội dung thay đổi..."
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                        required
                      />

                      {/* Delete Row Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveChangeRow(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 4: Publish Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Trạng Thái Xuất Bản
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Bật để người dùng ngoài trang chính nhìn thấy trong danh sách Changelog
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setClIsPublished(!clIsPublished)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
                    clIsPublished
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {clIsPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{clIsPublished ? 'Đang Xuất Bản' : 'Bản Nháp (Ẩn)'}</span>
                </button>
              </div>

              {clError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{clError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsChangelogEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={clSaveLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-950/30 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {clSaveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingChangelogId ? 'Lưu Thay Đổi' : 'Tạo Phiên Bản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-3 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl border border-slate-800 dark:border-slate-200 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-4 px-4 flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto w-full text-xs text-slate-500 dark:text-slate-500 z-10 transition-colors">
        <span>MathViz Studio &copy; {new Date().getFullYear()} — Hệ thống Phân quyền Quản trị & Cộng tác viên</span>
        <button
          type="button"
          onClick={() => setIsChangelogOpen(true)}
          title="Bấm để xem lịch sử phiên bản (Changelog)"
          className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
        >
          Phiên bản {APP_VERSION.fullString}
        </button>
      </footer>
      </div>

      {/* Changelog / Version History Modal */}
      {isChangelogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Lịch sử Phiên bản
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhật ký cập nhật & tính năng mới của MathViz Studio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChangelogOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Releases List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-xs">
              {CHANGELOG.map((rel, idx) => (
                <div
                  key={rel.version}
                  className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                        {rel.version}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          Mới nhất
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                      {rel.date}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {rel.title}
                  </h4>

                  <ul className="flex flex-col gap-2 pl-1">
                    {rel.changes.map((c, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                            c.type === 'feat'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : c.type === 'fix'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {c.type}
                        </span>
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsChangelogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
