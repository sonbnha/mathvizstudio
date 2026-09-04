import { getDb } from './db';

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  try {
    const sql = getDb();

    // 1. Tạo bảng users nếu chưa có
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Tạo bảng saved_diagrams nếu chưa có
    await sql`
      CREATE TABLE IF NOT EXISTS saved_diagrams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        prompt TEXT,
        svg_content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Tạo index cho user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_saved_diagrams_user_id ON saved_diagrams(user_id);
    `;

    initialized = true;
  } catch (error) {
    console.error('⚠️ [Neon DB] Lỗi khởi tạo bảng:', error);
  }
}
