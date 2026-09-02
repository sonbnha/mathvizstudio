import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { CHANGELOG, sortChangelogsList } from '@/config/changelog';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/changelog: Get all changelogs (Admin only)
export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Bạn không có quyền truy cập quản lý Changelog (Chỉ dành cho Admin).' },
      { status: 403 }
    );
  }

  try {
    // Ensure all static initial releases exist in database
    for (const item of [...CHANGELOG].reverse()) {
      try {
        const existing = await prisma.changelog.findUnique({
          where: { version: item.version },
        });
        if (!existing) {
          await prisma.changelog.create({
            data: {
              version: item.version,
              date: item.date,
              title: item.title,
              changes: item.changes,
              isPublished: true,
            },
          });
        }
      } catch {
        // ignore duplicate
      }
    }

    const changelogs = await prisma.changelog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const sorted = sortChangelogsList(changelogs);

    return NextResponse.json({ changelogs: sorted });
  } catch (error: any) {
    console.error('Error fetching admin changelogs:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh sách Changelog.' },
      { status: 500 }
    );
  }
}

// POST /api/admin/changelog: Create a new changelog release
export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Bạn không có quyền thêm mới Changelog (Chỉ dành cho Admin).' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { version, date, title, changes, isPublished = true } = body;

    if (!version?.trim() || !title?.trim() || !date?.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ Phiên bản, Tiêu đề và Ngày áp dụng.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng bổ sung ít nhất 1 mục thay đổi trong phiên bản.' },
        { status: 400 }
      );
    }

    // Check duplicate version
    const existing = await prisma.changelog.findUnique({
      where: { version: version.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Phiên bản "${version.trim()}" đã tồn tại trong hệ thống!` },
        { status: 400 }
      );
    }

    const newChangelog = await prisma.changelog.create({
      data: {
        version: version.trim(),
        date: date.trim(),
        title: title.trim(),
        changes: changes,
        isPublished: Boolean(isPublished),
      },
    });

    try {
      revalidatePath('/api/changelog');
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ success: true, changelog: newChangelog }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating changelog:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo mới phiên bản Changelog.' },
      { status: 500 }
    );
  }
}
