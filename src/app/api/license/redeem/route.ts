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

    // 3. Tìm mã key trong database Neon (Kiểm tra cả bảng LicenseKey và license_keys)
    let keyRows = await sql`
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
        used_at
      FROM "LicenseKey"
      WHERE UPPER(key) = ${cleanKey}
      LIMIT 1
    `;

    if (!keyRows || keyRows.length === 0) {
      keyRows = await sql`
        SELECT 
          id, 
          key, 
          customer_name AS "customerName", 
          total_credits AS "totalCredits", 
          used_credits AS "usedCredits", 
          expires_at AS "expiresAt", 
          is_active AS "isActive", 
          status, 
          used_by, 
          used_at
        FROM license_keys
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
      if (keyRecord.used_by && String(keyRecord.used_by).toLowerCase() === String(currentUser.id).toLowerCase()) {
        const uLimit = typeof keyRecord.totalCredits === 'number' ? keyRecord.totalCredits : -1;
        const uCount = typeof keyRecord.usedCredits === 'number' ? keyRecord.usedCredits : 0;
        const remCredits = uLimit === -1 ? -1 : Math.max(0, uLimit - uCount);
        const expIso = (currentUser.vipExpiresAt || keyRecord.expiresAt)
          ? new Date(currentUser.vipExpiresAt || keyRecord.expiresAt).toISOString()
          : null;

        return NextResponse.json({
          success: true,
          message: 'Mã key này đã được liên kết với tài khoản của bạn.',
          user: {
            id: currentUser.id,
            name: currentUser.name,
            email: (currentUser as any).email || '',
            username: currentUser.username,
            role: currentUser.role,
            isVip: true,
            is_vip: true,
            vipExpiresAt: expIso,
            vip_expires_at: expIso,
            usageLimit: uLimit,
            usage_limit: uLimit,
            usageCount: uCount,
            usage_count: uCount,
            remainingCredits: remCredits,
            remaining_credits: remCredits,
            apiKey: cleanKey,
            api_key: cleanKey,
          },
        });
      }

      return NextResponse.json(
        { error: 'Mã key không hợp lệ hoặc đã được sử dụng.' },
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

    // 5. Tính toán thời hạn VIP
    // Nếu key có expiresAt: gán ngày hết hạn của key (hoặc giữ ngày xa hơn nếu user đang có VIP)
    // Nếu key không có expiresAt: VIP vĩnh viễn (null)
    let newVipExpiresAt: Date | null = null;
    if (keyRecord.expiresAt) {
      const keyExp = new Date(keyRecord.expiresAt);
      if (currentUser.vipExpiresAt) {
        const curExp = new Date(currentUser.vipExpiresAt);
        newVipExpiresAt = keyExp > curExp ? keyExp : curExp;
      } else {
        newVipExpiresAt = keyExp;
      }
    }

    // 6. Cập nhật trạng thái Key: status = 'used', used_by = user.id, used_at = NOW()
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

    try {
      await sql`
        UPDATE license_keys
        SET 
          status = 'used',
          used_by = ${currentUser.id}::uuid,
          used_at = CURRENT_TIMESTAMP
        WHERE UPPER(key) = ${cleanKey}
      `;
    } catch {}

    // 7. Cập nhật người dùng sang VIP trong bảng users (Neon)
    const updatedUsers = await sql`
      UPDATE users
      SET 
        is_vip = TRUE,
        vip_expires_at = ${newVipExpiresAt},
        api_key = ${cleanKey}
      WHERE id = ${currentUser.id}::uuid
      RETURNING id, name, email, username, role, is_vip, vip_expires_at, api_key
    `;

    const updatedUser = updatedUsers && updatedUsers.length > 0 ? updatedUsers[0] : null;

    // 8. Đồng bộ sang bảng User Prisma (nếu có tài khoản tương ứng)
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
          },
        });
      }
    } catch (prismaSyncErr) {
      console.warn('Prisma User VIP sync warning:', prismaSyncErr);
    }

    const uLimit = typeof keyRecord.totalCredits === 'number' ? keyRecord.totalCredits : -1;
    const uCount = typeof keyRecord.usedCredits === 'number' ? keyRecord.usedCredits : 0;
    const remCredits = uLimit === -1 ? -1 : Math.max(0, uLimit - uCount);
    const expIso = newVipExpiresAt ? newVipExpiresAt.toISOString() : null;

    return NextResponse.json({
      success: true,
      message: 'Kích hoạt tài khoản VIP thành công!',
      user: {
        id: updatedUser?.id || currentUser.id,
        name: updatedUser?.name || currentUser.name,
        email: updatedUser?.email || (currentUser as any).email || '',
        username: updatedUser?.username || currentUser.username,
        role: updatedUser?.role || currentUser.role,
        isVip: true,
        is_vip: true,
        vipExpiresAt: expIso,
        vip_expires_at: expIso,
        usageLimit: uLimit,
        usage_limit: uLimit,
        usageCount: uCount,
        usage_count: uCount,
        remainingCredits: remCredits,
        remaining_credits: remCredits,
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
