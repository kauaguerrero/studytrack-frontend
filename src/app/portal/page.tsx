import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types/roles';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Usa adminClient para garantir leitura de organization_id sem bloqueio de RLS
  const adminClient = createAdminClient();
  type ProfileRow = { role: string | null; organization_id: string | null };
  const profileRes = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();
  const profile = profileRes.data as ProfileRow | null;

  const rawRole = profile?.role || user.user_metadata?.role || 'student';
  const roleStr = String(rawRole ?? 'student').trim().toLowerCase();

  // Founder: redireciona para o portal do parceiro
  if (roleStr === 'founder') {
    if (profile?.organization_id) {
      const orgRes = await adminClient
        .from('organizations')
        .select('slug')
        .eq('id', profile.organization_id)
        .single();
      const org = orgRes.data as { slug: string } | null;
      if (org?.slug) redirect(`/partners/${org.slug}/dashboard`);
    }
    // Founder sem org ainda — cai no dashboard de aluno como fallback
    redirect('/portal/student/dashboard');
  }

  // Aluno B2B com org vinculada → redireciona para o portal do parceiro
  if (roleStr === 'student' && profile?.organization_id) {
    const orgRes = await adminClient
      .from('organizations')
      .select('slug')
      .eq('id', profile.organization_id)
      .single();
    const org = orgRes.data as { slug: string } | null;
    if (org?.slug) redirect(`/partners/${org.slug}/student/dashboard`);
  }

  // Associado técnico: role associate (ou teacher legado) com org vinculada → correção de redações no parceiro
  if ((roleStr === 'associate' || roleStr === 'teacher') && profile?.organization_id) {
    const orgRes = await adminClient
      .from('organizations')
      .select('slug')
      .eq('id', profile.organization_id)
      .single();
    const org = orgRes.data as { slug: string } | null;
    if (org?.slug) redirect(`/partners/${org.slug}/redacoes`);
  }

  const validRoles: readonly UserRole[] = ['student', 'teacher', 'manager', 'admin', 'secretariat', 'dev'];
  const role: UserRole = validRoles.includes(roleStr as UserRole)
    ? (roleStr as UserRole)
    : 'student';

  // Redireciona para a página inicial de cada papel
  switch (role) {
    case 'teacher':
      redirect('/portal/teacher');
      break;
    case 'manager':
      redirect('/portal/manager');
      break;
    case 'admin':
      redirect('/portal/admin');
      break;
    case 'dev':
      redirect('/portal/dev/tasks');
      break;
    case 'secretariat':
      redirect('/portal/secretariat');
      break;
    default:
      redirect('/portal/student/dashboard');
  }
}
