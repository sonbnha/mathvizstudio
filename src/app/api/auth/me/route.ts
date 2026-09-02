import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.' },
        { status: 401 }
      );
    }

    // Get count of keys created by this user
    const createdKeysCount = await prisma.licenseKey.count({
      where: { createdById: user.id },
    });

    return NextResponse.json({
      user: {
        ...user,
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
