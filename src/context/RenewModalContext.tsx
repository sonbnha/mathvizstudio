'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import RenewLicenseModal from '@/components/RenewLicenseModal';
import { computeLicenseStatus, LicenseStatusResult } from '@/lib/licenseStatus';

interface OpenRenewModalOptions {
  isNearExpiry?: boolean;
  customTitle?: string;
  customDescription?: string;
}

interface RenewModalContextType {
  isOpen: boolean;
  openRenewModal: (opts?: OpenRenewModalOptions) => void;
  closeRenewModal: () => void;
  currentUser: any | null;
  licenseInfo: LicenseStatusResult;
  refreshUser: () => Promise<void>;
}

const defaultLicenseInfo = computeLicenseStatus({});

const RenewModalContext = createContext<RenewModalContextType>({
  isOpen: false,
  openRenewModal: () => {},
  closeRenewModal: () => {},
  currentUser: null,
  licenseInfo: defaultLicenseInfo,
  refreshUser: async () => {},
});

export function RenewModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<OpenRenewModalOptions>({});
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthUpdated = () => {
      fetchCurrentUser();
    };

    const handleOpenRenewModal = (e: Event) => {
      const customEvent = e as CustomEvent<OpenRenewModalOptions>;
      if (customEvent.detail) {
        setModalOptions(customEvent.detail);
      }
      setIsOpen(true);
    };

    window.addEventListener('auth-updated', handleAuthUpdated);
    window.addEventListener('open-renew-modal', handleOpenRenewModal);

    return () => {
      window.removeEventListener('auth-updated', handleAuthUpdated);
      window.removeEventListener('open-renew-modal', handleOpenRenewModal);
    };
  }, [fetchCurrentUser]);

  const openRenewModal = useCallback((opts?: OpenRenewModalOptions) => {
    if (opts) {
      setModalOptions(opts);
    }
    setIsOpen(true);
  }, []);

  const closeRenewModal = useCallback(() => {
    setIsOpen(false);
    setModalOptions({});
  }, []);

  const handleSuccess = useCallback(async (updatedUserOrKey: any) => {
    await fetchCurrentUser();
    window.dispatchEvent(new CustomEvent('auth-updated', { detail: updatedUserOrKey }));
  }, [fetchCurrentUser]);

  // Compute status for current logged-in user
  const licenseInfo = computeLicenseStatus({
    user: currentUser,
  });

  return (
    <RenewModalContext.Provider
      value={{
        isOpen,
        openRenewModal,
        closeRenewModal,
        currentUser,
        licenseInfo,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
      <RenewLicenseModal
        isOpen={isOpen}
        onClose={closeRenewModal}
        currentUser={currentUser}
        onSuccess={handleSuccess}
        isNearExpiry={modalOptions.isNearExpiry ?? licenseInfo.isNearExpiry}
        customTitle={modalOptions.customTitle}
        customDescription={modalOptions.customDescription}
      />
    </RenewModalContext.Provider>
  );
}

export function useRenewModal(): RenewModalContextType {
  const context = useContext(RenewModalContext);
  return context;
}
