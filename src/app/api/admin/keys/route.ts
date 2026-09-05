import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';

function generateRandomKey(type: 'VIP' | 'TRIAL' = 'VIP'): string {
  const p1 = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'A');
  const p2 = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'B');
  if (type === 'TRIAL') {
    return `MV-TR-${p1}-${p2}`;
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
    const isStaff = role === 'staff' || role === 'ctv';
    const cuid = (user as any).cuid;
    const whereCondition = isStaff
      ? (cuid
        ? { OR: [{ createdById: user.id }, { createdById: cuid }] }
        : { createdById: user.id })
      : {};

    const keys = await prisma.licenseKey.findMany({
      where: whereCondition,
      include: {
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Truy vấn thông tin người dùng đã kích hoạt key
    const usedByIds = keys.map((k) => k.used_by).filter((id): id is string => Boolean(id));
    const usedByMap: Record<string, { id: string; name: string; email: string; username: string }> = {};

    if (usedByIds.length > 0) {
      try {
        const { getDb } = await import('@/lib/db');
        const sql = getDb();
        const userRows = await sql`
          SELECT id, name, email, username
          FROM users
          WHERE id::text = ANY(${usedByIds})
        `;
        for (const u of userRows) {
          usedByMap[u.id] = {
            id: u.id,
            name: u.name,
            email: u.email,
            username: u.username,
          };
        }
      } catch (e) {
        console.warn('Lỗi query used_by users:', e);
      }
    }

    const enhancedKeys = keys.map((k) => ({
      ...k,
      status: k.status || (k.used_by ? 'used' : 'active'),
      usedBy: k.used_by ? usedByMap[k.used_by] || null : null,
      usedAt: k.used_at,
    }));

    return NextResponse.json({ keys: enhancedKeys, currentUser: user });
  } catch (error: any) {
    console.error('Error fetching keys:', error);
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
      { error: 'Page not found' },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const { customerName, totalCredits = 50, durationDays = 0, customKey, note, keyType = 'VIP' } = body;

    // Fetch fresh user data with key count from database
    const cuid = (currentUser as any).cuid;
    const user = await prisma.user.findFirst({
      where: cuid
        ? { OR: [{ id: currentUser.id }, { id: cuid }] }
        : { id: currentUser.id },
      include: { _count: { select: { keys: true } } },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại hoặc đã bị khóa.' },
        { status: 403 }
      );
    }

    // Check quota for STAFF role (Only block when role is NOT ADMIN AND maxCredits is NOT -1)
    const isCurrentUserAdmin = (currentUser.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'admin';
    if (!isCurrentUserAdmin && user.maxCredits !== -1) {
      const currentCreatedCount = user._count.keys;
      if (currentCreatedCount >= user.maxCredits) {
        return NextResponse.json(
          {
            error: `Bạn đã đạt giới hạn tối đa (${user.maxCredits} key) được cấp! Vui lòng liên hệ Admin để nâng hạn mức.`,
          },
          { status: 403 }
        );
      }
    }

    const effectiveType: 'VIP' | 'TRIAL' = keyType === 'TRIAL' ? 'TRIAL' : 'VIP';

    // Auto generate unique key if not provided
    let keyString = customKey?.trim() ? customKey.trim().toUpperCase() : generateRandomKey(effectiveType);
    
    // Check collision and regenerate if needed
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.licenseKey.findUnique({
        where: { key: keyString },
      });
      if (!existing) break;
      keyString = generateRandomKey(effectiveType);
      attempts++;
    }

    let expiresAt: Date | null = null;
    if (durationDays && Number(durationDays) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
    }

    const defaultName =
      effectiveType === 'TRIAL'
        ? `Trial_${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        : 'Khách hàng';
    const rawCustomerName = customerName?.trim() || defaultName;

    const finalCustomerName = note?.trim()
      ? `${rawCustomerName} (${note.trim()})`
      : rawCustomerName;

    const newKey = await prisma.licenseKey.create({
      data: {
        key: keyString,
        customerName: finalCustomerName,
        totalCredits: Number(totalCredits),
        usedCredits: 0,
        expiresAt,
        isActive: true,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, key: newKey }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating key:', error);
    return NextResponse.json(
      { error: 'Không thể tạo License Key.' },
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
