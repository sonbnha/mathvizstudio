import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwtToken } from '@/lib/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Intercept all requests starting with /admin
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const token =
      req.cookies.get('auth_token')?.value ||
      req.cookies.get('mathviz_auth_token')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }

    const payload = await verifyJwtToken(token);
    if (!payload || (payload.role || '').toLowerCase() !== 'admin') {
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

export default middleware;
export const proxy = middleware;
