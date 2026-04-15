import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getSprintDetail } from '../../_utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { sprintId } = await params;
  const body = await request.json();
  const development = (body.development ?? '').trim();
  const positives = (body.positives ?? '').trim();
  const negatives = (body.negatives ?? '').trim();
  const finalSummary = (body.final_summary ?? '').trim();

  if (!development) return NextResponse.json({ error: "Campo 'development' é obrigatório" }, { status: 400 });
  if (!positives) return NextResponse.json({ error: "Campo 'positives' é obrigatório" }, { status: 400 });
  if (!negatives) return NextResponse.json({ error: "Campo 'negatives' é obrigatório" }, { status: 400 });
  if (!finalSummary) return NextResponse.json({ error: "Campo 'final_summary' é obrigatório" }, { status: 400 });

  const sprint = await getSprintDetail(auth.supabaseAdmin, sprintId);
  if (!sprint) return NextResponse.json({ error: 'Sprint não encontrada' }, { status: 404 });
  const { error } = await (auth.supabaseAdmin as any).rpc('finish_admin_sprint', {
    p_sprint_id: sprintId,
    p_completed_by: auth.user.id,
    p_development: development,
    p_positives: positives,
    p_negatives: negatives,
    p_final_summary: finalSummary,
    p_ai_summary: body.ai_summary?.trim() || null,
  });

  if (error) {
    const message = error.message ?? 'Falha ao finalizar sprint';
    const status =
      /não encontrada/i.test(message) ? 404 :
      /obrigatório|ativas/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const result = await getSprintDetail(auth.supabaseAdmin, sprintId);
  return NextResponse.json(result);
}
