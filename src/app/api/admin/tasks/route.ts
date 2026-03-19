import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: { session } } = await auth.supabase.auth.getSession();
  const token = session?.access_token;

  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const res = await fetch(`${BACKEND}/api/admin/tasks${params ? `?${params}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: { session } } = await auth.supabase.auth.getSession();
  const token = session?.access_token;
  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/admin/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
