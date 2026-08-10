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
  const { data: messages, error } = await db
    .from('lead_whatsapp_messages')
    .select('id, direction, body, node_id, created_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nodeIds = [...new Set((messages ?? []).map((m: { node_id: string | null }) => m.node_id).filter(Boolean))];
  let nodeTitleById = new Map<string, string>();
  if (nodeIds.length > 0) {
    const { data: nodes } = await db.from('prospeccao_flow_nodes').select('id, title').in('id', nodeIds);
    nodeTitleById = new Map((nodes ?? []).map((n: { id: string; title: string }) => [n.id, n.title]));
  }

  const enriched = (messages ?? []).map((m: { node_id: string | null }) => ({
    ...m,
    node_title: m.node_id ? (nodeTitleById.get(m.node_id) ?? null) : null,
  }));

  return NextResponse.json({ messages: enriched });
}
