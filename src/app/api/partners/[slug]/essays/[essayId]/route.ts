import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

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
  const isAssociate = role === 'associate' || role === 'teacher';
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
  const isAssociate = role === 'associate' || role === 'teacher';
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

  const [{ data: scoreRows }, { data: annotationRows }] = await Promise.all([
    admin.from('essay_competency_scores').select('*').eq('essay_id', essayId),
    admin.from('essay_annotations').select('*').eq('essay_id', essayId),
  ]);

  // Prioriza tabelas relacionais quando houver dados.
  const relationalCompetencyScores = normalizeCompetencyScores(scoreRows);
  const relationalAnnotations = normalizeAnnotations(annotationRows);
  const competencyScores = relationalCompetencyScores.length > 0 ? relationalCompetencyScores : jsonCompetencyScores;
  const annotations = relationalAnnotations.length > 0 ? relationalAnnotations : jsonAnnotations;

  return NextResponse.json({
    id: String(essay.id),
    status: (essay.status as string) || 'pending',
    theme: resolveTheme(essay),
    text: String(essay.text || ''),
    submitted_at: String(essay.submitted_at || ''),
    corrected_at: (essay.corrected_at as string) || null,
    total_score: typeof essay.total_score === 'number' ? essay.total_score : null,
    general_comment: typeof essay.general_comment === 'string' ? essay.general_comment : null,
    competency_scores: competencyScores,
    annotations,
    student,
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
  }));

  const rawScores = Array.isArray(payload.competency_scores) ? payload.competency_scores : [];
  if (rawScores.length !== 5) {
    return NextResponse.json({ error: 'Envie as 5 competências para correção.' }, { status: 400 });
  }

  const competencyScores: Array<{ competency: number; score: number; comment: string; expected: number }> = rawScores.map((item: { competency: number; score: number; comment?: string }, idx: number) => {
    const competency = Number(item?.competency);
    const score = Number(item?.score);
    const comment = typeof item?.comment === 'string' ? item.comment.trim().slice(0, MAX_COMP_COMMENT_LEN) : '';
    return { competency, score, comment, expected: idx + 1 };
  });

  const invalidScore = competencyScores.find((item: { competency: number; score: number; comment: string; expected: number }) => {
    const validComp = Number.isInteger(item.competency) && item.competency === item.expected;
    const validScore = Number.isFinite(item.score) && item.score >= 0 && item.score <= 200;
    return !validComp || !validScore;
  });
  if (invalidScore) {
    return NextResponse.json({ error: 'Notas inválidas. Use competências 1-5 e notas entre 0 e 200.' }, { status: 400 });
  }

  const totalScore = competencyScores.reduce((sum: number, item: { score: number }) => sum + Number(item.score || 0), 0);
  const safeGeneralComment = typeof payload.general_comment === 'string'
    ? payload.general_comment.trim().slice(0, MAX_GENERAL_COMMENT_LEN)
    : '';

  const { data: essay, error: fetchError } = await auth.admin
    .from('essays')
    .select('*')
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .maybeSingle<Record<string, unknown>>();

  if (fetchError || !essay) {
    return NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 });
  }
  if (String(essay.status || '').toLowerCase() !== 'pending') {
    return NextResponse.json({ error: 'A redação não está pendente para correção.' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    status: 'corrected',
    total_score: totalScore,
    general_comment: safeGeneralComment,
    corrected_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(essay, 'competency_scores')) {
    updatePayload.competency_scores = competencyScores;
  }
  if (Object.prototype.hasOwnProperty.call(essay, 'updated_at')) {
    updatePayload.updated_at = new Date().toISOString();
  }
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

  if (Object.prototype.hasOwnProperty.call(essay, 'annotations')) {
    updatePayload.annotations = sanitizedAnnotations;
  }

  const essaysTable = auth.admin.from('essays') as any;
  const { error: updateError } = await essaysTable
    .update(updatePayload)
    .eq('id', essayId)
    .eq('org_id', auth.orgId);

  if (updateError) {
    return NextResponse.json(
      {
        error: 'Não foi possível salvar a correção.',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
      },
      { status: 500 },
    );
  }

  // Persistência relacional (compatibilidade com schema normalizado).
  if (competencyScores.length > 0) {
    const { error: clearScoresError } = await auth.admin
      .from('essay_competency_scores')
      .delete()
      .eq('essay_id', essayId);
    if (clearScoresError) {
      return NextResponse.json(
        {
          error: 'Correção salva, mas não foi possível atualizar notas por competência.',
          details: process.env.NODE_ENV === 'development' ? clearScoresError.message : undefined,
        },
        { status: 500 },
      );
    }

    const scoreRows = competencyScores.map((item: { competency: number; score: number; comment: string }) => ({
      essay_id: essayId,
      competency: Number(item.competency),
      score: Number(item.score),
      comment: typeof item.comment === 'string' ? item.comment : null,
    }));

    const { error: insertScoresError } = await (auth.admin.from('essay_competency_scores') as any)
      .insert(scoreRows);
    if (insertScoresError) {
      return NextResponse.json(
        {
          error: 'Correção salva, mas falhou ao gravar notas por competência.',
          details: process.env.NODE_ENV === 'development' ? insertScoresError.message : undefined,
        },
        { status: 500 },
      );
    }
  }

  let annotationWarning: string | null = null;
  if (sanitizedAnnotations.length > 0) {
    const { error: clearAnnotationsError } = await auth.admin
      .from('essay_annotations')
      .delete()
      .eq('essay_id', essayId);
    if (!clearAnnotationsError) {
      const insertResult = await insertEssayAnnotationsCompat(auth.admin, essayId, auth.userId, sanitizedAnnotations);
      if (!insertResult.ok) {
        annotationWarning = insertResult.error;
      }
    } else {
      annotationWarning = clearAnnotationsError.message || 'Falha ao limpar anotações anteriores.';
    }
  }

  return NextResponse.json({
    ok: true,
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
    .select('id')
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .maybeSingle<{ id: string }>();
  if (!essay) return NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 });

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
