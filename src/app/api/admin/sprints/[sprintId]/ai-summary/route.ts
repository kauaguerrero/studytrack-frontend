import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getSprintDetail } from '../../_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { sprintId } = await params;
  const sprint = await getSprintDetail(auth.supabaseAdmin, sprintId);
  if (!sprint) return NextResponse.json({ error: 'Sprint não encontrada' }, { status: 404 });

  const res = await fetch(`${BACKEND}/api/admin/tasks/sprints/${sprintId}/ai-summary`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sprint }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: res.status });
}
