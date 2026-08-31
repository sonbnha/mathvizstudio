import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // 1. Tạo tài khoản Super Admin chính: sonbnha123
  const sonPasswordHash = await bcrypt.hash('bgaming123', 10);
  const sonAdminUser = await prisma.user.upsert({
    where: { username: 'sonbnha123' },
    update: {
      passwordHash: sonPasswordHash,
      role: 'ADMIN',
      name: 'Super Admin (Son)',
      isActive: true,
      maxCredits: 99999,
    },
    create: {
      username: 'sonbnha123',
      name: 'Super Admin (Son)',
      passwordHash: sonPasswordHash,
      role: 'ADMIN',
      maxCredits: 99999,
      isActive: true,
    },
  });

  // 2. Tài khoản admin phụ
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      username: 'admin',
      name: 'Super Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      maxCredits: 9999,
      isActive: true,
    },
  });

  // 3. Tài khoản Cộng tác viên mẫu (Staff / CTV)
  const staffPasswordHash = await bcrypt.hash('Ctv@123456', 10);
  const staffUser = await prisma.user.upsert({
    where: { username: 'ctv_math' },
    update: {
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      isActive: true,
    },
    create: {
      username: 'ctv_math',
      name: 'CTV Nguyễn Văn Toàn',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      maxCredits: 50,
      isActive: true,
    },
  });

  // 4. Key dùng thử: MV-TRIAL-1234 (10 lượt)
  const trialKey = await prisma.licenseKey.upsert({
    where: { key: 'MV-TRIAL-1234' },
    update: {
      createdById: sonAdminUser.id,
    },
    create: {
      key: 'MV-TRIAL-1234',
      customerName: 'Trial User',
      totalCredits: 10,
      usedCredits: 0,
      isActive: true,
      createdById: sonAdminUser.id,
    },
  });

  // 5. Key VIP: MV-VIP-8899 (không giới hạn lượt: -1, hạn dùng 1 năm)
  const vipKey = await prisma.licenseKey.upsert({
    where: { key: 'MV-VIP-8899' },
    update: {
      createdById: sonAdminUser.id,
    },
    create: {
      key: 'MV-VIP-8899',
      customerName: 'VIP Customer',
      totalCredits: -1,
      usedCredits: 0,
      expiresAt: oneYearFromNow,
      isActive: true,
      createdById: sonAdminUser.id,
    },
  });

  console.log('Seed data successfully executed:');
  console.log('---------------------------------');
  console.log('✅ Super Admin Account: sonbnha123 (Role: ADMIN)');
  console.log('✅ Secondary Admin:     admin      (Role: ADMIN)');
  console.log('✅ Sample CTV Account:  ctv_math   (Role: STAFF)');
  console.log('✅ Sample License Keys: MV-TRIAL-1234, MV-VIP-8899');
  console.log('---------------------------------');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
