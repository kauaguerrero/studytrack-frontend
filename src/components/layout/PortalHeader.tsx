'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/roles';

interface PortalHeaderProps {
  resolvedRole: UserRole;
  onOpenMobileMenu?: () => void;
}

const roleLabel: Record<UserRole, string> = {
  student: 'Aluno',
  teacher: 'Docente',
  manager: 'Gestão',
  secretariat: 'Secretaria',
  admin: 'Admin',
  founder: 'Parceiro',
};

export function PortalHeader({
  resolvedRole,
  onOpenMobileMenu,
}: PortalHeaderProps) {
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
