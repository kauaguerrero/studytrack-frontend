import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { UserRole } from '@/types/roles';

const SUPPORT_WHATSAPP = '5516994045785';
const SUPPORT_MESSAGE = encodeURIComponent(
  'Olá! Minha conta apareceu sem vínculo com meu cursinho no StudyTrack (erro de sincronização). Pode me ajudar?'
);

function StudentSyncErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-[#080808]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40">
        Erro de sincronização
      </p>
      <h1 className="font-display mt-1.5 text-[28px] font-black leading-tight text-slate-900 dark:text-white sm:text-[34px]">
        Sua conta não está vinculada a um cursinho
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-white/50">
        Isso normalmente acontece por uma falha temporária na sincronização com a instituição.
        Fale com o gestor do seu cursinho ou com o nosso suporte pra resolver.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${SUPPORT_MESSAGE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          Falar com o suporte
        </a>
        <Link
          href="/auth/login"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
        >
          Voltar pro login
        </Link>
      </div>
    </div>
  );
}

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
    // Founder sem org ainda — redireciona para home
    redirect('/');
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

  // Aluno sem organization_id: nunca deveria acontecer com o fluxo normal de
  // convite/cadastro — indica um problema de vínculo (ex: falha de sincronização,
  // conta órfã). Mostra uma tela explicando em vez de cair silenciosamente na
  // landing page.
  if (roleStr === 'student' && !profile?.organization_id) {
    return <StudentSyncErrorScreen />;
  }

  // Associado técnico com org vinculada → correção de redações no parceiro
  if (roleStr === 'associate' && profile?.organization_id) {
    const orgRes = await adminClient
      .from('organizations')
      .select('slug')
      .eq('id', profile.organization_id)
      .single();
    const org = orgRes.data as { slug: string } | null;
    if (org?.slug) redirect(`/partners/${org.slug}/redacoes`);
  }

  const validRoles: readonly UserRole[] = ['student', 'admin', 'dev'];
  const role: UserRole = validRoles.includes(roleStr as UserRole)
    ? (roleStr as UserRole)
    : 'student';

  // Redireciona para a página inicial de cada papel
  switch (role) {
    case 'admin':
      redirect('/portal/admin');
      break;
    case 'dev':
      redirect('/portal/admin/tasks');
      break;
    default:
      redirect('/');
  }
}
