import { requireAdmin } from '@/app/api/admin/_utils';
import { proxyToFlask } from '../_proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  return proxyToFlask('/handoff', auth.token);
}
