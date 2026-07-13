// Utilitários de contraste para cores de marca dinâmicas (vindas do Supabase).
// A cor pode ser qualquer tom, inclusive muito claro (ex: amarelo), então texto
// e ícones sobre fundo branco/claro precisam de uma versão legível da mesma cor
// — sem "sujar" o tom misturando com preto. A técnica usada é limitar a
// luminosidade em HSL preservando matiz e saturação, o que produz uma versão
// mais rica/profunda da mesma cor (ex: amarelo vira um dourado), não um cinza-oliva.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex?.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(...rgb);
}

/**
 * Preto, branco e cinza puro (ou quase) não carregam matiz nenhum — tentar
 * "clarear preservando o matiz" nesses casos inventa uma cor que não existe
 * na marca (ex: preto vira um vermelho aleatório, porque h=0 é só um valor
 * padrão de fallback matemático, não uma cor real). Nesses casos a resposta
 * certa não é forçar uma cor, é admitir que essa entrada não tem identidade
 * cromática pra preservar.
 */
function isAchromatic(hsl: { h: number; s: number; l: number }): boolean {
  return hsl.s < 12 || hsl.l < 6 || hsl.l > 96;
}

const NEUTRAL_ON_LIGHT = '#1e293b'; // slate-800 — tinta neutra seguindo o design system
const NEUTRAL_ON_DARK = '#e2e8f0'; // slate-200 — neutro claro seguindo o design system

/**
 * Retorna uma versão da cor de marca segura para texto/ícones sobre fundo
 * claro. Se a cor já é escura o bastante, devolve o próprio CSS var (cor
 * intacta). Se for clara demais, limita a luminosidade em HSL — preserva
 * matiz e saturação, então o resultado ainda "parece" a cor da marca, só
 * mais profundo (ex: amarelo → dourado escuro), nunca acinzentado. Se a cor
 * for acromática (preto/branco/cinza), não inventa matiz — cai pra um
 * neutro do design system.
 */
export function readableBrandText(hex: string | undefined | null, cssVar: string, maxLightness = 40): string {
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl || hsl.l <= maxLightness) return cssVar;
  if (isAchromatic(hsl)) return NEUTRAL_ON_LIGHT;
  return `hsl(${hsl.h.toFixed(1)} ${Math.max(hsl.s, 55).toFixed(0)}% ${maxLightness}%)`;
}

/**
 * Mesma ideia de `readableBrandText`, só que para texto/ícones sobre fundo
 * ESCURO (cards que viram `dark:bg-slate-900`, etc). Ali a lógica se inverte:
 * uma cor propositalmente escurecida fica ilegível contra um fundo já escuro.
 * Então aqui, em vez de limitar a luminosidade por cima (max), a gente garante
 * um piso de luminosidade (min) — clareia só o suficiente pra ler, preservando
 * matiz/saturação (não estoura pra branco puro). Se a cor for acromática
 * (preto/branco/cinza), não inventa matiz — cai pra um neutro claro.
 */
export function readableBrandTextOnDark(hex: string | undefined | null, cssVar: string, minLightness = 62): string {
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl || hsl.l >= minLightness) return cssVar;
  if (isAchromatic(hsl)) return NEUTRAL_ON_DARK;
  return `hsl(${hsl.h.toFixed(1)} ${Math.max(hsl.s, 45).toFixed(0)}% ${minLightness}%)`;
}

/**
 * Par de valores (claro/escuro) prontos para injetar como CSS custom
 * properties e deixar o CSS decidir qual usar via seletor `.dark` — sem
 * precisar de JS sabendo qual tema está ativo agora. Use com as classes
 * utilitárias `.brand-text-adaptive` / `.brand-surface-adaptive` do
 * globals.css: `style={brandTextVars('--minha-var', hex, cssVar)}`.
 */
export function brandTextVars(
  varName: string,
  hex: string | undefined | null,
  cssVar: string,
  opts?: { maxLightness?: number; minLightness?: number },
): Record<string, string> {
  return {
    [`${varName}-light`]: readableBrandText(hex, cssVar, opts?.maxLightness),
    [`${varName}-dark`]: readableBrandTextOnDark(hex, cssVar, opts?.minLightness),
  };
}

export interface OrgBrandColors {
  brand_primary?: string | null;
  brand_secondary?: string | null;
  brand_accent?: string | null;
}

/**
 * Quando a cor "preferida" da marca (ex: secondary) é preto/branco/cinza —
 * sem matiz nenhum pra usar como acento — não faz sentido inventar uma cor
 * do nada. O certo é ir buscar, entre as OUTRAS cores que o cliente já
 * configurou, uma que realmente tenha identidade cromática (ex: se
 * secondary é preto mas accent/primary são o amarelo da marca, usa o
 * amarelo — ele já é "perfeito"). Só cai pra neutro do design system se
 * literalmente nenhuma das três cores tiver matiz.
 */
export function resolveAccentColor(
  org: OrgBrandColors,
  preferred: 'brand_primary' | 'brand_secondary' | 'brand_accent' = 'brand_secondary',
): { hex: string | null; cssVar: string } {
  const order: Array<'brand_primary' | 'brand_secondary' | 'brand_accent'> =
    preferred === 'brand_secondary' ? ['brand_secondary', 'brand_accent', 'brand_primary']
      : preferred === 'brand_accent' ? ['brand_accent', 'brand_primary', 'brand_secondary']
        : ['brand_primary', 'brand_accent', 'brand_secondary'];

  for (const key of order) {
    const hex = org[key];
    const hsl = hex ? hexToHsl(hex) : null;
    if (hsl && !isAchromatic(hsl)) {
      return { hex: hex as string, cssVar: `var(--${key.replace('brand_', 'brand-')})` };
    }
  }
  // Nenhuma das três cores tem identidade cromática (marca em tons de
  // cinza) — não força cor, mantém a preferida original como está.
  return { hex: org[preferred] ?? null, cssVar: `var(--${preferred.replace('brand_', 'brand-')})` };
}

/**
 * true se a cor for clara o bastante para exigir texto escuro por cima.
 *
 * Usa luminância percebida (fórmula YIQ: 0.299R + 0.587G + 0.114B), não HSL
 * lightness — cores 100% saturadas (ex: amarelo puro #FFFF00) sempre caem em
 * HSL L=50%, mesmo parecendo muito claras visualmente, então um limiar em
 * cima de HSL lightness classifica amarelo/lima vibrantes como "escuros" e
 * escolhe texto branco sobre eles (ilegível). Luminância percebida evita isso.
 */
export function isLightBrand(hex: string | undefined | null, threshold = 150): boolean {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const perceivedBrightness = (r * 299 + g * 587 + b * 114) / 1000;
  return perceivedBrightness > threshold;
}

/**
 * Cor de texto ideal para usar sobre um preenchimento sólido nessa cor de
 * marca. Se a cor for escura o bastante, branco puro já contrasta bem. Se
 * for clara (ex: amarelo), em vez de cair pra um neutro genérico tipo preto
 * (que "briga" com a cor, sem nada a ver com a marca), escurece a MESMA cor
 * preservando matiz/saturação — mesma técnica do `readableBrandText`. O
 * resultado é um tom "dourado/oliva escuro" que ainda parece parte da
 * paleta, e passa contraste AA (~5:1) contra a cor original.
 */
export function onBrandText(hex: string | undefined | null): string {
  if (!isLightBrand(hex)) return '#ffffff';
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl || isAchromatic(hsl)) return '#0f172a';
  return `hsl(${hsl.h.toFixed(1)} ${Math.max(hsl.s, 55).toFixed(0)}% 20%)`;
}

/**
 * Contorno fino escuro simulado via `text-shadow` em 4 direções — alternativa
 * a `onBrandText` para quando o texto deve continuar BRANCO mesmo sobre uma
 * cor de marca clara (ex: amarelo), em vez de escurecer a cor. `-webkit-text-stroke`
 * existe mas não é suportado em todo navegador e pode ficar mal-centralizado
 * dependendo da fonte; 4 sombras deslocadas em diagonal funcionam em qualquer
 * lugar. Retorna 'none' quando a cor de fundo já é escura (branco já contrasta
 * bem sozinho, contorno só acrescentaria ruído visual).
 */
export function brandTextOutline(
  hex: string | undefined | null,
  width = 1,
  color = 'rgba(0,0,0,0.6)',
): string {
  if (!isLightBrand(hex)) return 'none';
  return [
    `-${width}px -${width}px 0 ${color}`,
    `${width}px -${width}px 0 ${color}`,
    `-${width}px ${width}px 0 ${color}`,
    `${width}px ${width}px 0 ${color}`,
  ].join(', ');
}
