import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const licenseKey =
      req.headers.get('x-license-key') ||
      req.headers.get('X-License-Key') ||
      (await req.json().catch(() => ({})))?.licenseKey;

    if (!licenseKey || !licenseKey.trim()) {
      return NextResponse.json({ success: true, remainingCredits: -1 });
    }

    const keyRecord = await prisma.licenseKey.findUnique({
      where: { key: licenseKey.trim() },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json({ success: false, message: 'License key không hợp lệ.' }, { status: 403 });
    }

    let remainingCredits = -1;
    if (keyRecord.totalCredits !== -1) {
      if (keyRecord.usedCredits >= keyRecord.totalCredits) {
        return NextResponse.json({ success: false, message: 'License key đã hết lượt sử dụng.' }, { status: 403 });
      }

      const updated = await prisma.licenseKey.update({
        where: { id: keyRecord.id },
        data: { usedCredits: { increment: 1 } },
      });

      remainingCredits = Math.max(0, updated.totalCredits - updated.usedCredits);
    }

    return NextResponse.json({
      success: true,
      remainingCredits,
    });
  } catch (err: any) {
    console.error('Lỗi trừ credit license:', err);
    return NextResponse.json({ success: true, error: err?.message });
  }
}
