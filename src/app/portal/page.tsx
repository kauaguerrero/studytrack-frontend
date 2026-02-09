import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PortalRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Usa backend para buscar role (bypassa RLS)
  let role = 'student';
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    if (token) {
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        role = data.role || 'student';
      }
    }
  } catch (error) {
    console.error('Portal redirect - Erro ao buscar role:', error);
    role = user.user_metadata?.role || 'student';
  }

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