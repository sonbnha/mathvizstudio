import { getDb } from './db';

let initialized = false;

export async function initDb(): Promise<void> {
  if (initialized) return;

  try {
    const sql = getDb();

    // 0. Đảm bảo extension pgcrypto
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

    // 1. Tạo bảng users nếu chưa có
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        api_key TEXT,
        username VARCHAR(100),
        cuid VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 1.1 Đảm bảo các cột mở rộng tồn tại nếu bảng đã tạo trước đó
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT;`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS cuid VARCHAR(100);`;
      await sql`UPDATE users SET status = 'active' WHERE status IS NULL;`;
      await sql`UPDATE users SET is_active = true WHERE is_active IS NULL;`;
    } catch {}

    // 1.2 Tự động đồng bộ tài khoản cũ từ bảng "User" (nếu có)
    try {
      const oldUsers = await sql.query('SELECT * FROM "User"');
      for (const oldUser of oldUsers) {
        const username = oldUser.username;
        const email = username.includes('@') ? username : `${username}`;
        const cuid = oldUser.id;
        const role = (oldUser.role || '').toUpperCase() === 'ADMIN' ? 'admin' : ((oldUser.role || '').toUpperCase() === 'STAFF' ? 'ctv' : 'user');
        const isActive = oldUser.isActive !== false;
        const status = isActive ? 'active' : 'banned';

        await sql`
          INSERT INTO users (id, email, username, password_hash, name, role, status, is_active, cuid, created_at)
          VALUES (gen_random_uuid(), ${email}, ${username}, ${oldUser.passwordHash}, ${oldUser.name || username}, ${role}, ${status}, ${isActive}, ${cuid}, ${oldUser.createdAt || new Date()})
          ON CONFLICT (email) DO UPDATE SET
            cuid = EXCLUDED.cuid,
            username = EXCLUDED.username,
            role = EXCLUDED.role;
        `;
      }
    } catch {}

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
