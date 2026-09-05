import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';

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

    const sql = getDb();

    // Check ownership if STAFF / CTV
    if (role !== 'admin') {
      const cuid = (user as any).cuid;
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
