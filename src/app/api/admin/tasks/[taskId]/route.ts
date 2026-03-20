import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

async function safeJson(res: Response): Promise<{ data: unknown; parseError: boolean }> {
  const text = await res.text();
  try {
    return { data: text ? JSON.parse(text) : {}, parseError: false };
  } catch {
    return { data: null, parseError: true };
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro no backend' }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const { data, parseError } = await safeJson(res);
  if (parseError) return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { taskId } = await params;

  const res = await fetch(`${BACKEND}/api/admin/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  const { data, parseError } = await safeJson(res);
  if (parseError) return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: res.status });
}