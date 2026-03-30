/**
 * Landing page pública da organização parceira.
 * Exibe branding do cursinho e direciona para login/dashboard.
 *
 * Esta rota é o ponto de entrada para founders E alunos do cursinho.
 * Se já autenticado como founder → redireciona para /dashboard
 * Se já autenticado como student → redireciona para /student/dashboard
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GraduationCap, BookOpen, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrgLandingProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgLandingPage({ params }: OrgLandingProps) {
  const { slug } = await params;

  // Busca dados públicos da org (nome, branding)
  type OrgRow = {
    id: string; name: string; logo_url: string | null;
    brand_primary: string | null; brand_secondary: string | null; brand_accent: string | null;
  };
  const adminClient = createAdminClient();
  const orgRes = await adminClient
    .from('organizations')
    .select('id, name, logo_url, brand_primary, brand_secondary, brand_accent')
    .eq('slug', slug)
    .single();

  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect('/');
  }

  // Se usuário já está logado, redireciona para o lugar certo
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'founder' || profile?.role === 'admin') {
      redirect(`/partners/${slug}/dashboard`);
    }
    if (profile?.role === 'student') {
      redirect(`/partners/${slug}/student/dashboard`);
    }
  }

  const primary = org.brand_primary ?? '#6366f1';
  const secondary = org.brand_secondary ?? '#8b5cf6';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}15 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="rounded-2xl border bg-white shadow-xl dark:bg-slate-900 overflow-hidden">
          {/* Header com cor da marca */}
          <div
            className="px-8 py-8 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            {org.logo_url ? (
              <Image
                src={org.logo_url}
                alt={org.name}
                width={72}
                height={72}
                className="mx-auto mb-4 rounded-xl object-contain bg-white/20 p-1"
              />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white/20">
                <GraduationCap className="h-8 w-8" />
              </div>
            )}
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="mt-1 text-sm opacity-80">Plataforma de Estudos StudyTrack</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Acesse sua conta para continuar estudando
            </p>

            {/* Botão de acesso para alunos */}
            <Button
              asChild
              className="w-full gap-2 text-white"
              style={{ backgroundColor: primary }}
            >
              <Link href={`/auth/login?next=/partners/${slug}/student/dashboard`}>
                <BookOpen className="h-4 w-4" />
                Acessar como Aluno
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>

            {/* Link para founder */}
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href={`/auth/login?next=/partners/${slug}/dashboard`}>
                <Users className="h-4 w-4" />
                Acesso do Responsável
              </Link>
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Não tem conta?{' '}
              <Link
                href={`/partners/${slug}/register`}
                className="underline hover:text-slate-600"
                style={{ color: primary }}
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé StudyTrack */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by{' '}
          <Link href="https://studytrack.com.br" className="underline hover:text-slate-600">
            StudyTrack
          </Link>
        </p>
      </div>
    </div>
  );
}
