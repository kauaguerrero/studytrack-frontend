import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY ?? '';
const BUNNY_STREAM_BASE = 'https://video.bunnycdn.com';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  // Fetch org
  const { data: org, error: orgErr } = await db
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  // Check if already provisioned
  const { data: existing } = await db
    .from('video_libraries')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Library já provisionada' }, { status: 409 });
  }

  // Create Bunny library
  const bunnyRes = await fetch(`${BUNNY_STREAM_BASE}/videoLibrary`, {
    method: 'POST',
    headers: {
      AccessKey: BUNNY_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Name: `studytrack-${org.slug}` }),
  });

  if (!bunnyRes.ok) {
    const text = await bunnyRes.text();
    return NextResponse.json(
      { error: `Bunny error: ${bunnyRes.status} — ${text}` },
      { status: 502 },
    );
  }

  const bunny = await bunnyRes.json();
  const libraryId: number = bunny.Id;
  const apiKey: string = bunny.ApiKey;

  // Save to DB
  const { data: lib, error: dbErr } = await db
    .from('video_libraries')
    .insert({
      org_id: orgId,
      bunny_library_id: libraryId,
      bunny_api_key: apiKey,
      is_active: true,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ library: lib }, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  const { error } = await db
    .from('video_libraries')
    .delete()
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
