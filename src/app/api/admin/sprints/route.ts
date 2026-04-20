import { NextResponse } from 'next/server';
import { requireAdmin, requireTaskAccess } from '@/app/api/admin/_utils';
import { getActiveSprintDetail, getSprintDetail } from './_utils';

export async function GET(request: Request) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const history = url.searchParams.get('history') === 'true';

  if (!history) {
    const sprint = await getActiveSprintDetail(auth.supabaseAdmin);
    return NextResponse.json(sprint);
  }

  const { data, error } = await auth.supabaseAdmin
    .from('admin_sprints')
    .select('id')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sprints = await Promise.all(((data ?? []) as any[]).map((row: any) => getSprintDetail(auth.supabaseAdmin, row.id)));
  return NextResponse.json(sprints.filter(Boolean));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const goal = (body.goal ?? '').trim();
  const startDate = (body.start_date ?? '').trim();
  const endDate = (body.end_date ?? '').trim();
  const taskIds = Array.isArray(body.task_ids)
    ? body.task_ids.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  if (!goal) return NextResponse.json({ error: "Campo 'goal' é obrigatório" }, { status: 400 });
  if (!startDate) return NextResponse.json({ error: "Campo 'start_date' é obrigatório" }, { status: 400 });
  if (!endDate) return NextResponse.json({ error: "Campo 'end_date' é obrigatório" }, { status: 400 });
  if (!taskIds.length) return NextResponse.json({ error: 'Selecione ao menos uma task do backlog para a sprint' }, { status: 400 });
  if (endDate < startDate) return NextResponse.json({ error: 'A data final não pode ser anterior à data inicial' }, { status: 400 });

  const { data: sprintId, error } = await (auth.supabaseAdmin as any).rpc('create_admin_sprint', {
    p_goal: goal,
    p_start_date: startDate,
    p_end_date: endDate,
    p_created_by: auth.user.id,
    p_task_ids: taskIds,
  });

  if (error || !sprintId) {
    const message = error?.message ?? 'Falha ao criar sprint';
    const status =
      /obrigatório|anterior|ativa|backlog|selecionadas|encontradas/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const sprint = await getSprintDetail(auth.supabaseAdmin, sprintId);
  return NextResponse.json(sprint, { status: 201 });
}
