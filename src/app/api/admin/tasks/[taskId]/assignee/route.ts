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

  const { data: current, error: fetchErr } = await auth.supabaseAdmin
    .from('admin_tasks')
    .select('assignee_id, deadline')
    .eq('id', taskId)
    .single();

  if (fetchErr || !current) return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });

  const cur = current as { assignee_id: string | null; deadline: string | null };
  const updates: Record<string, unknown> = {};

  if (body.assignee_id !== undefined && body.assignee_id !== cur.assignee_id) {
    updates.assignee_id = body.assignee_id;
    await recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'assignee_id', cur.assignee_id, body.assignee_id);
  }
  if (body.deadline !== undefined && body.deadline !== cur.deadline) {
    updates.deadline = body.deadline;
    await recordHistory(auth.supabaseAdmin, taskId, auth.user.id, 'deadline', cur.deadline, body.deadline);
  }

  if (Object.keys(updates).length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (auth.supabaseAdmin as any).from('admin_tasks').update(updates).eq('id', taskId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const task = await getTaskDetail(auth.supabaseAdmin, taskId);
  return NextResponse.json(task);
}
