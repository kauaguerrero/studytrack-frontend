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

  // BYPASS RLS: Usar API backend que tem service role
  let role: UserRole = 'student';
  let fullName = 'Usuário';
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    
    if (token) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: 'no-store'
      }).catch(() => null);
      
      clearTimeout(timeoutId);
      
      if (res?.ok) {
        const data = await res.json();
        role = (data.role as UserRole) || 'student';
        fullName = data.full_name || 'Usuário';
      }
    }
  } catch (error) {
    console.error('⚠️ Portal Layout - Erro ao buscar profile:', error);
  }
  
  // Fallback: usar user_metadata
  if (!fullName || fullName === 'Usuário') {
    fullName = user.user_metadata?.full_name || 'Usuário';
  }
  
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <PortalLayoutWrapper role={role} fullName={fullName} avatarUrl={avatarUrl}>
      {children}
    </PortalLayoutWrapper>
  );
}