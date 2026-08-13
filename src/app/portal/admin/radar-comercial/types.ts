export type MetricLayer = 'leads' | 'conversao' | 'ticket' | 'esfriando';
export type MapLevel = 'national' | 'state';

export interface SelectedRegion {
  level: MapLevel;
  uf?: string;
  name?: string;
}

export interface RegionData {
  key: string;
  name: string;
  total_leads: number;
  novos: number;
  fechados: number;
  decididos: number;
  taxa_conversao: number;
  ticket_medio: number | null;
  leads_esfriando: number;
}

export interface KPITotals {
  total_leads: number;
  taxa_conversao: number;
  ticket_medio: number | null;
  leads_esfriando: number;
}

export interface RadarGeoResponse {
  level: MapLevel;
  uf: string | null;
  regions: RegionData[];
  totals: KPITotals;
  funnel: Record<string, number>;
}
