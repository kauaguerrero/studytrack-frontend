import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { buildTaskIntelligence } from '../../_lib/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;

  try {
    const payload = await buildTaskIntelligence(auth.supabaseAdmin, taskId);
    if (!payload) {
      return NextResponse.json({ error: 'Task não encontrada' }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao gerar inteligência da task' }, { status: 500 });
  }
}
