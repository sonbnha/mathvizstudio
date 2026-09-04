import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// GET: Lấy toàn bộ hình vẽ của user hiện tại
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!isUuid(user.id)) {
      return NextResponse.json({ success: true, diagrams: [] });
    }

    await initDb();
    const sql = getDb();
    const rows = await sql`
      SELECT id, user_id, title, prompt, svg_content, created_at
      FROM saved_diagrams
      WHERE user_id = ${user.id}::uuid
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      diagrams: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        prompt: r.prompt || '',
        svgContent: r.svg_content,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách hình vẽ:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi lấy danh sách hình vẽ.' },
      { status: 500 }
    );
  }
}

// POST: Lưu hình vẽ (hỗ trợ lưu đơn hoặc batch sync mảng hình)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!isUuid(user.id)) {
      return NextResponse.json(
        { error: 'Chỉ tài khoản người dùng Neon mới hỗ trợ lưu đám mây.' },
        { status: 400 }
      );
    }

    await initDb();
    const sql = getDb();
    const body = await req.json().catch(() => ({}));

    // 1. Trường hợp Batch sync mảng hình từ localStorage
    if (Array.isArray(body.diagrams)) {
      const savedList = [];
      for (const item of body.diagrams) {
        const svgContent = item.svgContent || item.svgCode;
        if (!svgContent) continue;
        const title = item.title || 'Hình vẽ toán học';
        const prompt = item.prompt || item.promptText || '';

        // Kiểm tra xem hình đã tồn tại chưa để tránh trùng lặp
        const existing = await sql`
          SELECT id FROM saved_diagrams
          WHERE user_id = ${user.id}::uuid AND svg_content = ${svgContent}
          LIMIT 1
        `;

        if (!existing || existing.length === 0) {
          const inserted = await sql`
            INSERT INTO saved_diagrams (user_id, title, prompt, svg_content)
            VALUES (${user.id}::uuid, ${title}, ${prompt}, ${svgContent})
            RETURNING id, title, prompt, svg_content, created_at
          `;
          if (inserted.length > 0) {
            savedList.push(inserted[0]);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã đồng bộ ${savedList.length} hình vẽ lên Neon.`,
        syncedCount: savedList.length,
      });
    }

    // 2. Trường hợp lưu 1 hình vẽ mới
    const { title, prompt, promptText } = body;
    const svgContent = body.svgContent || body.svgCode;
    if (!svgContent) {
      return NextResponse.json({ error: 'Thiếu dữ liệu svgContent.' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO saved_diagrams (user_id, title, prompt, svg_content)
      VALUES (${user.id}::uuid, ${title || 'Hình không tên'}, ${prompt || promptText || ''}, ${svgContent})
      RETURNING id, title, prompt, svg_content, created_at
    `;

    const d = inserted[0] as any;
    return NextResponse.json({
      success: true,
      diagram: {
        id: d.id,
        title: d.title,
        prompt: d.prompt,
        svgContent: d.svg_content,
        createdAt: d.created_at,
      },
    });
  } catch (error: any) {
    console.error('Lỗi lưu hình vẽ:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi lưu hình vẽ.' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa hình vẽ
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu tham số id.' }, { status: 400 });
    }

    if (!isUuid(user.id) || !isUuid(id)) {
      return NextResponse.json({
        success: true,
        message: 'Bỏ qua xóa vì không phải bản ghi trên Neon.',
      });
    }

    await initDb();
    const sql = getDb();
    await sql`
      DELETE FROM saved_diagrams
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
    `;

    return NextResponse.json({ success: true, message: 'Đã xóa hình vẽ thành công.' });
  } catch (error: any) {
    console.error('Lỗi xóa hình vẽ:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi xóa hình vẽ.' },
      { status: 500 }
    );
  }
}
