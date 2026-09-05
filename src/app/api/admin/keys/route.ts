import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';

function generateRandomKey(prefix?: string): string {
  const p1 = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'A');
  const p2 = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'B');
  if (prefix && prefix.trim()) {
    const cleanPrefix = prefix.trim().toUpperCase().replace(/-+$/, '');
    return `${cleanPrefix}-${p1}-${p2}`;
  }
  return `MV-VIP-${p1}-${p2}`;
}

// GET: Fetch license keys (Admin or CTV/Staff)
export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const role = (user?.role || '').toLowerCase();
  if (!user || (role !== 'admin' && role !== 'ctv' && role !== 'staff')) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  try {
    const sql = getDb();
    const isStaff = role === 'staff' || role === 'ctv';

    const search = (req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('search') || '').trim().toLowerCase();

    let rows;
    if (isStaff) {
      const cuid = (user as any).cuid;
      rows = await sql`
        SELECT 
          lk.id,
          lk.key,
          lk.key_code,
          lk.total_credits,
          lk.max_usage,
          lk.used_credits,
          lk.duration_days,
          lk.status,
          lk.is_active,
          lk.expires_at,
          lk.created_at,
          lk.created_by,
          lk.used_by,
          lk.used_at,
          creator.id AS creator_id,
          creator.name AS creator_name,
          creator.username AS creator_username,
          creator.role AS creator_role,
          used_user.id AS used_user_id,
          used_user.name AS used_user_name,
          used_user.username AS used_user_username,
          used_user.email AS used_user_email
        FROM license_keys lk
        LEFT JOIN users creator ON creator.id = lk.created_by
        LEFT JOIN users used_user ON used_user.id = lk.used_by
        WHERE lk.created_by = ${user.id}::uuid
           OR (${cuid}::text IS NOT NULL AND creator.cuid = ${cuid})
        ORDER BY lk.created_at DESC;
      `;
    } else {
      rows = await sql`
        SELECT 
          lk.id,
          lk.key,
          lk.key_code,
          lk.total_credits,
          lk.max_usage,
          lk.used_credits,
          lk.duration_days,
          lk.status,
          lk.is_active,
          lk.expires_at,
          lk.created_at,
          lk.created_by,
          lk.used_by,
          lk.used_at,
          creator.id AS creator_id,
          creator.name AS creator_name,
          creator.username AS creator_username,
          creator.role AS creator_role,
          used_user.id AS used_user_id,
          used_user.name AS used_user_name,
          used_user.username AS used_user_username,
          used_user.email AS used_user_email
        FROM license_keys lk
        LEFT JOIN users creator ON creator.id = lk.created_by
        LEFT JOIN users used_user ON used_user.id = lk.used_by
        ORDER BY lk.created_at DESC;
      `;
    }

    let enhancedKeys = rows.map((k: any) => ({
      id: k.id,
      key: k.key || k.key_code,
      keyCode: k.key_code || k.key,
      key_code: k.key_code || k.key,
      customerName: null,
      customer_name: null,
      totalCredits: typeof k.total_credits === 'number' ? k.total_credits : (typeof k.max_usage === 'number' ? k.max_usage : 50),
      total_credits: typeof k.total_credits === 'number' ? k.total_credits : (typeof k.max_usage === 'number' ? k.max_usage : 50),
      maxUsage: typeof k.max_usage === 'number' ? k.max_usage : (typeof k.total_credits === 'number' ? k.total_credits : 100),
      max_usage: typeof k.max_usage === 'number' ? k.max_usage : (typeof k.total_credits === 'number' ? k.total_credits : 100),
      usedCredits: typeof k.used_credits === 'number' ? k.used_credits : 0,
      used_credits: typeof k.used_credits === 'number' ? k.used_credits : 0,
      durationDays: typeof k.duration_days === 'number' ? k.duration_days : 30,
      duration_days: typeof k.duration_days === 'number' ? k.duration_days : 30,
      expiresAt: k.expires_at,
      expires_at: k.expires_at,
      status: k.status || (k.used_by ? 'used' : 'active'),
      isActive: Boolean(k.is_active ?? true),
      is_active: Boolean(k.is_active ?? true),
      createdAt: k.created_at,
      created_at: k.created_at,
      createdById: k.created_by,
      created_by: k.created_by,
      createdBy: k.creator_id ? {
        id: k.creator_id,
        username: k.creator_username,
        name: k.creator_name,
        role: k.creator_role,
      } : null,
      usedBy: k.used_user_id ? {
        id: k.used_user_id,
        name: k.used_user_name,
        username: k.used_user_username,
        email: k.used_user_email,
      } : null,
      used_by: k.used_by,
      usedAt: k.used_at,
      used_at: k.used_at,
    }));

    if (search) {
      enhancedKeys = enhancedKeys.filter((k: any) =>
        k.key.toLowerCase().includes(search) ||
        k.keyCode.toLowerCase().includes(search) ||
        (k.createdBy?.username && k.createdBy.username.toLowerCase().includes(search)) ||
        (k.createdBy?.name && k.createdBy.name.toLowerCase().includes(search)) ||
        (k.usedBy?.username && k.usedBy.username.toLowerCase().includes(search)) ||
        (k.usedBy?.name && k.usedBy.name.toLowerCase().includes(search)) ||
        (k.usedBy?.email && k.usedBy.email.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ keys: enhancedKeys, currentUser: user });
  } catch (error: any) {
    console.error('Lỗi khi tải danh sách License Keys:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh sách License Keys.' },
      { status: 500 }
    );
  }
}

// POST: Create a new license key (Admin or CTV/Staff)
export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUserFromRequest(req);
  const role = (currentUser?.role || '').toLowerCase();
  if (!currentUser || (role !== 'admin' && role !== 'ctv' && role !== 'staff')) {
    return NextResponse.json(
      { error: 'Không tìm thấy phiên đăng nhập hợp lệ' },
      { status: 401 }
    );
  }

  const currentUserId = currentUser.id;
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Không tìm thấy phiên đăng nhập hợp lệ' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      totalCredits,
      total_credits,
      maxUsage,
      max_usage,
      durationDays,
      duration_days,
      customKey,
      keyCode,
      key_code,
      note,
      keyType = 'VIP',
      prefix,
    } = body;

    const sql = getDb();

    // 1. Kiểm tra trạng thái tài khoản người tạo từ DB Neon
    const userRows = await sql`
      SELECT id, username, name, role, key_quota, is_active, status, cuid
      FROM users
      WHERE id = ${currentUserId}::uuid
      LIMIT 1
    `;

    const dbUser: any = userRows && userRows.length > 0 ? userRows[0] : currentUser;
    if (dbUser.is_active === false || dbUser.status === 'banned') {
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại hoặc đã bị khóa.' },
        { status: 403 }
      );
    }

    // 2. Kiểm tra hạn mức tạo key cho vai trò CTV / STAFF
    const isCurrentUserAdmin =
      (currentUser.role || '').toLowerCase() === 'admin' ||
      (dbUser.role || '').toLowerCase() === 'admin';

    const userQuota = typeof dbUser.key_quota === 'number' ? dbUser.key_quota : 50;

    if (!isCurrentUserAdmin && userQuota !== -1) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM license_keys
        WHERE created_by = ${currentUserId}::uuid
      `;
      const currentCreatedCount = countRows[0]?.count || 0;
      if (currentCreatedCount >= userQuota) {
        return NextResponse.json(
          {
            error: `Bạn đã đạt giới hạn tối đa (${userQuota} key) được cấp! Vui lòng liên hệ Admin để nâng hạn mức.`,
          },
          { status: 403 }
        );
      }
    }

    // 3. Chuẩn hóa tham số tạo key (Chỉ tạo key VIP bản quyền chính thức)
    const effectivePrefix = prefix || 'MV-VIP';

    // Số ngày có hiệu lực (30, 90, 365, hoặc 0: vĩnh viễn)
    const days = durationDays !== undefined
      ? Number(durationDays)
      : duration_days !== undefined
      ? Number(duration_days)
      : 30;

    // Hạn mức lượt tạo hình
    const usage = maxUsage !== undefined
      ? Number(maxUsage)
      : max_usage !== undefined
      ? Number(max_usage)
      : totalCredits !== undefined
      ? Number(totalCredits)
      : total_credits !== undefined
      ? Number(total_credits)
      : 100;

    // Tự sinh mã key ngẫu nhiên nếu không truyền mã tùy chỉnh
    const rawCustomKey = customKey || keyCode || key_code;
    let keyString = rawCustomKey?.trim()
      ? rawCustomKey.trim().toUpperCase()
      : generateRandomKey(effectivePrefix);

    // Kiểm tra trùng lặp mã key và tái tạo nếu cần
    let attempts = 0;
    while (attempts < 5) {
      const existing = await sql`
        SELECT id FROM license_keys 
        WHERE UPPER(key) = ${keyString} OR UPPER(key_code) = ${keyString}
        LIMIT 1
      `;
      if (!existing || existing.length === 0) break;
      keyString = generateRandomKey(effectivePrefix);
      attempts++;
    }

    // Tính thời gian hết hạn
    let expiresAt: Date | null = null;
    if (days && days > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // 4. INSERT an toàn vào Neon Postgres bảng license_keys
    const insertedRows = await sql`
      INSERT INTO license_keys (
        key,
        key_code,
        created_by,
        duration_days,
        max_usage,
        total_credits,
        used_credits,
        status,
        expires_at,
        is_active,
        created_at
      )
      VALUES (
        ${keyString},
        ${keyString},
        ${currentUserId}::uuid,
        ${days},
        ${usage},
        ${usage},
        0,
        'active',
        ${expiresAt},
        true,
        CURRENT_TIMESTAMP
      )
      RETURNING *;
    `;

    if (!insertedRows || insertedRows.length === 0) {
      throw new Error('Không nhận được dữ liệu phản hồi từ database sau khi tạo key.');
    }

    const newKeyRow = insertedRows[0];

    // 5. Đồng bộ dự phòng sang bảng LicenseKey (Prisma) nếu có để tránh sai lệch
    try {
      const cuid = dbUser.cuid || (currentUser as any).cuid;
      await sql`
        INSERT INTO "LicenseKey" (
          id, key, "totalCredits", "usedCredits", "expiresAt", "isActive", "createdAt", "createdById", status
        )
        VALUES (
          ${newKeyRow.id}::text,
          ${keyString},
          ${usage},
          0,
          ${expiresAt},
          true,
          CURRENT_TIMESTAMP,
          ${cuid || null},
          'active'
        )
        ON CONFLICT (key) DO UPDATE SET
          "totalCredits" = EXCLUDED."totalCredits",
          "expiresAt" = EXCLUDED."expiresAt",
          status = EXCLUDED.status;
      `;
    } catch (syncErr) {
      console.warn('Prisma LicenseKey sync warning:', syncErr);
    }

    // 6. Định dạng key trả về chuẩn giao diện
    const formattedKey = {
      id: newKeyRow.id,
      key: newKeyRow.key || newKeyRow.key_code,
      keyCode: newKeyRow.key_code || newKeyRow.key,
      key_code: newKeyRow.key_code || newKeyRow.key,
      customerName: null,
      customer_name: null,
      totalCredits: newKeyRow.total_credits,
      total_credits: newKeyRow.total_credits,
      maxUsage: newKeyRow.max_usage,
      max_usage: newKeyRow.max_usage,
      usedCredits: newKeyRow.used_credits,
      used_credits: newKeyRow.used_credits,
      durationDays: newKeyRow.duration_days,
      duration_days: newKeyRow.duration_days,
      expiresAt: newKeyRow.expires_at,
      expires_at: newKeyRow.expires_at,
      status: newKeyRow.status || 'active',
      isActive: Boolean(newKeyRow.is_active ?? true),
      is_active: Boolean(newKeyRow.is_active ?? true),
      createdAt: newKeyRow.created_at,
      created_at: newKeyRow.created_at,
      createdById: newKeyRow.created_by,
      created_by: newKeyRow.created_by,
      createdBy: {
        id: dbUser.id || currentUserId,
        username: dbUser.username || currentUser.username,
        name: dbUser.name || currentUser.name,
        role: dbUser.role || currentUser.role,
      },
      usedBy: null,
      used_by: null,
      usedAt: null,
      used_at: null,
    };

    return NextResponse.json({ success: true, key: formattedKey }, { status: 201 });
  } catch (err: any) {
    console.error('Lỗi khi tạo License Key:', err.message, err.detail);
    return NextResponse.json(
      { error: err.message || 'Lỗi tạo key' },
      { status: 500 }
    );
  }
}

// DELETE: Delete key
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const role = (user?.role || '').toLowerCase();
  if (!user || (role !== 'admin' && role !== 'ctv' && role !== 'staff')) {
    return NextResponse.json(
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Thiếu ID của License Key cần xóa.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Check ownership if STAFF / CTV
    if (role !== 'admin') {
      const keyRows = await sql`
        SELECT id, created_by 
        FROM license_keys 
        WHERE id::text = ${id} OR key = ${id} OR key_code = ${id}
        LIMIT 1
      `;
      if (keyRows.length > 0 && keyRows[0].created_by && keyRows[0].created_by !== user.id) {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        );
      }
    }

    await sql`
      DELETE FROM license_keys 
      WHERE id::text = ${id} OR key = ${id} OR key_code = ${id}
    `;

    try {
      await sql`
        DELETE FROM "LicenseKey" 
        WHERE id = ${id} OR key = ${id}
      `;
    } catch {}

    return NextResponse.json({ success: true, message: 'Đã xóa License Key thành công.' });
  } catch (error: any) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa License Key.' },
      { status: 500 }
    );
  }
}
