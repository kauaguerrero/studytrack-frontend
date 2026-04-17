import { NextResponse } from 'next/server';
import { requireTaskAccess, recordHistory, getTaskDetail } from '@/app/api/admin/_utils';
import { sanitizeTaskUpdateBody } from '../_lib/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
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
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();

  const allowed = new Set([
    'title',
    'scope',
    'deadline',
    'priority',
    'assignee_id',
    'co_assignee_id',
    'description',
    'task_type',
    'expected_outcome',
    'target_date',
    'progress_notes',
    'completed_work',
    'remaining_work',
    'current_blockers',
    'dependency_updates',
    'had_rework',
    'had_scope_deviation',
    'had_delay',
    'delay_reason',
  ]);
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  let updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.has(k)) continue;
    if (k === 'priority' && !validPriorities.includes(v as string)) {
      return NextResponse.json({ error: `Prioridade inválida: ${v}` }, { status: 400 });
    }
    updates[k] = v;
  }

  try {
    updates = sanitizeTaskUpdateBody(updates);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Payload inválido' }, { status: 400 });
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
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const url = new URL(req.url);
  const permanent = ['true', '1', 'yes'].includes(
    url.searchParams.get('permanent')?.toLowerCase() ?? ''
  );

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  if (permanent) {
    const { error: unlinkSprintErr } = await auth.supabaseAdmin
      .from('admin_sprint_tasks')
      .delete()
      .eq('task_id', taskId);

    if (unlinkSprintErr) {
      return NextResponse.json({ error: unlinkSprintErr.message }, { status: 500 });
    }

    const { error: deleteErr } = await auth.supabaseAdmin
      .from('admin_tasks')
      .delete()
      .eq('id', taskId);

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

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
