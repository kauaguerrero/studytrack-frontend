import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

const FEATURE_LABELS: Record<string, { label: string; category: string }> = {
  essay_transcription: { label: 'Transcrição de Redação', category: 'Redações' },
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();

  const { data: logs, error } = await (supabase as any)
    .from('ai_usage_logs')
    .select('id, user_id, feature_name, model_name, input_tokens, output_tokens, cost_usd, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    return NextResponse.json({ error: 'Falha ao buscar logs de uso.' }, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Resolve org names from org_ids in metadata
  const orgIds: string[] = [...new Set(
    logs
      .map((l: any) => l.metadata?.org_id)
      .filter(Boolean) as string[]
  )];

  let orgMap: Record<string, string> = {};
  if (orgIds.length > 0) {
    const { data: orgs } = await (supabase as any)
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    if (orgs) {
      orgMap = Object.fromEntries(orgs.map((o: any) => [o.id, o.name]));
    }
  }

  const items = logs.map((log: any) => {
    const feature = FEATURE_LABELS[log.feature_name] ?? {
      label: log.feature_name,
      category: 'Geral',
    };
    const orgId = log.metadata?.org_id ?? null;

    return {
      id: log.id,
      feature_label: feature.label,
      category: feature.category,
      model_name: log.model_name,
      org_name: orgId ? (orgMap[orgId] ?? 'Org desconhecida') : null,
      input_tokens: log.input_tokens ?? 0,
      output_tokens: log.output_tokens ?? 0,
      total_tokens: (log.input_tokens ?? 0) + (log.output_tokens ?? 0),
      cost_usd: log.cost_usd ?? null,
      created_at: log.created_at,
    };
  });

  return NextResponse.json({ items });
}
