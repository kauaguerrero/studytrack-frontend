import { NextResponse } from 'next/server';
import { getTaskDetail, requireTaskAccess } from '@/app/api/admin/_utils';
import { blockTask } from '../../_lib/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();
  const reason = String(body.reason ?? '').trim();

  if (!reason) {
    return NextResponse.json({ error: 'Campo reason é obrigatório' }, { status: 400 });
  }

  try {
    await blockTask(auth.supabaseAdmin, taskId, auth.user.id, {
      reason,
      category: body.category ? String(body.category).trim() : null,
      expected_unblock_date: body.expected_unblock_date ? String(body.expected_unblock_date) : null,
    });

    const task = await getTaskDetail(auth.supabaseAdmin, taskId);
    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao bloquear task' }, { status: 400 });
  }
}
