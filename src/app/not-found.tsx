import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BrokenPencilIllustration } from '@/components/ui/broken-pencil-illustration';

export default async function NotFound() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let homeLink = '/'; // Default fallback

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || user.user_metadata?.role || 'student';

    if (role === 'admin') homeLink = '/portal/admin';
  } else {
    homeLink = '/';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-[#080808]">
      <BrokenPencilIllustration className="mb-2 h-auto w-64 sm:w-80" />

      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40">
        Erro 404
      </p>
      <h1 className="font-display mt-1.5 text-[32px] font-black leading-tight text-slate-900 dark:text-white sm:text-[40px]">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-white/50">
        Parece que você se perdeu nos estudos. A página que você está procurando não existe ou foi movida.
      </p>

      <Link
        href={homeLink}
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition-colors hover:bg-blue-700"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
