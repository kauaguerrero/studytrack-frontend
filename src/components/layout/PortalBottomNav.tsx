'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Library, BookOpen, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalBottomNavProps {
  onOpenMoreMenu: () => void;
}

const items = [
  { href: '/portal/student/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/portal/student/library', icon: Library, label: 'Biblioteca' },
  { href: '/portal/student/banco-de-questoes', icon: BookOpen, label: 'Questões' },
] as const;

export function PortalBottomNav({ onOpenMoreMenu }: PortalBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-card/95 border-t border-border backdrop-blur-lg safe-area-pb"
      aria-label="Navegação principal"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors duration-200',
                active
                  ? 'text-blue-600 dark:text-sidebar-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                size={22}
                className={cn('shrink-0', active && 'stroke-[2.5]')}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Abrir menu completo"
        >
          <Menu size={22} className="shrink-0" aria-hidden />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
