import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; callId: string }> };

const ALLOWED_STATUSES = new Set([
  'quer_proposta',
  'sem_interesse',
  'retornar_depois',
  'agendou_videochamada',
]);

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, callId } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: call, error: fetchError } = await db
    .from('lead_calls')
    .select('audio_path')
    .eq('id', callId)
    .eq('lead_id', id)
    .single();

  if (fetchError || !call) {
    return NextResponse.json({ error: 'Ligação não encontrada' }, { status: 404 });
  }

  if (call.audio_path) {
    await db.storage.from('lead-call-recordings').remove([call.audio_path]);
  }

  const { error: deleteError } = await db
    .from('lead_calls')
    .delete()
    .eq('id', callId)
    .eq('lead_id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Erro ao excluir ligação' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, callId } = await params;
  const body = await request.json();

  const postCallStatus = body.post_call_status ?? null;
  if (postCallStatus !== null && !ALLOWED_STATUSES.has(postCallStatus)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data: call, error } = await db
    .from('lead_calls')
    .update({ post_call_status: postCallStatus })
    .eq('id', callId)
    .eq('lead_id', id)
    .select()
    .single();

  if (error || !call) return NextResponse.json({ error: 'Call não encontrado' }, { status: 404 });
  return NextResponse.json({ call });
}
