import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const uf          = searchParams.get('uf');
  const status      = searchParams.get('status');
  const has_email   = searchParams.get('has_email') === '1';
  const has_phone   = searchParams.get('has_phone') === '1';
  const search      = searchParams.get('search');
  const temperature = searchParams.get('temperature');
  const tipo        = searchParams.get('tipo');      // 'empresa' | 'pf'
  const max_anos    = searchParams.get('max_anos');  // '10' = últimos 10 anos

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  let query = db
    .from('leads')
    .select('*, lead_contacts(id, channel, contact_date, response, notes, next_action)')
    .order('created_at', { ascending: false });

  if (uf)          query = query.eq('uf', uf);
  if (status)      query = query.eq('status_crm', status);
  if (temperature) query = query.eq('temperature', temperature);
  if (has_email)   query = query.not('email', 'is', null);
  if (has_phone)   query = query.or('telefone1.not.is.null,telefone2.not.is.null');
  if (search) {
    const q = search.replace(/'/g, "''");
    query = query.or(`nome_fantasia.ilike.%${q}%,razao_social.ilike.%${q}%`);
  }
  if (tipo === 'empresa') {
    // Qualquer natureza que não seja Empresário Individual
    query = query.or('codigo_natureza_juridica.neq.2135,codigo_natureza_juridica.is.null');
  } else if (tipo === 'pf') {
    query = query.eq('codigo_natureza_juridica', '2135');
  }
  if (max_anos) {
    const anos = parseInt(max_anos, 10);
    if (!isNaN(anos)) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - anos);
      query = query.gte('data_abertura', cutoff.toISOString().split('T')[0]);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with org data where org_id is present
  const leads: Record<string, unknown>[] = data ?? [];
  const orgIds = [...new Set(leads.filter((l) => l.org_id).map((l) => l.org_id as string))];

  let orgsById = new Map<string, unknown>();
  if (orgIds.length > 0) {
    const { data: orgs } = await db
      .from('organizations')
      .select('id, name, slug, brand_primary')
      .in('id', orgIds);
    for (const org of orgs ?? []) {
      orgsById.set(org.id as string, org);
    }
  }

  // Enrich with WhatsApp automation session (nó atual do fluxo, se houver)
  const leadIds = leads.map((l) => l.id as string);
  let automationByLeadId = new Map<string, { node_title: string | null; session_status: string | null }>();
  if (leadIds.length > 0) {
    const { data: sessions } = await db
      .from('prospeccao_whatsapp_sessions')
      .select('lead_id, status, current_node_id')
      .in('lead_id', leadIds);

    const nodeIds = [...new Set((sessions ?? []).map((s: { current_node_id: string }) => s.current_node_id).filter(Boolean))];
    let nodeTitleById = new Map<string, string>();
    if (nodeIds.length > 0) {
      const { data: nodes } = await db.from('prospeccao_flow_nodes').select('id, title').in('id', nodeIds);
      nodeTitleById = new Map((nodes ?? []).map((n: { id: string; title: string }) => [n.id, n.title]));
    }

    automationByLeadId = new Map(
      (sessions ?? []).map((s: { lead_id: string; status: string; current_node_id: string }) => [
        s.lead_id,
        { node_title: nodeTitleById.get(s.current_node_id) ?? null, session_status: s.status },
      ])
    );
  }

  const enriched = leads.map((l) => ({
    ...l,
    org: l.org_id ? (orgsById.get(l.org_id as string) ?? null) : null,
    automation: automationByLeadId.get(l.id as string) ?? null,
  }));

  return NextResponse.json({ leads: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const razao_social = (body.razao_social as string | undefined)?.trim();
  if (!razao_social) {
    return NextResponse.json({ error: 'razao_social é obrigatória' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const insert: Record<string, unknown> = {
    razao_social,
    nome_fantasia:    body.nome_fantasia || null,
    uf:               body.uf || null,
    municipio:        body.municipio || null,
    telefone1:        body.telefone1 || null,
    email:            body.email || null,
    nome_socio:       body.nome_socio || null,
    status_crm:       body.status_crm ?? 'novo',
    temperature:      body.temperature ?? 'morno',
    source_channel:   body.source_channel || null,
    next_followup_at: body.next_followup_at || null,
    observacoes:      body.observacoes || null,
    created_by:       auth.user.id,
  };

  const { data: lead, error } = await db
    .from('leads')
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lead: { ...lead, lead_contacts: [], automation: null } }, { status: 201 });
}
