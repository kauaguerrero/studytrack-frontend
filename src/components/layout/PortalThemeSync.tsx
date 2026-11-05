'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

/**
 * Faz o tema salvo no banco (`profiles.theme_preference`) valer no /portal
 * (admin, dev).
 *
 * O next-themes só conhece o localStorage do navegador (`studytrack-theme`).
 * O perfil do admin já grava a preferência no banco, mas nada lia de volta:
 * em outro dispositivo, ou com o storage limpo, o tema escolhido sumia. Aqui o
 * valor do banco vence uma vez, na montagem. Depois disso, quem manda é o
 * próprio setTheme da tela de perfil (que também salva no banco).
 */
export function PortalThemeSync({ themePreference }: { themePreference: string | null | undefined }) {
  const { theme, setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const pref = themePreference;
    if (pref !== 'light' && pref !== 'dark' && pref !== 'system') return;
    if (theme !== pref) setTheme(pref);
  }, [theme, setTheme, themePreference]);

  return null;
}
