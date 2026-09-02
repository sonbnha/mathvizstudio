'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Key,
  Upload,
  ImageIcon,
  Copy,
  Download,
  FileImage,
  Send,
  Loader2,
  Check,
  Trash2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  FileCode,
  Palette,
  Printer,
  X,
  Code2,
  Sun,
  Moon,
  MousePointerClick,
  FolderClock,
  Search,
  FolderOpen,
  Filter,
  Layers,
  ArrowUpRight,
  BookmarkCheck,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { APP_VERSION } from '@/config/version';
import { CHANGELOG, mergeAndSortChangelogs } from '@/config/changelog';
import LessonPlanView from '@/components/LessonPlanView';
import { useApiKey } from '@/context/ApiKeyContext';

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

const TOPIC_CATEGORIES = [
  'Tất cả',
  'Toán 9 - Hệ thức lượng & Tỉ số lượng giác',
  'Toán 10 - Hệ thức lượng tam giác',
  'Toán 11/12 - Hình học không gian',
  'Hình học thực tế & Mô hình hóa',
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

export default function HomePage() {
  // Gemini API Key Context
  const { isCustomKeyActive, openApiKeyModal, getApiKeyHeaders, handleRateLimitError } = useApiKey();

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

  // Feature 1: Interactive SVG Canvas Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const draggingElementRef = useRef<{
    element: SVGElement;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    type: 'text' | 'circle';
  } | null>(null);

  // Feature 2: Personal History & Subject Library
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Tất cả');
  const [historyCardCopiedId, setHistoryCardCopiedId] = useState<string | null>(null);

  // Main Active Tab Switcher state ('geometry' | 'lesson-plan')
  const [mainTab, setMainTab] = useState<'geometry' | 'lesson-plan'>('geometry');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'lesson-plan' || tabParam === 'geometry') {
        setMainTab(tabParam);
      } else {
        const savedTab = localStorage.getItem('mathviz_main_tab');
        if (savedTab === 'lesson-plan' || savedTab === 'geometry') {
          setMainTab(savedTab);
        }
      }
    }
  }, []);

  const handleTabChange = (tab: 'geometry' | 'lesson-plan') => {
    setMainTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mathviz_main_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.toString());
    }
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

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem('mathviz_history_items', JSON.stringify(updated));
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

  // Call API generate
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
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': licenseKey.trim(),
          ...getApiKeyHeaders(),
        },
        body: JSON.stringify({
          prompt: activePrompt,
          imageBase64: imagePreview || undefined,
          mimeType: imageMimeType,
          styleMode,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 429) {
          handleRateLimitError();
          throw new Error('Hệ thống đang quá tải lượt gọi AI. Vui lòng nhập Gemini API Key cá nhân để tiếp tục.');
        }
        if (!res.ok) {
          throw new Error(rawText || `Lỗi máy chủ (${res.status})`);
        }
        throw new Error(`Dữ liệu máy chủ phản hồi không đúng định dạng JSON: ${rawText.slice(0, 120)}...`);
      }

      if (!res.ok) {
        if (
          res.status === 429 ||
          data.isRateLimit ||
          String(data.error || '').toLowerCase().includes('429') ||
          String(data.error || '').toLowerCase().includes('quota') ||
          String(data.error || '').toLowerCase().includes('resource_exhausted')
        ) {
          handleRateLimitError(data.error);
          throw new Error(data.error || 'Hệ thống đang quá tải lượt gọi AI. Vui lòng nhập Gemini API Key cá nhân để tiếp tục.');
        }
        throw new Error(data.error || `Đã có lỗi xảy ra khi tạo hình (${res.status}).`);
      }

      setSvgOutput(data.svg);
      saveToHistory(data.svg, activePrompt);

      // Hit 100% on success and delay 250ms with smooth completion effect
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 250));

      if (isRefinement) {
        setRefineInput('');
      }
      // Refresh license key status in real time
      checkLicenseKey();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối tới máy chủ.');
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

  // Helper: Convert screen clientX, clientY into SVG viewBox coordinates
  const getSvgCoordinates = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: clientX, y: clientY };
  };

  // Interactive SVG Canvas Drag & Drop Listeners
  useEffect(() => {
    if (!isEditMode || !svgOutput) return;

    const svgMount = document.getElementById('svgMount');
    if (!svgMount) return;

    const svg = svgMount.querySelector('svg');
    if (!svg) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as SVGElement;
      if (!target) return;

      // Find if clicked element is a <text> or <circle>
      const textTarget = (target.tagName.toLowerCase() === 'text'
        ? target
        : target.closest('text')) as SVGTextElement | null;
      const circleTarget = (target.tagName.toLowerCase() === 'circle'
        ? target
        : target.closest('circle')) as SVGCircleElement | null;

      if (textTarget) {
        e.preventDefault();
        const { x: startX, y: startY } = getSvgCoordinates(svg, e.clientX, e.clientY);
        const initX = parseFloat(textTarget.getAttribute('x') || '0');
        const initY = parseFloat(textTarget.getAttribute('y') || '0');

        draggingElementRef.current = {
          element: textTarget,
          startX,
          startY,
          initX,
          initY,
          type: 'text',
        };
        textTarget.classList.add('opacity-80');
      } else if (circleTarget) {
        e.preventDefault();
        const { x: startX, y: startY } = getSvgCoordinates(svg, e.clientX, e.clientY);
        const initX = parseFloat(circleTarget.getAttribute('cx') || '0');
        const initY = parseFloat(circleTarget.getAttribute('cy') || '0');

        draggingElementRef.current = {
          element: circleTarget,
          startX,
          startY,
          initX,
          initY,
          type: 'circle',
        };
        circleTarget.classList.add('opacity-80');
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingElementRef.current) return;
      e.preventDefault();

      const { element, startX, startY, initX, initY, type } = draggingElementRef.current;
      const currentPos = getSvgCoordinates(svg, e.clientX, e.clientY);
      const dx = currentPos.x - startX;
      const dy = currentPos.y - startY;

      if (type === 'text') {
        const newX = Math.round((initX + dx) * 10) / 10;
        const newY = Math.round((initY + dy) * 10) / 10;
        element.setAttribute('x', String(newX));
        element.setAttribute('y', String(newY));

        // Also update any child tspans if they have absolute x coords
        const tspans = element.querySelectorAll('tspan');
        tspans.forEach((tspan) => {
          if (tspan.getAttribute('x')) {
            tspan.setAttribute('x', String(newX));
          }
        });
      } else if (type === 'circle') {
        const newCx = Math.round((initX + dx) * 10) / 10;
        const newCy = Math.round((initY + dy) * 10) / 10;
        element.setAttribute('cx', String(newCx));
        element.setAttribute('cy', String(newCy));
      }
    };

    const handlePointerUp = () => {
      if (draggingElementRef.current) {
        draggingElementRef.current.element.classList.remove('opacity-80');
        draggingElementRef.current = null;

        // Synchronize updated SVG DOM back to React state
        const serialized = new XMLSerializer().serializeToString(svg);
        setSvgOutput(serialized);
      }
    };

    svg.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      svg.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isEditMode, svgOutput]);

  // Filtered History
  const filteredHistory = historyItems.filter((item) => {
    const matchesSearch =
      historySearch.trim() === '' ||
      item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.promptText.toLowerCase().includes(historySearch.toLowerCase());
    const matchesTopic = selectedTopic === 'Tất cả' || item.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

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
            className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-medium border bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 hover:border-sky-500/40 dark:hover:border-sky-500/40 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs cursor-pointer group shrink-0"
            title="Cấu hình Gemini API Key cá nhân (khi hệ thống quá tải)"
          >
            <Key className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span className="hidden sm:inline">
              {isCustomKeyActive ? 'Key riêng' : 'Gemini Key'}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                isCustomKeyActive
                  ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)] animate-pulse'
                  : 'bg-slate-400 dark:bg-slate-500'
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
        {/* TAB 1: Vẽ hình học AI (3 Cột Studio) */}
        <div className={`flex-1 min-h-0 w-full px-4 md:px-6 py-3 flex flex-col lg:flex-row gap-4 overflow-hidden ${mainTab === 'geometry' ? 'flex' : 'hidden'}`}>
          {/* CỘT 1: NHẬP LIỆU VÀ CÔNG CỤ (Cố định bề ngang, h-full, cuộn độc lập) */}
          <section className="w-full lg:w-[360px] xl:w-[380px] shrink-0 h-full overflow-y-auto pr-1 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col">
          {/* Preset Buttons */}
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm dark:shadow-lg transition-colors">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Bài toán thực tế mẫu
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setPrompt(preset.prompt)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                      {preset.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-950 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition">
                      {preset.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt & File Input Box */}
          <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm dark:shadow-lg flex-1 flex flex-col gap-4 transition-colors">
            {/* Style Presets Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Phong cách hiển thị
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {styleMode === 'color' ? 'Màu sắc trực quan' : 'Đơn sắc in ấn A4'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStyleMode('color')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 ${
                    styleMode === 'color'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Bài giảng (Màu sắc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStyleMode('monochrome')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 ${
                    styleMode === 'monochrome'
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Đề thi / In ấn</span>
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nội dung đề bài</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Văn bản hoặc mô tả hình vẽ
                </span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Nhập đề bài toán (ví dụ: Một chiếc thang dài 4m dựa vào tường tạo góc 60 độ với mặt đất...)"
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none transition"
              />
            </div>

            {/* Drag & Drop / Paste Image Area */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Ảnh đề bài toán (OCR AI)
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                  Hỗ trợ Ctrl+V / Cmd+V
                </span>
              </label>

              {imagePreview ? (
                <div className="relative group rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-50 dark:bg-slate-950 p-2.5 flex items-center gap-3 shadow-sm dark:shadow-md dark:shadow-cyan-950/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview bài toán"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 font-semibold">
                      <span>Đã đính kèm ảnh đề bài</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-mono">
                        {imageMimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                      Gemini 3.6 Flash sẽ tự động đọc chữ (OCR) & dựng mô hình toán.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition flex items-center gap-1"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa ảnh</span>
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100/80 dark:hover:bg-slate-950/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Upload className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">
                      Chọn file ảnh từ máy
                    </span>{' '}
                    hoặc <span className="text-slate-600 dark:text-slate-300 font-medium">kéo thả / dán (Ctrl+V)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Hỗ trợ PNG, JPG, WEBP — Tự động nhận diện đề toán bằng OCR
                  </p>
                </div>
              )}
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

            {/* Generate Action Button */}
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="mt-auto w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang phân tích & tạo mã SVG...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition transform" />
                  <span>Tạo hình minh họa ({styleMode === 'color' ? 'Màu sắc' : 'Đơn sắc'})</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* CỘT 2: KHUNG VẼ CANVAS SVG (Tự nở rộng chiếm không gian chính, h-full) */}
        <section className="flex-1 min-w-0 h-full flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Khung Canvas SVG</span>

              {/* Edit Mode Active Indicator */}
              {isEditMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-300 font-semibold flex items-center gap-1 animate-pulse">
                  <MousePointerClick className="w-3 h-3" />
                  Kéo thả nhãn/điểm đang bật
                </span>
              )}
            </div>

            {/* Action Tools */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Interactive Edit Mode Toggle Button */}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                disabled={!svgOutput || isGenerating}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                  isEditMode
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-transparent disabled:opacity-40'
                }`}
                title={
                  isEditMode
                    ? 'Tắt chế độ chỉnh sửa kéo thả'
                    : 'Bật chế độ chỉnh sửa trực tiếp: Kéo thả nhãn số đo & tên điểm bằng chuột'
                }
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Đang Chỉnh sửa' : 'Chỉnh sửa trực tiếp'}</span>
              </button>

              <button
                onClick={handleCopySVG}
                disabled={!svgOutput || isGenerating}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-slate-200 dark:border-transparent transition flex items-center gap-1.5"
                title="Sao chép mã SVG"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Đã chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SVG</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSVG}
                disabled={!svgOutput || isGenerating}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-slate-200 dark:border-transparent transition flex items-center gap-1.5"
                title="Tải file .svg"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Tải SVG</span>
              </button>

              <button
                onClick={() => handleDownloadPNG(2)}
                disabled={!svgOutput || isGenerating}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/10 dark:bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/20 dark:hover:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition flex items-center gap-1.5"
                title="Tải file PNG nét cao"
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>Tải PNG</span>
              </button>

              {/* TikZ LaTeX Export Button */}
              <button
                onClick={handleExportTikz}
                disabled={(!svgOutput && !prompt.trim()) || isGenerating}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                title="Xuất mã TikZ / LaTeX để dùng trên Overleaf hoặc MathType"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Xuất TikZ (LaTeX)</span>
              </button>
            </div>
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

              {svgOutput ? (
                <div
                  id="svgMount"
                  className={`w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto ${
                    isEditMode
                      ? '[&_text]:cursor-move [&_circle]:cursor-move [&_text:hover]:outline [&_text:hover]:outline-2 [&_text:hover]:outline-dashed [&_text:hover]:outline-cyan-500 [&_circle:hover]:outline [&_circle:hover]:outline-2 [&_circle:hover]:outline-dashed [&_circle:hover]:outline-cyan-500'
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
        </section>

        {/* CỘT 3: BỘ SƯU TẬP HIỂN THỊ MẶC ĐỊNH (Cố định bên phải, h-full) */}
        <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0 h-full flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FolderClock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Bộ sưu tập đã lưu ({historyItems.length})
            </span>
            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="text-xs text-rose-500 hover:text-rose-600 transition-colors font-medium cursor-pointer"
              >
                Xóa hết
              </button>
            )}
          </div>

          {/* Thanh tìm kiếm & Tabs lọc danh mục */}
          <div className="mb-3 space-y-2">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Tìm kiếm hình vẽ..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full pb-1">
              {TOPIC_CATEGORIES.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap font-medium transition cursor-pointer ${
                    selectedTopic === topic
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {topic.startsWith('Toán') ? topic.split(' - ')[0] : topic}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách cuộn độc lập */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <FolderOpen className="w-7 h-7 mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Không có hình vẽ nào
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="group bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl p-2.5 flex flex-col gap-2 transition shadow-xs hover:shadow-sm"
                >
                  {/* SVG Thumbnail Container */}
                  <div className="w-full h-28 bg-white rounded-lg border border-slate-200 dark:border-slate-700/80 p-1 flex items-center justify-center overflow-hidden relative shadow-2xs">
                    <div
                      className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto pointer-events-none"
                      dangerouslySetInnerHTML={{ __html: item.svgCode }}
                    />
                    <span className="absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0.2 rounded-full bg-slate-900/80 backdrop-blur-xs text-slate-200 font-semibold">
                      {item.topic.split(' - ')[0]}
                    </span>
                  </div>

                  {/* Info & Actions */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {item.promptText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80 pt-1.5 mt-0.5">
                    <span>{new Date(item.timestamp).toLocaleDateString('vi-VN')}</span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(item.svgCode);
                          setHistoryCardCopiedId(item.id);
                          setTimeout(() => setHistoryCardCopiedId(null), 2000);
                        }}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Copy mã SVG"
                      >
                        {historyCardCopiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Xóa hình này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadFromHistory(item)}
                        className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Mở</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
        </div>

        {/* TAB 2: Soạn giáo án tự động */}
        <div className={`flex-1 min-h-0 w-full px-4 md:px-6 py-3 overflow-hidden ${mainTab === 'lesson-plan' ? 'flex flex-col' : 'hidden'}`}>
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
