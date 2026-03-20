import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, recordHistory, getTaskDetail } from '@/app/api/admin/_utils';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const newStatus = (body.status ?? '').trim();

  const validStatuses = ['backlog', 'in_progress', 'review', 'done', 'archived'];
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
    const { data: existing } = await auth.supabaseAdmin
      .from('admin_task_completion')
      .select('task_id')
      .eq('task_id', taskId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'completion_report é imutável — já existe para esta task' }, { status: 400 });
    }
  }

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { error: updateErr } = await db
    .from('admin_tasks')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'status', (current as { status: string }).status, newStatus);

  if (body.progress) {
    const p = body.progress;
    await db.from('admin_task_progress').upsert({
      task_id: taskId,
      already_done: p.already_done,
      currently_doing: p.currently_doing,
      remaining: p.remaining,
      updated_at: new Date().toISOString(),
    });
  }

  if (body.completion_report) {
    const cr = body.completion_report;
    await db.from('admin_task_completion').insert({
      task_id: taskId,
      files_modified_count: cr.files_modified_count,
      files_modified_list: cr.files_modified_list ?? [],
      summary: cr.summary,
    });
  }

  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(task);
}
