import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

type EssayRow = {
  id: string;
  student_id: string;
  status: 'pending' | 'corrected' | 'seen' | 'awaiting_second' | 'second_corrected';
  submitted_at: string;
  corrected_at: string | null;
  imported_at?: string | null;
  is_historical?: boolean | null;
  total_score: number | null;
  average_score?: number | null;
  text_preview: string | null;
  second_corrector_id?: string | null;
  correction_lock_user_id?: string | null;
  correction_lock_at?: string | null;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type OverviewMetricsRpcArgs = {
  p_org_id: string;
  p_essay_type: string | null;
  p_submitted_gte: string | null;
  p_submitted_lt: string | null;
  p_date_range_active: boolean;
  p_second_corrector_id: string;
};

// A RPC partner_essays_overview_metrics ainda não está nos tipos gerados do
// Supabase (mesmo padrão de LockRpcClient em essays/[essayId]/lock/route.ts).
// O formato do retorno é validado contra o cálculo JS anterior por
// scripts/test-overview-metrics-parity.mjs.
type OverviewMetricsRpcClient = {
  rpc: (
    fn: 'partner_essays_overview_metrics',
    args: OverviewMetricsRpcArgs,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function parsePageParam(value: string | null, fallback: number, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfWeekBrtKey(): string {
  const todayKey = toBrtDateKey(new Date());
  const [y, m, d] = todayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekDay = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - weekDay);
  const yy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function startOfMonthBrtKey(): string {
  const todayKey = toBrtDateKey(new Date());
  const [y, m] = todayKey.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, (am || 1) - 1, ad || 1);
  const end = Date.UTC(by, (bm || 1) - 1, bd || 1);
  return Math.round((end - start) / 86400000);
}

/** BRT é UTC-3 fixo (sem horário de verão desde 2019) — 00:00 BRT = 03:00 UTC do mesmo dia. */
function brtDateKeyToUtcStartIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 3, 0, 0)).toISOString();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const essayTypeFilter = url.searchParams.get('essay_type') ?? 'all';
  const validTypes = ['enem', 'ufu', 'ueg', 'fuvest', 'vunesp'];
  const filterByType = validTypes.includes(essayTypeFilter) ? essayTypeFilter : null;
  const pendingSortAscending = url.searchParams.get('pending_sort') !== 'desc';

  const datePreset = url.searchParams.get('date_preset');
  const dateFromParam = url.searchParams.get('date_from');
  const dateToParam = url.searchParams.get('date_to');
  const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const todayKey = toBrtDateKey(new Date());

  let dateRangeKeys: { fromKey: string; toKey: string } | null = null;
  if (datePreset === 'today') {
    dateRangeKeys = { fromKey: todayKey, toKey: todayKey };
  } else if (datePreset === 'yesterday') {
    const yesterdayKey = addDaysToKey(todayKey, -1);
    dateRangeKeys = { fromKey: yesterdayKey, toKey: yesterdayKey };
  } else if (datePreset === 'week') {
    dateRangeKeys = { fromKey: startOfWeekBrtKey(), toKey: todayKey };
  } else if (datePreset === 'month') {
    dateRangeKeys = { fromKey: startOfMonthBrtKey(), toKey: todayKey };
  } else if (
    dateFromParam && dateToParam &&
    DATE_KEY_RE.test(dateFromParam) && DATE_KEY_RE.test(dateToParam) &&
    dateFromParam <= dateToParam
  ) {
    const inclusiveDays = daysBetweenKeys(dateFromParam, dateToParam) + 1;
    if (inclusiveDays >= 1 && inclusiveDays <= 60) {
      dateRangeKeys = { fromKey: dateFromParam, toKey: dateToParam };
    }
  }

  const submittedAtGte = dateRangeKeys ? brtDateKeyToUtcStartIso(dateRangeKeys.fromKey) : null;
  const submittedAtLt = dateRangeKeys ? brtDateKeyToUtcStartIso(addDaysToKey(dateRangeKeys.toKey, 1)) : null;

  const pendingPage = parsePageParam(url.searchParams.get('pending_page'), 1, 1000);
  const pendingLimit = parsePageParam(url.searchParams.get('pending_limit'), 10, 50);
  const correctedPage = parsePageParam(url.searchParams.get('corrected_page'), 1, 1000);
  const correctedLimit = parsePageParam(url.searchParams.get('corrected_limit'), 10, 50);
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

  if (!org?.id) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  if (!requester) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  const isAssociate = role === 'associate';
  if (!isAdmin && !isFounder && !isAssociate) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if ((isFounder || isAssociate) && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  // `text_preview` (coluna gerada: primeiros 200 chars) no lugar de `text` —
  // a fila só usa preview curto + busca no início. Detalhe usa `text` completo.
  const essayFields = 'id, student_id, status, essay_type, submitted_at, corrected_at, imported_at, is_historical, total_score, average_score, text_preview, theme, second_corrector_id, correction_lock_user_id, correction_lock_at';
  const pendingFrom = (pendingPage - 1) * pendingLimit;
  const pendingTo = pendingFrom + pendingLimit - 1;
  const correctedFrom = (correctedPage - 1) * correctedLimit;
  const correctedTo = correctedFrom + correctedLimit - 1;

  const metricsClient = admin as unknown as OverviewMetricsRpcClient;
  const [metricsRpcRes, pendingRes, assignedSecondRes, correctedRes] = await Promise.all([
    // Métricas (contagens, médias, ranking, competências, pendentes-por-tipo)
    // são agregadas no Postgres. Antes eram 4 queries daqui — uma varrendo até
    // 500 redações (com texto), duas varreduras de contagem e todas as notas
    // por competência — somadas em JS. A RPC devolve só os números (~2 KB).
    // Paridade exata verificada por scripts/test-overview-metrics-parity.mjs.
    metricsClient.rpc('partner_essays_overview_metrics', {
      p_org_id: org.id,
      p_essay_type: filterByType,
      p_submitted_gte: submittedAtGte,
      p_submitted_lt: submittedAtLt,
      p_date_range_active: dateRangeKeys !== null,
      p_second_corrector_id: user.id,
    }),
    (() => {
      // "Aguardando correção" mostra as redações pendentes enviadas dentro
      // do período selecionado no filtro (mesma regra do tipo de redação).
      let query = admin
        .from('essays')
        .select(essayFields, { count: 'exact' })
        .eq('org_id', org.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query
        .eq('status', 'pending')
        .order('submitted_at', { ascending: pendingSortAscending })
        .range(pendingFrom, pendingTo);
    })(),
    (() => {
      let query = admin
        .from('essays')
        .select(essayFields)
        .eq('org_id', org.id)
        .eq('status', 'awaiting_second')
        .eq('second_corrector_id', user.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query.order('submitted_at', { ascending: true });
    })(),
    (() => {
      let query = admin
        .from('essays')
        .select(essayFields, { count: 'exact' })
        .eq('org_id', org.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query
        .in('status', ['corrected', 'second_corrected', 'seen'])
        .order('submitted_at', { ascending: false })
        .range(correctedFrom, correctedTo);
    })(),
  ]);

  if (metricsRpcRes.error) {
    return NextResponse.json(
      {
        error: 'Não foi possível carregar redações.',
        details: process.env.NODE_ENV === 'development' ? metricsRpcRes.error?.message : undefined,
      },
      { status: 500 },
    );
  }
  const metrics = metricsRpcRes.data;

  const pendingItemsRaw = ((pendingRes.error ? [] : pendingRes.data) || []) as EssayRow[];
  const assignedSecondItemsRaw = ((assignedSecondRes.error ? [] : assignedSecondRes.data) || []) as EssayRow[];
  const correctedItemsRaw = ((correctedRes.error ? [] : correctedRes.data) || []) as EssayRow[];
  const pendingTotal = pendingRes.error ? 0 : (pendingRes.count || 0);
  const pendingDisplayTotal = pendingTotal + assignedSecondItemsRaw.length;
  const correctedTotal = correctedRes.error ? 0 : (correctedRes.count || 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingDisplayTotal / pendingLimit));
  const correctedTotalPages = Math.max(1, Math.ceil(correctedTotal / correctedLimit));

  // Perfis (nome/avatar/e-mail) só para hidratar as listas paginadas de
  // pendentes/corrigidas — o ranking já vem resolvido pela RPC.
  const listItems = [...pendingItemsRaw, ...assignedSecondItemsRaw, ...correctedItemsRaw];
  const studentIds = Array.from(new Set(listItems.map((e) => e.student_id).filter(Boolean)));
  const lockUserIds = Array.from(new Set(
    listItems
      .map((e) => e.correction_lock_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  ));
  const allProfileIds = Array.from(new Set([...studentIds, ...lockUserIds]));
  const { data: profilesData } = allProfileIds.length > 0
    ? await admin.from('profiles').select('id, full_name, email, avatar_url').in('id', allProfileIds)
    : { data: [] as StudentRow[] };
  const profilesMap = new Map(((profilesData || []) as StudentRow[]).map((s) => [s.id, s]));
  const studentsMap = profilesMap;
  const lockUsersMap = profilesMap;

  const hydrateEssay = (item: EssayRow) => {
    const student = studentsMap.get(item.student_id);
    const lockUser = item.correction_lock_user_id ? lockUsersMap.get(item.correction_lock_user_id) : null;
    return {
      ...item,
      correction_lock_user: lockUser
        ? {
            id: lockUser.id,
            full_name: lockUser.full_name,
            avatar_url: lockUser.avatar_url,
          }
        : null,
      text: item.text_preview || '',
      student: {
        id: item.student_id,
        full_name: student?.full_name ?? null,
        email: student?.email ?? null,
        avatar_url: student?.avatar_url ?? null,
      },
      student_plan: null,
    };
  };

  return NextResponse.json({
    essay_type_filter: essayTypeFilter,
    date_filter: dateRangeKeys
      ? { preset: datePreset ?? 'custom', from: dateRangeKeys.fromKey, to: dateRangeKeys.toKey }
      : null,
    metrics,
    pending_items: [...assignedSecondItemsRaw, ...pendingItemsRaw].map(hydrateEssay),
    corrected_items: correctedItemsRaw.map(hydrateEssay),
    pagination: {
      pending: {
        page: pendingPage,
        limit: pendingLimit,
        total: pendingDisplayTotal,
        total_pages: pendingTotalPages,
      },
      corrected: {
        page: correctedPage,
        limit: correctedLimit,
        total: correctedTotal,
        total_pages: correctedTotalPages,
      },
    },
  });
}
