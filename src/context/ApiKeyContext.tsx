'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  customApiKey: string;
  isCustomKeyActive: boolean;
  isApiKeyModalOpen: boolean;
  rateLimitNotice: string | null;
  setCustomApiKey: (key: string) => void;
  removeCustomApiKey: () => void;
  openApiKeyModal: (noticeMessage?: string) => void;
  closeApiKeyModal: () => void;
  getApiKeyHeaders: () => Record<string, string>;
  handleRateLimitError: (message?: string) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const STORAGE_KEY_USER_GEMINI = 'user_gemini_api_key';

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customApiKey, setCustomApiKeyState] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_USER_GEMINI);
      if (saved && saved.trim()) {
        setCustomApiKeyState(saved.trim());
      }
    }
  }, []);

  const setCustomApiKey = (key: string) => {
    const clean = key.trim();
    setCustomApiKeyState(clean);
    if (typeof window !== 'undefined') {
      if (clean) {
        localStorage.setItem(STORAGE_KEY_USER_GEMINI, clean);
      } else {
        localStorage.removeItem(STORAGE_KEY_USER_GEMINI);
      }
    }
  };

  const removeCustomApiKey = () => {
    setCustomApiKeyState('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER_GEMINI);
    }
  };

  const openApiKeyModal = (noticeMessage?: string) => {
    if (noticeMessage) {
      setRateLimitNotice(noticeMessage);
    }
    setIsApiKeyModalOpen(true);
  };

  const closeApiKeyModal = () => {
    setIsApiKeyModalOpen(false);
    setRateLimitNotice(null);
  };

  const getApiKeyHeaders = (): Record<string, string> => {
    if (customApiKey && customApiKey.trim()) {
      return { 'x-gemini-api-key': customApiKey.trim() };
    }
    return {};
  };

  const handleRateLimitError = (message?: string) => {
    const defaultMsg =
      message ||
      'Hệ thống đang quá tải lượt gọi AI miễn phí! Vui lòng nhập Gemini API Key cá nhân của bạn để tiếp tục không bị gián đoạn.';
    openApiKeyModal(defaultMsg);
  };

  return (
    <ApiKeyContext.Provider
      value={{
        customApiKey,
        isCustomKeyActive: Boolean(customApiKey && customApiKey.trim()),
        isApiKeyModalOpen,
        rateLimitNotice,
        setCustomApiKey,
        removeCustomApiKey,
        openApiKeyModal,
        closeApiKeyModal,
        getApiKeyHeaders,
        handleRateLimitError,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
