import { NextResponse } from 'next/server';
import { getTaskDetail, requireTaskAccess } from '@/app/api/admin/_utils';
import { unblockTask } from '../../_lib/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();
  const targetStatus = String(body.target_status ?? '').trim() as 'in_progress' | 'review' | 'done';

  if (!['in_progress', 'review', 'done'].includes(targetStatus)) {
    return NextResponse.json({ error: 'target_status inválido para desbloqueio' }, { status: 400 });
  }

  try {
    await unblockTask(auth.supabaseAdmin, taskId, auth.user.id, {
      target_status: targetStatus,
      resolution_note: body.resolution_note ? String(body.resolution_note).trim() : null,
    });

    const task = await getTaskDetail(auth.supabaseAdmin, taskId);
    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao desbloquear task' }, { status: 400 });
  }
}
