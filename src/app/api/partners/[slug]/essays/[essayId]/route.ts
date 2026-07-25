import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

type CorrectorProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  organization_id?: string | null;
  associate_permissions: { can_correct?: boolean; can_import?: boolean } | null;
};

function canCorrectEssays(profile: Pick<CorrectorProfile, 'role' | 'associate_permissions'>): boolean {
  const role = String(profile.role || '').toLowerCase();
  if (role === 'admin' || role === 'founder' || role === 'teacher') return true;
  if (role === 'associate') return profile.associate_permissions?.can_correct !== false;
  return false;
}

const MAX_GENERAL_COMMENT_LEN = 5000;
const MAX_COMP_COMMENT_LEN = 2000;
const MAX_ANNOTATION_TEXT_LEN = 3000;
const MAX_ANNOTATIONS = 200;

function ensureSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  return null;
}

function resolveTheme(row: Record<string, unknown>): string | null {
  const keys = ['theme', 'essay_theme', 'tema', 'proposal', 'prompt', 'topic', 'title'];
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function normalizeCompetencyScores(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        competency: Number(row.competency || 0),
        score: Number(row.score || 0),
        comment: typeof row.comment === 'string' ? row.comment : null,
      };
    })
    .filter((item) => item.competency > 0);
}

function normalizeAnnotations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id || crypto.randomUUID()),
        start_offset: Number(row.start_offset || 0),
        end_offset: Number(row.end_offset || 0),
        type: row.type === 'correction' ? 'correction' : 'comment',
        comment_text: typeof row.comment_text === 'string' ? row.comment_text : null,
        original_text: typeof row.original_text === 'string' ? row.original_text : null,
        corrected_text: typeof row.corrected_text === 'string' ? row.corrected_text : null,
      };
    })
    .filter((item) => item.end_offset > item.start_offset);
}

async function insertEssayAnnotationsCompat(
  admin: ReturnType<typeof createAdminClient>,
  essayId: string,
  authorId: string,
  incomingAnnotations: unknown[],
) {
  if (incomingAnnotations.length === 0) return { ok: true as const };

  const base = incomingAnnotations.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      essay_id: essayId,
      author_id: authorId,
      start_offset: Number(row.start_offset || 0),
      end_offset: Number(row.end_offset || 0),
      type: row.type === 'correction' ? 'correction' : 'comment',
      comment_text: typeof row.comment_text === 'string' ? row.comment_text : null,
      original_text: typeof row.original_text === 'string' ? row.original_text : null,
      corrected_text: typeof row.corrected_text === 'string' ? row.corrected_text : null,
      created_at: new Date().toISOString(),
    };
  });

  const attempts: Array<Array<Record<string, unknown>>> = [
    // Formato completo (schemas com id/created_at obrigatórios).
    base.map((row) => ({
      id: row.id,
      essay_id: row.essay_id,
      author_id: row.author_id,
      start_offset: row.start_offset,
      end_offset: row.end_offset,
      type: row.type,
      comment_text: row.comment_text,
      original_text: row.original_text,
      corrected_text: row.corrected_text,
      created_at: row.created_at,
    })),
    // Formato atual.
    base.map((row) => ({
      essay_id: row.essay_id,
      author_id: row.author_id,
      start_offset: row.start_offset,
      end_offset: row.end_offset,
      type: row.type,
      comment_text: row.comment_text,
      original_text: row.original_text,
      corrected_text: row.corrected_text,
    })),
    // Formato legado com coluna `comment`.
    base.map((row) => ({
      essay_id: row.essay_id,
      author_id: row.author_id,
      start_offset: row.start_offset,
      end_offset: row.end_offset,
      type: row.type,
      comment: row.comment_text,
      original_text: row.original_text,
      corrected_text: row.corrected_text,
    })),
    // Formato mínimo.
    base.map((row) => ({
      essay_id: row.essay_id,
      author_id: row.author_id,
      start_offset: row.start_offset,
      end_offset: row.end_offset,
      type: row.type,
    })),
  ];

  let lastErrorMessage = 'Formato de anotações incompatível com o schema.';
  const annotationsTable = admin.from('essay_annotations') as any;
  for (const rows of attempts) {
    const { error } = await annotationsTable.insert(rows);
    if (!error) return { ok: true as const };
    lastErrorMessage = error.message || lastErrorMessage;
  }

  return { ok: false as const, error: lastErrorMessage };
}

async function authorize(slug: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 }) };
  }
  if (!requester) {
    return { ok: false as const, response: NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 }) };
  }

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  const isAssociate = role === 'associate';
  if (!isAdmin && !isFounder && !isAssociate) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) };
  }
  if ((isFounder || isAssociate) && requester.organization_id !== org.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 }) };
  }

  return { ok: true as const, admin, orgId: org.id, userId: user.id };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const { slug, essayId } = await context.params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }
  if (!requester) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
  }

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  const isAssociate = role === 'associate';
  const isStudent = role === 'student';
  if (!isAdmin && !isFounder && !isAssociate && !isStudent) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!isAdmin && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data: essay, error } = await admin
    .from('essays')
    .select('*')
    .eq('id', essayId)
    .eq('org_id', org.id)
    .maybeSingle<Record<string, unknown>>();

  if (error || !essay) {
    return NextResponse.json(
      {
        error: 'Redação não encontrada.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 404 },
    );
  }

  if (isStudent && String(essay.student_id || '') !== user.id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const studentId = String(essay.student_id || '');
  let student: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null = null;
  if (studentId) {
    const { data: studentRow } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', studentId)
      .maybeSingle<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }>();
    student = studentRow || null;
  }

  const jsonCompetencyScores = normalizeCompetencyScores(essay.competency_scores);
  const jsonAnnotations = normalizeAnnotations(essay.annotations);

  const [{ data: scoreRows }, { data: annotationRows }, { data: correctionRows }] = await Promise.all([
    admin.from('essay_competency_scores').select('*').eq('essay_id', essayId).order('competency'),
    admin.from('essay_annotations').select('*').eq('essay_id', essayId),
    admin.from('essay_corrections').select('*, corrector:profiles!essay_corrections_corrector_id_fkey(full_name, avatar_url)').eq('essay_id', essayId).order('round'),
  ]);

  // Prioriza tabelas relacionais quando houver dados.
  const relationalCompetencyScores = normalizeCompetencyScores(scoreRows);
  const relationalAnnotations = normalizeAnnotations(annotationRows);
  const competencyScores = relationalCompetencyScores.length > 0 ? relationalCompetencyScores : jsonCompetencyScores;
  const annotations = relationalAnnotations.length > 0 ? relationalAnnotations : jsonAnnotations;

  // Inclui correction_round nas scores e annotations quando disponível
  const scoresWithRound = scoreRows
    ? scoreRows.map((r: Record<string, unknown>) => ({
        competency: Number(r.competency),
        score: Number(r.score),
        comment: typeof r.comment === 'string' ? r.comment : null,
        correction_round: Number(r.correction_round ?? 1),
      }))
    : competencyScores.map((s) => ({ ...s, correction_round: 1 }));

  const annotationsWithRound = annotationRows
    ? annotationRows.map((r: Record<string, unknown>) => ({
        id: String(r.id || crypto.randomUUID()),
        start_offset: Number(r.start_offset ?? 0),
        end_offset: Number(r.end_offset ?? 0),
        type: r.type === 'correction' ? 'correction' : 'comment',
        comment_text: typeof r.comment_text === 'string' ? r.comment_text : null,
        original_text: typeof r.original_text === 'string' ? r.original_text : null,
        corrected_text: typeof r.corrected_text === 'string' ? r.corrected_text : null,
        correction_round: Number(r.correction_round ?? 1),
      }))
    : annotations.map((a) => ({ ...a, correction_round: 1 }));

  // Monta o array de correções (para staff: inclui nome do corretor; para aluno: sem identificação)
  const corrections = (correctionRows || []).map((c: Record<string, unknown>) => ({
    round: Number(c.round),
    total_score: Number(c.total_score),
    general_comment: typeof c.general_comment === 'string' ? c.general_comment : null,
    corrected_at: typeof c.corrected_at === 'string' ? c.corrected_at : null,
    ...(!isStudent && {
      corrector_name: (c.corrector as Record<string, unknown> | null)?.full_name ?? null,
      corrector_avatar_url: (c.corrector as Record<string, unknown> | null)?.avatar_url ?? null,
    }),
  }));

  // Busca nome do segundo corretor para exibir no lock warning
  let secondCorrectorName: string | null = null;
  const secondCorrectorId = essay.second_corrector_id as string | null;
  if (secondCorrectorId) {
    const { data: scRow } = await admin.from('profiles').select('full_name').eq('id', secondCorrectorId).maybeSingle<{ full_name: string | null }>();
    secondCorrectorName = scRow?.full_name ?? null;
  }

  // Gerar URL assinada para imagem original (falha silenciosa — imagem é referência opcional)
  let signedImageUrl: string | null = null;
  const rawImageUrl = essay.image_url as string | null;
  if (rawImageUrl) {
    try {
      const storagePathMatch = rawImageUrl.match(/essay-images\/(.+)$/);
      if (storagePathMatch) {
        const storagePath = storagePathMatch[1];
        const { data: signedUrlData } = await admin.storage
          .from('essay-images')
          .createSignedUrl(storagePath, 3600);
        signedImageUrl = signedUrlData?.signedUrl ?? null;
      }
    } catch (e) {
      console.error('[EssayRoute] Falha ao gerar URL assinada para imagem:', e);
    }
  }

  // Bucket é público — a URL armazenada no DB já é acessível diretamente.
  const rawHistoricalFileUrl = essay.historical_file_url as string | null;
  const signedHistoricalFileUrl: string | null = rawHistoricalFileUrl ?? null;

  return NextResponse.json({
    id: String(essay.id),
    status: (essay.status as string) || 'pending',
    essay_type: (essay.essay_type as string) || 'enem',
    theme: resolveTheme(essay),
    text: String(essay.text || ''),
    submitted_at: String(essay.submitted_at || ''),
    corrected_at: (essay.corrected_at as string) || null,
    second_corrected_at: (essay.second_corrected_at as string) || null,
    total_score: typeof essay.total_score === 'number' ? essay.total_score : null,
    average_score: typeof essay.average_score === 'number' ? essay.average_score : null,
    general_comment: typeof essay.general_comment === 'string' ? essay.general_comment : null,
    competency_scores: scoresWithRound,
    annotations: annotationsWithRound,
    corrections,
    second_corrector_id: secondCorrectorId,
    second_corrector_name: secondCorrectorName,
    second_correction_requested_at: (essay.second_correction_requested_at as string) || null,
    student,
    signed_image_url: signedImageUrl,
    is_historical: Boolean(essay.is_historical),
    historical_date: (essay.historical_date as string) || null,
    imported_at: (essay.imported_at as string) || null,
    signed_historical_file_url: signedHistoricalFileUrl,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug, essayId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const payload = await request.json().catch(() => ({} as {
    competency_scores?: Array<{ competency: number; score: number; comment?: string }>;
    annotations?: unknown[];
    general_comment?: string;
    request_second_correction?: boolean;
    second_corrector_id?: string | null;
  }));

  const rawScores = Array.isArray(payload.competency_scores) ? payload.competency_scores : [];
  const safeGeneralComment = typeof payload.general_comment === 'string'
    ? payload.general_comment.trim().slice(0, MAX_GENERAL_COMMENT_LEN)
    : '';
  const requestSecond = Boolean(payload.request_second_correction);
  const chosenSecondCorrectorId = typeof payload.second_corrector_id === 'string' ? payload.second_corrector_id : null;

  const { data: essay, error: fetchError } = await auth.admin
    .from('essays')
    .select('*')
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .maybeSingle<Record<string, unknown>>();

  if (fetchError || !essay) {
    return NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 });
  }

  const essayStatus = String(essay.status || '').toLowerCase();
  const secondCorrectorId = essay.second_corrector_id as string | null;

  // Determina rodada de correção
  let correctionRound = 1;
  if (essayStatus === 'pending') {
    correctionRound = 1;
  } else if (essayStatus === 'awaiting_second') {
    // Apenas o segundo corretor alocado (ou admin/founder) pode fazer a segunda correção
    const { data: callerProfile } = await auth.admin
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .maybeSingle<{ role: string | null }>();
    const callerRole = String(callerProfile?.role || '').toLowerCase();
    if (callerRole !== 'admin' && callerRole !== 'founder' && auth.userId !== secondCorrectorId) {
      const scName = secondCorrectorId
        ? (await auth.admin.from('profiles').select('full_name').eq('id', secondCorrectorId).maybeSingle<{ full_name: string | null }>()).data?.full_name ?? 'outro corretor'
        : 'outro corretor';
      return NextResponse.json({
        error: `Esta redação está reservada para segunda correção por ${scName}.`,
        locked: true,
        second_corrector_name: scName,
      }, { status: 403 });
    }
    correctionRound = 2;
  } else {
    return NextResponse.json({ error: 'A redação não está disponível para correção.' }, { status: 400 });
  }

  const rawType = String(essay.essay_type || 'enem').toLowerCase();
  const essayType: EssayType = (rawType === 'ufu' || rawType === 'ueg' || rawType === 'fuvest' || rawType === 'vunesp' || rawType === 'geral') ? (rawType as EssayType) : 'enem';
  const typeConfig = ESSAY_TYPE_CONFIGS[essayType] ?? ESSAY_TYPE_CONFIGS.enem;
  const compMaxes = typeConfig.score_options.map((opts) =>
    Array.isArray(opts) && opts.length > 0 ? Math.max(...opts) : 200,
  );
  const expectedCount = compMaxes.length;

  if (rawScores.length !== expectedCount) {
    return NextResponse.json(
      { error: `Envie as ${expectedCount} competências para correção (tipo ${essayType.toUpperCase()}).` },
      { status: 400 },
    );
  }

  const competencyScores: Array<{ competency: number; score: number; comment: string; expected: number }> = rawScores.map((item: { competency: number; score: number; comment?: string }, idx: number) => {
    const competency = Number(item?.competency);
    const score = Number(item?.score);
    const comment = typeof item?.comment === 'string' ? item.comment.trim().slice(0, MAX_COMP_COMMENT_LEN) : '';
    return { competency, score, comment, expected: idx + 1 };
  });

  const invalidScore = competencyScores.find((item: { competency: number; score: number; comment: string; expected: number }, idx: number) => {
    const validComp = Number.isInteger(item.competency) && item.competency === item.expected;
    const validScore = Number.isFinite(item.score) && item.score >= 0 && item.score <= (compMaxes[idx] ?? 200);
    return !validComp || !validScore;
  });
  if (invalidScore) {
    return NextResponse.json(
      { error: `Notas inválidas para o tipo ${essayType.toUpperCase()}. Verifique os limites por competência.` },
      { status: 400 },
    );
  }

  const totalScore = competencyScores.reduce((sum: number, item: { score: number }) => sum + Number(item.score || 0), 0);

  const nowIso = new Date().toISOString();
  const incomingAnnotations: unknown[] = Array.isArray(payload.annotations) ? payload.annotations.slice(0, MAX_ANNOTATIONS) : [];
  const sanitizedAnnotations = incomingAnnotations
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        start_offset: Number(row.start_offset),
        end_offset: Number(row.end_offset),
        type: row.type === 'correction' ? 'correction' : 'comment',
        comment_text: typeof row.comment_text === 'string' ? row.comment_text.trim().slice(0, MAX_ANNOTATION_TEXT_LEN) : null,
        original_text: typeof row.original_text === 'string' ? row.original_text.slice(0, MAX_ANNOTATION_TEXT_LEN) : null,
        corrected_text: typeof row.corrected_text === 'string' ? row.corrected_text.slice(0, MAX_ANNOTATION_TEXT_LEN) : null,
      };
    })
    .filter((row: { start_offset: number; end_offset: number }) => Number.isInteger(row.start_offset)
      && Number.isInteger(row.end_offset)
      && row.start_offset >= 0
      && row.end_offset > row.start_offset);

  if (sanitizedAnnotations.length !== incomingAnnotations.length) {
    return NextResponse.json({ error: 'Anotações inválidas no texto selecionado.' }, { status: 400 });
  }

  // Resolve segundo corretor (apenas rodada 1 com segunda correção solicitada)
  let resolvedSecondCorrectorId: string | null = null;
  let resolvedSecondCorrectorName: string | null = null;
  if (correctionRound === 1 && requestSecond) {
    if (chosenSecondCorrectorId) {
      const { data: scProfile } = await auth.admin
        .from('profiles')
        .select('id, full_name, role, organization_id, associate_permissions')
        .eq('id', chosenSecondCorrectorId)
        .maybeSingle<CorrectorProfile>();
      if (!scProfile || scProfile.organization_id !== auth.orgId) {
        return NextResponse.json({ error: 'Corretor selecionado não pertence a esta organização.' }, { status: 400 });
      }
      if (!canCorrectEssays(scProfile)) {
        return NextResponse.json({ error: 'Usuário selecionado não tem permissão para corrigir redações.' }, { status: 400 });
      }
      resolvedSecondCorrectorId = chosenSecondCorrectorId;
      resolvedSecondCorrectorName = scProfile.full_name;
    } else {
      // Aleatório: seleciona um staff da org excluindo o corretor atual
      const { data: staffList } = await auth.admin
        .from('profiles')
        .select('id, full_name, role, associate_permissions')
        .eq('organization_id', auth.orgId)
        .in('role', ['founder', 'associate'])
        .neq('id', auth.userId)
        .limit(10)
        .returns<CorrectorProfile[]>();
      const eligibleStaff = (staffList || []).filter(canCorrectEssays);
      if (eligibleStaff.length === 0) {
        return NextResponse.json({ error: 'Não há outros corretores disponíveis para segunda correção.' }, { status: 400 });
      }
      const chosen = eligibleStaff[Math.floor(Math.random() * eligibleStaff.length)];
      resolvedSecondCorrectorId = chosen.id;
      resolvedSecondCorrectorName = chosen.full_name;
    }
  }

  // Busca nota da rodada 1 em essay_corrections (fonte autoritativa para o average)
  let round1ScoreForAverage = 0;
  if (correctionRound === 2) {
    const r1Result = await (auth.admin.from('essay_corrections') as any)
      .select('total_score')
      .eq('essay_id', essayId)
      .eq('round', 1)
      .maybeSingle();
    const r1Correction = r1Result.data as { total_score: number | null } | null;
    round1ScoreForAverage = Number(r1Correction?.total_score ?? essay.total_score ?? 0);
  }

  // Monta o payload de atualização do essay
  let updatePayload: Record<string, unknown>;
  if (correctionRound === 1) {
    if (requestSecond && resolvedSecondCorrectorId) {
      updatePayload = {
        status: 'awaiting_second',
        total_score: totalScore,
        general_comment: safeGeneralComment,
        corrected_at: nowIso,
        seen_at: null,
        second_corrector_id: resolvedSecondCorrectorId,
        second_correction_requested_by: auth.userId,
        second_correction_requested_at: nowIso,
      };
    } else {
      updatePayload = {
        status: 'corrected',
        total_score: totalScore,
        general_comment: safeGeneralComment,
        corrected_at: nowIso,
        seen_at: null,
      };
    }
  } else {
    const averageScore = Math.round(((round1ScoreForAverage + totalScore) / 2) * 100) / 100;
    updatePayload = {
      status: 'second_corrected',
      second_corrected_at: nowIso,
      average_score: averageScore,
      seen_at: null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(essay, 'updated_at')) {
    updatePayload.updated_at = nowIso;
  }

  // Persiste scores ANTES de atualizar status: se falhar, corretor pode retentar (status inalterado)
  if (competencyScores.length > 0) {
    await (auth.admin.from('essay_competency_scores') as any)
      .delete()
      .eq('essay_id', essayId)
      .eq('correction_round', correctionRound);

    const scoreRows = competencyScores.map((item: { competency: number; score: number; comment: string }) => ({
      essay_id: essayId,
      competency: Number(item.competency),
      score: Number(item.score),
      comment: typeof item.comment === 'string' ? item.comment : null,
      correction_round: correctionRound,
    }));

    const { error: insertScoresError } = await (auth.admin.from('essay_competency_scores') as any)
      .insert(scoreRows);
    if (insertScoresError) {
      return NextResponse.json(
        {
          error: 'Falha ao gravar notas por competência.',
          details: process.env.NODE_ENV === 'development' ? insertScoresError.message : undefined,
        },
        { status: 500 },
      );
    }
  }

  // Registra a rodada de correção em essay_corrections
  await (auth.admin.from('essay_corrections') as any).upsert({
    essay_id: essayId,
    corrector_id: auth.userId,
    round: correctionRound,
    total_score: totalScore,
    general_comment: safeGeneralComment,
    corrected_at: nowIso,
  }, { onConflict: 'essay_id,round' });

  // Persiste annotations ANTES de atualizar status
  let annotationWarning: string | null = null;
  if (sanitizedAnnotations.length > 0) {
    await auth.admin.from('essay_annotations').delete().eq('essay_id', essayId).eq('correction_round', correctionRound);
    const annotationsWithRound = sanitizedAnnotations.map((a) => ({ ...a, correction_round: correctionRound }));
    const insertResult = await insertEssayAnnotationsCompat(auth.admin, essayId, auth.userId, annotationsWithRound);
    if (!insertResult.ok) {
      annotationWarning = insertResult.error;
    }
  }

  // Atualiza status do essay POR ÚLTIMO com lock otimista (evita race conditions)
  const essaysTable = auth.admin.from('essays') as any;
  const { error: updateError, data: updatedEssays } = await essaysTable
    .update(updatePayload)
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .eq('status', essayStatus)
    .select('id');

  if (updateError) {
    return NextResponse.json(
      {
        error: 'Não foi possível salvar a correção.',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
      },
      { status: 500 },
    );
  }

  if (!updatedEssays || (updatedEssays as unknown[]).length === 0) {
    return NextResponse.json(
      { error: 'A redação foi modificada por outro usuário. Recarregue e tente novamente.', retry: true },
      { status: 409 },
    );
  }

  if (correctionRound === 1 && requestSecond && resolvedSecondCorrectorId) {
    return NextResponse.json({
      ok: true,
      action: 'second_correction_requested',
      second_corrector: { id: resolvedSecondCorrectorId, full_name: resolvedSecondCorrectorName },
      warning: annotationWarning ? 'Anotações não puderam ser persistidas totalmente.' : null,
    });
  }

  return NextResponse.json({
    ok: true,
    total_score: totalScore,
    ...(correctionRound === 2 && { average_score: Math.round(((Number(essay.total_score ?? 0) + totalScore) / 2) * 100) / 100 }),
    warning: annotationWarning ? 'Correção salva, mas as anotações não puderam ser persistidas totalmente.' : null,
    details: process.env.NODE_ENV === 'development' ? annotationWarning : undefined,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug, essayId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const { data: requester } = await auth.admin
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle<{ role: string | null }>();
  const role = String(requester?.role || '').toLowerCase();
  const canManage = role === 'admin' || role === 'founder';
  if (!canManage) {
    return NextResponse.json({ error: 'Apenas founder/admin podem excluir redações.' }, { status: 403 });
  }

  const { data: essay } = await auth.admin
    .from('essays')
    .select('id, status')
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .maybeSingle<{ id: string; status: string }>();
  if (!essay) return NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 });

  if (essay.status === 'awaiting_second') {
    return NextResponse.json(
      { error: 'Esta redação está aguardando segunda correção e não pode ser excluída agora.' },
      { status: 409 },
    );
  }

  // Compatibilidade quando não há CASCADE no banco.
  await auth.admin.from('essay_annotations').delete().eq('essay_id', essayId);
  await auth.admin.from('essay_competency_scores').delete().eq('essay_id', essayId);

  const { error } = await auth.admin.from('essays').delete().eq('id', essayId).eq('org_id', auth.orgId);
  if (error) {
    return NextResponse.json(
      {
        error: 'Falha ao excluir redação.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
