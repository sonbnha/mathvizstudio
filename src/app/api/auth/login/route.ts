import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { initDb } from '@/lib/init-db';

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; username?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const identifier = (body.email || body.username || '').trim();
    const password = body.password || '';

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập email hoặc tên đăng nhập và mật khẩu.' },
        { status: 400 }
      );
    }

    // 1. Kiểm tra trong Neon Database bảng `users` (đăng nhập bằng email)
    try {
      await initDb();
      const sql = getDb();
      const neonUsers = await sql`
        SELECT id, email, password_hash, name, role
        FROM users
        WHERE LOWER(email) = LOWER(${identifier})
        LIMIT 1
      `;

      if (neonUsers && neonUsers.length > 0) {
        const user = neonUsers[0] as any;
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
          const token = signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
          });

          const response = NextResponse.json({
            success: true,
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role || 'user',
            },
          });

          response.cookies.set({
            name: 'mathviz_auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });

          return response;
        }
      }
    } catch (neonErr) {
      console.warn('Neon auth query warning:', neonErr);
    }

    // 2. Tương thích ngược: Kiểm tra trong Prisma User (Admin / CTV)
    try {
      const prismaUser = await prisma.user.findUnique({
        where: { username: identifier },
      });

      if (prismaUser) {
        if (!prismaUser.isActive) {
          return NextResponse.json(
            { error: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.' },
            { status: 403 }
          );
        }

        const isMatch = await bcrypt.compare(password, prismaUser.passwordHash);
        if (isMatch) {
          const token = signToken({
            userId: prismaUser.id,
            username: prismaUser.username,
            name: prismaUser.name,
            role: prismaUser.role,
          });

          const response = NextResponse.json({
            success: true,
            token,
            user: {
              id: prismaUser.id,
              username: prismaUser.username,
              name: prismaUser.name,
              role: prismaUser.role,
              maxCredits: prismaUser.maxCredits,
            },
          });

          response.cookies.set({
            name: 'mathviz_auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });

          return response;
        }
      }
    } catch (prismaErr) {
      console.warn('Prisma auth query warning:', prismaErr);
    }

    return NextResponse.json(
      { error: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi trong quá trình xử lý đăng nhập.' },
      { status: 500 }
    );
  }
}
