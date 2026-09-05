import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// GET /api/user/collection: Lấy bộ sưu tập riêng biệt của người dùng hiện tại từ Neon DB
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập. Vui lòng đăng nhập để xem bộ sưu tập.' },
        { status: 401 }
      );
    }

    if (!isUuid(user.id)) {
      return NextResponse.json({ success: true, collection: [], diagrams: [], items: [] });
    }

    await initDb();
    const sql = getDb();
    const rows = await sql`
      SELECT id, user_id, title, prompt, svg_content, created_at
      FROM saved_diagrams
      WHERE user_id = ${user.id}::uuid
      ORDER BY created_at DESC
    `;

    const collection = rows.map((r: any) => ({
      id: r.id,
      title: r.title || 'Mô hình hình học',
      prompt: r.prompt || '',
      promptText: r.prompt || '',
      svgContent: r.svg_content,
      svgCode: r.svg_content,
      createdAt: r.created_at,
      timestamp: new Date(r.created_at).getTime() || Date.now(),
    }));

    return NextResponse.json({
      success: true,
      collection,
      diagrams: collection,
      items: collection,
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy bộ sưu tập của user (/api/user/collection):', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi lấy bộ sưu tập.' },
      { status: 500 }
    );
  }
}

// POST /api/user/collection: Thêm hình vẽ vào bộ sưu tập của người dùng
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập. Vui lòng đăng nhập để lưu hình vào bộ sưu tập.' },
        { status: 401 }
      );
    }

    if (!isUuid(user.id)) {
      return NextResponse.json(
        { error: 'Chỉ tài khoản Neon hợp lệ mới hỗ trợ lưu đám mây.' },
        { status: 400 }
      );
    }

    await initDb();
    const sql = getDb();
    const body = await req.json().catch(() => ({}));

    // Trường hợp 1: Batch sync mảng hình
    if (Array.isArray(body.diagrams) || Array.isArray(body.items)) {
      const list = body.diagrams || body.items;
      const savedList = [];
      for (const item of list) {
        const svgContent = item.svgContent || item.svgCode;
        if (!svgContent) continue;
        const title = item.title || 'Hình vẽ toán học';
        const prompt = item.prompt || item.promptText || '';

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
        message: `Đã lưu ${savedList.length} hình vẽ vào bộ sưu tập.`,
        savedCount: savedList.length,
      });
    }

    // Trường hợp 2: Lưu một hình vẽ đơn
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
        promptText: d.prompt,
        svgContent: d.svg_content,
        svgCode: d.svg_content,
        createdAt: d.created_at,
        timestamp: new Date(d.created_at).getTime() || Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi lưu vào bộ sưu tập (/api/user/collection):', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi lưu vào bộ sưu tập.' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/collection: Xóa hình khỏi bộ sưu tập của người dùng
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

    return NextResponse.json({ success: true, message: 'Đã xóa hình vẽ khỏi bộ sưu tập thành công.' });
  } catch (error: any) {
    console.error('Lỗi khi xóa hình khỏi bộ sưu tập (/api/user/collection):', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi server khi xóa hình vẽ.' },
      { status: 500 }
    );
  }
}
