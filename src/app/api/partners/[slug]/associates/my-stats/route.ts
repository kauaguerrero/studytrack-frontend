import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type OrgRow = { id: string; slug: string };
type AnnRow = { created_at: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Supabase Admin não configurado.' }, { status: 500 });
  }

  const profilesTable = adminClient.from('profiles') as any;
  const organizationsTable = adminClient.from('organizations') as any;
  const annotationsTable = adminClient.from('essay_annotations') as any;

  const [{ data: requester }, { data: org }] = await Promise.all([
    profilesTable.select('role, organization_id').eq('id', user.id).maybeSingle(),
    organizationsTable.select('id, slug').eq('slug', slug).maybeSingle(),
  ]) as [{ data: { role: string | null; organization_id: string | null } | null }, { data: OrgRow | null }];

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }
  if (requester?.role !== 'associate' || requester?.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { data: annotations } = await annotationsTable
    .select('created_at')
    .eq('author_id', user.id)
    .eq('type', 'correction') as { data: AnnRow[] | null };

  const all = annotations ?? [];
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 3_600_000);

  let today = 0, week = 0, month = 0;
  for (const ann of all) {
    const t = ann.created_at;
    if (t >= todayStart.toISOString()) today++;
    if (t >= weekStart.toISOString()) week++;
    if (t >= monthStart.toISOString()) month++;
  }

  return NextResponse.json({ today, week, month, total: all.length });
}
