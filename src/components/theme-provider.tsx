"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Rotas onde next-themes deve ser desativado (sempre força light no <html>).
 *  - Rotas públicas: sem dark mode global
 *  - Rotas de aluno: StudentThemeShell gerencia o dark mode de forma isolada via
 *    div.dark, sem depender da classe no <html>. Se next-themes adicionar dark ao
 *    <html>, o @custom-variant dark (&:is(.dark *)) vaza para todo o conteúdo do
 *    aluno, ignorando a preferência salva do aluno. */
const FORCE_LIGHT_ROUTES = ["/auth", "/", "/landing", "/fafram"];

function shouldForceLight(pathname: string | null): boolean {
  if (!pathname) return false;
  if (FORCE_LIGHT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return true;
  // Rotas de aluno B2B: tema isolado via StudentThemeShell, não via <html>
  if (pathname.includes('/student/')) return true;
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forceLight = shouldForceLight(pathname);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="studytrack-theme"
      disableTransitionOnChange={false}
      forcedTheme={forceLight ? "light" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
