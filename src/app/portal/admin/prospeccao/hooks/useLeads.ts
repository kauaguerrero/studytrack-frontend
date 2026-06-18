'use client';

import useSWR, { mutate } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';
import type {
  Lead,
  LeadContact,
  LeadFilters,
  LeadsStats,
  ImportJob,
  LeadStatusCRM,
  LeadTemperature,
} from '../types';

const LEADS_BASE = '/api/admin/prospeccao/leads';
const STATS_KEY = '/api/admin/prospeccao/stats';

function buildLeadsKey(filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (filters.uf) params.set('uf', filters.uf);
  if (filters.status) params.set('status', filters.status);
  if (filters.has_phone) params.set('has_phone', '1');
  if (filters.search) params.set('search', filters.search);
  if (filters.temperature) params.set('temperature', filters.temperature);
  const qs = params.toString();
  return qs ? `${LEADS_BASE}?${qs}` : LEADS_BASE;
}

export function useLeads(filters: LeadFilters) {
  const key = buildLeadsKey(filters);
  const { data, error, isLoading } = useSWR<{ leads: Lead[] }>(
    key,
    apiFetcher,
    { revalidateOnFocus: false }
  );
  return {
    leads: data?.leads ?? [],
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate((k) => typeof k === 'string' && k.startsWith(LEADS_BASE)),
  };
}

export function useLeadsStats() {
  const { data, error, isLoading } = useSWR<LeadsStats>(
    STATS_KEY,
    apiFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  return {
    stats: data ?? null,
    isLoading,
    error: error as Error | undefined,
    reloadStats: () => mutate(STATS_KEY),
  };
}

export function reloadAllLeadsData() {
  void mutate((k) => typeof k === 'string' && k.startsWith(LEADS_BASE));
  void mutate(STATS_KEY);
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiUpdateLead(
  id: string,
  patch: Partial<Pick<Lead, 'status_crm' | 'temperature' | 'observacoes' | 'next_followup_at'>>
): Promise<{ lead: Lead }> {
  return fetchJSON(`${LEADS_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function apiCreateLead(body: {
  razao_social: string;
  nome_fantasia?: string;
  uf?: string;
  municipio?: string;
  telefone1?: string;
  email?: string;
  nome_socio?: string;
  status_crm?: LeadStatusCRM;
  temperature?: LeadTemperature;
  source_channel?: string;
  next_followup_at?: string | null;
  observacoes?: string;
}): Promise<{ lead: Lead }> {
  return fetchJSON(LEADS_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiDeleteLead(id: string): Promise<void> {
  const res = await fetch(`${LEADS_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function apiAddContact(
  leadId: string,
  body: {
    channel: string;
    response: string;
    notes?: string;
    next_action?: string;
    temperature?: string;
  }
): Promise<{ contact: LeadContact }> {
  return fetchJSON(`${LEADS_BASE}/${leadId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiCreateMockOrg(
  leadId: string,
  orgName: string
): Promise<{ org_url: string }> {
  return fetchJSON(`${LEADS_BASE}/${leadId}/create-mock-org`, {
    method: 'POST',
    body: JSON.stringify({ org_name: orgName }),
  });
}

export async function apiConvertLead(leadId: string): Promise<{ ok: true }> {
  return fetchJSON(`${LEADS_BASE}/${leadId}/convert`, { method: 'POST' });
}

export async function apiStartImport(
  keywords: string[]
): Promise<{ job_id: string }> {
  return fetchJSON('/api/admin/prospeccao/import', {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  });
}

export async function apiGetImportJob(jobId: string): Promise<ImportJob> {
  return fetchJSON(`/api/admin/prospeccao/import/${jobId}`);
}
