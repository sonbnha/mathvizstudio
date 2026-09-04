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
      return NextResponse.rewrite(new URL('/404', req.url));
    }

    const payload = await verifyJwtToken(token);
    const role = (payload?.role || '').toLowerCase();
    if (!payload || (role !== 'admin' && role !== 'ctv' && role !== 'staff')) {
      return NextResponse.rewrite(new URL('/404', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

export default middleware;
export const proxy = middleware;
