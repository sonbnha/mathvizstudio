import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

async function checkAdmin(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role || '').toLowerCase() !== 'admin') {
    return null;
  }
  return user;
}

// Handler chung cho cả PATCH và PUT
async function handleUpdateUser(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Quyền truy cập bị từ chối. Chỉ Administrator mới có quyền cập nhật.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { isActive, is_active, status, maxCredits, password, name, role } = body;

    // 1. Nếu là tài khoản Neon Database (UUID)
    if (isUuid(id)) {
      await initDb();
      const sql = getDb();

      if (role) {
        const normalizedRole = role.toLowerCase();
        const validRole = ['admin', 'ctv', 'user'].includes(normalizedRole)
          ? normalizedRole
          : 'user';
        await sql`UPDATE users SET role = ${validRole} WHERE id = ${id}::uuid`;
      }

      let normalizedStatus: string | undefined = undefined;
      if (status && (status === 'active' || status === 'banned')) {
        normalizedStatus = status;
      } else if (typeof is_active === 'boolean') {
        normalizedStatus = is_active ? 'active' : 'banned';
      } else if (typeof isActive === 'boolean') {
        normalizedStatus = isActive ? 'active' : 'banned';
      }

      if (normalizedStatus) {
        const activeBool = normalizedStatus === 'active';
        await sql`UPDATE users SET status = ${normalizedStatus}, is_active = ${activeBool} WHERE id = ${id}::uuid`;
      }

      if (password && password.trim()) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}::uuid`;
      }

      if (name && name.trim()) {
        await sql`UPDATE users SET name = ${name.trim()} WHERE id = ${id}::uuid`;
      }

      if (body.apiKey !== undefined || body.api_key !== undefined) {
        const newKey = (body.apiKey || body.api_key || '').trim() || null;
        await sql`UPDATE users SET api_key = ${newKey} WHERE id = ${id}::uuid`;
      }

      const rows = await sql`
        SELECT u.id, u.name, u.email, u.username, u.role, COALESCE(u.status, 'active') as status,
               COALESCE(u.is_active, true) as is_active, u.api_key, u.cuid, u.created_at,
               COUNT(d.id)::int as saved_diagrams_count
        FROM users u
        LEFT JOIN saved_diagrams d ON d.user_id = u.id
        WHERE u.id = ${id}::uuid
        GROUP BY u.id, u.name, u.email, u.username, u.role, u.status, u.is_active, u.api_key, u.cuid, u.created_at
      `;

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
      }

      const u = rows[0] as any;

      // Sync Prisma if user has cuid
      if (u.cuid) {
        try {
          const prismaUpdate: any = {};
          if (role) prismaUpdate.role = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF';
          if (normalizedStatus) prismaUpdate.isActive = normalizedStatus === 'active';
          if (name) prismaUpdate.name = name.trim();
          if (password && password.trim()) prismaUpdate.passwordHash = await bcrypt.hash(password.trim(), 10);
          if (Object.keys(prismaUpdate).length > 0) {
            await prisma.user.update({ where: { id: u.cuid }, data: prismaUpdate });
          }
        } catch {}
      }

      return NextResponse.json({
        success: true,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username || u.email,
          role: u.role,
          status: u.status || 'active',
          is_active: u.status === 'active',
          isActive: u.status === 'active',
          api_key: u.api_key,
          apiKey: u.api_key,
          cuid: u.cuid,
          created_at: u.created_at,
          createdAt: u.created_at,
          saved_diagrams_count: Number(u.saved_diagrams_count || 0),
          savedDiagramsCount: Number(u.saved_diagrams_count || 0),
        },
      });
    }

    // 2. Tài khoản Prisma Staff / Admin (CUID)
    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof is_active === 'boolean') updateData.isActive = is_active;
    if (typeof maxCredits === 'number') updateData.maxCredits = maxCredits;
    if (name) updateData.name = name.trim();
    if (role && (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'STAFF')) {
      updateData.role = role.toUpperCase();
    }
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
    return NextResponse.json({ error: error?.message || 'Không thể cập nhật thông tin người dùng.' }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateUser(req, context.params);
}

// PUT /api/admin/users/[id]
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateUser(req, context.params);
}

// DELETE /api/admin/users/[id]: Delete user or clear violations
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Quyền truy cập bị từ chối. Chỉ Administrator mới có quyền xóa.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Không thể tự xóa tài khoản của chính bạn.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Hành động: Chỉ xóa toàn bộ hình vẽ vi phạm của người dùng
    if (action === 'clear_diagrams') {
      if (isUuid(id)) {
        await initDb();
        const sql = getDb();
        await sql`DELETE FROM saved_diagrams WHERE user_id = ${id}::uuid`;
        return NextResponse.json({
          success: true,
          message: 'Đã dọn sạch toàn bộ hình vẽ trong bộ sưu tập của người dùng.',
        });
      }
    }

    // 2. Xóa toàn bộ tài khoản
    if (isUuid(id)) {
      await initDb();
      const sql = getDb();
      await sql`DELETE FROM users WHERE id = ${id}::uuid`;
      return NextResponse.json({ success: true, message: 'Đã xóa tài khoản người dùng thành công.' });
    }

    // Tài khoản Prisma
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi khi xóa người dùng.' }, { status: 500 });
  }
}
