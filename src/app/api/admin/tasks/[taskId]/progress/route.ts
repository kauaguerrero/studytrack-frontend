import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Aguardando a resolução do parâmetro dinâmico
  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}/progress`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro no backend' }, { status: res.status });
  
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}