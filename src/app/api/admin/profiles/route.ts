import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';

  const db = auth.supabaseAdmin as any;

  let query = db
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .order('full_name');

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  } else {
    // Sem search: retorna apenas admins/devs (comportamento original)
    query = query.in('role', ['admin', 'dev']);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
