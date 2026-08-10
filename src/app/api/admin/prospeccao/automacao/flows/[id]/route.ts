import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../../_proxy';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  return proxyToFlask(`/flows/${id}`, auth.token);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyToFlask(`/flows/${id}`, auth.token, { method: 'PUT', body });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  return proxyToFlask(`/flows/${id}`, auth.token, { method: 'DELETE' });
}
