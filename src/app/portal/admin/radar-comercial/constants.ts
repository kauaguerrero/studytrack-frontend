import type { MetricLayer } from './types';

export const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo',
  TO: 'Tocantins',
};

// IBGE numeric code for each UF sigla — used for municipality GeoJSON URL
export const IBGE_CODES: Record<string, number> = {
  AC: 12, AL: 27, AM: 13, AP: 16, BA: 29, CE: 23, DF: 53, ES: 32, GO: 52,
  MA: 21, MG: 31, MS: 50, MT: 51, PA: 15, PB: 25, PE: 26, PI: 22, PR: 41,
  RJ: 33, RN: 24, RO: 11, RR: 14, RS: 43, SC: 42, SE: 28, SP: 35, TO: 17,
};

export const METRIC_LAYERS: { key: MetricLayer; label: string; shortLabel: string }[] = [
  { key: 'leads',    label: 'Densidade de leads',    shortLabel: 'Leads' },
  { key: 'conversao', label: 'Taxa de conversão',    shortLabel: 'Conversão' },
  { key: 'ticket',   label: 'Ticket médio potencial', shortLabel: 'Ticket' },
  { key: 'esfriando', label: 'Leads esfriando',     shortLabel: 'Esfriando' },
];

// Centroid positions (cx, cy) for each UF in the simplemaps 1000×912 SVG
// Source: <circle> elements in /public/geo/brazil-states.svg
export const STATE_CENTROIDS: Record<string, [number, number]> = {
  AC: [136.5, 345.5], AL: [800.6, 345.3], AM: [215.2, 233.1], AP: [492.7, 124.0],
  BA: [697.6, 397.7], CE: [741.0, 247.1], DF: [573.7, 469.3], ES: [724.2, 542.5],
  GO: [526.6, 487.8], MA: [622.9, 254.2], MG: [644.1, 527.0], MS: [430.2, 562.7],
  MT: [409.9, 419.8], PA: [461.3, 259.6], PB: [811.1, 291.7], PE: [759.9, 315.3],
  PI: [671.2, 311.0], PR: [489.8, 658.5], RJ: [680.3, 610.0], RN: [798.0, 263.9],
  RO: [259.8, 363.7], RR: [300.5, 101.0], RS: [461.1, 773.3], SC: [528.0, 718.5],
  SE: [784.8, 359.8], SP: [560.9, 605.0], TO: [562.1, 361.7],
};

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail',
  reuniao_presencial: 'Reunião presencial', reuniao_online: 'Reunião online', outro: 'Outro',
};

export const FUNNEL_ORDER = [
  'novo', 'contatado', 'respondeu', 'handoff', 'esperando_contato_gestor',
  'aguardando_confirmacao_call', 'call_agendado', 'interesse', 'demo_teste',
  'enviar_proposta', 'proposta_enviada', 'fechado', 'perdido',
];

export const FUNNEL_LABELS: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  respondeu: 'Respondeu',
  handoff: 'Handoff',
  esperando_contato_gestor: 'Aguardando gestor',
  aguardando_confirmacao_call: 'Aguard. confirmação call',
  call_agendado: 'Call agendado',
  interesse: 'Com interesse',
  demo_teste: 'Em demo/teste',
  enviar_proposta: 'A enviar proposta',
  proposta_enviada: 'Proposta enviada',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

// Choropleth color scale: light → dark for the violet/indigo palette
export function metricValue(region: { total_leads: number; taxa_conversao: number; ticket_medio: number | null; leads_esfriando: number }, metric: MetricLayer): number {
  switch (metric) {
    case 'leads': return region.total_leads;
    case 'conversao': return region.taxa_conversao;
    case 'ticket': return region.ticket_medio ?? 0;
    case 'esfriando': return region.leads_esfriando;
  }
}

export function choroplethColor(value: number, max: number, metric: MetricLayer): string {
  if (max === 0) return '#e2e8f0';
  const t = Math.min(value / max, 1);
  if (t === 0) return '#f1f5f9';

  // esfriando = orange/amber scale (warning); others = violet scale
  if (metric === 'esfriando') {
    const r = Math.round(255 - t * (255 - 245));
    const g = Math.round(237 - t * (237 - 124));
    const b = Math.round(213 - t * (213 - 26));
    return `rgb(${r},${g},${b})`;
  }

  const r = Math.round(237 - t * (237 - 79));
  const g = Math.round(233 - t * (233 - 70));
  const b = Math.round(254 - t * (254 - 229));
  return `rgb(${r},${g},${b})`;
}
