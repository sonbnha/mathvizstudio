import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

// DELETE /api/admin/keys/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role || '').toLowerCase() !== 'admin') {
    return NextResponse.json(
      { error: 'Quyền truy cập bị từ chối. Chỉ Administrator mới có quyền xóa License Key.' },
      { status: 403 }
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
