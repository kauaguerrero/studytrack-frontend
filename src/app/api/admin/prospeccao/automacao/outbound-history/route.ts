import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../_proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return proxyToFlask(`/outbound-history${request.nextUrl.search}`, auth.token);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  return proxyToFlask('/outbound-history', auth.token, { method: 'DELETE', body });
}
