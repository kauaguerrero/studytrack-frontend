'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';

interface ModuleGuardProps {
  permKey: string;
  /** Padrão true = módulo ativo por omissão (basta desligar); false = precisa ser explicitamente habilitado */
  defaultEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * Redireciona para o dashboard do parceiro se o módulo estiver desabilitado
 * nas configurações da organização.
 *
 * Wrapping client-side: coloque ao redor do conteúdo da página.
 */
export function ModuleGuard({ permKey, defaultEnabled = true, children }: ModuleGuardProps) {
  const { org } = useOrg();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  // aluno volta para o Início dele; o /dashboard do gestor quebra para quem é aluno
  const home = pathname.includes('/student/') ? `/partners/${org.slug}/student/dashboard` : `/partners/${org.slug}/dashboard`;

  const perms = org.permissions;
  const isEnabled =
    perms === undefined || perms === null
      ? defaultEnabled
      : perms[permKey] === undefined
        ? defaultEnabled
        : Boolean(perms[permKey]);

  useEffect(() => {
    if (!isEnabled) {
      router.replace(home);
    }
  }, [isEnabled, router, home]);

  if (!isEnabled) return null;
  return <>{children}</>;
}
