'use client';

// Comunicação da escola (plano Cenas, fase 9): avisos, calendário e links.
// Tudo passa pelo Flask (/api/partners/<slug>/...); as tabelas não são lidas
// direto do Supabase.

import { useEffect, useState } from 'react';
import { classesFetch } from '@/lib/org-classes';

export const commsFetch = classesFetch;

/** ISO (UTC) → valor de <input type=datetime-local> no fuso do navegador. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface RecurrenceFields {
  recurrence_freq?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_weekdays?: number[] | null;
  recurrence_until?: string | null;
}

export interface SchoolAnnouncement extends RecurrenceFields {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  is_important: boolean;
  visible_class_ids: string[] | null;
  expires_at: string | null;
  created_at: string;
  audience?: number;
  read_count?: number;
  ack_count?: number;
  calendar_starts_at?: string | null;
  calendar_ends_at?: string | null;
  calendar_all_day?: boolean;
}

export interface AnnouncementReads {
  audience: number;
  read_count: number;
  ack_count: number;
  people: { user_id: string; name: string | null; read_at: string | null; acknowledged_at: string | null }[];
}

export type EventKind = 'evento' | 'prova' | 'feriado' | 'prazo' | 'aula';
export type CalendarKind = EventKind | 'aviso';

export interface CalendarItem extends RecurrenceFields {
  id: string;
  source: 'event' | 'simulado' | 'announcement';
  kind: CalendarKind;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  link_url: string | null;
  visible_class_ids: string[] | null;
  modality?: string | null;
  /** Dia (yyyy-mm-dd, fuso SP) desta ocorrência; a série inteira tem o mesmo id. */
  occurrence_date: string;
  recurrence_label?: string | null;
  series_starts_at?: string;
  series_ends_at?: string | null;
  image_url?: string | null;
  is_important?: boolean;
  announcement_source?: 'school' | 'platform';
}

export const EVENT_KIND_LABEL: Record<CalendarKind, string> = {
  evento: 'Evento', prova: 'Prova', feriado: 'Feriado', prazo: 'Prazo', aula: 'Aula', aviso: 'Aviso',
};
export const EVENT_KIND_COLOR: Record<CalendarKind, string> = {
  evento: '#6366f1', prova: '#e11d48', feriado: '#16a34a', prazo: '#d97706', aula: '#7c3aed', aviso: '#0891b2',
};
export const EVENT_KINDS: EventKind[] = ['evento', 'prova', 'feriado', 'prazo', 'aula'];

export interface MenuLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  embeddable: boolean | null;
  embed_reason: string | null;
  position?: number;
  active?: boolean;
  visible_class_ids?: string[] | null;
  embed_checked_at?: string | null;
}

/** "5534999998888" → link wa.me. */
export function whatsappHref(digits: string | null | undefined, text?: string): string | null {
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Links do menu do aluno (uma leitura por montagem do layout). */
export function useMyLinks(slug: string, enabled: boolean) {
  const [links, setLinks] = useState<MenuLink[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    commsFetch<{ links: MenuLink[] }>(slug, '/my-links')
      .then((r) => { if (alive) setLinks(r.links ?? []); })
      .catch(() => { /* módulo desligado/rede: só não mostra */ });
    return () => { alive = false; };
  }, [slug, enabled]);
  return links;
}
