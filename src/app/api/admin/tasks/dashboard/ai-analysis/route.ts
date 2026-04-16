import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const res = await fetch(`${BACKEND}/api/admin/tasks/dashboard/ai-analysis`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do backend' }, { status: 502 });
  }

  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: 200 });
}
