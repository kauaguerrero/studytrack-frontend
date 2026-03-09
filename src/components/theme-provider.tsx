"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Rotas onde o tema escuro NÃO se aplica (sempre modo claro). */
const PUBLIC_LIGHT_ROUTES = ["/auth", "/", "/landing", "/fafram"];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_LIGHT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forceLight = isPublicRoute(pathname);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forceLight ? "light" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
