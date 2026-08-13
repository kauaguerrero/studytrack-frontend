import { NextRequest } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../../../_proxy';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ phone: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { phone } = await params;
  return proxyToFlask(`/handoff/${phone}/assumir`, auth.token, { method: 'POST' });
}
