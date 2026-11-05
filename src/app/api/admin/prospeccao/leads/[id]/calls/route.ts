import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Validade da URL assinada do áudio. A tela re-busca a lista ao abrir o lead. */
const AUDIO_SIGN_TTL_SECONDS = 2 * 3600;

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

  // Bucket `lead-call-recordings` é privado: `audio_url` devolvido é uma URL
  // assinada temporária gerada a partir de `audio_path` (a URL gravada no banco
  // não abre). Sem `audio_path` (áudio apagado) → null, e a tela esconde o player.
  const audioPaths = [
    ...new Set<string>(
      calls
        .map((c: { audio_path: string | null }) => c.audio_path)
        .filter((p: string | null): p is string => !!p),
    ),
  ];
  const signedByPath: Record<string, string> = {};
  if (audioPaths.length > 0) {
    const { data: signed, error: signError } = await db.storage
      .from('lead-call-recordings')
      .createSignedUrls(audioPaths, AUDIO_SIGN_TTL_SECONDS);
    if (signError) console.error('[LeadCalls] Falha ao assinar URLs de áudio:', signError);
    for (const s of (signed ?? []) as Array<{ path: string | null; signedUrl: string | null; error: string | null }>) {
      if (s.path && s.signedUrl && !s.error) signedByPath[s.path] = s.signedUrl;
    }
  }

  const enriched = calls.map((c: { recorded_by: string; audio_path: string | null }) => ({
    ...c,
    audio_url: c.audio_path ? signedByPath[c.audio_path] ?? null : null,
    recorded_by_name:
      profileMap[c.recorded_by]?.full_name ?? profileMap[c.recorded_by]?.email ?? '—',
  }));

  return NextResponse.json({ calls: enriched });
}
