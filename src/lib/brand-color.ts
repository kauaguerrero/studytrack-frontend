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
 * Retorna uma versão da cor de marca segura para texto/ícones sobre fundo
 * claro. Se a cor já é escura o bastante, devolve o próprio CSS var (cor
 * intacta). Se for clara demais, limita a luminosidade em HSL — preserva
 * matiz e saturação, então o resultado ainda "parece" a cor da marca, só
 * mais profundo (ex: amarelo → dourado escuro), nunca acinzentado.
 */
export function readableBrandText(hex: string | undefined | null, cssVar: string, maxLightness = 40): string {
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl || hsl.l <= maxLightness) return cssVar;
  return `hsl(${hsl.h.toFixed(1)} ${Math.max(hsl.s, 55).toFixed(0)}% ${maxLightness}%)`;
}

/** true se a cor for clara o bastante para exigir texto escuro por cima. */
export function isLightBrand(hex: string | undefined | null, threshold = 62): boolean {
  const hsl = hex ? hexToHsl(hex) : null;
  if (!hsl) return false;
  return hsl.l > threshold;
}

/** Cor de texto ideal (branco ou tinta escura) para usar sobre um preenchimento sólido nessa cor de marca. */
export function onBrandText(hex: string | undefined | null): string {
  return isLightBrand(hex) ? '#0f172a' : '#ffffff';
}
