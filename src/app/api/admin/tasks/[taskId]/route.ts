import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Aguardando a resolução do parâmetro dinâmico
  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro no backend' }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}