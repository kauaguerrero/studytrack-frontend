import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, recordHistory } from '@/app/api/admin/_utils';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: suggestion, error: sugErr } = await auth.supabaseAdmin
    .from('admin_ai_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (sugErr || !suggestion) return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });

  const s = suggestion as { suggestion_title: string; suggestion_scope: string };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (auth.supabaseAdmin as any)
    .from('admin_tasks')
    .insert({
      title: s.suggestion_title,
      scope: s.suggestion_scope,
      created_by: auth.user.id,
      status: 'backlog',
      priority: 'medium',
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'Falha ao criar task' }, { status: 500 });
  }

  const task = inserted as { id: string };
  await recordHistory(auth.supabaseAdmin, task.id, auth.user.id, 'status', null, 'backlog');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (auth.supabaseAdmin as any)
    .from('admin_ai_suggestions')
    .update({ promoted_to_task_id: task.id })
    .eq('id', id);

  return NextResponse.json(inserted, { status: 201 });
}
