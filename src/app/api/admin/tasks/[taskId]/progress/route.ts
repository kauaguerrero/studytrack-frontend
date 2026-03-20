import { NextResponse } from 'next/server';
import { requireAdmin, recordHistory, getTaskDetail } from '@/app/api/admin/_utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();

  const alreadyDone = (body.already_done ?? '').trim();
  const currentlyDoing = (body.currently_doing ?? '').trim();
  const remaining = (body.remaining ?? '').trim();

  if (!alreadyDone || !currentlyDoing || !remaining) {
    return NextResponse.json(
      { error: 'Campos already_done, currently_doing e remaining são obrigatórios' },
      { status: 400 }
    );
  }

  const { data: task, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchErr || !task) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  if ((task as { status: string }).status !== 'in_progress') {
    return NextResponse.json(
      { error: 'Atualização de progresso só é permitida para tasks in_progress' },
      { status: 400 }
    );
  }

  const { data: oldProg } = await auth.supabaseAdmin
    .from('admin_task_progress')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (auth.supabaseAdmin as any).from('admin_task_progress').upsert({
    task_id: taskId,
    already_done: alreadyDone,
    currently_doing: currentlyDoing,
    remaining,
    updated_at: new Date().toISOString(),
  });

  const old = oldProg as { currently_doing?: string; remaining?: string } | null;
  const historyPromises = [];
  if (old?.currently_doing !== currentlyDoing) {
    historyPromises.push(recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'currently_doing', old?.currently_doing, currentlyDoing));
  }
  if (old?.remaining !== remaining) {
    historyPromises.push(recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'remaining', old?.remaining, remaining));
  }
  await Promise.all(historyPromises);

  const result = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(result);
}
