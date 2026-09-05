import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'mathviz-secure-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  username?: string;
  email?: string;
  name?: string;
  role: 'ADMIN' | 'STAFF' | 'user' | string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export { verifyJwtToken } from './jwt';

export async function getCurrentUserFromRequest(req: NextRequest) {
  // 1. Try Cookies (support both auth_token and mathviz_auth_token)
  let token = req.cookies.get('auth_token')?.value || req.cookies.get('mathviz_auth_token')?.value;

  // 2. Try Authorization Bearer Header
  if (!token) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  // 3. Try Neon Postgres users table first
  try {
    const { getDb } = await import('./db');
    const sql = getDb();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.userId);
    const rows = isUuid
      ? await sql`
          SELECT id, email, username, name, role, status, is_active, api_key, cuid, key_quota, is_vip, vip_expires_at, remaining_quota, max_quota, created_at
          FROM users
          WHERE id = ${payload.userId}::uuid
        `
      : await sql`
          SELECT id, email, username, name, role, status, is_active, api_key, cuid, key_quota, is_vip, vip_expires_at, remaining_quota, max_quota, created_at
          FROM users
          WHERE cuid = ${payload.userId} OR username = ${payload.userId}
        `;

    if (rows && rows.length > 0) {
      const u = rows[0] as any;
      if (u.status === 'banned' || u.is_active === false) {
        return null;
      }
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: (u.role || 'user').toLowerCase(),
        status: u.status || 'active',
        apiKey: u.api_key,
        cuid: u.cuid,
        keyQuota: u.key_quota,
        isVip: Boolean(u.is_vip),
        vipExpiresAt: u.vip_expires_at,
        remaining_quota: typeof u.remaining_quota === 'number' ? u.remaining_quota : 0,
        remainingQuota: typeof u.remaining_quota === 'number' ? u.remaining_quota : 0,
        max_quota: typeof u.max_quota === 'number' ? u.max_quota : 0,
        maxQuota: typeof u.max_quota === 'number' ? u.max_quota : 0,
        createdAt: u.created_at,
      };
    }
  } catch {
    // Neon query failed or table doesn't have this user, fallback to Prisma
  }

  // 4. Fallback to Prisma User (for Admin / CTV staff)
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        maxCredits: true,
        isVip: true,
        vipExpiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (user && user.isActive) {
      return user;
    }
  } catch {}

  return null;
}
