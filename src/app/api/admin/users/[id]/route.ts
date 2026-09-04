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
    const { name, email, role, status, newPassword, password, isActive, is_active } = body;

    await initDb();
    const sql = getDb();

    // 1. Tìm người dùng trong database theo id (UUID hoặc cuid)
    let targetUser: any = null;
    if (isUuid(id)) {
      const rows = await sql`SELECT id, name, email, username, role, status, cuid, password_hash FROM users WHERE id = ${id}::uuid LIMIT 1`;
      if (rows && rows.length > 0) targetUser = rows[0];
    }
    if (!targetUser) {
      const rows = await sql`SELECT id, name, email, username, role, status, cuid, password_hash FROM users WHERE cuid = ${id} OR id::text = ${id} LIMIT 1`;
      if (rows && rows.length > 0) targetUser = rows[0];
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    // 2. Chuẩn hóa các trường cập nhật
    const cleanName = name !== undefined && name !== null && String(name).trim() !== ''
      ? String(name).trim()
      : targetUser.name;

    const cleanEmail = email !== undefined && email !== null && String(email).trim() !== ''
      ? String(email).trim().toLowerCase()
      : targetUser.email;

    // Kiểm tra trùng lặp email nếu email bị thay đổi
    if (cleanEmail && cleanEmail !== targetUser.email) {
      const conflict = await sql`
        SELECT id FROM users 
        WHERE LOWER(email) = ${cleanEmail} AND id != ${targetUser.id}::uuid 
        LIMIT 1
      `;
      if (conflict && conflict.length > 0) {
        return NextResponse.json(
          { error: `Email "${cleanEmail}" đã được sử dụng bởi một tài khoản khác.` },
          { status: 400 }
        );
      }
    }

    // Chuẩn hóa role: 'admin' | 'ctv' | 'user'
    let cleanRole = targetUser.role || 'user';
    if (role !== undefined && role !== null) {
      const r = String(role).trim().toLowerCase();
      if (r === 'admin') cleanRole = 'admin';
      else if (r === 'ctv' || r === 'staff') cleanRole = 'ctv';
      else if (r === 'user') cleanRole = 'user';
    }

    // Chuẩn hóa status: 'active' | 'banned'
    let cleanStatus = targetUser.status || 'active';
    if (status !== undefined && status !== null) {
      const s = String(status).trim().toLowerCase();
      if (s === 'banned' || s === 'blocked' || s === 'inactive') cleanStatus = 'banned';
      else if (s === 'active') cleanStatus = 'active';
    } else if (typeof is_active === 'boolean') {
      cleanStatus = is_active ? 'active' : 'banned';
    } else if (typeof isActive === 'boolean') {
      cleanStatus = isActive ? 'active' : 'banned';
    }

    const isActiveBool = cleanStatus === 'active';

    // Chuẩn hóa password mới (nếu có thì hash bcrypt, để trống thì giữ nguyên password_hash cũ qua COALESCE)
    const rawPass = (newPassword || password || '').toString().trim();
    const passwordHash = rawPass ? await bcrypt.hash(rawPass, 10) : null;

    // 3. Thực thi UPDATE trực tiếp vào bảng users trên Neon Postgres
    // UPDATE users 
    // SET name = $1, email = $2, role = $3, status = $4,
    //     password_hash = COALESCE($5, password_hash)
    // WHERE id = $6
    // RETURNING id, name, email, role, status;
    const updatedRows = await sql`
      UPDATE users 
      SET name = ${cleanName},
          email = ${cleanEmail},
          role = ${cleanRole},
          status = ${cleanStatus},
          is_active = ${isActiveBool},
          password_hash = COALESCE(${passwordHash}, password_hash)
      WHERE id = ${targetUser.id}::uuid
      RETURNING id, name, email, role, status;
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Không thể cập nhật tài khoản.' }, { status: 500 });
    }

    const u = updatedRows[0] as any;

    // Đồng bộ sang Prisma nếu tài khoản có cuid
    if (targetUser.cuid) {
      try {
        const prismaUpdate: any = {
          name: cleanName,
          isActive: isActiveBool,
          role: cleanRole === 'admin' ? 'ADMIN' : 'STAFF',
        };
        if (passwordHash) prismaUpdate.passwordHash = passwordHash;
        await prisma.user.update({ where: { id: targetUser.cuid }, data: prismaUpdate });
      } catch {}
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Cập nhật thông tin tài khoản thành công!',
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          is_active: u.status === 'active',
          isActive: u.status === 'active',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error?.message || 'Không thể cập nhật thông tin người dùng.' },
      { status: 500 }
    );
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
