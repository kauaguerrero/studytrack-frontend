import { NextResponse } from 'next/server';
import { requireTaskAccess, recordHistory } from '@/app/api/admin/_utils';
import { sanitizeTaskUpdateBody } from './_lib/server';

export async function GET(request: Request) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const overdue = url.searchParams.get('overdue') === 'true';
  const assigneeId = url.searchParams.get('assignee_id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = auth.supabaseAdmin
    .from('admin_tasks')
    .select('*, assignee:profiles!admin_tasks_assignee_id_fkey(id, full_name, avatar_url), co_assignee:profiles!admin_tasks_co_assignee_id_fkey(id, full_name, avatar_url)');

  if (status) query = query.eq('status', status);
  if (assigneeId) query = query.or(`assignee_id.eq.${assigneeId},co_assignee_id.eq.${assigneeId}`);
  if (overdue) {
    const now = new Date().toISOString();
    query = query.lt('deadline', now).not('status', 'in', '("done","archived")');
  }
  if (search) query = query.or(`title.ilike.%${search}%,scope.ilike.%${search}%`);

  query = query.order('created_at', { ascending: false });

  const { data: tasks, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!tasks?.length) return NextResponse.json([]);

  // Fetch progress summary for in_progress tasks
  const taskIds = tasks.map((t: { id: string }) => t.id);
  const { data: progData } = await auth.supabaseAdmin
    .from('admin_task_progress')
    .select('task_id, currently_doing')
    .in('task_id', taskIds);

  const progressMap: Record<string, string | null> = {};
  for (const p of progData ?? []) {
    progressMap[(p as { task_id: string }).task_id] = (p as { currently_doing: string | null }).currently_doing;
  }

  const result = tasks.map((t: { id: string }) => ({
    ...t,
    currently_doing: progressMap[(t as { id: string }).id] ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const title = (body.title ?? '').trim();
  const scope = (body.scope ?? '').trim();
  const createdBy = auth.user.id;

  if (!title) return NextResponse.json({ error: "Campo 'title' é obrigatório" }, { status: 400 });
  if (!scope) return NextResponse.json({ error: "Campo 'scope' é obrigatório" }, { status: 400 });

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const priority = validPriorities.includes(body.priority) ? body.priority : 'medium';
  const assigneeIds = Array.isArray(body.assignee_ids)
    ? body.assignee_ids.map((value: unknown) => String(value).trim()).filter(Boolean)
    : [];

  let payload: Record<string, unknown> = { title, scope, created_by: createdBy, status: 'backlog', priority };
  if (assigneeIds.length) {
    payload.assignee_ids = assigneeIds;
    payload.assignee_id = assigneeIds[0] ?? null;
    payload.co_assignee_id = assigneeIds[1] ?? null;
  } else {
    if (body.assignee_id) payload.assignee_id = body.assignee_id;
    if (body.co_assignee_id) payload.co_assignee_id = body.co_assignee_id;
  }
  if (body.deadline) payload.deadline = body.deadline;
  try {
    payload = {
      ...payload,
      ...sanitizeTaskUpdateBody({
        description: body.description ?? null,
        task_type: body.task_type ?? null,
        expected_outcome: body.expected_outcome ?? null,
        target_date: body.target_date ?? null,
      }),
    };
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Payload inválido' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (auth.supabaseAdmin as any)
    .from('admin_tasks')
    .insert(payload)
    .select()
    .single();

  if (error || !inserted) return NextResponse.json({ error: error?.message ?? 'Falha ao inserir task' }, { status: 500 });

  await recordHistory(auth.supabaseAdmin, (inserted as { id: string }).id, createdBy, 'status', null, 'backlog');

  return NextResponse.json(inserted, { status: 201 });
}
