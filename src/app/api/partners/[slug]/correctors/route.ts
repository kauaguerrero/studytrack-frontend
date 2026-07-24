import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }
  if (!requester) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
  }

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isStaff = ['founder', 'associate'].includes(role);
  if (!isAdmin && !isStaff) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!isAdmin && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data: correctors, error } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .eq('organization_id', org.id)
    .in('role', ['founder', 'associate'])
    .order('full_name');

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar corretores.' }, { status: 500 });
  }

  return NextResponse.json(correctors || []);
}
