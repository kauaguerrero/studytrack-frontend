"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Rotas onde next-themes deve ficar sempre light (rotas públicas, sem dark
 * mode global nenhum). */
const FORCE_LIGHT_ROUTES = ["/auth", "/", "/landing", "/fafram"];

function isPublicForceLightRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return FORCE_LIGHT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Toda a árvore /partners/[slug]/* (founder E aluno) gerencia o próprio tema
 * de forma independente, lendo `profiles.theme_preference` do banco:
 *  - Founder: script inline em partners/[slug]/layout.tsx aplica a classe
 *    `dark` direto no <html> (localStorage `partner-founder-theme-{slug}`).
 *  - Aluno: StudentThemeContext/StudentThemeShell aplicam `dark` num <div>
 *    isolado (localStorage `partner-student-theme-{slug}`), pra não afetar
 *    o resto do app.
 * Nenhum componente dessa área usa useTheme()/setTheme() do next-themes. */
function isPartnerAreaRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/partners/");
}

/** Lê a classe já aplicada no <html> pelo script inline (founder) ou pelo
 * SSR (aluno) — ambos rodam antes da hidratação, então nesse ponto o valor
 * já está correto. No servidor (sem `document`) cai em "light", mas isso só
 * afeta o script anti-flash que o próprio next-themes injeta ANTES do script
 * do founder no HTML — o script do founder roda logo em seguida e tem a
 * palavra final sobre a pintura inicial, então nenhum flash chega a aparecer. */
function currentHtmlTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Por que `forcedTheme` em vez de desmontar o NextThemesProvider nas rotas
 * de founder/aluno:
 *
 * O NextThemesProvider fica montado o tempo inteiro, em toda rota — nunca
 * troca de tipo de componente. Só o valor de `forcedTheme` muda conforme a
 * rota. Isso importa porque, se a árvore alternasse entre `<NextThemesProvider>`
 * e um Fragment dependendo do pathname, o React desmontaria e remontaria
 * TUDO que está por baixo (a página inteira) sempre que uma navegação
 * client-side cruzasse essa fronteira — resetando popups de gamificação em
 * fila (PopupQueueProvider), animações do Framer Motion, tudo. Hoje isso não
 * acontece porque toda navegação interna do founder/aluno fica dentro de
 * /partners/*, e login/logout já são reload completo — mas manter o
 * provider estável elimina essa classe de risco de vez, mesmo que isso mude
 * no futuro.
 *
 * O bug em si (tema volta a escurecer depois de um reload, mesmo com "Claro"
 * salvo) era o efeito de montagem do next-themes rodando DEPOIS da
 * hidratação e reaplicando a classe `dark`/`light` com base em
 * `localStorage['studytrack-theme']` (uma chave que founder/aluno nunca
 * escrevem) — sobrescrevendo o que o script inline/SSR já tinha pintado
 * certo. Passar `forcedTheme` = "o que já está no <html> agora" faz esse
 * efeito reaplicar o MESMO valor (idempotente, sem sobrescrever nada) em vez
 * de um valor de outra fonte.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  let forcedTheme: "light" | "dark" | undefined;
  if (isPublicForceLightRoute(pathname)) {
    forcedTheme = "light";
  } else if (isPartnerAreaRoute(pathname)) {
    forcedTheme = currentHtmlTheme();
  } else {
    forcedTheme = undefined;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="studytrack-theme"
      disableTransitionOnChange={false}
      forcedTheme={forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
