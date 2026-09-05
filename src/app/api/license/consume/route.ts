import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
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
        RETURNING total_credits AS "totalCredits", used_credits AS "usedCredits";
      `;

      if (updatedRows && updatedRows.length > 0) {
        const u = updatedRows[0];
        const rem = u.totalCredits === -1 ? -1 : Math.max(0, u.totalCredits - u.usedCredits);
        return NextResponse.json({
          success: true,
          remainingCredits: rem,
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
