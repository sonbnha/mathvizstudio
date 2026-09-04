'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Loader2, Sparkles, Search } from 'lucide-react';
import LatexPreview from '@/components/LatexPreview';

export interface UnifiedInputSubmitData {
  text: string;
  imageFile: File | null;
  base64: string | null;
}

export interface UnifiedInputProps {
  value?: string;
  onChange?: (text: string) => void;
  onSubmit: (data: UnifiedInputSubmitData) => void;
  onOcrExtract?: (base64: string) => Promise<string>;
  isLoading?: boolean;
  imagePreview?: string | null;
  onImageChange?: (base64: string | null, file: File | null) => void;
  placeholder?: string;
  submitButtonText?: string;
}

export const UnifiedProblemInput: React.FC<UnifiedInputProps> = ({
  value,
  onChange,
  onSubmit,
  onOcrExtract,
  isLoading = false,
  imagePreview,
  onImageChange,
  placeholder,
  submitButtonText = 'Tạo hình',
}) => {
  const [internalText, setInternalText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlledText = value !== undefined;
  const currentText = isControlledText ? value : internalText;

  const isControlledImage = imagePreview !== undefined;
  const currentPreviewUrl = isControlledImage ? imagePreview : internalPreviewUrl;

  const handleTextChange = (newText: string) => {
    if (!isControlledText) setInternalText(newText);
    onChange?.(newText);
  };

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(52, Math.min(textareaRef.current.scrollHeight, 180));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [currentText]);

  // Xử lý phím ESC đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    if (isModalOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        if (!isControlledImage) {
          setInternalPreviewUrl(b64);
        }
        onImageChange?.(b64, file);
      };
      reader.readAsDataURL(file);
    },
    [isControlledImage, onImageChange]
  );

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

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

  const handleRemoveImage = () => {
    setImageFile(null);
    if (!isControlledImage) setInternalPreviewUrl(null);
    onImageChange?.(null, null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunOcr = async () => {
    if (!currentPreviewUrl || !onOcrExtract || isOcrLoading) return;
    try {
      setIsOcrLoading(true);
      const extractedText = await onOcrExtract(currentPreviewUrl);
      if (extractedText) {
        const nextText = currentText.trim()
          ? `${currentText.trim()}\n\n${extractedText}`
          : extractedText;
        handleTextChange(nextText);
      }
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSend = () => {
    if (!currentText.trim() && !currentPreviewUrl) return;
    onSubmit({ text: currentText, imageFile, base64: currentPreviewUrl });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full max-w-full rounded-2xl border p-3 shadow-xs box-border flex flex-col gap-2.5 overflow-hidden transition-all ${
        isDragging
          ? 'border-cyan-500 bg-cyan-500/5 ring-2 ring-cyan-500/20'
          : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/50 focus-within:border-cyan-500/60 dark:focus-within:border-cyan-500/50'
      }`}
    >
      {/* 1. Ô nhập Textarea */}
      <textarea
        ref={textareaRef}
        value={currentText}
        onChange={(e) => handleTextChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={
          placeholder ||
          'Nhập đề bài toán, dán ảnh (Ctrl+V) hoặc bấm đính kèm ảnh bên dưới...'
        }
        rows={2}
        className="w-full bg-transparent resize-none border-0 p-0 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-0 outline-none leading-relaxed min-h-[52px]"
      />

      {/* Vùng Xem trước Công thức Toán học LaTeX */}
      <LatexPreview content={currentText} />

      {/* 2. Vùng Thumbnail & Nút OCR (Nằm dưới text) */}
      {currentPreviewUrl && (
        <div className="flex items-center gap-2.5 my-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/40 w-fit">
          <div
            onClick={() => setIsModalOpen(true)}
            className="relative group w-11 h-11 rounded-md overflow-hidden border border-slate-300 dark:border-slate-600 cursor-zoom-in transition-transform hover:scale-105 shrink-0"
            title="Bấm để xem ảnh to hơn"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPreviewUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-white drop-shadow-md" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="absolute top-0.5 right-0.5 z-10 w-3.5 h-3.5 bg-black/70 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] transition"
              title="Xóa ảnh"
            >
              ✕
            </button>
          </div>

          {/* Nút kích hoạt OCR */}
          {onOcrExtract && (
            <button
              type="button"
              onClick={handleRunOcr}
              disabled={isOcrLoading}
              className="py-1 px-2.5 text-[11px] bg-sky-600/10 hover:bg-sky-600/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-wait font-medium"
            >
              {isOcrLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang đọc...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  <span>⚡ Đọc chữ vào khung</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Toolbar đáy */}
      <div className="w-full max-w-full pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 box-border min-w-0">
        {/* Nút Đính kèm: Thu nhỏ padding để không chiếm diện tích */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 px-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          title="Đính kèm ảnh"
        >
          <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Đính kèm</span>
        </button>

        {/* Nút Tạo hình: Rút gọn text thành "Tạo hình" để không bị nở bề ngang, flex-1 chiếm vừa khít phần còn lại */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || (!currentText.trim() && !currentPreviewUrl)}
          className="flex-1 min-w-0 h-9 px-2 flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:opacity-95 text-white text-xs font-semibold shadow-xs hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate">Đang tạo...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{submitButtonText || 'Tạo hình'}</span>
            </>
          )}
        </button>
      </div>

      {/* 4. Lightbox Modal Overlay */}
      {isModalOpen && currentPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-auto h-auto flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Đóng (ESC)</span>
              <span>✕</span>
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPreviewUrl}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-slate-700/60"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedProblemInput;
