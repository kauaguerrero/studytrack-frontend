import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalLayoutWrapper } from '@/components/layout/PortalLayoutWrapper';
import { UserRole } from '@/types/roles';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  if (!userId) {
    redirect('/auth/login');
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
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