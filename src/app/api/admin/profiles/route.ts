import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const res = await fetch(`${BACKEND}/api/admin/admin-profiles`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro no backend' }, { status: res.status });
  const data = await res.json();
  return NextResponse.json(data);
}
