import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let body: { key?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const keyString = body.key?.trim();
    if (!keyString) {
      return NextResponse.json(
        { valid: false, message: 'Vui lòng cung cấp mã License Key.' },
        { status: 400 }
      );
    }

    const keyRecord = await prisma.licenseKey.findUnique({
      where: { key: keyString },
    });

    if (!keyRecord) {
      return NextResponse.json(
        { valid: false, message: 'Mã key không tồn tại.' },
        { status: 404 }
      );
    }

    if (!keyRecord.isActive) {
      return NextResponse.json(
        { valid: false, message: 'Key đã bị vô hiệu hóa.' },
        { status: 403 }
      );
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'Key đã hết hạn sử dụng.' },
        { status: 403 }
      );
    }

    if (keyRecord.totalCredits !== -1 && keyRecord.usedCredits >= keyRecord.totalCredits) {
      return NextResponse.json(
        { valid: false, message: 'Key đã sử dụng hết lượt.' },
        { status: 403 }
      );
    }

    const remaining =
      keyRecord.totalCredits === -1
        ? 'Vô hạn'
        : Math.max(0, keyRecord.totalCredits - keyRecord.usedCredits);

    return NextResponse.json({
      valid: true,
      customerName: keyRecord.customerName,
      totalCredits: keyRecord.totalCredits,
      usedCredits: keyRecord.usedCredits,
      remainingCredits: remaining,
      expiresAt: keyRecord.expiresAt,
    });
  } catch (error: any) {
    console.error('Error checking license key:', error);
    return NextResponse.json(
      { valid: false, message: error?.message || 'Lỗi kiểm tra License Key.' },
      { status: 500 }
    );
  }
}
