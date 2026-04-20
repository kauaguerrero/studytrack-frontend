import { NextRequest, NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { listTaskAssignableProfiles } from '@/app/api/admin/tasks/_lib/server';

export async function GET(request: NextRequest) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';

  // Com search: busca qualquer perfil por nome/email (usado no modal B2B founder)
  if (search) {
    const db = auth.supabaseAdmin as any;
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      .order('full_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // Sem search: retorna perfis atribuíveis a tasks (comportamento original)
  try {
    const data = await listTaskAssignableProfiles(auth.supabaseAdmin);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao listar perfis' }, { status: 500 });
  }
}
