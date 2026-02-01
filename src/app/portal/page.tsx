import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PortalRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Consulta o papel real no banco
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || 'student';

  // Redireciona para a página inicial de cada papel
  switch (role) {
    case 'teacher':
      redirect('/portal/teacher'); // Vai para a página do professor
      break;
    case 'manager':
      redirect('/portal/manager'); // Vai para a página do gestor
      break;
    case 'admin':
      redirect('/portal/manager');
      break;
    case 'secretariat':
      redirect('/portal/secretariat'); // Vai para a página da secretaria
      break;
    default:
      redirect('/portal/student/dashboard'); // Vai para a página do aluno
  }
}