'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/roles';

interface PortalHeaderProps {
  resolvedRole: UserRole;
  onOpenMobileMenu?: () => void;
  /** Esconde a marca "StudyTrack" + badge de papel e o próprio header no
   * desktop — usado em painéis que já têm seu próprio hero (ex: admin
   * "Master Control"). No mobile permanece só o botão de abrir o menu. */
  minimal?: boolean;
}

const roleLabel: Record<UserRole, string> = {
  student: 'Aluno',
  teacher: 'Docente',
  manager: 'Gestão',
  secretariat: 'Secretaria',
  admin: 'Admin',
  dev: 'Dev',
  founder: 'Parceiro',
  associate: 'Associado',
};

export function PortalHeader({
  resolvedRole,
  onOpenMobileMenu,
  minimal = false,
}: PortalHeaderProps) {
  if (minimal) {
    return (
      <header className="bg-card h-14 border-b border-border flex items-center px-4 flex-shrink-0 sticky top-0 z-30 md:hidden">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon-touch"
            onClick={onOpenMobileMenu}
            className="shrink-0"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="size-5 text-muted-foreground" aria-hidden />
          </Button>
        )}
      </header>
    );
  }

  return (
    <header className="bg-card h-16 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {/* Mobile: abrir menu (Sheet / Mais) */}
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon-touch"
            onClick={onOpenMobileMenu}
            className="md:hidden shrink-0"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="size-5 text-muted-foreground" aria-hidden />
          </Button>
        )}
        <span className="font-bold text-foreground text-lg truncate">
          Study
          <span className="text-blue-600 dark:text-sidebar-primary">Track</span>
        </span>
      </div>
      <div className="text-xs font-bold bg-muted text-muted-foreground px-3 py-1.5 rounded-full uppercase tracking-wide shrink-0">
        {roleLabel[resolvedRole] ?? resolvedRole}
      </div>
    </header>
  );
}
