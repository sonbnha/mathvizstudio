import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET_KEY || 'mathviz-secure-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'STAFF' | string;
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

export async function getCurrentUserFromRequest(req: NextRequest) {
  // 1. Try Cookie
  let token = req.cookies.get('mathviz_auth_token')?.value;

  // 2. Try Authorization Bearer Header
  if (!token) {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 3. Fallback to legacy X-Admin-Secret Header for backwards-compatibility or scripts
  const adminSecret = req.headers.get('x-admin-secret') || req.headers.get('X-Admin-Secret');
  if (!token && adminSecret && process.env.ADMIN_SECRET_KEY && adminSecret === process.env.ADMIN_SECRET_KEY) {
    // Find or return default admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });
    if (adminUser) return adminUser;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      maxCredits: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;

  return user;
}
