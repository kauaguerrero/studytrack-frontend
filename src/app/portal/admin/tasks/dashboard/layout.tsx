import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function TaskDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string | null }>();

  if (profile?.role !== 'admin') {
    redirect('/portal/admin/tasks');
  }

  return children;
}
