import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

// Opções reais (distintas) de UF/canal de origem, e município cascateado por
// UF — alimenta o seletor do modal "Novo fluxo" em vez de campo de texto livre.

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const ufsParam = request.nextUrl.searchParams.get('ufs');
  const ufs = ufsParam ? ufsParam.split(',').map((v) => v.trim()).filter(Boolean) : [];

  const [ufsRes, sourceChannelsRes, municipiosRes] = await Promise.all([
    db.from('leads').select('uf').not('uf', 'is', null),
    db.from('leads').select('source_channel').not('source_channel', 'is', null),
    ufs.length > 0
      ? db.from('leads').select('municipio').not('municipio', 'is', null).in('uf', ufs)
      : Promise.resolve({ data: [] }),
  ]);

  const dedupe = (rows: Record<string, string>[], key: string) =>
    Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();

  return NextResponse.json({
    ufs: dedupe(ufsRes.data ?? [], 'uf'),
    source_channels: dedupe(sourceChannelsRes.data ?? [], 'source_channel'),
    municipios: dedupe(municipiosRes.data ?? [], 'municipio'),
  });
}
