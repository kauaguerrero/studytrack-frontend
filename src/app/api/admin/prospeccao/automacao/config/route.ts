import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../_proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return proxyToFlask('/config', auth.token);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  return proxyToFlask('/config', auth.token, { method: 'PATCH', body });
}
