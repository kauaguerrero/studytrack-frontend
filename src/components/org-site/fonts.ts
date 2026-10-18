import localFont from 'next/font/local';

/**
 * Fontes do template `premium_v1`, auto-hospedadas e carregadas SÓ nesta rota.
 *
 * `next/font/local` (mesmo padrão da GeneralSans em src/app/layout.tsx) gera o
 * @font-face, faz preload e serve do próprio domínio. Os arquivos vieram do
 * protótipo (docs/references/ave-palavra-site/site/assets/fonts), todos SIL
 * Open Font License.
 *
 * A Fraunces é o arquivo variável COMPLETO de propósito: o protótipo usa os
 * eixos `opsz`, `SOFT` e `WONK` (font-variation-settings no CSS do template);
 * uma versão só com peso perderia o itálico "wonky" dos títulos.
 */

export const fraunces = localFont({
  src: [
    { path: '../../../public/fonts/org-site/fraunces-latin-full-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../../../public/fonts/org-site/fraunces-latin-full-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-ops-serif',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  preload: true,
});

export const manrope = localFont({
  src: [
    { path: '../../../public/fonts/org-site/manrope-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/org-site/manrope-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/org-site/manrope-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/org-site/manrope-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../../public/fonts/org-site/manrope-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-ops-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  preload: true,
});

// Só aparece nos comentários "à mão" da redação — não precisa de preload.
export const caveat = localFont({
  src: [
    { path: '../../../public/fonts/org-site/caveat-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/org-site/caveat-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-ops-hand',
  display: 'swap',
  fallback: ['cursive'],
  preload: false,
});

export const orgSiteFontClassName = `${fraunces.variable} ${manrope.variable} ${caveat.variable}`;
