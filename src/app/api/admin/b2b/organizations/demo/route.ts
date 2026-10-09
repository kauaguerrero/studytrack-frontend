import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildDemoStatsSeed, PHYSICS_SUBJECT_WEIGHTS } from '@/lib/demo-org-seed';

// Presets de distribuição por matéria. A demo de um cursinho de Física precisa
// abrir com Física dominando o gráfico de desempenho; a de um generalista, não.
const SUBJECT_PRESETS = {
  geral: undefined,
  fisica: PHYSICS_SUBJECT_WEIGHTS,
} as const;

type SubjectPreset = keyof typeof SUBJECT_PRESETS;

export const dynamic = 'force-dynamic';

// Cria uma org demo (is_mock=true) com stats já mockadas em `demo_stats`,
// sem criar nenhum founder/aluno real nem linha em profiles/user_answers/
// simulado_sessions/essays. Rota separada de POST /organizations pra manter
// o fluxo de criação de instituição real 100% intocado.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const {
    name,
    brand_primary = '#6366f1',
    brand_secondary = '#8b5cf6',
    brand_accent = '#f59e0b',
    logo_url = null,
    subject_preset = 'geral',
    focus_area,
  } = body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const db = admin as any;

  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'org-demo';

  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data: existing } = await db
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const presetKey: SubjectPreset =
    subject_preset in SUBJECT_PRESETS ? (subject_preset as SubjectPreset) : 'geral';

  const demoStats = buildDemoStatsSeed({
    subjectWeights: SUBJECT_PRESETS[presetKey],
    focusArea: typeof focus_area === 'string' && focus_area.trim() ? focus_area.trim() : undefined,
    // Semente derivada do slug: cada org demo recebe números próprios em vez de
    // repetir exatamente a mesma série da anterior.
    seed: [...baseSlug].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7),
  });

  const { data: org, error } = await db
    .from('organizations')
    .insert({
      name: name.trim(),
      slug,
      is_mock: true,
      plan_tier: 'b2b_pro',
      max_students: 200,
      brand_primary,
      brand_secondary,
      brand_accent,
      logo_url,
      permissions: {
        ranking_enabled: true,
        redacoes_enabled: true,
        video_lessons_enabled: true,
        simulados_enabled: true,
        planos_enabled: true,
        banco_questoes_enabled: true,
        desempenho_enabled: true,
        titulos_enabled: true,
        suporte_enabled: true,
      },
      demo_stats: demoStats,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: org }, { status: 201 });
}
