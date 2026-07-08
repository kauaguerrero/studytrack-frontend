'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  const perms = org.permissions;
  const isEnabled =
    perms === undefined || perms === null
      ? defaultEnabled
      : perms[permKey] === undefined
        ? defaultEnabled
        : Boolean(perms[permKey]);

  useEffect(() => {
    if (!isEnabled) {
      router.replace(`/partners/${org.slug}/dashboard`);
    }
  }, [isEnabled, router, org.slug]);

  if (!isEnabled) return null;
  return <>{children}</>;
}
