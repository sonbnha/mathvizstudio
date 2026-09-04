import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

// DELETE /api/admin/keys/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(req);
  const role = (user?.role || '').toLowerCase();
  if (!user || (role !== 'admin' && role !== 'ctv' && role !== 'staff')) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
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

    // Check ownership if STAFF / CTV
    if (role !== 'admin') {
      const keyRecord = await prisma.licenseKey.findUnique({ where: { id } });
      const cuid = (user as any).cuid;
      const isOwner = keyRecord && (keyRecord.createdById === user.id || (cuid && keyRecord.createdById === cuid));
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
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
