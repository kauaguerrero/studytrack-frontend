import { NextRequest, NextResponse } from 'next/server';
import { requireTaskAccess, recordHistory, getTaskDetail } from '@/app/api/admin/_utils';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const newStatus = (body.status ?? '').trim();

  const validStatuses = ['backlog', 'in_progress', 'review', 'done', 'blocked', 'archived'];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json(
      { error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  if (newStatus === 'in_progress') {
    const p = body.progress ?? {};
    if (!p.already_done || !p.currently_doing || !p.remaining) {
      return NextResponse.json(
        { error: 'Campos already_done, currently_doing e remaining são obrigatórios ao mover para in_progress' },
        { status: 400 }
      );
    }
  }

  if (newStatus === 'done') {
    const cr = body.completion_report ?? {};
    if (cr.files_modified_count == null || !cr.files_modified_list || !cr.summary) {
      return NextResponse.json(
        { error: 'Campos files_modified_count, files_modified_list e summary são obrigatórios ao marcar como done' },
        { status: 400 }
      );
    }
  }

  if (newStatus === 'blocked') {
    return NextResponse.json(
      { error: 'Use a rota específica de bloqueio para preservar o contexto operacional.' },
      { status: 400 }
    );
  }

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('status, started_at')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'in_progress') {
    updatePayload.started_at = (current as { started_at?: string | null }).started_at ?? new Date().toISOString();
    updatePayload.last_progress_update_at = new Date().toISOString();
  }
  if (newStatus === 'done') {
    updatePayload.completed_at = new Date().toISOString();
    updatePayload.completed_by = auth.user.id;
  }
  const { error: updateErr } = await db
    .from('admin_tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'status', (current as { status: string }).status, newStatus);

  if (body.progress) {
    const p = body.progress;
    await Promise.all([
      db.from('admin_task_progress').upsert({
        task_id: taskId,
        already_done: p.already_done,
        currently_doing: p.currently_doing,
        remaining: p.remaining,
        updated_at: new Date().toISOString(),
      }),
      p.next_step != null
        ? db.from('admin_tasks').update({ next_step: p.next_step }).eq('id', taskId)
        : Promise.resolve(),
    ]);
  }

  if (body.completion_report) {
    const cr = body.completion_report;
    await db.from('admin_task_completion').upsert({
      task_id: taskId,
      files_modified_count: cr.files_modified_count,
      files_modified_list: cr.files_modified_list ?? [],
      summary: cr.summary,
    });
  }

  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(task);
}
