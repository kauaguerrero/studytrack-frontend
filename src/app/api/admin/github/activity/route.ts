import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrDev } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const username = searchParams.get('username');
  const weeks = parseInt(searchParams.get('weeks') ?? '8', 10);
  const repo = searchParams.get('repo');

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const admin = createAdminClient();
  let query = (admin as any)
    .from('github_activity_cache')
    .select('*')
    .gte('week_start', sinceStr)
    .order('week_start', { ascending: true });

  if (username) query = query.eq('github_username', username);
  if (repo) query = query.eq('repo', repo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: links } = await (admin as any)
    .from('dev_github_links')
    .select('github_username, profiles(full_name, avatar_url)');

  const linkMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
  for (const l of links ?? []) {
    linkMap[l.github_username] = l.profiles;
  }

  const { data: lastSync } = await (admin as any)
    .from('github_activity_cache')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    activity: data,
    links: linkMap,
    last_synced_at: lastSync?.synced_at ?? null,
  });
}
