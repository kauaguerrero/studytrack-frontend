import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

export async function GET(_req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabaseAdmin
    .from('admin_ai_suggestions')
    .select('*')
    .is('dismissed_at', null)
    .is('promoted_to_task_id', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: generate suggestions — keeps calling Flask (Gemini logic lives there)
export async function POST(_req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const res = await fetch(`${BACKEND}/api/admin/tasks/ai/suggestions/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
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
