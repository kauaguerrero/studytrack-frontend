import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

type Segment = 'HOT' | 'WARM' | 'COLD';
type ConversionStage = 'nao_abordado' | 'abordado' | 'oferta_feita' | 'oferta_especial' | 'convertido' | 'perdido';
type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  whatsapp_jid: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  trial_start_date: string | null;
  onboarding_completed: boolean | null;
  handshake_completed: boolean | null;
  total_points: number | null;
  current_streak: number | null;
  last_activity_date: string | null;
  whatsapp_notifications_enabled: boolean | null;
  conversion_stage?: ConversionStage | null;
};

type UserComputed = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp_phone: string | null;
  whatsapp_jid: string | null;
  plan_tier: string | null;
  subscription_status: string | null;
  trial_start_date: string | null;
  onboarding_completed: boolean;
  handshake_completed: boolean;
  total_points: number;
  current_streak: number;
  last_activity_date: string | null;
  whatsapp_notifications_enabled: boolean;
  messages_total: number;
  limit_reached: boolean;
  last_whatsapp_at: string | null;
  days_in_trial: number | null;
  segment: Segment;
  conversion_stage: ConversionStage;
  last_user_message_at: string | null;
  meta_window_active: boolean;
  admin_approaches_count: number;
};

function clampInt(value: string | null, def: number, min: number, max: number) {
  const n = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseBool(value: string | null): boolean | null {
  if (!value) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function segmentOf(u: {
  onboarding_completed: boolean | null;
  handshake_completed: boolean | null;
  messages_total: number;
  limit_reached: boolean;
  total_points: number;
}): Segment {
  const onboarding = !!u.onboarding_completed;
  const handshake = !!u.handshake_completed;
  if (!onboarding || !handshake) return 'COLD';
  if (u.messages_total >= 5 || u.limit_reached || u.total_points > 0) return 'HOT';
  return 'WARM';
}

function daysSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const page = clampInt(url.searchParams.get('page'), 1, 1, 500);
  const pageSize = clampInt(url.searchParams.get('pageSize'), 20, 5, 100);
  const segmentFilter = (url.searchParams.get('segment') || 'ALL').toUpperCase();
  const minTrialDays = clampInt(url.searchParams.get('minTrialDays'), 0, 0, 3650);
  const maxTrialDays = clampInt(url.searchParams.get('maxTrialDays'), 3650, 0, 3650);
  const limitReachedFilter = parseBool(url.searchParams.get('limitReached'));
  const activeWindowOnly = url.searchParams.get('activeWindowOnly') === 'true';
  const sort = (url.searchParams.get('sort') || 'messages_desc').toLowerCase();
  const all = url.searchParams.get('all') === 'true';

  // Perfis trial (tamanho atual pequeno ~122). Mantemos simples e robusto: carrega e agrega em memória.
  const { data: profiles, error: profilesErr } = await auth.supabaseAdmin
    .from('profiles')
    .select([
      'id',
      'full_name',
      'email',
      'whatsapp_phone',
      'whatsapp_jid',
      'plan_tier',
      'onboarding_completed',
      'handshake_completed',
      'subscription_status',
      'trial_start_date',
      'total_points',
      'current_streak',
      'last_activity_date',
      'whatsapp_notifications_enabled',
      'conversion_stage',
    ].join(','))
    .eq('role', 'student')
    .not('trial_start_date', 'is', null)
    .limit(5000);

  if (profilesErr) {
    return NextResponse.json({ error: profilesErr.message }, { status: 500 });
  }

  const ids = (profiles ?? []).map((p) => p.id).filter(Boolean);

  // whatsapp_daily_usage: soma de message_count e OR de limit_reached
  const usageByUser = new Map<string, { messages: number; limit: boolean }>();
  if (ids.length) {
    const { data: usageRows } = await auth.supabaseAdmin
      .from('whatsapp_daily_usage')
      .select('user_id, message_count, limit_reached')
      .in('user_id', ids)
      .limit(100000);

    for (const r of usageRows ?? []) {
      const userId = r.user_id as string | null;
      if (!userId) continue;
      const prev = usageByUser.get(userId) ?? { messages: 0, limit: false };
      usageByUser.set(userId, {
        messages: prev.messages + Number(r.message_count ?? 0),
        limit: prev.limit || !!r.limit_reached,
      });
    }
  }

  // whatsapp_logs: contagem e última interação (created_at)
  const logByUser = new Map<string, { count: number; lastAt: string | null; lastInboundAt: string | null }>();
  if (ids.length) {
    const { data: logRows } = await auth.supabaseAdmin
      .from('whatsapp_logs')
      .select('user_id, created_at, direction')
      .in('user_id', ids)
      .limit(100000);

    for (const r of logRows ?? []) {
      const userId = r.user_id as string | null;
      if (!userId) continue;
      const createdAt = (r.created_at as string | null) ?? null;
      const direction = (r.direction as string | null) ?? null;
      const prev = logByUser.get(userId) ?? { count: 0, lastAt: null, lastInboundAt: null };
      const lastAt = !prev.lastAt || (createdAt && createdAt > prev.lastAt) ? createdAt : prev.lastAt;
      const lastInboundAt = direction === 'inbound' && (!prev.lastInboundAt || (createdAt && createdAt > prev.lastInboundAt))
        ? createdAt
        : prev.lastInboundAt;
      logByUser.set(userId, { count: prev.count + 1, lastAt, lastInboundAt });
    }
  }

  // admin_actions_log: contagem de abordagens (message_sent + template_sent)
  const approachesByUser = new Map<string, number>();
  if (ids.length) {
    const { data: actionRows } = await auth.supabaseAdmin
      .from('admin_actions_log')
      .select('user_id, action_type')
      .in('user_id', ids)
      .in('action_type', ['message_sent', 'template_sent'])
      .limit(100000);

    for (const r of actionRows ?? []) {
      const userId = r.user_id as string | null;
      if (!userId) continue;
      approachesByUser.set(userId, (approachesByUser.get(userId) ?? 0) + 1);
    }
  }

  const now = new Date();
  const windowCutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const users: UserComputed[] = (profiles ?? []).map((p: ProfileRow) => {
    const usage = usageByUser.get(p.id) ?? { messages: 0, limit: false };
    const logs = logByUser.get(p.id) ?? { count: 0, lastAt: null, lastInboundAt: null };
    const messagesTotal = Math.max(usage.messages, logs.count); // fallback: se daily_usage estiver vazia, usa logs
    const trialDays = p.trial_start_date ? Math.max(0, Math.floor((now.getTime() - new Date(p.trial_start_date).getTime()) / (1000 * 60 * 60 * 24))) : null;
    const lastUserAt = logs.lastInboundAt;
    const metaWindowActive = !!(lastUserAt && new Date(lastUserAt).getTime() >= windowCutoff);
    const conversionStage = (p.conversion_stage ?? 'nao_abordado') as ConversionStage;
    const adminApproaches = approachesByUser.get(p.id) ?? 0;

    const u = {
      id: p.id,
      full_name: p.full_name ?? 'Sem nome',
      email: p.email ?? null,
      whatsapp_phone: p.whatsapp_phone ?? null,
      whatsapp_jid: p.whatsapp_jid ?? null,
      plan_tier: p.plan_tier ?? null,
      subscription_status: p.subscription_status ?? null,
      trial_start_date: p.trial_start_date ?? null,
      onboarding_completed: !!p.onboarding_completed,
      handshake_completed: !!p.handshake_completed,
      total_points: Number(p.total_points ?? 0),
      current_streak: Number(p.current_streak ?? 0),
      last_activity_date: p.last_activity_date ?? null,
      whatsapp_notifications_enabled: p.whatsapp_notifications_enabled !== false,
      messages_total: messagesTotal,
      limit_reached: usage.limit,
      last_whatsapp_at: logs.lastAt,
      days_in_trial: trialDays,
      conversion_stage: conversionStage,
      last_user_message_at: lastUserAt,
      meta_window_active: metaWindowActive,
      admin_approaches_count: adminApproaches,
    };

    return { ...u, segment: segmentOf(u) };
  });

  const summary = users.reduce(
    (acc, u) => {
      acc.total += 1;
      acc[u.segment] += 1;
      return acc;
    },
    { HOT: 0, WARM: 0, COLD: 0, total: 0 }
  );

  // filtros
  const filtered = users.filter((u) => {
    if (segmentFilter !== 'ALL' && segmentFilter !== u.segment) return false;
    const days = u.days_in_trial ?? 0;
    if (days < minTrialDays || days > maxTrialDays) return false;
    if (limitReachedFilter !== null && u.limit_reached !== limitReachedFilter) return false;
    if (activeWindowOnly && !u.meta_window_active) return false;
    return true;
  });

  // ordenação
  const sorters: Record<string, (a: UserComputed, b: UserComputed) => number> = {
    messages_desc: (a, b) => (b.messages_total ?? 0) - (a.messages_total ?? 0),
    points_desc: (a, b) => (b.total_points ?? 0) - (a.total_points ?? 0),
    trial_days_desc: (a, b) => (b.days_in_trial ?? 0) - (a.days_in_trial ?? 0),
  };
  filtered.sort(sorters[sort] ?? sorters.messages_desc);

  const totalFiltered = filtered.length;

  const pageUsers = all
    ? filtered.slice(0, 2000)
    : filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return NextResponse.json({
    summary,
    page: all ? 1 : page,
    pageSize: all ? pageUsers.length : pageSize,
    totalFiltered,
    users: pageUsers.map((u) => ({
      ...u,
      last_activity_days_ago: u.last_activity_date ? daysSince(u.last_activity_date) : null,
    })),
  });
}

