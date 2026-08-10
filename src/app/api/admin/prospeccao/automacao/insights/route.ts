import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../_proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  return proxyToFlask(`/insights${limit ? `?limit=${limit}` : ''}`, auth.token);
}
