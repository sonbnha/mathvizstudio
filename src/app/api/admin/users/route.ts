import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// Middleware check for ADMIN role
async function checkAdmin(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || (user.role || '').toLowerCase() !== 'admin') {
    return null;
  }
  return user;
}

// GET /api/admin/users: List all users (Supports search by email/name, returns saved diagrams count)
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') || '').trim();
  const source = searchParams.get('source');

  // Trường hợp quản lý nhân sự License Key (Prisma)
  if (source === 'staff') {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          maxCredits: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { keys: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, users });
    } catch (error: any) {
      console.error('Error fetching staff users:', error);
      return NextResponse.json({ error: 'Lỗi khi tải danh sách nhân sự.' }, { status: 500 });
    }
  }

  // Mặc định: Lấy danh sách toàn bộ người dùng từ Neon Database
  try {
    await initDb();
    const sql = getDb();

    let rows;
    if (search) {
      const pattern = `%${search}%`;
      rows = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.username,
          u.role, 
          COALESCE(u.status, 'active') AS status,
          COALESCE(u.is_active, true) AS is_active, 
          u.api_key,
          u.cuid,
          u.created_at,
          COALESCE(u.key_quota, 50) AS key_quota,
          COALESCE(u.is_vip, false) AS is_vip,
          u.vip_expires_at,
          COUNT(DISTINCT d.id)::int AS saved_diagrams_count,
          COUNT(DISTINCT lk.id)::int AS created_keys_count
        FROM users u
        LEFT JOIN saved_diagrams d ON d.user_id = u.id
        LEFT JOIN "LicenseKey" lk ON (lk."createdById" = u.id::text OR (u.cuid IS NOT NULL AND lk."createdById" = u.cuid))
        WHERE u.name ILIKE ${pattern} OR u.email ILIKE ${pattern} OR (u.username IS NOT NULL AND u.username ILIKE ${pattern})
        GROUP BY u.id, u.name, u.email, u.username, u.role, u.status, u.is_active, u.api_key, u.cuid, u.created_at, u.key_quota, u.is_vip, u.vip_expires_at
        ORDER BY u.created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.username,
          u.role, 
          COALESCE(u.status, 'active') AS status,
          COALESCE(u.is_active, true) AS is_active, 
          u.api_key,
          u.cuid,
          u.created_at,
          COALESCE(u.key_quota, 50) AS key_quota,
          COALESCE(u.is_vip, false) AS is_vip,
          u.vip_expires_at,
          COUNT(DISTINCT d.id)::int AS saved_diagrams_count,
          COUNT(DISTINCT lk.id)::int AS created_keys_count
        FROM users u
        LEFT JOIN saved_diagrams d ON d.user_id = u.id
        LEFT JOIN "LicenseKey" lk ON (lk."createdById" = u.id::text OR (u.cuid IS NOT NULL AND lk."createdById" = u.cuid))
        GROUP BY u.id, u.name, u.email, u.username, u.role, u.status, u.is_active, u.api_key, u.cuid, u.created_at, u.key_quota, u.is_vip, u.vip_expires_at
        ORDER BY u.created_at DESC
      `;
    }

    const users = rows.map((r: any) => ({
      id: r.id,
      name: r.name || r.username || r.email,
      email: r.email,
      username: r.username || r.email,
      role: r.role || 'user',
      status: r.status || 'active',
      is_active: r.status === 'active',
      isActive: r.status === 'active',
      is_vip: Boolean(r.is_vip),
      isVip: Boolean(r.is_vip),
      vip_expires_at: r.vip_expires_at,
      vipExpiresAt: r.vip_expires_at,
      api_key: r.api_key,
      apiKey: r.api_key,
      cuid: r.cuid,
      created_at: r.created_at,
      createdAt: r.created_at,
      saved_diagrams_count: Number(r.saved_diagrams_count || 0),
      savedDiagramsCount: Number(r.saved_diagrams_count || 0),
      key_quota: r.role === 'admin' ? -1 : Number(r.key_quota ?? 50),
      keyQuota: r.role === 'admin' ? -1 : Number(r.key_quota ?? 50),
      maxCredits: r.role === 'admin' ? -1 : Number(r.key_quota ?? 50),
      _count: {
        keys: Number(r.created_keys_count || 0),
      },
    }));

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching users from Neon:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi khi tải danh sách người dùng.' }, { status: 500 });
  }
}

// POST /api/admin/users: Create new account
export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { email, username, password, name, role = 'user', source = 'neon', maxCredits = 50, key_quota } = body;

    const identifier = (email || username || '').trim().toLowerCase();
    if (!identifier || !password || !name) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ Họ tên, Email/Tên đăng nhập và Mật khẩu.' },
        { status: 400 }
      );
    }

    // 1. Tạo trên Neon
    if (source === 'neon' || identifier.includes('@') || role) {
      await initDb();
      const sql = getDb();

      const cleanUsername = (username || (identifier.includes('@') ? identifier.split('@')[0] : identifier)).trim().toLowerCase();
      const cleanEmail = (email || (identifier.includes('@') ? identifier : `${cleanUsername}@mathviz.local`)).trim().toLowerCase();

      const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${cleanEmail} OR (username IS NOT NULL AND LOWER(username) = ${cleanUsername}) LIMIT 1`;
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: `Tên đăng nhập hoặc Email "${identifier}" đã được đăng ký.` },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const normalizedRole = ['admin', 'ctv', 'user'].includes(role.toLowerCase()) ? role.toLowerCase() : 'user';
      const effectiveKeyQuota = normalizedRole === 'admin'
        ? -1
        : (key_quota !== undefined ? Number(key_quota) : (maxCredits !== undefined ? Number(maxCredits) : 50));

      const inserted = await sql`
        INSERT INTO users (email, username, password_hash, name, role, is_active, key_quota)
        VALUES (${cleanEmail}, ${cleanUsername}, ${passwordHash}, ${name.trim()}, ${normalizedRole}, true, ${effectiveKeyQuota})
        RETURNING id, name, email, username, role, is_active, key_quota, created_at
      `;

      const u = inserted[0] as any;

      try {
        if (normalizedRole === 'admin' || normalizedRole === 'ctv') {
          const prismaRole = normalizedRole === 'admin' ? 'ADMIN' : 'STAFF';
          const pUser = await prisma.user.create({
            data: {
              id: u.id,
              username: cleanUsername,
              passwordHash,
              name: name.trim(),
              role: prismaRole,
              maxCredits: effectiveKeyQuota,
              isActive: true,
            },
          });
          await sql`UPDATE users SET cuid = ${pUser.id} WHERE id = ${u.id}::uuid;`;
        }
      } catch (err) {
        console.error('Prisma user sync notice:', err);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username,
          role: u.role,
          is_active: u.is_active,
          isActive: u.is_active,
          key_quota: u.key_quota,
          keyQuota: u.key_quota,
          maxCredits: u.key_quota,
          created_at: u.created_at,
          createdAt: u.created_at,
          savedDiagramsCount: 0,
        },
      }, { status: 201 });
    }

    // 2. Tạo trên Prisma cho Staff License Key
    const existingPrisma = await prisma.user.findUnique({
      where: { username: identifier },
    });

    if (existingPrisma) {
      return NextResponse.json(
        { error: `Tên đăng nhập "${identifier}" đã tồn tại.` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: identifier,
        passwordHash,
        name: name.trim(),
        role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF',
        maxCredits: role.toUpperCase() === 'ADMIN' ? -1 : (typeof maxCredits === 'number' ? maxCredits : Number(maxCredits) || 50),
        isActive: true,
      },
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

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error?.message || 'Không thể tạo tài khoản người dùng.' }, { status: 500 });
  }
}

// Handler cập nhật
async function handleUpdate(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, isActive, is_active, status, maxCredits, password, name, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng cần cập nhật.' }, { status: 400 });
    }

    if (isUuid(id)) {
      await initDb();
      const sql = getDb();

      if (role) {
        const normalizedRole = role.toLowerCase();
        const validRole = ['admin', 'ctv', 'user'].includes(normalizedRole) ? normalizedRole : 'user';
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

      const rows = await sql`
        SELECT u.id, u.name, u.email, u.role, COALESCE(u.status, 'active') as status,
               COALESCE(u.is_active, true) as is_active, u.created_at,
               COUNT(d.id)::int as saved_diagrams_count
        FROM users u
        LEFT JOIN saved_diagrams d ON d.user_id = u.id
        WHERE u.id = ${id}::uuid
        GROUP BY u.id, u.name, u.email, u.role, u.status, u.is_active, u.created_at
      `;

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
      }

      const u = rows[0] as any;
      return NextResponse.json({
        success: true,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status || 'active',
          is_active: u.status === 'active',
          isActive: u.status === 'active',
          created_at: u.created_at,
          createdAt: u.created_at,
          saved_diagrams_count: Number(u.saved_diagrams_count || 0),
          savedDiagramsCount: Number(u.saved_diagrams_count || 0),
        },
      });
    }

    // Prisma User
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

// PATCH /api/admin/users
export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}

// PUT /api/admin/users
export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

// DELETE /api/admin/users: Delete user by query param ?id=...
export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { error: 'Quyền truy cập bị từ chối. Chỉ Administrator mới có quyền xóa.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng cần xóa.' }, { status: 400 });
    }

    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Không thể tự xóa tài khoản của chính bạn.' },
        { status: 400 }
      );
    }

    const action = searchParams.get('action');
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

    if (isUuid(id)) {
      await initDb();
      const sql = getDb();
      await sql`DELETE FROM users WHERE id = ${id}::uuid`;
      return NextResponse.json({ success: true, message: 'Đã xóa tài khoản người dùng thành công.' });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi khi xóa người dùng.' }, { status: 500 });
  }
}
