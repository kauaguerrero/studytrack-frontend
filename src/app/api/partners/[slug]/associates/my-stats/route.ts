import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type OrgRow = { id: string; slug: string };
type CorrRow = { corrected_at: string };

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
  const essaysTable = adminClient.from('essays') as any;
  const correctionsTable = adminClient.from('essay_corrections') as any;

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

  // Fonte autoritativa é essay_corrections (gravada ao submeter a correção), não
  // essay_annotations tipo 'correction' — anotações de texto são opcionais e o
  // corretor pode avaliar (notas + comentário geral) sem marcar nenhum trecho,
  // o que zerava as métricas mesmo com redações efetivamente corrigidas.
  const { data: orgEssays } = await essaysTable.select('id').eq('org_id', org.id) as { data: { id: string }[] | null };
  const orgEssayIds = (orgEssays ?? []).map((e) => e.id);
  const safeEssayIds = orgEssayIds.length > 0 ? orgEssayIds : ['00000000-0000-0000-0000-000000000000'];

  const { data: corrections } = await correctionsTable
    .select('corrected_at')
    .eq('corrector_id', user.id)
    .in('essay_id', safeEssayIds) as { data: CorrRow[] | null };

  const all = corrections ?? [];
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 3_600_000);

  let today = 0, week = 0, month = 0;
  for (const c of all) {
    const t = c.corrected_at;
    if (t >= todayStart.toISOString()) today++;
    if (t >= weekStart.toISOString()) week++;
    if (t >= monthStart.toISOString()) month++;
  }

  return NextResponse.json({ today, week, month, total: all.length });
}
