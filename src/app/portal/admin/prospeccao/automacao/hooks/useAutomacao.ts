'use client';

import useSWR, { mutate } from 'swr';
import { apiFetcher } from '@/lib/api-fetcher';
import type {
  AutomationConfig,
  DailyInsight,
  Flow,
  FlowDetail,
  HandoffItem,
  LeadFilterOptions,
  ManualQueueItem,
  WorkerLog,
  WorkerStatus,
} from '../types';

const WORKER_KEY = '/api/admin/prospeccao/automacao/worker';
const WORKER_LOGS_KEY = '/api/admin/prospeccao/automacao/worker/logs';
const FLOWS_KEY = '/api/admin/prospeccao/automacao/flows';
const CONFIG_KEY = '/api/admin/prospeccao/automacao/config';
const INSIGHTS_KEY = '/api/admin/prospeccao/automacao/insights';
const HANDOFF_KEY = '/api/admin/prospeccao/automacao/handoff';
const LEAD_FILTER_OPTIONS_KEY = '/api/admin/prospeccao/automacao/lead-filter-options';
const MANUAL_QUEUE_KEY = '/api/admin/prospeccao/automacao/manual-queue';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Worker (status/QR/heartbeat + comando start/stop) ─────────────────────────

export function useWorkerStatus() {
  const { data, error, isLoading } = useSWR<{ worker: WorkerStatus }>(WORKER_KEY, apiFetcher, {
    refreshInterval: 4_000,
    revalidateOnFocus: false,
  });
  return {
    worker: data?.worker ?? null,
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate(WORKER_KEY),
  };
}

export async function apiSetWorkerCommand(command: 'start' | 'stop' | 'logout'): Promise<{ worker: WorkerStatus }> {
  const result = await fetchJSON<{ worker: WorkerStatus }>(WORKER_KEY, {
    method: 'PATCH',
    body: JSON.stringify({ command }),
  });
  void mutate(WORKER_KEY);
  return result;
}

export function useWorkerLogs() {
  const { data, error, isLoading } = useSWR<{ logs: WorkerLog[] }>(WORKER_LOGS_KEY, apiFetcher, {
    refreshInterval: 2_000,
    revalidateOnFocus: false,
  });
  return {
    logs: data?.logs ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

// ── Fluxos ──────────────────────────────────────────────────────────────────

export function useFlows() {
  const { data, error, isLoading } = useSWR<{ flows: Flow[] }>(FLOWS_KEY, apiFetcher, {
    revalidateOnFocus: false,
  });
  return {
    flows: data?.flows ?? [],
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate(FLOWS_KEY),
  };
}

export async function apiCreateFlow(body: {
  name: string;
  is_default?: boolean;
  filter_config?: Record<string, string[]>;
}): Promise<{ flow: Flow }> {
  const result = await fetchJSON<{ flow: Flow }>(FLOWS_KEY, { method: 'POST', body: JSON.stringify(body) });
  void mutate(FLOWS_KEY);
  return result;
}

export async function apiDeleteFlow(id: string): Promise<void> {
  await fetchJSON(`${FLOWS_KEY}/${id}`, { method: 'DELETE' });
  void mutate(FLOWS_KEY);
}

export async function apiPatchFlow(id: string, patch: Partial<Flow>): Promise<void> {
  await fetchJSON(`${FLOWS_KEY}/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  void mutate(FLOWS_KEY);
}

export async function apiGetFlowDetail(id: string): Promise<FlowDetail> {
  return fetchJSON(`${FLOWS_KEY}/${id}`);
}

export async function apiSaveFlowGraph(id: string, body: Partial<Flow> & Record<string, unknown>): Promise<void> {
  await fetchJSON(`${FLOWS_KEY}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  void mutate(FLOWS_KEY);
}

// ── Config de pacing ────────────────────────────────────────────────────────

export function useAutomationConfig() {
  const { data, error, isLoading } = useSWR<{ config: AutomationConfig }>(CONFIG_KEY, apiFetcher, {
    revalidateOnFocus: false,
  });
  return {
    config: data?.config ?? null,
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate(CONFIG_KEY),
  };
}

export async function apiPatchConfig(patch: Partial<AutomationConfig>): Promise<{ config: AutomationConfig }> {
  const result = await fetchJSON<{ config: AutomationConfig }>(CONFIG_KEY, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  void mutate(CONFIG_KEY);
  return result;
}

// ── Insights diários (Gemini) ───────────────────────────────────────────────

export function useDailyInsights() {
  const { data, error, isLoading } = useSWR<{ insights: DailyInsight[] }>(INSIGHTS_KEY, apiFetcher, {
    revalidateOnFocus: false,
  });
  return {
    insights: data?.insights ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

// ── Handoff (conversas aguardando ação humana) ─────────────────────────────

export function useHandoff() {
  const { data, error, isLoading } = useSWR<{ handoff: HandoffItem[] }>(HANDOFF_KEY, apiFetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: false,
  });
  return {
    handoff: data?.handoff ?? [],
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate(HANDOFF_KEY),
  };
}

export async function apiAssumirHandoff(phone: string): Promise<void> {
  await fetchJSON(`${HANDOFF_KEY}/${phone}/assumir`, { method: 'POST' });
  void mutate(HANDOFF_KEY);
}

// ── Opções de filtro de leads (seletor cascade do "Novo fluxo") ────────────

export function useLeadFilterOptions(selectedUfs: string[]) {
  const ufsKey = [...selectedUfs].sort().join(',');
  const key = ufsKey ? `${LEAD_FILTER_OPTIONS_KEY}?ufs=${encodeURIComponent(ufsKey)}` : LEAD_FILTER_OPTIONS_KEY;
  const { data, error, isLoading } = useSWR<LeadFilterOptions>(key, apiFetcher, {
    revalidateOnFocus: false,
  });
  return {
    ufs: data?.ufs ?? [],
    municipios: data?.municipios ?? [],
    source_channels: data?.source_channels ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}

// ── Fila manual de disparo prioritário ─────────────────────────────────────

export function useManualQueue() {
  const { data, error, isLoading } = useSWR<{ queue: ManualQueueItem[] }>(MANUAL_QUEUE_KEY, apiFetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: false,
  });
  return {
    queue: data?.queue ?? [],
    isLoading,
    error: error as Error | undefined,
    reload: () => mutate(MANUAL_QUEUE_KEY),
  };
}

export async function apiAddToManualQueue(leadIds: string[]): Promise<{ added: string[] }> {
  const result = await fetchJSON<{ added: string[] }>(MANUAL_QUEUE_KEY, {
    method: 'POST',
    body: JSON.stringify({ lead_ids: leadIds }),
  });
  void mutate(MANUAL_QUEUE_KEY);
  return result;
}

export async function apiClearManualQueue(): Promise<void> {
  await fetchJSON(MANUAL_QUEUE_KEY, { method: 'DELETE' });
  void mutate(MANUAL_QUEUE_KEY);
}

export async function apiDispatchNextInQueue(): Promise<{ dispatched?: string; skipped?: string }> {
  const result = await fetchJSON<{ dispatched?: string; skipped?: string }>(`${MANUAL_QUEUE_KEY}/dispatch-next`, {
    method: 'POST',
  });
  void mutate(MANUAL_QUEUE_KEY);
  return result;
}
