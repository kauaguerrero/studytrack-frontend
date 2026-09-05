/**
 * Normalização de nome de pessoa — mesma regra aplicada no backfill de
 * `profiles.full_name` (database/migrations/20260905_normalize_full_name.sql
 * no repo do backend). Mantenha as duas em sincronia: divergir faz o nome
 * gravado hoje ficar diferente do que já está no banco.
 */

/** Conectivos que ficam em minúscula — exceto quando abrem o nome. */
const CONNECTIVES = new Set([
  'de', 'do', 'da', 'dos', 'das', 'e', 'di', 'du', 'del', 'della', 'dello',
  'van', 'von', 'der', 'den', 'la', 'le', 'y', 'dal',
]);

/** Iniciais tipo "S.R." ou "J." — devem ficar inteiras em caixa alta. */
const INITIALS = /^(?:[A-Za-zÀ-ÿ]\.){1,4}$/;

/** Algarismos romanos de sufixo (Neto II, Filho III). */
const ROMAN = /^(?:I{2,3}|IV|VI{0,3}|IX|XI{0,3})$/;

/**
 * Capitaliza cada parte do token, respeitando separadores internos.
 * Cobre hífen (Ana-Maria) e apóstrofo (D'Ávila).
 */
function capitalizeToken(token: string): string {
  return token
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[-'’])([a-zà-ÿ])/g, (_m, sep: string, letter: string) =>
      sep + letter.toLocaleUpperCase('pt-BR'),
    );
}

/**
 * "  JOÃO pedro DE castro  " → "João Pedro de Castro".
 * Colapsa espaços repetidos e apara as pontas.
 */
export function capitalizePersonName(raw: string): string {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((token, index) => {
      const lower = token.toLocaleLowerCase('pt-BR');
      if (index > 0 && CONNECTIVES.has(lower)) return lower;
      if (INITIALS.test(token)) return token.toLocaleUpperCase('pt-BR');
      if (ROMAN.test(token.toLocaleUpperCase('pt-BR'))) return token.toLocaleUpperCase('pt-BR');
      return capitalizeToken(token);
    })
    .join(' ');
}

/** Nome de pessoa não leva dígito — pega "João 123" e afins. */
export function hasDigit(raw: string): boolean {
  return /\d/.test(raw || '');
}
