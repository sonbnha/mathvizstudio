import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL is not set in environment.');
  process.exit(1);
}

const sql = neon(url);

export async function runUnifiedMigration() {
  console.log('🚀 [Migration] Bắt đầu hợp nhất schema và dữ liệu trên Neon Postgres...');

  try {
    // 1. Kích hoạt extension pgcrypto
    console.log('📦 1. Kích hoạt extension "pgcrypto"...');
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

    // 2. Tạo bảng users tập trung nếu chưa có
    console.log('👤 2. Khởi tạo/Cập nhật bảng "users"...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        api_key TEXT,
        username VARCHAR(100),
        cuid VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Đảm bảo các cột mở rộng tồn tại nếu bảng đã được tạo trước đó
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS cuid VARCHAR(100);`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`;
    await sql`UPDATE users SET status = 'active' WHERE status IS NULL;`;
    await sql`UPDATE users SET is_active = true WHERE is_active IS NULL;`;

    // 3. Tạo bảng saved_diagrams nếu chưa có
    console.log('🎨 3. Khởi tạo/Cập nhật bảng "saved_diagrams"...');
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
    await sql`CREATE INDEX IF NOT EXISTS idx_saved_diagrams_user_id ON saved_diagrams(user_id);`;

    // 4. Quét dữ liệu Admin/CTV cũ từ bảng "User" (nếu có)
    console.log('🔍 4. Quét dữ liệu tài khoản từ bảng "User"...');
    let oldUsers: any[] = [];
    try {
      oldUsers = await sql.query('SELECT * FROM "User"');
      console.log(`Tìm thấy ${oldUsers.length} tài khoản trong bảng "User" cũ.`);
    } catch (err: any) {
      console.log('Bảng "User" cũ không tồn tại hoặc đã được xử lý:', err.message);
    }

    // 5. Lấy danh sách License Keys để liên kết API Key
    let licenseKeys: any[] = [];
    try {
      licenseKeys = await sql.query('SELECT * FROM "LicenseKey" ORDER BY "createdAt" DESC');
      console.log(`Tìm thấy ${licenseKeys.length} license keys trong bảng "LicenseKey".`);
    } catch (err: any) {
      console.log('Không thể đọc bảng "LicenseKey":', err.message);
    }

    // 6. Hợp nhất từng tài khoản vào bảng users mới
    let migratedCount = 0;
    for (const oldUser of oldUsers) {
      const username = oldUser.username;
      const email = username.includes('@') ? username : `${username}`;
      const passwordHash = oldUser.passwordHash;
      const name = oldUser.name || username;
      const cuid = oldUser.id;
      
      // Chuyển đổi role chuẩn: 'ADMIN' -> 'admin', 'STAFF' -> 'ctv', còn lại -> 'user'
      let role = 'user';
      if ((oldUser.role || '').toUpperCase() === 'ADMIN') role = 'admin';
      else if ((oldUser.role || '').toUpperCase() === 'STAFF') role = 'ctv';

      const isActive = oldUser.isActive !== false;
      const status = isActive ? 'active' : 'banned';

      // Tìm API Key gắn liền với tài khoản (nếu có)
      const userKey = licenseKeys.find((k: any) => k.createdById === cuid);
      const apiKey = userKey ? userKey.key : null;

      // Kiểm tra xem đã có trong bảng users chưa
      const existing = await sql`
        SELECT id FROM users 
        WHERE LOWER(email) = LOWER(${email}) 
           OR (username IS NOT NULL AND LOWER(username) = LOWER(${username}))
           OR (cuid IS NOT NULL AND cuid = ${cuid})
        LIMIT 1;
      `;

      if (existing && existing.length > 0) {
        // Cập nhật thông tin giữ nguyên id
        await sql`
          UPDATE users SET
            email = ${email},
            username = ${username},
            password_hash = ${passwordHash},
            name = ${name},
            role = ${role},
            status = ${status},
            is_active = ${isActive},
            api_key = COALESCE(api_key, ${apiKey}),
            cuid = ${cuid}
          WHERE id = ${existing[0].id};
        `;
        console.log(`  ↻ Đã cập nhật tài khoản [${role.toUpperCase()}]: ${username} (${name})`);
      } else {
        // Thêm mới vào users
        await sql`
          INSERT INTO users (
            id, email, username, password_hash, name, role, status, is_active, api_key, cuid, created_at
          ) VALUES (
            gen_random_uuid(), ${email}, ${username}, ${passwordHash}, ${name}, ${role}, ${status}, ${isActive}, ${apiKey}, ${cuid}, ${oldUser.createdAt || new Date()}
          );
        `;
        console.log(`  + Đã hợp nhất tài khoản mới [${role.toUpperCase()}]: ${username} (${name})`);
      }
      migratedCount++;
    }

    console.log(`\n🎉 Hoàn thành hợp nhất: ${migratedCount} tài khoản đã được đồng bộ vào bảng "users"!`);

    // Kiểm tra lại danh sách users
    const allUsers = await sql`
      SELECT id, email, username, name, role, status, is_active, api_key, cuid, created_at 
      FROM users 
      ORDER BY created_at ASC;
    `;
    console.log('\n📋 Danh sách người dùng hiện tại trong bảng "users":');
    console.table(allUsers.map((u: any) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      api_key: u.api_key,
      cuid: u.cuid,
    })));

  } catch (error) {
    console.error('❌ Lỗi trong quá trình migration:', error);
    throw error;
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate-unified-users.ts')) {
  runUnifiedMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
