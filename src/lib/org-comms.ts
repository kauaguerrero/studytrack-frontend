'use client';

// Comunicação da escola (plano Cenas, fase 9): avisos, calendário e links.
// Tudo passa pelo Flask (/api/partners/<slug>/...); as tabelas não são lidas
// direto do Supabase.

import { useEffect, useState } from 'react';
import { classesFetch } from '@/lib/org-classes';

export const commsFetch = classesFetch;

export interface SchoolAnnouncement {
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
}

export interface AnnouncementReads {
  audience: number;
  read_count: number;
  ack_count: number;
  people: { user_id: string; name: string | null; read_at: string | null; acknowledged_at: string | null }[];
}

export type EventKind = 'evento' | 'prova' | 'feriado' | 'prazo' | 'aula';

export interface CalendarItem {
  id: string;
  source: 'event' | 'simulado';
  kind: EventKind;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  link_url: string | null;
  visible_class_ids: string[] | null;
  modality?: string | null;
}

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  evento: 'Evento', prova: 'Prova', feriado: 'Feriado', prazo: 'Prazo', aula: 'Aula',
};
export const EVENT_KIND_COLOR: Record<EventKind, string> = {
  evento: '#6366f1', prova: '#e11d48', feriado: '#16a34a', prazo: '#d97706', aula: '#7c3aed',
};

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
