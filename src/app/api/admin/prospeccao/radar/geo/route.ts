import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

const STATUS_DECIDIDO = ['fechado', 'perdido'];
const STATUS_ATIVO = ['contatado', 'respondeu', 'handoff', 'esperando_contato_gestor',
  'aguardando_confirmacao_call', 'call_agendado', 'interesse', 'demo_teste',
  'enviar_proposta', 'proposta_enviada'];
const COOLING_DAYS = 7;

function taxa(fechados: number, decididos: number): number {
  if (decididos === 0) return 0;
  return Math.round((fechados / decididos) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const level = req.nextUrl.searchParams.get('level') ?? 'national';
  const uf = req.nextUrl.searchParams.get('uf');

  if (level === 'state' && !uf) {
    return NextResponse.json({ error: 'uf obrigatório para level=state' }, { status: 400 });
  }

  // ── Buscar leads ─────────────────────────────────────────────────────────────
  let leadsQuery = db
    .from('leads')
    .select('id, uf, municipio, status_crm, valor_proposta_mensal, created_at');

  if (level === 'state') leadsQuery = leadsQuery.eq('uf', uf);

  const { data: leads, error: leadsErr } = await leadsQuery;
  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });

  // ── IDs de leads ativos com contato recente (para "esfriando") ───────────────
  const coolingCutoff = new Date(Date.now() - COOLING_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentContacts } = await db
    .from('lead_contacts')
    .select('lead_id')
    .gte('contact_date', coolingCutoff);

  const recentlyContacted = new Set<string>((recentContacts ?? []).map((r: { lead_id: string }) => r.lead_id));

  // ── Funnel (por UF ou nacional) ──────────────────────────────────────────────
  const funnelMap: Record<string, number> = {};
  for (const l of (leads ?? [])) {
    funnelMap[l.status_crm] = (funnelMap[l.status_crm] ?? 0) + 1;
  }

  // ── Agrupamento por UF ou municipio ──────────────────────────────────────────
  type Region = {
    key: string; name: string;
    total_leads: number; novos: number; fechados: number; decididos: number;
    ticket_sum: number; ticket_count: number;
    leads_esfriando: number;
  };

  const regionMap = new Map<string, Region>();

  for (const l of (leads ?? [])) {
    const key: string | null = level === 'national' ? l.uf : l.municipio;
    if (!key) continue;

    if (!regionMap.has(key)) {
      regionMap.set(key, { key, name: key, total_leads: 0, novos: 0, fechados: 0, decididos: 0, ticket_sum: 0, ticket_count: 0, leads_esfriando: 0 });
    }
    const r = regionMap.get(key)!;
    r.total_leads++;

    if (l.status_crm === 'novo') r.novos++;
    if (l.status_crm === 'fechado') r.fechados++;
    if (STATUS_DECIDIDO.includes(l.status_crm)) r.decididos++;

    if (l.valor_proposta_mensal != null) {
      r.ticket_sum += Number(l.valor_proposta_mensal);
      r.ticket_count++;
    }

    const isAtivo = STATUS_ATIVO.includes(l.status_crm);
    const isOldEnough = new Date(l.created_at) < new Date(coolingCutoff);
    if (isAtivo && isOldEnough && !recentlyContacted.has(l.id)) {
      r.leads_esfriando++;
    }
  }

  const regions = [...regionMap.values()].map(r => ({
    key: r.key,
    name: r.name,
    total_leads: r.total_leads,
    novos: r.novos,
    fechados: r.fechados,
    decididos: r.decididos,
    taxa_conversao: taxa(r.fechados, r.decididos),
    ticket_medio: r.ticket_count > 0 ? Math.round((r.ticket_sum / r.ticket_count) * 100) / 100 : null,
    leads_esfriando: r.leads_esfriando,
  }));

  // ── Totais da seleção atual ──────────────────────────────────────────────────
  const total_leads = regions.reduce((s, r) => s + r.total_leads, 0);
  const total_fechados = regions.reduce((s, r) => s + r.fechados, 0);
  const total_decididos = regions.reduce((s, r) => s + r.decididos, 0);
  const ticket_vals = regions.filter(r => r.ticket_medio !== null).map(r => r.ticket_medio as number);
  const ticket_medio = ticket_vals.length > 0
    ? Math.round(ticket_vals.reduce((s, v) => s + v, 0) / ticket_vals.length * 100) / 100
    : null;
  const leads_esfriando = regions.reduce((s, r) => s + r.leads_esfriando, 0);

  return NextResponse.json({
    level,
    uf: uf ?? null,
    regions,
    totals: {
      total_leads,
      taxa_conversao: taxa(total_fechados, total_decididos),
      ticket_medio,
      leads_esfriando,
    },
    funnel: funnelMap,
  });
}
