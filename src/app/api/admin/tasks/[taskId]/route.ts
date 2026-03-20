import { NextResponse } from 'next/server';
import { requireAdmin, recordHistory, getTaskDetail } from '@/app/api/admin/_utils';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  if (!task) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();

  const allowed = new Set(['title', 'scope', 'deadline', 'priority', 'assignee_id']);
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.has(k)) continue;
    if (k === 'priority' && !validPriorities.includes(v as string)) {
      return NextResponse.json({ error: `Prioridade inválida: ${v}` }, { status: 400 });
    }
    updates[k] = v;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
  }

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  // Only persist fields that actually changed
  const toUpdate: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== (current as Record<string, unknown>)[k]) toUpdate[k] = v;
  }

  if (Object.keys(toUpdate).length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (auth.supabaseAdmin as any)
      .from('admin_tasks')
      .update(toUpdate)
      .eq('id', taskId);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await Promise.all(
      Object.entries(toUpdate).map(([field, newVal]) =>
        recordHistory(auth.supabaseAdmin, taskId, auth.user.id, field, (current as Record<string, unknown>)[field], newVal)
      )
    );
  }

  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(task);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (auth.supabaseAdmin as any)
    .from('admin_tasks')
    .update({ status: 'archived' })
    .eq('id', taskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'status', (current as { status: string }).status, 'archived');

  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(task);
}
