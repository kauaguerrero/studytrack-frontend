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
 *
 * Fixar o eixo `opsz` em 144 cortaria os dois arquivos de 264KB para 143KB,
 * mas o parágrafo da redação corrigida usa `opsz 14` — com o eixo fixo ele
 * renderiza condensado e bem menos legível (comparado lado a lado). Os 121KB
 * extras ficam, de propósito.
 *
 * Nenhuma das três entra em preload: o LCP da página é a foto do herói, e os
 * arquivos de fonte competiam com ela pela banda. Todas usam `display: swap`.
 */

export const fraunces = localFont({
  src: [
    { path: '../../../public/fonts/org-site/fraunces-latin-full-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../../../public/fonts/org-site/fraunces-latin-full-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-ops-serif',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  // Em preload: desenha o <h1> do herói. Tirá-la do preload atrasa o FCP em
  // ~1,4s (medido), o que é pior do que a banda que ela disputa.
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
  // Fora do preload de propósito: são 5 pesos, e pré-carregar todos tirava
  // banda da foto do herói, que é o LCP. Com `display: swap` o texto aparece
  // na fonte de sistema e troca — alguns ms depois, sem bloquear nada.
  preload: false,
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
