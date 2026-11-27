'use client';

// Integrações da escola (plano Cenas, fase 11) — Galileu financeiro, só leitura.
// Rotas Flask em /api/partners/<slug>/integrations/galileu e /my-finance.
// A chave da API nunca volta do servidor: só os 4 últimos caracteres.

import { classesFetch } from '@/lib/org-classes';

export const integrationsFetch = classesFetch;

export interface GalileuStatus {
  provider: 'galileu';
  enabled: boolean;
  configured: boolean;
  key_source: 'org' | 'env' | 'invalid' | null;
  key_last4: string | null;
  last_check_at: string | null;
  last_check_ok: boolean | null;
  last_error: string | null;
  ok?: boolean;
  error?: string | null;
}

export interface GalileuStudent { id_aluno: string; nome: string | null; email: string | null; rm: string | null; cpf: string | null }

export type MatchedBy = 'email' | 'cpf' | 'manual' | 'nome';

export interface LinkRow {
  user_id: string;
  name: string | null;
  email: string | null;
  /** CPF aprovado, sempre mascarado (***.123.456-**). */
  cpf?: string | null;
  cpf_source?: 'integracoes' | 'planilha' | 'aluno' | null;
  /** CPF que o aluno informou e espera a aprovação do gestor (mascarado). */
  cpf_pending?: string | null;
  /** Sem CPF aprovado: aluno do Galileu com o mesmo nome (único). O gestor confirma ou descarta. */
  suggestion?: GalileuStudent | null;
  link: null | { external_student_id: string; matched_by: MatchedBy; galileu: GalileuStudent | null };
}

export interface LinkOverview { students: LinkRow[]; linked: number; total: number; suggestions?: number; cpf_pending?: number }

export interface MyCpf { cpf: string | null; pending: string | null }

export const MATCHED_BY_LABEL: Record<MatchedBy, string> = {
  email: 'pelo e-mail', cpf: 'pelo CPF', manual: 'manual', nome: 'pelo nome (confirmado)',
};

/** Só dígitos, no máximo 11; formata 000.000.000-00 enquanto digita. */
export function formatCpfInput(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** Dígitos verificadores do CPF (o servidor confere de novo). */
export function isValidCpf(v: string): boolean {
  const d = v.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n - 1; i++) s += Number(d[i]) * (n - i);
    return ((s * 10) % 11) % 10;
  };
  return dig(10) === Number(d[9]) && dig(11) === Number(d[10]);
}

export type InstallmentStatus = 'paga' | 'aberta' | 'vencida' | 'cancelada' | 'outra';

export interface Installment {
  id: string;
  kind: 'mensalidade' | 'avulsa';
  description: string;
  due_date: string | null;
  paid_date: string | null;
  amount: number | null;
  total: number | null;
  paid_amount: number | null;
  fine: number | null;
  status: InstallmentStatus;
  status_label: string | null;
  link: string | null;
}

export interface MyFinance {
  whatsapp_finance: string | null;
  linked: boolean;
  installments: Installment[];
  summary: null | {
    overdue_count: number; overdue_total: number; open_count: number; open_total: number;
    paid_count: number; next_due: string | null;
  };
  fetched_at?: string;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (v: number | null | undefined) => (v == null ? '—' : BRL.format(v));

/** "2026-12-10" → "10/12/2026" sem passar por fuso horário. */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Separa as parcelas nas três listas que o aluno vê (canceladas ficam de fora). */
export function groupInstallments(items: Installment[]) {
  const byDue = (a: Installment, b: Installment) => (a.due_date ?? '').localeCompare(b.due_date ?? '');
  return {
    vencidas: items.filter((i) => i.status === 'vencida').sort(byDue),
    abertas: items.filter((i) => i.status === 'aberta').sort(byDue),
    pagas: items.filter((i) => i.status === 'paga').sort((a, b) => byDue(b, a)),
  };
}
