'use client';

import { usePathname } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { SidebarContent } from '@/components/layout/PortalSidebar';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/roles';
import { useState } from 'react';

interface MobileNavProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
}

/**
 * Barra de navegação mobile com Sheet (menu lateral).
 * Dentro do portal (/portal/*) o layout já fornece header + Bottom Nav (aluno) ou Sheet global,
 * então este componente não renderiza nada para evitar duplicação.
 * Fora do portal, exibe logo + botão que abre o Sheet com menu completo (backdrop blur, 60fps).
 */
export function MobileLibraryNav(props: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const inPortal =
    pathname?.startsWith('/portal') && !pathname?.includes('/portal/onboarding');

  if (inPortal) {
    return null;
  }

  return (
    <div className="md:hidden flex items-center justify-between bg-card border-b border-border p-4 sticky top-0 z-30">
      <div className="font-bold text-foreground">
        Study<span className="text-blue-600">Track</span>
      </div>

      <Button
        variant="ghost"
        size="icon-touch"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="text-muted-foreground" size={22} aria-hidden />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          overlayClassName="bg-black/40 backdrop-blur-md"
          className="p-0 w-72 max-w-[85vw] will-change-transform"
        >
          <SidebarContent {...props} onCloseMobile={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
