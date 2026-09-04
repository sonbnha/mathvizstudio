import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkAdmin(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role || '').toLowerCase() !== 'admin') {
    return null;
  }
  return user;
}

// PUT /api/admin/changelog/[id]: Update changelog details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối (Chỉ dành cho Admin).' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { version, date, title, changes, isPublished } = body;

    const updateData: any = {};
    if (version !== undefined) updateData.version = version.trim();
    if (date !== undefined) updateData.date = date.trim();
    if (title !== undefined) updateData.title = title.trim();
    if (changes !== undefined) updateData.changes = changes;
    if (typeof isPublished === 'boolean') updateData.isPublished = isPublished;

    // Check version uniqueness if changed
    if (updateData.version) {
      const duplicate = await prisma.changelog.findFirst({
        where: {
          version: updateData.version,
          NOT: { id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Phiên bản "${updateData.version}" đã tồn tại trên một bản ghi khác.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.changelog.update({
      where: { id },
      data: updateData,
    });

    try {
      revalidatePath('/api/changelog');
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ success: true, changelog: updated });
  } catch (error: any) {
    console.error('Error updating changelog:', error);
    return NextResponse.json({ error: 'Lỗi khi cập nhật phiên bản Changelog.' }, { status: 500 });
  }
}

// PATCH /api/admin/changelog/[id]: Toggle isPublished status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { isPublished } = body;

    if (typeof isPublished !== 'boolean') {
      return NextResponse.json({ error: 'Thiếu trường isPublished.' }, { status: 400 });
    }

    const updated = await prisma.changelog.update({
      where: { id },
      data: { isPublished },
    });

    try {
      revalidatePath('/api/changelog');
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ success: true, changelog: updated });
  } catch (error: any) {
    console.error('Error patching changelog status:', error);
    return NextResponse.json({ error: 'Lỗi khi đổi trạng thái hiển thị.' }, { status: 500 });
  }
}

// DELETE /api/admin/changelog/[id]: Delete a changelog release
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
  }

  try {
    const { id } = await params;

    await prisma.changelog.delete({
      where: { id },
    });

    try {
      revalidatePath('/api/changelog');
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ success: true, message: 'Đã xóa phiên bản Changelog thành công.' });
  } catch (error: any) {
    console.error('Error deleting changelog:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa phiên bản Changelog.' }, { status: 500 });
  }
}
