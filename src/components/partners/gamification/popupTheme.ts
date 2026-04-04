'use client';

import { useStudentTheme } from '@/contexts/StudentThemeContext';

export type PopupTone = 'celebration' | 'shield' | 'streak' | 'danger' | 'ranking';

function toneAccent(tone: PopupTone): { dark: string; light: string } {
  switch (tone) {
    case 'shield':
      return { dark: 'rgba(59,130,246,0.22)', light: 'rgba(37,99,235,0.16)' };
    case 'streak':
      return { dark: 'rgba(249,115,22,0.24)', light: 'rgba(234,88,12,0.15)' };
    case 'danger':
      return { dark: 'rgba(239,68,68,0.22)', light: 'rgba(239,68,68,0.14)' };
    case 'ranking':
      return { dark: 'rgba(245,158,11,0.18)', light: 'rgba(217,119,6,0.12)' };
    case 'celebration':
    default:
      return { dark: 'rgba(245,158,11,0.24)', light: 'rgba(245,158,11,0.14)' };
  }
}

export function usePopupTheme(tone: PopupTone) {
  const { resolvedTheme } = useStudentTheme();
  const isDark = resolvedTheme === 'dark';
  const accent = toneAccent(tone);

  return {
    isDark,
    overlayStyle: isDark
      ? {
          background: `radial-gradient(circle at top, ${accent.dark}, transparent 34%), rgba(2, 6, 23, 0.86)`,
          backdropFilter: 'blur(14px)',
        }
      : {
          background: `radial-gradient(circle at top, ${accent.light}, transparent 32%), rgba(248, 250, 252, 0.84)`,
          backdropFilter: 'blur(14px)',
        },
    cardStyle: isDark
      ? {
          background:
            'linear-gradient(155deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.96) 54%, color-mix(in srgb, var(--brand-primary) 12%, rgba(2,6,23,0.96)) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 120px rgba(2,6,23,0.56)',
        }
      : {
          background:
            'linear-gradient(155deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 58%, color-mix(in srgb, var(--brand-primary) 10%, rgba(255,255,255,0.98)) 100%)',
          border: '1px solid rgba(148,163,184,0.22)',
          boxShadow: '0 32px 96px rgba(148,163,184,0.22)',
        },
    panelStyle: isDark
      ? {
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }
      : {
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(148,163,184,0.18)',
        },
    accentPanelStyle: isDark
      ? {
          background: 'color-mix(in srgb, var(--brand-primary) 14%, rgba(255,255,255,0.04))',
          border: '1px solid color-mix(in srgb, var(--brand-primary) 26%, rgba(255,255,255,0.04))',
        }
      : {
          background: 'color-mix(in srgb, var(--brand-primary) 10%, white)',
          border: '1px solid color-mix(in srgb, var(--brand-primary) 18%, rgba(148,163,184,0.16))',
        },
    titleClass: isDark ? 'text-white' : 'text-slate-950',
    bodyClass: isDark ? 'text-white/72' : 'text-slate-600',
    mutedClass: isDark ? 'text-white/42' : 'text-slate-500',
    closeButtonClass: isDark
      ? 'text-white/40 hover:text-white hover:bg-white/10'
      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-900/5',
    primaryButtonClass: isDark
      ? 'text-slate-950 shadow-[0_10px_30px_color-mix(in_srgb,var(--brand-primary)_30%,transparent)]'
      : 'text-white shadow-[0_12px_30px_color-mix(in_srgb,var(--brand-primary)_20%,transparent)]',
    primaryButtonStyle: isDark
      ? {
          background:
            'linear-gradient(135deg, #fff 0%, color-mix(in srgb, var(--brand-primary) 20%, #fff) 100%)',
        }
      : {
          background:
            'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 74%, #0f172a) 100%)',
        },
    secondaryButtonClass: isDark
      ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white',
  };
}
