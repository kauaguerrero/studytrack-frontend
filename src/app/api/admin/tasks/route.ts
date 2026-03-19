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

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const res = await fetch(`${BACKEND}/api/admin/tasks${params ? `?${params}` : ''}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  const { data, parseError } = await safeJson(res);
  if (parseError) return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const { data, parseError } = await safeJson(res);
  if (parseError) return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: res.status });
}
