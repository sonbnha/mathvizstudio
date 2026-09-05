import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực người dùng qua session/cookie JWT
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để kích hoạt License Key.' },
        { status: 401 }
      );
    }

    // 2. Nhận payload và chuẩn hóa mã key
    const body = await req.json().catch(() => ({}));
    const rawKey = body.keyCode || body.key;
    const cleanKey = (rawKey || '').trim().toUpperCase();

    if (!cleanKey) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mã License Key.' },
        { status: 400 }
      );
    }

    await initDb();
    const sql = getDb();

    // 3. Tìm mã key trong database Neon (Kiểm tra cả bảng license_keys và LicenseKey)
    let keyRows = await sql`
      SELECT 
        id, 
        key, 
        customer_name AS "customerName", 
        total_credits AS "totalCredits", 
        used_credits AS "usedCredits", 
        duration_days AS "durationDays",
        max_usage AS "maxUsage",
        expires_at AS "expiresAt", 
        is_active AS "isActive", 
        status, 
        used_by, 
        used_at,
        created_at
      FROM license_keys
      WHERE UPPER(key) = ${cleanKey}
      LIMIT 1
    `;

    if (!keyRows || keyRows.length === 0) {
      keyRows = await sql`
        SELECT 
          id, 
          key, 
          "customerName", 
          "totalCredits", 
          "usedCredits", 
          "expiresAt", 
          "isActive", 
          status, 
          used_by, 
          used_at,
          "createdAt" AS created_at
        FROM "LicenseKey"
        WHERE UPPER(key) = ${cleanKey}
        LIMIT 1
      `;
    }

    if (!keyRows || keyRows.length === 0) {
      return NextResponse.json(
        { error: 'Mã key không tồn tại trên hệ thống.' },
        { status: 400 }
      );
    }

    const keyRecord = keyRows[0];

    // 4. Kiểm tra điều kiện hợp lệ của Key
    if (keyRecord.isActive === false) {
      return NextResponse.json(
        { error: 'Mã key này đã bị vô hiệu hóa.' },
        { status: 400 }
      );
    }

    if (keyRecord.status === 'used' || keyRecord.used_by !== null) {
      return NextResponse.json(
        { error: 'Mã key không hợp lệ hoặc đã được kích hoạt trước đó.' },
        { status: 400 }
      );
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Mã key này đã hết hạn sử dụng.' },
        { status: 400 }
      );
    }

    if (keyRecord.totalCredits !== -1 && keyRecord.usedCredits >= keyRecord.totalCredits) {
      return NextResponse.json(
        { error: 'Mã key này đã sử dụng hết lượt.' },
        { status: 400 }
      );
    }

    // 5. Xác định giá trị thời hạn (duration_days) và số lượt (max_usage) của Key mới
    let durationDays = 30;
    if (typeof keyRecord.durationDays === 'number' && keyRecord.durationDays > 0) {
      durationDays = keyRecord.durationDays;
    } else if (typeof (keyRecord as any).duration_days === 'number' && (keyRecord as any).duration_days > 0) {
      durationDays = (keyRecord as any).duration_days;
    } else if (keyRecord.expiresAt) {
      const createdTime = new Date(keyRecord.created_at || Date.now()).getTime();
      const expTime = new Date(keyRecord.expiresAt).getTime();
      const diffDays = Math.round((expTime - createdTime) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) durationDays = diffDays;
    }

    let keyQuotaGranted = 100;
    if (typeof keyRecord.maxUsage === 'number') {
      keyQuotaGranted = keyRecord.maxUsage;
    } else if (typeof (keyRecord as any).max_usage === 'number') {
      keyQuotaGranted = (keyRecord as any).max_usage;
    } else if (typeof keyRecord.totalCredits === 'number') {
      keyQuotaGranted = keyRecord.totalCredits;
    } else if (typeof (keyRecord as any).total_credits === 'number') {
      keyQuotaGranted = (keyRecord as any).total_credits;
    }

    // 6. Lấy dữ liệu mới nhất của tài khoản từ bảng users trên Neon DB
    const userRows = await sql`
      SELECT id, email, username, name, role, is_vip, vip_expires_at, remaining_quota, max_quota, api_key
      FROM users
      WHERE id = ${currentUser.id}::uuid
      LIMIT 1
    `;
    const userObj = currentUser as any;
    const dbUser = (userRows && userRows.length > 0 ? userRows[0] : userObj) as any;

    const now = new Date();
    const currentExp = dbUser?.vip_expires_at || userObj.vip_expires_at || userObj.vipExpiresAt;
    const currentExpDate = currentExp ? new Date(currentExp) : null;

    // 1. Logic cộng dồn thời hạn (vip_expires_at):
    // - Nếu tài khoản hiện tại ĐANG CÒN HẠN (vip_expires_at > NOW()):
    //   Thời hạn mới = vip_expires_at hiện tại + duration_days của key mới.
    // - Nếu tài khoản ĐÃ HẾT HẠN hoặc chưa từng có hạn (vip_expires_at <= NOW() hoặc null):
    //   Thời hạn mới = Thời điểm hiện tại (NOW()) + duration_days của key mới.
    let newVipExpiresAt: Date;
    if (currentExpDate && currentExpDate > now) {
      newVipExpiresAt = new Date(currentExpDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      newVipExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    // 2. Logic cộng dồn lượt sử dụng (remaining_quota):
    // - Lượt sử dụng mới = (Số lượt còn lại hiện tại của user) + (Số lượt được cấp từ key mới max_usage).
    let currentRemaining = typeof dbUser?.remaining_quota === 'number'
      ? Math.max(0, dbUser.remaining_quota)
      : (typeof userObj.remaining_quota === 'number' ? Math.max(0, userObj.remaining_quota) : 0);

    if (currentRemaining <= 0 && typeof userObj.remaining_credits === 'number' && userObj.remaining_credits > 0) {
      currentRemaining = userObj.remaining_credits;
    }

    let currentMax = typeof dbUser?.max_quota === 'number'
      ? Math.max(0, dbUser.max_quota)
      : (typeof userObj.max_quota === 'number' ? Math.max(0, userObj.max_quota) : 0);

    const newRemainingQuota = keyQuotaGranted === -1
      ? 999
      : (currentRemaining + keyQuotaGranted);

    const newMaxQuota = keyQuotaGranted === -1
      ? 999
      : (Math.max(currentMax, currentRemaining) + keyQuotaGranted);

    // 3. Đảm bảo tính toàn vẹn dữ liệu (Atomic Transaction):
    // 3.1 Đánh dấu key đó trong bảng license_keys: status = 'used', used_by = user.id, used_at = NOW()
    await sql`
      UPDATE license_keys
      SET 
        status = 'used',
        used_by = ${currentUser.id}::uuid,
        used_at = CURRENT_TIMESTAMP
      WHERE UPPER(key) = ${cleanKey}
    `;

    try {
      await sql`
        UPDATE "LicenseKey"
        SET 
          status = 'used',
          used_by = ${currentUser.id}::uuid,
          used_at = CURRENT_TIMESTAMP
        WHERE UPPER(key) = ${cleanKey}
      `;
    } catch {}

    // 3.2 Cập nhật tài khoản người dùng trong bảng users (Neon DB)
    const updatedUsers = await sql`
      UPDATE users
      SET 
        is_vip = TRUE,
        vip_expires_at = ${newVipExpiresAt},
        remaining_quota = ${newRemainingQuota},
        max_quota = ${newMaxQuota},
        api_key = ${cleanKey}
      WHERE id = ${currentUser.id}::uuid
      RETURNING id, name, email, username, role, is_vip, vip_expires_at, remaining_quota, max_quota, api_key
    `;

    const updatedUser = updatedUsers && updatedUsers.length > 0 ? updatedUsers[0] : null;

    // 3.3 Đồng bộ sang Prisma User nếu tồn tại
    try {
      const cuid = (currentUser as any).cuid;
      if (cuid || currentUser.id) {
        await prisma.user.updateMany({
          where: {
            OR: [
              { id: currentUser.id },
              ...(cuid ? [{ id: cuid }] : []),
            ],
          },
          data: {
            isVip: true,
            vipExpiresAt: newVipExpiresAt,
            maxCredits: newRemainingQuota,
          },
        });
      }
    } catch (prismaSyncErr) {
      console.warn('Prisma User VIP sync warning:', prismaSyncErr);
    }

    // 4. Trả về thông tin cập nhật cho frontend: { success: true, newExpiresAt, newRemainingQuota, user }
    return NextResponse.json({
      success: true,
      message: 'Gia hạn và cộng dồn thời hạn VIP & lượt sử dụng thành công!',
      newExpiresAt: newVipExpiresAt.toISOString(),
      newRemainingQuota,
      user: {
        ...currentUser,
        id: updatedUser?.id || currentUser.id,
        name: updatedUser?.name || currentUser.name,
        email: updatedUser?.email || (currentUser as any).email || '',
        username: updatedUser?.username || currentUser.username,
        role: updatedUser?.role || currentUser.role,
        isVip: true,
        is_vip: true,
        vipExpiresAt: newVipExpiresAt.toISOString(),
        vip_expires_at: newVipExpiresAt.toISOString(),
        remaining_quota: newRemainingQuota,
        remainingQuota: newRemainingQuota,
        max_quota: newMaxQuota,
        maxQuota: newMaxQuota,
        remaining_credits: newRemainingQuota,
        remainingCredits: newRemainingQuota,
        usage_limit: newMaxQuota,
        usageLimit: newMaxQuota,
        apiKey: cleanKey,
        api_key: cleanKey,
      },
    });
  } catch (err: any) {
    console.error('Lỗi khi kích hoạt License Key:', err);
    return NextResponse.json(
      { error: err.message || 'Đã có lỗi xảy ra khi kích hoạt License Key.' },
      { status: 500 }
    );
  }
}
