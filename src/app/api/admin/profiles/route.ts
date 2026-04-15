import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('role', ['admin', 'dev'])
    .order('full_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
