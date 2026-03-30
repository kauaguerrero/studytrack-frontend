import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types/roles';

export default async function PortalRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Usa adminClient para garantir leitura de organization_id sem bloqueio de RLS
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

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

  const role: UserRole = (['student', 'teacher', 'manager', 'admin', 'secretariat'] as const).includes(roleStr as any)
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
    case 'secretariat':
      redirect('/portal/secretariat');
      break;
    default:
      redirect('/portal/student/dashboard');
  }
}
