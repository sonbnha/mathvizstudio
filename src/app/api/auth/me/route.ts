import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.' },
        { status: 401 }
      );
    }

    // 1. Get count of keys created by this user if admin/staff
    let createdKeysCount = 0;
    try {
      const cuid = (user as any).cuid;
      createdKeysCount = await prisma.licenseKey.count({
        where: cuid
          ? { OR: [{ createdById: user.id }, { createdById: cuid }] }
          : { createdById: user.id },
      });
    } catch {}

    // 2. Compute VIP & Quota usage
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isVipFlag = Boolean(user.isVip || (user as any).is_vip);
    let isVip = isAdmin || isVipFlag;
    let vipExpiresAt: string | null = user.vipExpiresAt || (user as any).vip_expires_at || null;
    let usageLimit = isAdmin ? -1 : 0;
    let usageCount = 0;
    let remainingCredits: number | string = isAdmin ? -1 : 0;
    let userApiKey = (user as any).apiKey || (user as any).api_key || null;

    try {
      const sql = getDb();
      // Tìm key gắn với user trong bảng "LicenseKey" hoặc "license_keys"
      let keyRows = await sql`
        SELECT "totalCredits", "usedCredits", "expiresAt", key
        FROM "LicenseKey"
        WHERE used_by = ${user.id}::uuid OR (${userApiKey}::text IS NOT NULL AND key = ${userApiKey})
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      if (!keyRows || keyRows.length === 0) {
        keyRows = await sql`
          SELECT total_credits AS "totalCredits", used_credits AS "usedCredits", expires_at AS "expiresAt", key
          FROM license_keys
          WHERE used_by = ${user.id}::uuid OR (${userApiKey}::text IS NOT NULL AND key = ${userApiKey})
          ORDER BY created_at DESC
          LIMIT 1
        `;
      }

      if (keyRows && keyRows.length > 0) {
        const k = keyRows[0];
        usageLimit = typeof k.totalCredits === 'number' ? k.totalCredits : 0;
        usageCount = typeof k.usedCredits === 'number' ? k.usedCredits : 0;
        if (!vipExpiresAt && k.expiresAt) {
          vipExpiresAt = new Date(k.expiresAt).toISOString();
        }
        if (!userApiKey && k.key) {
          userApiKey = k.key;
        }
        remainingCredits = usageLimit === -1 ? -1 : Math.max(0, usageLimit - usageCount);
        isVip = true;
      } else if (isVip) {
        // Tài khoản được gắn cờ VIP không giới hạn
        usageLimit = -1;
        remainingCredits = -1;
      }
    } catch (dbErr) {
      console.warn('Lỗi truy vấn thông tin key của user:', dbErr);
    }

    // Kiểm tra hết hạn VIP
    const isExpired = Boolean(vipExpiresAt && new Date(vipExpiresAt) <= new Date());
    if (isExpired && !isAdmin) {
      isVip = false;
    }

    return NextResponse.json({
      user: {
        ...user,
        apiKey: userApiKey,
        api_key: userApiKey,
        is_vip: isVip,
        isVip: isVip,
        vip_expires_at: vipExpiresAt,
        vipExpiresAt: vipExpiresAt,
        usage_limit: usageLimit,
        usageLimit: usageLimit,
        usage_count: usageCount,
        usageCount: usageCount,
        remaining_credits: remainingCredits,
        remainingCredits: remainingCredits,
        createdKeysCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin người dùng.' },
      { status: 500 }
    );
  }
}
