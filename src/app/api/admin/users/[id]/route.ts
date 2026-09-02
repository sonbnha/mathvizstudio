import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

async function checkAdmin(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  return user;
}

// PUT /api/admin/users/[id]: Update user by route param
export async function PUT(
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
    const { isActive, maxCredits, password, name, role } = body;

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof maxCredits === 'number') updateData.maxCredits = maxCredits;
    if (name) updateData.name = name.trim();
    if (role && (role === 'ADMIN' || role === 'STAFF')) updateData.role = role;
    if (password && password.trim()) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        maxCredits: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Không thể cập nhật thông tin người dùng.' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]: Delete user by route param
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

    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Không thể tự xóa tài khoản của chính bạn.' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa người dùng.' }, { status: 500 });
  }
}
