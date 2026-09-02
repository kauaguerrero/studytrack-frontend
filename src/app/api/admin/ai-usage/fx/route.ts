import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getUsdBrl } from '@/lib/fx';

// Cotação USD→BRL isolada: NÃO toca no banco. O card usa isto no botão de
// refresh pra atualizar o câmbio sem re-consultar `ai_usage_logs` (evita egress).
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const fx = await getUsdBrl();
  return NextResponse.json({
    usd_brl: fx.rate,
    usd_brl_source: fx.source,
    usd_brl_updated_at: fx.updated_at,
  });
}
