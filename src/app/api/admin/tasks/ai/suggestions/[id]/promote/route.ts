import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function POST(
  _req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: { session } } = await auth.supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BACKEND}/api/admin/tasks/ai/suggestions/${id}/promote`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  
  return NextResponse.json(data, { status: res.status });
}