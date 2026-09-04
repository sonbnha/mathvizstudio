import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

// DELETE /api/admin/keys/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Thiếu ID của License Key cần xóa.' },
        { status: 400 }
      );
    }

    // Check ownership if STAFF
    if ((user.role || '').toLowerCase() !== 'admin') {
      const keyRecord = await prisma.licenseKey.findUnique({ where: { id } });
      const cuid = (user as any).cuid;
      const isOwner = keyRecord && (keyRecord.createdById === user.id || (cuid && keyRecord.createdById === cuid));
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Bạn không có quyền xóa License Key này.' },
          { status: 403 }
        );
      }
    }

    await prisma.licenseKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa License Key thành công.' });
  } catch (error: any) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa License Key.' },
      { status: 500 }
    );
  }
}
