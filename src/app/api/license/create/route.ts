import { NextRequest } from 'next/server';
import { POST as createKeyPost } from '@/app/api/admin/keys/route';

export async function POST(req: NextRequest) {
  return createKeyPost(req);
}
