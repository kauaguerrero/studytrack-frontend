import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

// 1. Tipagem ajustada para receber uma Promise em params
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // 2. Aguardando a resolução dos parâmetros dinâmicos
  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  const { data: { session } } = await auth.supabase.auth.getSession();
  const token = session?.access_token;
  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}/assignee`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 3. Tratamento de erro recomendado (veja a crítica abaixo)
  if (!res.ok) {
     return NextResponse.json({ error: 'Erro no backend' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}