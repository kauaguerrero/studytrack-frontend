import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../../_proxy';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return proxyToFlask('/manual-queue/dispatch-next', auth.token, { method: 'POST' });
}
