import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function NotFound() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let homeLink = '/portal/student/dashboard'; // Default fallback

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || user.user_metadata?.role || 'student';

    if (role === 'teacher') homeLink = '/portal/teacher';
    else if (role === 'manager') homeLink = '/portal/manager';
    else if (role === 'admin') homeLink = '/portal/manager';
  } else {
      homeLink = '/';
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
      <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Página não encontrada</h2>
      <p className="text-slate-500 mb-8 max-w-md text-center">
        Ops! Parece que você se perdeu nos estudos. A página que você está procurando não existe ou foi movida.
      </p>
      
      <Link 
        href={homeLink}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}