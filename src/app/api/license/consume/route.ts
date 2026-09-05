import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // 0. Nếu người dùng đang đăng nhập, trừ trực tiếp remaining_quota trên bảng users của tài khoản
    try {
      const { getCurrentUserFromRequest } = await import('@/lib/auth');
      const currentUser = await getCurrentUserFromRequest(req);
      if (currentUser) {
        const sql = getDb();
        const updatedUsers = await sql`
          UPDATE users
          SET remaining_quota = GREATEST(0, remaining_quota - 1)
          WHERE id = ${currentUser.id}::uuid
          RETURNING remaining_quota, max_quota;
        `;
        if (updatedUsers && updatedUsers.length > 0) {
          const userRem = updatedUsers[0].remaining_quota;
          const userMax = updatedUsers[0].max_quota ?? 10;
          return NextResponse.json({
            success: true,
            remainingCredits: userRem,
            remaining_quota: userRem,
            totalCredits: userMax,
            usedCredits: Math.max(0, userMax - userRem),
          });
        }
      }
    } catch {}

    const rawKey =
      req.headers.get('x-license-key') ||
      req.headers.get('X-License-Key') ||
      (await req.json().catch(() => ({})))?.licenseKey;

    if (!rawKey || !rawKey.trim()) {
      return NextResponse.json({ success: true, remainingCredits: -1, totalCredits: -1, usedCredits: 0 });
    }

    const cleanKey = rawKey.trim().toUpperCase();

    // 1. Thử cập nhật qua Prisma
    try {
      const keyRecord = await prisma.licenseKey.findFirst({
        where: { key: { equals: cleanKey, mode: 'insensitive' } },
      });

      if (keyRecord && keyRecord.isActive) {
        let remainingCredits: number | string = -1;
        let usedCredits = keyRecord.usedCredits;
        if (keyRecord.totalCredits !== -1) {
          if (keyRecord.usedCredits >= keyRecord.totalCredits) {
            return NextResponse.json({ success: false, message: 'License key đã hết lượt sử dụng.' }, { status: 403 });
          }

          const updated = await prisma.licenseKey.update({
            where: { id: keyRecord.id },
            data: { usedCredits: { increment: 1 } },
          });

          usedCredits = updated.usedCredits;
          remainingCredits = Math.max(0, updated.totalCredits - updated.usedCredits);
        }

        return NextResponse.json({
          success: true,
          remainingCredits,
          usedCredits,
          totalCredits: keyRecord.totalCredits,
        });
      }
    } catch {}

    // 2. Thử cập nhật qua Neon DB nếu không tìm thấy trong Prisma
    try {
      const sql = getDb();
      const updatedRows = await sql`
        UPDATE license_keys
        SET used_credits = used_credits + 1
        WHERE UPPER(key) = ${cleanKey} AND is_active = TRUE AND (total_credits = -1 OR used_credits < total_credits)
        RETURNING total_credits AS "totalCredits", used_credits AS "usedCredits", used_by;
      `;

      if (updatedRows && updatedRows.length > 0) {
        const u = updatedRows[0];
        if (u.used_by) {
          await sql`
            UPDATE users
            SET remaining_quota = GREATEST(0, remaining_quota - 1)
            WHERE id = ${u.used_by}::uuid;
          `;
        }
        const rem = u.totalCredits === -1 ? -1 : Math.max(0, u.totalCredits - u.usedCredits);
        return NextResponse.json({
          success: true,
          remainingCredits: rem,
          remaining_quota: rem,
          usedCredits: u.usedCredits,
          totalCredits: u.totalCredits,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, remainingCredits: -1 });
  } catch (err: any) {
    console.error('Lỗi trừ credit license:', err);
    return NextResponse.json({ success: true, error: err?.message });
  }
}
