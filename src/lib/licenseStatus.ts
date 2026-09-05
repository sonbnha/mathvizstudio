export interface LicenseStatusResult {
  isVipActive: boolean;
  isNearExpiry: boolean;
  isExpiredOrDepleted: boolean;
  daysRemaining: number | null; // null = vô hạn
  remainingCredits: number; // -1 = vô hạn
  totalCredits: number; // -1 = vô hạn
  usedCredits: number;
  vipExpiresAt: string | null;
  isAdmin: boolean;
}

export function computeLicenseStatus({
  user,
  guestKey,
  guestLicenseStatus,
}: {
  user?: any | null;
  guestKey?: string;
  guestLicenseStatus?: any | null;
}): LicenseStatusResult {
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  if (isAdmin) {
    return {
      isVipActive: true,
      isNearExpiry: false,
      isExpiredOrDepleted: false,
      daysRemaining: null,
      remainingCredits: -1,
      totalCredits: -1,
      usedCredits: 0,
      vipExpiresAt: null,
      isAdmin: true,
    };
  }

  const now = new Date();

  // 1. Trường hợp người dùng đã đăng nhập (currentUser)
  if (user) {
    const isVipFlag = Boolean(user.isVip || user.is_vip);
    const exp = user.vipExpiresAt || user.vip_expires_at;
    const expDate = exp ? new Date(exp) : null;

    const daysRemaining = expDate
      ? Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    const isVipActive = isVipFlag && (!expDate || expDate > now);

    const limit = typeof user.usage_limit === 'number'
      ? user.usage_limit
      : typeof user.usageLimit === 'number'
      ? user.usageLimit
      : -1;

    const count = typeof user.usage_count === 'number'
      ? user.usage_count
      : typeof user.usageCount === 'number'
      ? user.usageCount
      : 0;

    const remainingCredits = typeof user.remaining_credits === 'number'
      ? user.remaining_credits
      : typeof user.remainingCredits === 'number'
      ? user.remainingCredits
      : (limit === -1 ? -1 : Math.max(0, limit - count));

    // isNearExpiry: isVipActive && ((số ngày còn lại <= 3 && số ngày còn lại > 0) || (số lượt còn lại <= 5 && số lượt còn lại > 0))
    const isNearExpiry = isVipActive && (
      (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0) ||
      (remainingCredits !== -1 && remainingCredits <= 5 && remainingCredits > 0)
    );

    // isExpiredOrDepleted: (!isVipActive) || (số ngày còn lại <= 0) || (số lượt còn lại <= 0)
    const isExpiredOrDepleted = !isVipActive ||
      (daysRemaining !== null && daysRemaining <= 0) ||
      (remainingCredits !== -1 && remainingCredits <= 0);

    return {
      isVipActive,
      isNearExpiry,
      isExpiredOrDepleted,
      daysRemaining,
      remainingCredits,
      totalCredits: limit,
      usedCredits: count,
      vipExpiresAt: exp ? new Date(exp).toISOString() : null,
      isAdmin: false,
    };
  }

  // 2. Trường hợp khách vãng lai (Guest)
  const hasValidGuestKey = Boolean(guestLicenseStatus?.valid && guestKey?.trim());
  const exp = guestLicenseStatus?.expiresAt;
  const expDate = exp ? new Date(exp) : null;

  const daysRemaining = expDate
    ? Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const limit = typeof guestLicenseStatus?.totalCredits === 'number'
    ? guestLicenseStatus.totalCredits
    : (hasValidGuestKey ? 50 : 0);

  const count = typeof guestLicenseStatus?.usedCredits === 'number'
    ? guestLicenseStatus.usedCredits
    : 0;

  const remainingCredits = typeof guestLicenseStatus?.remainingCredits === 'number'
    ? guestLicenseStatus.remainingCredits
    : (limit === -1 ? -1 : (hasValidGuestKey ? Math.max(0, limit - count) : 0));

  const isVipActive = hasValidGuestKey && (!expDate || expDate > now);

  const isNearExpiry = isVipActive && (
    (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0) ||
    (remainingCredits !== -1 && remainingCredits <= 5 && remainingCredits > 0)
  );

  const isExpiredOrDepleted = !isVipActive ||
    (daysRemaining !== null && daysRemaining <= 0) ||
    (remainingCredits !== -1 && remainingCredits <= 0);

  return {
    isVipActive,
    isNearExpiry,
    isExpiredOrDepleted,
    daysRemaining,
    remainingCredits,
    totalCredits: limit,
    usedCredits: count,
    vipExpiresAt: exp ? new Date(exp).toISOString() : null,
    isAdmin: false,
  };
}
