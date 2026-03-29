/**
 * Dashboard para alunos B2B.
 *
 * O /portal/student/dashboard/page.tsx é um server component com imports
 * relativos (./task-card), o que impede re-export direto de outra rota.
 *
 * Solução: redirecionar para o portal padrão. O branding CSS vars do parceiro
 * não está disponível ali, então mostramos um dashboard simplificado com
 * link direto para as funcionalidades principais.
 *
 * TODO (Fase 6): Extrair StudentDashboardContent como componente shared
 * e importá-lo aqui com o branding aplicado via CSS vars do layout pai.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BookOpen, FileText, Target, BarChart3, ArrowRight, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PartnerStudentDashboard({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/partners/${slug}/student/dashboard`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, total_points, current_streak, last_activity_date')
    .eq('id', user.id)
    .single();

  const adminClient = createAdminClient();
  type OrgRow = { name: string; logo_url: string | null; brand_primary: string | null };
  const orgRes = await adminClient
    .from('organizations')
    .select('name, logo_url, brand_primary')
    .eq('slug', slug)
    .single();
  const org = orgRes.data as OrgRow | null;

  const firstName = (profile?.full_name ?? 'Aluno').split(' ')[0];
  const brandPrimary = org?.brand_primary ?? '#6366f1';

  const navCards = [
    {
      href: `/partners/${slug}/student/banco-de-questoes`,
      icon: BookOpen,
      title: 'Banco de Questões',
      desc: 'Pratique com +2.700 questões do ENEM',
    },
    {
      href: `/partners/${slug}/student/simulado`,
      icon: FileText,
      title: 'Simulados',
      desc: 'Faça simulados completos com TRI',
    },
    {
      href: '/portal/student/analytics',
      icon: BarChart3,
      title: 'Meu Desempenho',
      desc: 'Veja sua evolução e pontos fracos',
    },
    {
      href: '/portal/student/goals',
      icon: Target,
      title: 'Minhas Metas',
      desc: 'Defina e acompanhe seus objetivos',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="rounded-xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${brandPrimary}, ${brandPrimary}cc)` }}>
        <div className="flex items-center gap-3 mb-2">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org?.name} className="h-8 w-8 rounded-md object-contain bg-white/20 p-0.5" />
          ) : (
            <GraduationCap className="h-8 w-8 opacity-80" />
          )}
          <span className="text-sm font-medium opacity-80">{org?.name}</span>
        </div>
        <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
        <p className="text-sm opacity-80 mt-1">
          Sequência atual: <strong>{profile?.current_streak ?? 0} dias</strong> · Pontos: <strong>{profile?.total_points ?? 0}</strong>
        </p>
      </div>

      {/* Cards de navegação */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {navCards.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card className="h-full hover:border-[var(--brand-primary)] transition-colors cursor-pointer group">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white shrink-0"
                  style={{ backgroundColor: brandPrimary }}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-sm">{title}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{desc}</p>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Link para o portal completo */}
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-slate-500 mb-2">
          Acesse o portal completo com todas as funcionalidades
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/student/dashboard">
            Abrir portal StudyTrack completo →
          </Link>
        </Button>
      </div>
    </div>
  );
}
