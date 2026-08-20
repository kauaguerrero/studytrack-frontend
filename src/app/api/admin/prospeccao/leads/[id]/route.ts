import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data: lead, error } = await db
    .from('leads')
    .select('*, lead_contacts(id, channel, contact_date, response, notes, next_action)')
    .eq('id', id)
    .single();

  if (error || !lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  let org = null;
  if (lead.org_id) {
    const { data: orgData } = await db
      .from('organizations')
      .select('id, name, slug, brand_primary')
      .eq('id', lead.org_id)
      .single();
    org = orgData ?? null;
  }

  const { data: session } = await db
    .from('prospeccao_whatsapp_sessions')
    .select('status, current_node_id')
    .eq('lead_id', id)
    .maybeSingle();

  let automation = null;
  if (session) {
    let nodeTitle: string | null = null;
    if (session.current_node_id) {
      const { data: node } = await db
        .from('prospeccao_flow_nodes')
        .select('title')
        .eq('id', session.current_node_id)
        .single();
      nodeTitle = node?.title ?? null;
    }
    automation = { node_title: nodeTitle, session_status: session.status };
  }

  return NextResponse.json({ lead: { ...lead, org, automation } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();

  const ALLOWED = [
    'status_crm', 'temperature', 'observacoes', 'next_followup_at',
    'cnpj', 'razao_social', 'nome_fantasia', 'nome_socio',
    'uf', 'municipio', 'telefone1', 'telefone2', 'email', 'website',
    'call_outcome', 'call_scheduled_at', 'call_ends_at', 'call_title',
    'call_meet_link', 'call_calendar_event_id', 'valor_proposta_mensal',
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) update[key] = body[key];
  }

  if ('razao_social' in update && !(update.razao_social as string | null)?.trim()) {
    return NextResponse.json({ error: 'razao_social não pode ficar vazia' }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data: lead, error } = await db
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  // Busca lead para cleanup de mock data se necessário
  const { data: lead } = await db
    .from('leads')
    .select('org_id, mock_student_ids')
    .eq('id', id)
    .single();

  if (lead?.org_id) {
    const mockIds: string[] = lead.mock_student_ids ?? [];

    // Deleta mock users via Supabase Admin Auth
    for (const uid of mockIds) {
      await auth.supabaseAdmin.auth.admin.deleteUser(uid).catch(() => null);
    }

    // Remove a org mock (ON DELETE CASCADE cuida dos profiles restantes)
    await db.from('organizations').delete().eq('id', lead.org_id);
  }

  const { error } = await db.from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
