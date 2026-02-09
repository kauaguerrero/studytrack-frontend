import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PortalRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Consulta role direto do Supabase (RLS agora funciona!)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || 'student';

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