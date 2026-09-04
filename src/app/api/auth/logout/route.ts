import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Đăng xuất thành công.' });
  response.cookies.delete('mathviz_auth_token');
  response.cookies.delete('auth_token');
  return response;
}
