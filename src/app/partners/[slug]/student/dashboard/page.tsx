/**
 * Dashboard para alunos B2B.
 *
 * Server component: busca dados do aluno e da organização,
 * depois delega a renderização animada para DashboardClient.
 *
 * TODO (Fase 6): Extrair StudentDashboardContent como componente shared
 * e importá-lo aqui com o branding aplicado via CSS vars do layout pai.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DashboardClient } from './DashboardClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PartnerStudentDashboard({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, total_points, current_streak, last_activity_date')
    .eq('id', user.id)
    .single();

  const [{ count: questionsCount }, { count: simuladosCount }] = await Promise.all([
    supabase
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('simulado_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ]);

  const adminClient = createAdminClient();
  type OrgRow = { name: string; logo_url: string | null };
  const orgRes = await adminClient
    .from('organizations')
    .select('name, logo_url')
    .eq('slug', slug)
    .single();
  const org = orgRes.data as OrgRow | null;

  const firstName = (profile?.full_name ?? 'Aluno').split(' ')[0];

  return (
    <DashboardClient
      firstName={firstName}
      orgName={org?.name ?? 'StudyTrack'}
      orgLogoUrl={org?.logo_url ?? null}
      slug={slug}
      currentStreak={profile?.current_streak ?? 0}
      questionsCount={questionsCount ?? 0}
      simuladosCount={simuladosCount ?? 0}
    />
  );
}
