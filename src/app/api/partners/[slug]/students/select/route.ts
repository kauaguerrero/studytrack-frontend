import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  id: string;
  role: string | null;
  organization_id: string | null;
  associate_permissions: { can_import?: boolean } | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function canImport(profile: ProfileRow): boolean {
  const role = String(profile.role || '').toLowerCase();
  if (role === 'admin' || role === 'founder' || role === 'teacher' || role === 'manager' || role === 'secretariat') {
    return true;
  }
  if (role === 'associate') return profile.associate_permissions?.can_import === true;
  return false;
}

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
  const [{ data: org }, { data: profile }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin
      .from('profiles')
      .select('id, role, organization_id, associate_permissions')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  if (!profile || (profile.role !== 'admin' && profile.organization_id !== org.id)) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }
  if (!canImport(profile)) {
    return NextResponse.json({ error: 'Sem permissão para importar redações.' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('organization_id', org.id)
    .eq('role', 'student')
    .or('plan_tier.is.null,plan_tier.neq.b2b_test')
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('email', { ascending: true, nullsFirst: false })
    .limit(2000)
    .returns<StudentRow[]>();

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar alunos.' }, { status: 500 });
  }

  return NextResponse.json({ students: data ?? [] });
}
