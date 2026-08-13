import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: calls, error } = await db
    .from('lead_calls')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!calls || calls.length === 0) return NextResponse.json({ calls: [] });

  const recorderIds = [...new Set<string>(calls.map((c: { recorded_by: string }) => c.recorded_by))];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, email')
    .in('id', recorderIds);

  const profileMap: Record<string, { full_name: string | null; email: string | null }> =
    Object.fromEntries((profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p]));

  const enriched = calls.map((c: { recorded_by: string }) => ({
    ...c,
    recorded_by_name:
      profileMap[c.recorded_by]?.full_name ?? profileMap[c.recorded_by]?.email ?? '—',
  }));

  return NextResponse.json({ calls: enriched });
}
