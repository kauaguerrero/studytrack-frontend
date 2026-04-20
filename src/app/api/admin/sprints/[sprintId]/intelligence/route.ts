import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { buildTaskDashboardPayload } from '@/app/api/admin/tasks/_lib/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const auth = await requireTaskAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  const { sprintId } = await params;

  try {
    const payload = await buildTaskDashboardPayload(auth.supabaseAdmin);
    const sprintMetrics = payload.metrics.predictability.planned_vs_completed.find((item) => item.sprint_id === sprintId);
    const sprintRisk = payload.metrics.blockers_and_risk.risk_by_sprint.find((item) => item.sprint_id === sprintId);
    const signals = payload.signals.filter((signal) => signal.scope === 'sprint');

    if (!sprintMetrics) {
      return NextResponse.json({ error: 'Sprint não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      generated_at: payload.generated_at,
      sprint_id: sprintId,
      planned_vs_completed: sprintMetrics,
      risk: sprintRisk ?? null,
      signals,
      ai: payload.ai,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao gerar inteligência da sprint' }, { status: 500 });
  }
}
