import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalLayoutWrapper } from '@/components/layout/PortalLayoutWrapper';
import { UserRole } from '@/types/roles';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  
  // O Layout agora lê o cookie de sessão de forma segura, igual ao Middleware
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as UserRole) || 'student';
  const fullName = profile?.full_name || 'Usuário';
  const avatarUrl = undefined; // avatar vem do auth metadata; sem getUser, usamos fallback (iniciais)

  return (
    <PortalLayoutWrapper role={role} fullName={fullName} avatarUrl={avatarUrl}>
      {children}
    </PortalLayoutWrapper>
  );
}