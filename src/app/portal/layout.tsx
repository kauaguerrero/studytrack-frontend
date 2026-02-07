import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalLayoutWrapper } from '@/components/layout/PortalLayoutWrapper';
import { UserRole } from '@/types/roles';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Busca do Banco para saber qual Sidebar mostrar
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'student';
  const fullName = profile?.full_name || user.user_metadata?.full_name || 'Usuário';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <PortalLayoutWrapper role={role} fullName={fullName} avatarUrl={avatarUrl}>
      {children}
    </PortalLayoutWrapper>
  );
}