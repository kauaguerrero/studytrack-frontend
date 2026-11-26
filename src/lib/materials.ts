'use client';

// Material em PDF + anotações (plano Cenas, fase 10) — cliente das rotas Flask
// /api/partners/<slug>/materials. O PDF vem do R2 por URL assinada (15 min).

import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';
import { classesFetch } from '@/lib/org-classes';

export const materialsFetch = classesFetch;
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  discipline: string | null;
  visible_class_ids: string[] | null;
  file_name: string | null;
  file_size: number;
  page_count: number | null;
  position: number;
  created_at: string;
  annotated_pages?: number;
}

export type StrokeTool = 'pen' | 'hl';
/** Coordenadas normalizadas (0..1) da página: valem em qualquer zoom. */
export interface Stroke { t: StrokeTool; c: string; w: number; p: [number, number][] }
export interface Note { id: string; x: number; y: number; text: string }
export interface PageAnnotation { strokes: Stroke[]; notes: Note[] }

export const EMPTY_PAGE: PageAnnotation = { strokes: [], notes: [] };

export async function uploadMaterial(slug: string, file: File, fields: {
  title: string; subject?: string | null; discipline?: string | null; description?: string | null; visible_class_ids: string[] | null;
}): Promise<Material> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', fields.title);
  if (fields.subject) fd.append('subject', fields.subject);
  if (fields.discipline) fd.append('discipline', fields.discipline);
  if (fields.description) fd.append('description', fields.description);
  fd.append('visible_class_ids', JSON.stringify(fields.visible_class_ids));
  const { data: { session } } = await createClient().auth.getSession();
  const res = await fetch(`${getApiBaseUrl()}/api/partners/${slug}/materials`, {
    method: 'POST', body: fd, headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Não foi possível enviar o PDF.');
  return (body as { material: Material }).material;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Distância do ponto ao segmento (coordenadas normalizadas) — usada pela borracha. */
export function distToSegment(px: number, py: number, a: [number, number], b: [number, number]): number {
  const [ax, ay] = a; const [bx, by] = b;
  const dx = bx - ax; const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Índice do traço tocado pela borracha (o mais recente primeiro), ou -1. */
export function strokeHit(strokes: Stroke[], x: number, y: number, radius = 0.012): number {
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const p = strokes[i].p;
    if (p.length === 1 && Math.hypot(p[0][0] - x, p[0][1] - y) <= radius) return i;
    for (let j = 1; j < p.length; j += 1) if (distToSegment(x, y, p[j - 1], p[j]) <= radius) return i;
  }
  return -1;
}

/** Reduz pontos muito próximos (traço mais leve para salvar). */
export function simplify(points: [number, number][], min = 0.002): [number, number][] {
  if (points.length < 3) return points;
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [lx, ly] = out[out.length - 1];
    if (Math.hypot(points[i][0] - lx, points[i][1] - ly) >= min) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
}
