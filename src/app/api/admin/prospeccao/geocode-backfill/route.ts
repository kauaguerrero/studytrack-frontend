import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

// Max leads to geocode per call (avoids timeout on Vercel's 60s limit)
const BATCH_SIZE = 50;

const PLACES_DETAIL_URL = 'https://places.googleapis.com/v1/places';

interface PlacesDetailResult {
  location?: { latitude: number; longitude: number };
  addressComponents?: Array<{
    shortText?: string;
    longText?: string;
    types?: string[];
  }>;
}

const UF_ABBR = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

function extractUF(components: PlacesDetailResult['addressComponents']): string | null {
  if (!components) return null;
  for (const c of components) {
    if (c.types?.includes('administrative_area_level_1')) {
      const short = (c.shortText ?? '').toUpperCase();
      if (UF_ABBR.has(short)) return short;
    }
  }
  return null;
}

async function fetchPlaceDetail(placeId: string, apiKey: string): Promise<PlacesDetailResult | null> {
  const url = `${PLACES_DETAIL_URL}/${placeId}?fields=location,addressComponents&key=${apiKey}`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) return null;
  return res.json() as Promise<PlacesDetailResult>;
}

// GET  → returns counts (how many leads still need geocoding)
export async function GET(_req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { count: total } = await db
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .not('place_id', 'is', null);

  const { count: pending } = await db
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .not('place_id', 'is', null)
    .is('lat', null);

  return NextResponse.json({ total: total ?? 0, pending: pending ?? 0, batch_size: BATCH_SIZE });
}

// POST → geocodes one batch of leads missing lat/lng
export async function POST(_req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY não configurada' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: leads, error } = await db
    .from('leads')
    .select('id, place_id, uf')
    .not('place_id', 'is', null)
    .is('lat', null)
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads || leads.length === 0) {
    return NextResponse.json({ processed: 0, updated: 0, uf_mismatches: 0, message: 'Todos os leads já geocodificados.' });
  }

  let updated = 0;
  let failed  = 0;
  const ufMismatches: { id: string; stored_uf: string | null; real_uf: string | null }[] = [];

  for (const lead of leads as Array<{ id: string; place_id: string; uf: string | null }>) {
    const detail = await fetchPlaceDetail(lead.place_id, apiKey);
    if (!detail?.location) { failed++; continue; }

    const { latitude: lat, longitude: lng } = detail.location;
    const realUF = extractUF(detail.addressComponents);

    const patch: Record<string, unknown> = { lat, lng, updated_at: new Date().toISOString() };

    // If the stored UF doesn't match what Places says, record for reporting
    // (don't auto-correct — admin reviews the list)
    if (realUF && lead.uf && realUF !== lead.uf) {
      ufMismatches.push({ id: lead.id, stored_uf: lead.uf, real_uf: realUF });
    }

    const { error: patchErr } = await db
      .from('leads')
      .update(patch)
      .eq('id', lead.id);

    if (patchErr) { failed++; }
    else { updated++; }
  }

  return NextResponse.json({
    processed:    leads.length,
    updated,
    failed,
    uf_mismatches: ufMismatches.length,
    mismatches:    ufMismatches,
  });
}
