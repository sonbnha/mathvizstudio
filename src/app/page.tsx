'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Compass,
  Key,
  Upload,
  ImageIcon,
  Copy,
  Download,
  Send,
  Loader2,
  Check,
  Trash2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Palette,
  Printer,
  X,
  Code2,
  Sun,
  Moon,
  MousePointerClick,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { APP_VERSION } from '@/config/version';
import { CHANGELOG, mergeAndSortChangelogs } from '@/config/changelog';
import LessonPlanView from '@/components/LessonPlanView';
import { useApiKey } from '@/context/ApiKeyContext';
import {
  generateGeometrySvgClient,
  extractOcrTextFromImage,
  generateMathWithFallback,
} from '@/lib/geminiClient';
import UnifiedProblemInput from '@/components/UnifiedProblemInput';
import SavedCollection from '@/components/SavedCollection';
import ExportDropdown from '@/components/ExportDropdown';
import InteractiveSvgEditor from '@/components/InteractiveSvgEditor';

const PRESETS = [
  {
    id: 'thang',
    title: 'Thang dựa tường',
    desc: 'Hình học 9 - Góc nghiêng 60°',
    prompt:
      'Một chiếc thang dài 4m dựa vào tường nhà tạo với mặt đất một góc 60 độ. Tính chiều cao thang đạt được trên tường và khoảng cách từ chân thang đến chân tường.',
  },
  {
    id: 'haidang',
    title: 'Ngọn hải đăng',
    desc: 'Lượng giác - Góc hạ 30°',
    prompt:
      'Từ đỉnh ngọn hải đăng cao 38m, người ta nhìn thấy một con thuyền dưới một góc hạ 30 độ so với phương nằm ngang. Tính khoảng cách từ thuyền đến chân hải đăng.',
  },
  {
    id: 'bongcay',
    title: 'Bóng cây mặt trời',
    desc: 'Tam giác vuông - Tỉ số lượng giác',
    prompt:
      'Một cây xanh cao 8m có bóng trên mặt đất dài 6m. Tính góc tạo bởi tia nắng mặt trời với mặt đất (làm tròn đến độ).',
  },
];

export interface HistoryItem {
  id: string;
  title: string;
  promptText: string;
  svgCode: string;
  timestamp: number;
  topic: string;
}

function classifyTopic(promptText: string): string {
  const text = promptText.toLowerCase();
  if (
    text.includes('hình chóp') ||
    text.includes('lăng trụ') ||
    text.includes('lập phương') ||
    text.includes('hình trụ') ||
    text.includes('hình nón') ||
    text.includes('hình cầu') ||
    text.includes('không gian') ||
    text.includes('mặt phẳng') ||
    text.includes('thể tích') ||
    text.includes('bể nước')
  ) {
    return 'Toán 11/12 - Hình học không gian';
  }
  if (
    text.includes('định lý sin') ||
    text.includes('định lý cos') ||
    text.includes('định lí sin') ||
    text.includes('định lí cos') ||
    text.includes('khoảng cách 2 tàu') ||
    text.includes('ngắm đỉnh núi') ||
    text.includes('bán kính đường tròn') ||
    text.includes('vectơ') ||
    text.includes('vector')
  ) {
    return 'Toán 10 - Hệ thức lượng tam giác';
  }
  if (
    text.includes('thang') ||
    text.includes('hải đăng') ||
    text.includes('bóng cây') ||
    text.includes('góc hạ') ||
    text.includes('góc nâng') ||
    text.includes('góc nghiêng') ||
    text.includes('tỉ số lượng giác') ||
    text.includes('hệ thức lượng') ||
    text.includes('tam giác vuông') ||
    text.includes('chân tường') ||
    text.includes('bờ tường')
  ) {
    return 'Toán 9 - Hệ thức lượng & Tỉ số lượng giác';
  }
  return 'Hình học thực tế & Mô hình hóa';
}

interface LicenseCheckResult {
  valid: boolean;
  message?: string;
  customerName?: string | null;
  keyType?: 'trial' | 'vip';
  totalCredits?: number;
  usedCredits?: number;
  remainingCredits?: number | string;
  expiresAt?: string | null;
}

function HomeContent() {
  // Gemini API Key Context
  const { customApiKey, isCustomKeyActive, openApiKeyModal, getApiKeyHeaders, handleRateLimitError } = useApiKey();

  // Theme State (Default to Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // License Key State
  const [licenseKey, setLicenseKey] = useState('');
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<LicenseCheckResult | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [isLicenseExpanded, setIsLicenseExpanded] = useState(false);

  const maskKey = (key: string) => {
    if (!key) return '';
    const trimmed = key.trim();
    if (trimmed.length <= 6) return trimmed;
    return `•••• ${trimmed.slice(-4)}`;
  };

  // Form & Interaction State
  const [prompt, setPrompt] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [styleMode, setStyleMode] = useState<'color' | 'monochrome'>('color');
  const [loading, setLoading] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [refineInput, setRefineInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);

  // Feature 1: Interactive SVG Canvas Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Feature 2: Personal History & Saved Collection
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Main Active Tab Switcher: useSearchParams is the Single Source of Truth
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const mainTab: 'geometry' | 'lesson-plan' = tabParam === 'lesson-plan' ? 'lesson-plan' : 'geometry';

  // Fallback to localStorage active_tab only if URL has no tab param on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && !searchParams.has('tab')) {
      try {
        const savedTab = localStorage.getItem('active_tab') || localStorage.getItem('mathviz_main_tab');
        if (savedTab === 'lesson-plan') {
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', 'lesson-plan');
          router.replace(`?${params.toString()}`, { scroll: false });
        }
      } catch {
        /* ignore */
      }
    }
  }, [searchParams, router]);

  const handleTabChange = (newTab: 'geometry' | 'lesson-plan') => {
    try {
      localStorage.setItem('active_tab', newTab);
      localStorage.setItem('mathviz_main_tab', newTab);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Pending target figure ID from Lesson Plan module
  const [pendingTargetFigureId, setPendingTargetFigureId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedFigureId = sessionStorage.getItem('pending_target_figure_id');
        if (storedFigureId) {
          setPendingTargetFigureId(storedFigureId);
        }
      } catch {}
    }
  }, []);

  // Listen for switch-to-geometry event from Lesson Plan Word Preview
  useEffect(() => {
    const handleSwitchToGeometry = (e: any) => {
      const targetPrompt = e.detail?.prompt;
      const figureId = e.detail?.figureId;
      if (targetPrompt && typeof targetPrompt === 'string') {
        setPrompt(targetPrompt);
      }
      if (figureId && typeof figureId === 'string') {
        setPendingTargetFigureId(figureId);
        try {
          sessionStorage.setItem('pending_target_figure_id', figureId);
        } catch {}
      }
      handleTabChange('geometry');
    };
    window.addEventListener('switch-to-geometry', handleSwitchToGeometry);
    return () => window.removeEventListener('switch-to-geometry', handleSwitchToGeometry);
  }, []);

  const handleInsertFigureToLessonPlan = () => {
    if (!svgOutput || !pendingTargetFigureId) return;

    try {
      const storedFigures = JSON.parse(localStorage.getItem('lesson_plan_figures') || '{}');
      storedFigures[pendingTargetFigureId] = svgOutput;
      localStorage.setItem('lesson_plan_figures', JSON.stringify(storedFigures));
      sessionStorage.removeItem('pending_target_figure_id');
      const targetId = pendingTargetFigureId;
      setPendingTargetFigureId(null);
      window.dispatchEvent(
        new CustomEvent('lesson-plan-figure-updated', {
          detail: { figureId: targetId, svgCode: svgOutput },
        })
      );
    } catch (e) {
      console.error('Lỗi khi chèn hình vào giáo án:', e);
    }

    handleTabChange('lesson-plan');
  };

  // TikZ Export Modal state
  const [isTikzModalOpen, setIsTikzModalOpen] = useState(false);
  const [tikzCode, setTikzCode] = useState('');
  const [tikzLoading, setTikzLoading] = useState(false);
  const [tikzCopied, setTikzCopied] = useState(false);
  const [tikzError, setTikzError] = useState<string | null>(null);

  // Changelog Dynamic State
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [changelogList, setChangelogList] = useState(CHANGELOG);
  const [changelogLoading, setChangelogLoading] = useState(false);

  useEffect(() => {
    if (isChangelogOpen) {
      setChangelogLoading(true);
      fetch(`/api/changelog?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
        .then((res) => res.text())
        .then((text) => {
          try {
            const data = JSON.parse(text);
            if (data && Array.isArray(data.changelogs) && data.changelogs.length > 0) {
              setChangelogList(() => mergeAndSortChangelogs(CHANGELOG, data.changelogs));
            }
          } catch (e) {
            console.warn('Error parsing changelogs, keeping static CHANGELOG:', e);
          }
        })
        .catch((err) => console.error('Error loading public changelogs:', err))
        .finally(() => setChangelogLoading(false));
    }
  }, [isChangelogOpen]);

  // Canvas Loading Progress State (0 - 100)
  const [progress, setProgress] = useState(0);
  const isGenerating = loading || refineLoading;

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return 98;
          // Luôn đảm bảo có bước nhảy tối thiểu 0.04% mỗi chu kỳ để không bị kẹt ở bất kỳ mốc nào
          const remaining = 99 - prev;
          const increment = Math.max(remaining * 0.003, 0.04);
          return Math.min(prev + increment, 98);
        });
      }, 100);
    } else {
      setProgress(0);
    }
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [isGenerating]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Theme on Mount (Light Mode is Default)
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

  // Load History from localStorage on Mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('mathviz_history_items');
      if (savedHistory) {
        setHistoryItems(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn('Lỗi khi đọc lịch sử từ localStorage:', e);
    }
  }, []);

  // Đọc trạng thái đóng/mở danh sách bài toán thực tế mẫu từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('real_world_math_examples_collapsed');
      if (saved !== null) {
        setIsExamplesOpen(saved === 'false');
      }
    } catch (e) {
      console.warn('Lỗi đọc localStorage:', e);
    }
  }, []);

  const toggleExamples = () => {
    const next = !isExamplesOpen;
    setIsExamplesOpen(next);
    try {
      localStorage.setItem('real_world_math_examples_collapsed', String(!next));
    } catch {}
  };

  const handleSelectPreset = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    setIsExamplesOpen(false);
    try {
      localStorage.setItem('real_world_math_examples_collapsed', 'true');
    } catch {}
  };

  const MAX_GALLERY_ITEMS = 50;

  const cleanSvgPayload = (svg: string): string => {
    if (!svg) return '';
    // Strip HTML/SVG comments and collapse extra whitespace to minimize localStorage size
    return svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const saveToHistory = (svgCode: string, promptText: string) => {
    try {
      const topic = classifyTopic(promptText);
      const cleanPrompt = promptText.trim();
      const firstLine = cleanPrompt.split('.')[0] || cleanPrompt;
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      const optimizedSvg = cleanSvgPayload(svgCode);

      const newItem: HistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title || 'Mô hình hình học',
        promptText: cleanPrompt.length > 250 ? cleanPrompt.substring(0, 250) + '...' : cleanPrompt,
        svgCode: optimizedSvg,
        timestamp: Date.now(),
        topic,
      };

      setHistoryItems((prev) => {
        // Prevent storing identical SVG diagrams repeatedly
        const filtered = prev.filter((item) => item.id !== newItem.id && item.svgCode !== optimizedSvg);
        const updated = [newItem, ...filtered].slice(0, MAX_GALLERY_ITEMS);

        try {
          localStorage.setItem('mathviz_history_items', JSON.stringify(updated));
        } catch (storageErr) {
          console.warn('localStorage full or quota exceeded, auto-trimming history:', storageErr);
          // Fallback: gracefully trim to 20 items if quota is constrained
          try {
            const trimmed = updated.slice(0, 20);
            localStorage.setItem('mathviz_history_items', JSON.stringify(trimmed));
          } catch (e2) {
            console.error('Không thể lưu vào localStorage:', e2);
          }
        }
        return updated;
      });
    } catch (e) {
      console.warn('Lỗi khi lưu lịch sử:', e);
    }
  };

  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistoryItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('mathviz_history_items', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hình vẽ?')) {
      setHistoryItems([]);
      localStorage.removeItem('mathviz_history_items');
    }
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setPrompt(item.promptText);
    setSvgOutput(item.svgCode);
    setErrorMsg(null);
  };

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

  // Check License Key function
  const checkLicenseKey = useCallback(async (keyToCheck?: string) => {
    const key = (keyToCheck !== undefined ? keyToCheck : licenseKey).trim();
    if (!key) {
      setLicenseStatus(null);
      setCustomerName(null);
      localStorage.removeItem('mathviz_customer_name');
      return;
    }

    setIsCheckingLicense(true);
    try {
      const res = await fetch('/api/license/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setLicenseStatus({
          valid: false,
          message: data.message || 'Key không hợp lệ',
        });
        setCustomerName(null);
        localStorage.removeItem('mathviz_customer_name');
      } else {
        setLicenseStatus(data);
        if (data.customerName) {
          setCustomerName(data.customerName);
          localStorage.setItem('mathviz_customer_name', data.customerName);
        } else {
          setCustomerName(null);
          localStorage.removeItem('mathviz_customer_name');
        }
        // Tự động thu gọn ngay khi kích hoạt thành công
        setIsLicenseExpanded(false);
      }
    } catch (err: any) {
      setLicenseStatus({
        valid: false,
        message: 'Lỗi kiểm tra kết nối',
      });
      setCustomerName(null);
      localStorage.removeItem('mathviz_customer_name');
    } finally {
      setIsCheckingLicense(false);
    }
  }, [licenseKey]);

  // Load saved license key from localStorage & auto-check
  useEffect(() => {
    const savedKey = localStorage.getItem('mathviz_license_key');
    const savedCustomerName = localStorage.getItem('mathviz_customer_name');
    if (savedCustomerName) {
      setCustomerName(savedCustomerName);
    }
    const initialKey = savedKey || 'MV-TRIAL-1234';
    setLicenseKey(initialKey);
    if (!savedKey) {
      localStorage.setItem('mathviz_license_key', initialKey);
    }
    checkLicenseKey(initialKey);
  }, [checkLicenseKey]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setLicenseKey(newKey);
    localStorage.setItem('mathviz_license_key', newKey);
    setLicenseStatus(null);
    if (!newKey.trim()) {
      setCustomerName(null);
      localStorage.removeItem('mathviz_customer_name');
    }
  };

  // Process File to Base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ tải lên file định dạng hình ảnh (PNG, JPG, WEBP...).');
      return;
    }
    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Event Listener
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Trích xuất văn bản đề bài từ ảnh (OCR trực tiếp từ Client)
  const handleExtractText = async () => {
    if (!imagePreview) return;
    setIsOcrLoading(true);
    setErrorMsg(null);
    try {
      const extractedText = await extractOcrTextFromImage({
        imageBase64: imagePreview,
        mimeType: imageMimeType,
        apiKey: customApiKey || undefined,
      });

      setPrompt((prev) => (prev && prev.trim() ? `${prev.trim()}\n\n${extractedText}` : extractedText));
    } catch (err: any) {
      console.error('Lỗi OCR trích xuất chữ:', err);
      const errMsg = String(err?.message || '');
      const isRateLimit =
        errMsg.toLowerCase().includes('429') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('resource_exhausted');

      if (isRateLimit) {
        handleRateLimitError(errMsg);
      } else {
        setErrorMsg('Không thể trích xuất chữ từ ảnh: ' + (errMsg || 'Vui lòng kiểm tra API Key hoặc thử lại.'));
      }
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Gọi trực tiếp Google Gemini Client-Side (loại bỏ hoàn toàn timeout 10s của Vercel)
  const handleGenerate = async (overridePrompt?: string, isRefinement = false) => {
    const activePrompt = overridePrompt !== undefined ? overridePrompt : prompt;
    if (!activePrompt.trim() && !imagePreview) {
      setErrorMsg('Vui lòng nhập nội dung đề bài hoặc tải lên ảnh bài toán.');
      return;
    }

    if (!licenseKey.trim()) {
      setErrorMsg('Vui lòng nhập License Key để tạo hình.');
      return;
    }

    setErrorMsg(null);
    if (isRefinement) {
      setRefineLoading(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Kiểm tra License Key nhanh qua endpoint nội bộ (< 80ms)
      const checkRes = await fetch('/api/license/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licenseKey.trim() }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData.valid) {
        throw new Error(checkData.message || 'License key không hợp lệ hoặc đã hết lượt sử dụng.');
      }

      // 2. Gọi Google Gemini trực tiếp từ Client trình duyệt qua chuỗi Cascade
      const { svg: generatedSvg } = await generateGeometrySvgClient({
        prompt: activePrompt,
        imageBase64: imagePreview || undefined,
        mimeType: imageMimeType,
        styleMode,
        apiKey: customApiKey || undefined,
      });

      setSvgOutput(generatedSvg);
      saveToHistory(generatedSvg, activePrompt);

      // 3. Trừ credit License trong nền (< 50ms, không cản trở hiển thị hình)
      fetch('/api/license/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': licenseKey.trim(),
        },
      }).catch((e) => console.warn('Lỗi cập nhật credit:', e));

      // Hoàn tất thanh tiến trình
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (isRefinement) {
        setRefineInput('');
      }
      // Cập nhật lại số lượt sử dụng
      checkLicenseKey();
    } catch (err: any) {
      console.error('Lỗi sinh hình SVG:', err);
      const errMsg = String(err?.message || '');
      const isRateLimit =
        errMsg.toLowerCase().includes('429') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('resource_exhausted');

      if (isRateLimit) {
        handleRateLimitError(errMsg);
      }
      setErrorMsg(errMsg || 'Lỗi kết nối tạo hình SVG.');
      setProgress(0);
    } finally {
      setLoading(false);
      setRefineLoading(false);
    }
  };

  // Refine SVG handler
  const handleRefine = () => {
    if (!refineInput.trim()) return;
    if (!svgOutput) {
      setErrorMsg('Chưa có mã SVG để tinh chỉnh. Vui lòng tạo hình trước.');
      return;
    }
    const combinedPrompt = `Hãy cập nhật và sửa đổi hình vẽ SVG theo yêu cầu sau: "${refineInput.trim()}".\n\nĐây là mã SVG hiện tại cần chỉnh sửa:\n${svgOutput}`;
    handleGenerate(combinedPrompt, true);
  };

  // Copy SVG Code
  const handleCopySVG = () => {
    if (!svgOutput) return;
    navigator.clipboard.writeText(svgOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download SVG file
  const handleDownloadSVG = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathviz-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download High-Res PNG via HTML5 Canvas (Full ViewBox / Crisp Vector Rasterization)
  const handleDownloadPNG = (scale = 2) => {
    const svgElement =
      (document.querySelector('#svgMount svg') as SVGSVGElement | null) ||
      (document.querySelector('#previewContainer svg') as SVGSVGElement | null);

    if (!svgElement) return;

    // 1. Trích xuất chính xác viewBox (hoặc bounding box nếu thiếu viewBox)
    const viewBox = svgElement.viewBox?.baseVal;
    const width =
      viewBox && viewBox.width > 0 ? viewBox.width : svgElement.getBoundingClientRect().width || 650;
    const height =
      viewBox && viewBox.height > 0 ? viewBox.height : svgElement.getBoundingClientRect().height || 420;
    const minX = viewBox ? viewBox.x : 0;
    const minY = viewBox ? viewBox.y : 0;

    // 2. Clone SVG và ép kích thước width/height tuyệt đối
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));
    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    }

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Tăng scale lên 2x để ảnh PNG nét cao, không bị mờ nhòe
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);

        // Nền trắng tinh khiết chuẩn in ấn và hiển thị
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Vẽ toàn bộ SVG lên Canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Tạo liên kết tải về
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `mathviz-diagram-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  // Export TikZ handler
  const handleExportTikz = async () => {
    if (!licenseKey.trim()) {
      setErrorMsg('Vui lòng nhập License Key để xuất mã TikZ.');
      return;
    }
    setIsTikzModalOpen(true);
    setTikzLoading(true);
    setTikzError(null);
    setTikzCode('');

    try {
      const res = await fetch('/api/export/tikz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': licenseKey.trim(),
          ...getApiKeyHeaders(),
        },
        body: JSON.stringify({
          svg: svgOutput || undefined,
          prompt: prompt.trim() || undefined,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 429) {
          handleRateLimitError();
          throw new Error('Hệ thống đang quá tải lượt gọi AI. Vui lòng nhập Gemini API Key cá nhân.');
        }
        if (!res.ok) {
          throw new Error(rawText || `Lỗi máy chủ (${res.status})`);
        }
        throw new Error('Dữ liệu TikZ phản hồi không đúng định dạng JSON');
      }

      if (!res.ok) {
        if (res.status === 429) {
          handleRateLimitError(data.error);
        }
        throw new Error(data.error || 'Lỗi khi tạo mã TikZ.');
      }
      setTikzCode(data.tikz);
    } catch (err: any) {
      setTikzError(err.message || 'Lỗi kết nối khi xuất mã TikZ.');
    } finally {
      setTikzLoading(false);
    }
  };

  const handleCopyTikz = () => {
    if (!tikzCode) return;
    navigator.clipboard.writeText(tikzCode);
    setTikzCopied(true);
    setTimeout(() => setTikzCopied(false), 2000);
  };

  const handleDownloadTikz = () => {
    if (!tikzCode) return;
    const blob = new Blob([tikzCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathviz-diagram-${Date.now()}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-200">
      {/* Background visual elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 dark:bg-cyan-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-3xl"></div>
      </div>

      {/* 1. HEADER (Shrink-0) */}
      <header className="shrink-0 z-30 backdrop-blur-md bg-white/85 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs dark:shadow-xl dark:shadow-slate-950/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md dark:shadow-lg shadow-cyan-500/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
              MathViz Studio
              <button
                type="button"
                onClick={() => setIsChangelogOpen(true)}
                title="Bấm để xem lịch sử phiên bản (Changelog)"
                className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 tracking-normal shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>{APP_VERSION.fullString}</span>
              </button>
              <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-semibold tracking-normal">
                AI Visualizer
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mô hình hóa hình học & lượng giác THCS / THPT
            </p>
          </div>

          {/* Module Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-800">
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => handleTabChange('geometry')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                mainTab === 'geometry'
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vẽ hình học</span>
            </button>
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => handleTabChange('lesson-plan')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                mainTab === 'lesson-plan'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Soạn giáo án 5512</span>
            </button>
          </nav>
        </div>

        {/* Header Right: License Key + Library + Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* License Key & Live Status Badge (Collapsible when activated) */}
          {licenseStatus?.valid && !isLicenseExpanded ? (
            /* Collapsed Active Badge (Trial vs VIP) */
            (() => {
              const isTrial =
                licenseStatus.keyType === 'trial' ||
                licenseKey.toUpperCase().startsWith('MV-TR-') ||
                licenseKey.toUpperCase().includes('TRIAL') ||
                licenseKey.toUpperCase().includes('-TR-');

              return isTrial ? (
                /* Collapsed Trial Badge */
                <button
                  type="button"
                  onClick={() => setIsLicenseExpanded(true)}
                  className="h-10 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/90 hover:bg-sky-100/90 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-xs font-semibold shadow-xs transition-all cursor-pointer group shrink-0"
                  title="Bấm để xem chi tiết hoặc thay đổi License Key"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-sky-700 dark:text-sky-300 font-bold">
                    🧪 Trial: {maskKey(licenseKey)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-200/60 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-medium">
                    {customerName ? `Chào ${customerName} • ` : ''}
                    {licenseStatus.totalCredits === -1
                      ? 'Dùng thử'
                      : `Còn ${licenseStatus.remainingCredits}/${licenseStatus.totalCredits} lượt`}
                  </span>
                  <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70 group-hover:text-sky-800 dark:group-hover:text-sky-200 transition font-normal ml-0.5">
                    ⚙️ Đổi key
                  </span>
                </button>
              ) : (
                /* Collapsed VIP Badge */
                <button
                  type="button"
                  onClick={() => setIsLicenseExpanded(true)}
                  className="h-10 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs transition-all cursor-pointer group shrink-0"
                  title="Bấm để xem chi tiết hoặc thay đổi License Key"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    <Key className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    VIP: {maskKey(licenseKey)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-medium">
                    {customerName ? `👋 ${customerName}` : 'VIP'} •{' '}
                    {licenseStatus.totalCredits === -1
                      ? 'Vĩnh viễn'
                      : `Còn ${licenseStatus.remainingCredits} lượt`}
                  </span>
                  <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 transition font-normal ml-0.5">
                    ⚙️ Đổi key
                  </span>
                </button>
              );
            })()
          ) : (
            /* Expanded / Unactivated Form */
            <div className="h-10 flex items-center gap-2 bg-slate-100/90 dark:bg-slate-950/70 px-2.5 py-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all animate-in fade-in duration-200 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <Key className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden sm:inline">License Key:</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={handleKeyChange}
                  onBlur={() => checkLicenseKey()}
                  onKeyDown={(e) => e.key === 'Enter' && checkLicenseKey()}
                  placeholder="Nhập Key (vd: MV-VIP-xxxx / MV-TR-xxxx)"
                  className="h-7 border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-slate-950/60 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-[11px] px-2.5 py-0 rounded-md text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition w-36 sm:w-44 font-mono tracking-wider leading-none shadow-xs shrink-0"
                />
                <button
                  type="button"
                  onClick={() => checkLicenseKey()}
                  disabled={isCheckingLicense || !licenseKey.trim()}
                  className="h-7 w-7 shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center transition disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Kiểm tra trạng thái bản quyền"
                >
                  {isCheckingLicense ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                </button>
              </div>

              {/* Badge Info Status */}
              {!licenseKey.trim() || licenseStatus === null ? (
                <div className="h-7 text-[11px] px-2.5 py-0 rounded-md font-medium bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                  <span>Chưa kích hoạt</span>
                </div>
              ) : isCheckingLicense ? (
                <div className="h-7 text-[11px] px-2.5 py-0 rounded-md font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-1.5 shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  <span>Đang kiểm tra...</span>
                </div>
              ) : licenseStatus.valid ? (
                (() => {
                  const isTrial =
                    licenseStatus.keyType === 'trial' ||
                    licenseKey.toUpperCase().startsWith('MV-TR-') ||
                    licenseKey.toUpperCase().includes('TRIAL') ||
                    licenseKey.toUpperCase().includes('-TR-');

                  return isTrial ? (
                    /* Expanded Trial Badge */
                    <div className="h-7 text-[11px] px-2.5 py-0 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300 shadow-xs shrink-0">
                      <span className="text-sky-600 dark:text-sky-400 font-bold">🧪</span>
                      <span className="font-semibold">
                        {customerName ? `Chào ${customerName} • ` : ''}
                        {licenseStatus.totalCredits === -1
                          ? 'Dùng thử: Không giới hạn'
                          : `Dùng thử: Còn ${licenseStatus.remainingCredits}/${licenseStatus.totalCredits} lượt`}
                        {licenseStatus.expiresAt
                          ? ` (Hạn: ${new Date(licenseStatus.expiresAt).toLocaleDateString('vi-VN')})`
                          : ''}
                      </span>
                    </div>
                  ) : (
                    /* Expanded VIP Badge */
                    <div className="h-7 text-[11px] px-2.5 py-0 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300 shadow-xs shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold">
                        {customerName ? `👋 Chào ${customerName} • ` : ''}
                        {licenseStatus.totalCredits === -1
                          ? `VIP: Không giới hạn (${
                              licenseStatus.expiresAt
                                ? `Hạn: ${new Date(licenseStatus.expiresAt).toLocaleDateString('vi-VN')}`
                                : 'Vĩnh viễn'
                            })`
                          : `VIP: Còn ${licenseStatus.remainingCredits}/${licenseStatus.totalCredits} lượt`}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <div className="h-7 text-[11px] px-2.5 py-0 rounded-md font-medium bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>{licenseStatus.message || 'Key không hợp lệ'}</span>
                </div>
              )}
            </div>
          )}

          {/* Gemini API Key Configuration Button */}
          <button
            type="button"
            onClick={() => openApiKeyModal()}
            className="h-10 inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 rounded-xl text-xs font-medium border transition-all duration-200 shadow-xs cursor-pointer group shrink-0 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-sky-50 border-purple-200 hover:border-purple-300 hover:bg-purple-100/50 text-purple-900 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-sky-950/40 dark:border-purple-500/30 dark:hover:border-purple-400/60 dark:hover:bg-purple-950/60 dark:text-purple-200 dark:hover:text-white"
            title={
              isCustomKeyActive
                ? 'Đang dùng Gemini Key cá nhân. Bấm để quản lý.'
                : 'Đang dùng Gemini Key hệ thống (Auto). Bấm để nhập Key cá nhân.'
            }
          >
            <Key className="w-3.5 h-3.5 text-purple-600 dark:text-indigo-400 group-hover:rotate-12 transition-transform shrink-0" />
            {isCustomKeyActive ? (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs text-purple-900 dark:text-purple-200">
                  Key riêng
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200/80 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 uppercase tracking-wide">
                  Cá nhân
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs text-purple-900 dark:text-purple-200">
                  Gemini Key
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200/80 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 uppercase tracking-wide">
                  Auto
                </span>
              </div>
            )}
            <span
              className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                isCustomKeyActive
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse'
                  : 'bg-purple-500 dark:bg-indigo-400 shadow-[0_0_6px_rgba(168,85,247,0.4)] dark:shadow-[0_0_6px_rgba(129,140,248,0.7)]'
              }`}
            ></span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-sky-500/40 dark:hover:border-sky-500/40 text-slate-700 dark:text-amber-400 transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* 2. KHÔNG GIAN LÀM VIỆC (Flex-1 min-h-0, không bị tràn ra ngoài) */}
      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {/* TAB 1: Vẽ hình học AI (2 Cột Studio) */}
        <div
          suppressHydrationWarning
          className={`flex-1 min-h-0 w-full px-4 md:px-6 py-3 flex flex-col lg:flex-row gap-4 overflow-hidden ${mainTab === 'geometry' ? 'flex' : 'hidden'}`}
        >
          {/* CỘT 1: NHẬP LIỆU VÀ CÔNG CỤ (Cố định bề ngang ~320px-340px, h-full, cuộn độc lập) */}
          <section className="w-full lg:w-[320px] xl:w-[340px] shrink-0 h-full overflow-y-auto p-4 box-border rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-4">
          {/* Preset Buttons Collapsible Accordion */}
          <div className="w-full max-w-full mx-auto border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 rounded-2xl overflow-hidden shadow-xs shrink-0 transition-colors box-border">
            <button
              type="button"
              onClick={toggleExamples}
              className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📐</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bài toán thực tế mẫu
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700/50 font-medium">
                  {PRESETS.length} bài
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{isExamplesOpen ? 'Thu gọn' : 'Xem mẫu'}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isExamplesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Vùng danh sách nội dung bài mẫu */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExamplesOpen
                  ? 'max-h-[500px] opacity-100 p-3 border-t border-slate-200 dark:border-slate-800/80'
                  : 'max-h-0 opacity-0 p-0'
              }`}
            >
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.prompt)}
                    className="text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition group cursor-pointer"
                    title="Bấm để đưa bài này vào khung nhập"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition flex items-center gap-1.5">
                        <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">
                          #{idx + 1}
                        </span>
                        {preset.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {preset.desc}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt & File Input Box */}
          <div className="w-full max-w-full mx-auto bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm dark:shadow-lg flex-1 flex flex-col gap-4 transition-colors overflow-hidden box-border">
            {/* Style Presets Mode Selector */}
            <div className="flex flex-col gap-1.5 w-full max-w-full mx-auto">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Phong cách hiển thị
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {styleMode === 'color' ? 'Màu sắc trực quan' : 'Đơn sắc in ấn A4'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-full mx-auto box-border">
                <button
                  type="button"
                  onClick={() => setStyleMode('color')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 whitespace-nowrap text-center cursor-pointer ${
                    styleMode === 'color'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                  }`}
                  title="Phong cách trực quan có màu sắc thích hợp cho bài giảng và trình chiếu"
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Bài giảng (Màu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStyleMode('monochrome')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 whitespace-nowrap text-center cursor-pointer ${
                    styleMode === 'monochrome'
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                  }`}
                  title="Phong cách đen trắng đơn sắc chuẩn đề thi và in ấn A4"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Đề thi / In ấn</span>
                </button>
              </div>
            </div>

            {/* Unified Multimodal Input Box */}
            <div className="w-full max-w-full mx-auto flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden box-border">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nội dung đề bài</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Hỗ trợ văn bản hoặc dán ảnh (Ctrl+V)
                </span>
              </label>

              <UnifiedProblemInput
                value={prompt}
                onChange={(val) => setPrompt(val)}
                imagePreview={imagePreview}
                onImageChange={(b64, file) => {
                  setImagePreview(b64);
                  if (file) setImageMimeType(file.type);
                }}
                onOcrExtract={async (base64) => {
                  return await extractOcrTextFromImage({
                    imageBase64: base64,
                    mimeType: imageMimeType,
                    apiKey: customApiKey || undefined,
                  });
                }}
                onSubmit={() => handleGenerate()}
                isLoading={loading}
                submitButtonText="Tạo hình"
                placeholder="Nhập đề bài toán, dán ảnh (Ctrl+V) hoặc bấm đính kèm ảnh bên dưới..."
              />
            </div>

            {/* Error Banner */}
            {errorMsg && (() => {
              const is429 =
                errorMsg.includes('429') ||
                errorMsg.toLowerCase().includes('quota') ||
                errorMsg.toLowerCase().includes('resource_exhausted') ||
                errorMsg.toLowerCase().includes('quá tải');
              const friendlyMsg = is429
                ? "Hệ thống đang quá tải lượt gọi AI miễn phí. Vui lòng bấm nút 'Gemini Key' ở góc trên bên phải để nhập Key cá nhân."
                : errorMsg.length > 120
                ? errorMsg.slice(0, 120) + '…'
                : errorMsg;
              const showDetail = errorMsg.length > 120 || is429;

              return (
                <div className="w-full max-w-full overflow-hidden p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 break-words [word-break:break-word]">
                      <span>{friendlyMsg}</span>
                      {showDetail && !is429 && (
                        <details className="mt-1">
                          <summary className="text-[11px] text-rose-400/80 cursor-pointer hover:text-rose-500 transition select-none">
                            Xem chi tiết lỗi kỹ thuật
                          </summary>
                          <pre className="mt-1 text-[11px] p-1.5 bg-black/10 dark:bg-black/30 rounded overflow-x-auto break-all whitespace-pre-wrap max-h-20">
                            {errorMsg}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* CỘT 2: KHUNG VẼ CANVAS SVG, TINH CHỈNH & BỘ SƯU TẬP Ở ĐÁY */}
        <section className="flex-1 min-w-0 h-full flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs overflow-y-auto">
          {/* Header Canvas (Tự động hoán đổi thành Thanh công cụ định dạng khi ở Chế độ Chỉnh sửa) */}
          <div className="flex items-center justify-between min-h-[44px] pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0 transition-all">
            {!isEditMode ? (
              /* --- CHẾ ĐỘ MẶC ĐỊNH --- */
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Khung Canvas SVG</span>
                </div>

                {/* Action Tools */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Interactive Edit Mode Toggle Button */}
                  <button
                    onClick={() => setIsEditMode(true)}
                    disabled={!svgOutput || isGenerating}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-transparent disabled:opacity-40"
                    title="Bật chế độ chỉnh sửa trực tiếp: Kéo thả nhãn số đo, đổi nét đứt/liền, đổi màu, góc vuông"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>✏️ Chỉnh sửa trực tiếp</span>
                  </button>

                  {/* Dropdown "Xuất hình ảnh" Đa định dạng & Tùy chọn Độ phân giải */}
                  <ExportDropdown
                    svgElement={svgContainerRef.current?.querySelector('svg') || null}
                    svgString={svgOutput || ''}
                    tikzCode={tikzCode}
                    onExportTikz={handleExportTikz}
                    fileName="mathviz-diagram"
                    disabled={!svgOutput || isGenerating}
                  />

                  {/* Insert into Lesson Plan Button (when coming from Lesson Plan) */}
                  {pendingTargetFigureId && svgOutput && !isGenerating && (
                    <button
                      type="button"
                      onClick={handleInsertFigureToLessonPlan}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition-all animate-pulse active:scale-95 cursor-pointer shrink-0"
                      title="Chèn hình vẽ này trực tiếp vào vị trí khung minh họa trong Kế hoạch bài dạy"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>📥 Chèn hình này vào Giáo án</span>
                    </button>
                  )}

                </div>
              </>
            ) : (
              /* --- CHẾ ĐỘ CHỈNH SỬA TRỰC TIẾP: Vị trí Portal cho Thanh công cụ định dạng (Shape Toolbar) --- */
              <div id="canvasHeaderEditSlot" className="w-full flex items-center justify-between min-w-0" />
            )}
          </div>

          {/* Display Canvas Screen (flex-1 min-h-0 chiếm trọn chiều cao còn lại) */}
          <div
            id="previewContainer"
            ref={svgContainerRef}
            className={`flex-1 min-h-0 w-full rounded-xl flex items-center justify-center p-4 my-2 relative overflow-hidden select-none transition-all ${
              svgOutput
                ? 'bg-white border border-slate-300 dark:border-slate-700/80 shadow-sm dark:shadow-xl dark:shadow-black/50 text-slate-900'
                : 'bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-inner'
            }`}
          >
              {/* High-Tech Mathematical Loading Animation Overlay with Progress Bar */}
              {isGenerating && (
                <div className="absolute inset-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-950/90 flex flex-col items-center justify-center p-6 gap-4 animate-in fade-in duration-200">
                  {/* Glowing Geometric Spinner */}
                  <div className="relative flex items-center justify-center w-20 h-20">
                    {/* Outer ambient glow */}
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 dark:bg-cyan-500/30 blur-xl animate-pulse" />

                    {/* Outer dashed spinning ring */}
                    <div className="absolute w-20 h-20 rounded-full border-2 border-dashed border-cyan-500/40 dark:border-cyan-400/50 animate-[spin_8s_linear_infinite]" />

                    {/* Middle counter-rotating gradient ring */}
                    <div className="absolute w-14 h-14 rounded-full border-2 border-transparent border-t-indigo-500 border-r-cyan-400 dark:border-t-indigo-400 dark:border-r-cyan-300 animate-[spin_2.5s_linear_infinite_reverse]" />

                    {/* Inner high-speed spinner */}
                    <div className="absolute w-10 h-10 rounded-full border-2 border-cyan-500/20 border-b-cyan-500 animate-spin" />

                    {/* Center Pulsing Sparkle / Math Icon */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 dark:shadow-cyan-500/50 animate-pulse">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Status Texts & Percentage */}
                  <div className="flex flex-col items-center text-center gap-2 max-w-sm w-full">
                    <div className="flex items-center justify-between w-full max-w-[280px] sm:max-w-[320px] px-1 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                        {progress >= 100
                          ? 'Hoàn tất!'
                          : refineLoading
                          ? 'Đang tinh chỉnh...'
                          : 'Đang dựng hình...'}
                      </span>
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                        {Math.floor(progress)}%
                      </span>
                    </div>

                    {/* Sleek Gradient Progress Bar */}
                    <div className="w-full max-w-[280px] sm:max-w-[320px] h-2.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700/60 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-600 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-500/40 relative"
                        style={{ width: `${progress}%` }}
                      >
                        {/* Shimmer light effect inside progress bar */}
                        <div className="absolute inset-0 bg-white/25 animate-[pulse_1s_ease-in-out_infinite] rounded-full" />
                      </div>
                    </div>

                    {/* Dynamic stage message based on % */}
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[18px] transition-all duration-200 mt-0.5">
                      {progress >= 100
                        ? '✨ Hoàn tất! Đang hiển thị mô hình...'
                        : progress > 80
                        ? '⚙️ Đang hoàn tất khung vẽ...'
                        : progress > 40
                        ? '📐 Đang tạo tọa độ & hình học...'
                        : '🔍 Đang phân tích dữ liệu toán học...'}
                    </p>

                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Mô hình vector SVG chuẩn sư phạm đang được xử lý theo thời gian thực.
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive SVG Editor Overlay & Floating Toolbar */}
              <InteractiveSvgEditor
                svgCode={svgOutput || ''}
                isEditMode={isEditMode}
                onUpdateSvg={(newSvg) => setSvgOutput(newSvg)}
                onCloseEditMode={() => setIsEditMode(false)}
                mountContainerId="svgMount"
              />

              {svgOutput ? (
                <div
                  id="svgMount"
                  className={`w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto ${
                    isEditMode
                      ? '[&_text]:cursor-move [&_circle]:cursor-move [&_text:hover]:outline [&_text:hover]:outline-2 [&_text:hover]:outline-dashed [&_text:hover]:outline-cyan-500 [&_circle:hover]:outline [&_circle:hover]:outline-2 [&_circle:hover]:outline-dashed [&_circle:hover]:outline-cyan-500 [&_line]:cursor-pointer [&_line:hover]:stroke-cyan-500 [&_line:hover]:stroke-[2.5px] [&_path]:cursor-pointer [&_path:hover]:stroke-cyan-500 [&_polyline]:cursor-pointer [&_polyline:hover]:stroke-cyan-500 [&_polygon]:cursor-pointer [&_polygon:hover]:opacity-85'
                      : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: svgOutput }}
                />
              ) : (
                <div className="text-center p-8 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                    <Compass className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Chưa có hình minh họa
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                      Nhập đề bài hoặc chọn bài toán mẫu ở cột bên trái để AI tổng hợp mô hình toán học chuẩn SVG.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Refinement Chat Box */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Tinh chỉnh nhanh hình vẽ
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  disabled={!svgOutput || refineLoading}
                  placeholder={
                    svgOutput
                      ? 'Nhập yêu cầu sửa (vd: đổi góc sang 45 độ, đổi màu nét vẽ...)'
                      : 'Cần sinh hình trước khi tinh chỉnh...'
                  }
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none transition disabled:opacity-50"
                />
                <button
                  onClick={handleRefine}
                  disabled={!svgOutput || refineLoading || !refineInput.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-md shadow-cyan-950"
                >
                  {refineLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Khối Bộ sưu tập đã lưu ở đáy */}
            <SavedCollection
              items={historyItems.map((item) => ({
                id: item.id,
                title: item.title,
                svgContent: item.svgCode,
                createdAt: new Date(item.timestamp).toLocaleDateString('vi-VN'),
              }))}
              onSelectItem={(saved) => {
                const found = historyItems.find((h) => h.id === saved.id);
                if (found) handleLoadFromHistory(found);
              }}
              onDeleteItem={(id) => handleDeleteHistoryItem(id)}
              onClearAll={handleClearAllHistory}
            />
          </section>
        </div>

        {/* TAB 2: Soạn giáo án tự động */}
        <div
          suppressHydrationWarning
          className={`flex-1 min-h-0 w-full px-4 md:px-6 py-3 overflow-hidden ${mainTab === 'lesson-plan' ? 'flex flex-col' : 'hidden'}`}
        >
          <LessonPlanView licenseKey={licenseKey} />
        </div>
      </main>

      {/* TikZ LaTeX Export Modal */}
      {isTikzModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Mã TikZ / LaTeX Hoàn Chỉnh
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Overleaf Ready
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dán trực tiếp vào tài liệu LaTeX hoặc trình soạn thảo Overleaf
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTikzModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto min-h-[220px] flex flex-col">
              {tikzLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 dark:text-indigo-400" />
                  <p className="text-xs">Đang phân tích hình học & dịch sang cú pháp TikZ LaTeX...</p>
                </div>
              ) : tikzError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{tikzError}</span>
                </div>
              ) : (
                <pre className="flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-200 overflow-x-auto selection:bg-indigo-500 selection:text-white leading-relaxed">
                  {tikzCode || '\\begin{tikzpicture}\n  % Chưa có mã TikZ\n\\end{tikzpicture}'}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 gap-2">
              <span className="text-[10px] text-slate-500">
                Gói yêu cầu trong LaTeX: <code className="text-slate-700 dark:text-slate-400 font-mono">\usepackage&#123;tikz&#125;</code>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTikz}
                  disabled={!tikzCode || tikzLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file .tex</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTikz}
                  disabled={!tikzCode || tikzLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-950"
                >
                  {tikzCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Đã chép TikZ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép mã TikZ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FOOTER / STATUS BAR (Shrink-0, luôn hiển thị rõ ràng ở đáy) */}
      <footer className="shrink-0 h-8 px-4 md:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span>© {new Date().getFullYear()} MathViz Studio • Nền tảng mô hình hóa Toán học & Soạn giáo án</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden sm:inline">Chuẩn Công văn 5512 BGD&ĐT</span>
          <button
            type="button"
            onClick={() => setIsChangelogOpen(true)}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 underline decoration-dotted transition cursor-pointer font-mono"
            title="Xem Changelog"
          >
            {APP_VERSION.fullString}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Engine: Gemini 3.6 Flash
          </span>
        </div>
      </footer>

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
              {changelogLoading && changelogList.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  <span>Đang tải lịch sử phiên bản...</span>
                </div>
              ) : (
                changelogList.map((rel, idx) => (
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
              )))}
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

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
          <span>Đang tải MathViz Studio...</span>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
