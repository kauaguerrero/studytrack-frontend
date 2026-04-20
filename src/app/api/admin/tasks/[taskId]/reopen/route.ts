import { NextResponse } from 'next/server';
import { getTaskDetail, requireTaskAccess } from '@/app/api/admin/_utils';
import { reopenTask } from '../../_lib/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();
  const targetStatus = String(body.target_status ?? '').trim() as 'in_progress' | 'review' | 'blocked';
  const reason = String(body.reason ?? '').trim();

  if (!['in_progress', 'review', 'blocked'].includes(targetStatus)) {
    return NextResponse.json({ error: 'target_status inválido para reabertura' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: 'Campo reason é obrigatório' }, { status: 400 });
  }

  try {
    await reopenTask(auth.supabaseAdmin, taskId, auth.user.id, {
      target_status: targetStatus,
      reason,
      category: body.category ? String(body.category).trim() : null,
    });

    const task = await getTaskDetail(auth.supabaseAdmin, taskId);
    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao reabrir task' }, { status: 400 });
  }
}
