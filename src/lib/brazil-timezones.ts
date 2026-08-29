/**
 * Lista curada de fusos IANA brasileiros para o seletor de "fuso horário da
 * escola" em /partners/[slug]/configuracoes. Espelha `BRAZIL_TIMEZONES` em
 * studytrack-backend/app/blueprints/enterprise/partners.py — mantenha as duas
 * listas em sincronia se um fuso for adicionado/removido.
 *
 * O Brasil tem 4 fusos oficiais hoje (nenhum observa horário de verão desde
 * 2019): Fernando de Noronha, a maior parte do país, MT/MS/AM/RR/RO, e o
 * Acre/oeste do Amazonas. O backend valida contra qualquer fuso IANA real
 * (não só os desta lista), então essa lista serve apenas para o dropdown.
 */
export const BRAZIL_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
  { value: 'America/Sao_Paulo', label: 'Brasília, Sudeste, Sul, Nordeste, Centro-Oeste (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus / Amazonas (UTC-4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá / Mato Grosso (UTC-4)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande / Mato Grosso do Sul (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco / Acre (UTC-5)' },
];

export const DEFAULT_BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export function getTimezoneLabel(value: string | null | undefined): string {
  return BRAZIL_TIMEZONES.find((tz) => tz.value === value)?.label ?? value ?? DEFAULT_BRAZIL_TIMEZONE;
}
