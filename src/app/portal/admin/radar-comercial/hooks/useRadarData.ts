import useSWR from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';
import type { RadarGeoResponse } from '../types';
import type { Lead } from '../../prospeccao/types';

export function useNationalGeo() {
  return useSWR<RadarGeoResponse>(
    '/api/admin/prospeccao/radar/geo?level=national',
    apiFetcher,
    { refreshInterval: 60_000 }
  );
}

export function useStateGeo(uf: string | null) {
  return useSWR<RadarGeoResponse>(
    uf ? `/api/admin/prospeccao/radar/geo?level=state&uf=${uf}` : null,
    apiFetcher,
    { refreshInterval: 60_000 }
  );
}

// All leads for individual pin rendering — refreshes every 2 minutes
export function useAllLeads() {
  return useSWR<{ leads: Lead[] }>(
    '/api/admin/prospeccao/leads',
    apiFetcher,
    { refreshInterval: 120_000, revalidateOnFocus: false }
  );
}
