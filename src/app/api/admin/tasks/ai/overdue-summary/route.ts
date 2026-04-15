import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrDev } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function GET(_req: NextRequest) {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  const res = await fetch(`${BACKEND}/api/admin/tasks/ai/overdue-summary`, {
    headers: { Authorization: `Bearer ${auth.token}` },
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