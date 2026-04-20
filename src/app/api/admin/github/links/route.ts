import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrDev } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from('dev_github_links')
    .select('id, profile_id, github_username, profiles(full_name, avatar_url)')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  const { profile_id, github_username } = await request.json();
  if (!profile_id || !github_username) {
    return NextResponse.json({ error: 'profile_id e github_username obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from('dev_github_links')
    .upsert(
      { profile_id, github_username: github_username.trim().toLowerCase() },
      { onConflict: 'profile_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  const { profile_id } = await request.json();
  const admin = createAdminClient();
  await (admin as any).from('dev_github_links').delete().eq('profile_id', profile_id);
  return NextResponse.json({ ok: true });
}
