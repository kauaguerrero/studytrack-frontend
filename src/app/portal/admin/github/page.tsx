'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Github,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type LinkRow = {
  id: string;
  profile_id: string;
  github_username: string;
  profiles?: { full_name?: string; avatar_url?: string | null } | null;
};

type ActivityRow = {
  github_username: string;
  repo: string;
  week_start: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  synced_at: string;
};

type DailyActivityRow = {
  date: string;
  commits: number;
  prs_opened: number;
  prs_merged: number;
  total: number;
};

type LinkMeta = { full_name: string; avatar_url: string | null };

type MessageState = { type: 'success' | 'error'; text: string } | null;

const REPO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'studytrack-frontend', label: 'studytrack-frontend' },
  { value: 'studytrack-backend', label: 'studytrack-backend' },
];

const WEEK_OPTIONS = [
  { value: 4, label: '4 semanas' },
  { value: 8, label: '8 semanas' },
  { value: 12, label: '12 semanas' },
];

function formatDateTime(value: string | null) {
  if (!value) return 'Nunca sincronizado';
  const d = new Date(value);
  return `Última sync: ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatWeekStart(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getHeatColor(level: 0 | 1 | 2 | 3 | 4, isDark: boolean) {
  if (isDark) {
    if (level === 0) return '#161b22';
    if (level === 1) return '#0e4429';
    if (level === 2) return '#006d32';
    if (level === 3) return '#26a641';
    return '#39d353';
  }
  if (level === 0) return '#ebedf0';
  if (level === 1) return '#9be9a8';
  if (level === 2) return '#40c463';
  if (level === 3) return '#30a14e';
  return '#216e39';
}

function resolveHeatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function Avatar({ name, avatarUrl, isDark }: { name: string; avatarUrl: string | null | undefined; isDark: boolean }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`h-8 w-8 rounded-full object-cover border ${isDark ? 'border-white/[0.08]' : 'border-zinc-200'}`}
      />
    );
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '??';

  return (
    <div
      className={`h-8 w-8 rounded-full border text-[11px] font-bold flex items-center justify-center ${
        isDark ? 'border-white/[0.08] bg-zinc-800 text-zinc-200' : 'border-zinc-200 bg-zinc-100 text-zinc-700'
      }`}
    >
      {initials}
    </div>
  );
}

function SkeletonRow({ isDark }: { isDark: boolean }) {
  return (
    <div className={`grid grid-cols-12 gap-3 py-2.5 border-t animate-pulse ${isDark ? 'border-white/[0.06]' : 'border-zinc-200'}`}>
      <div className={`col-span-5 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`col-span-2 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`col-span-1 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`col-span-1 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`col-span-1 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      <div className={`col-span-2 h-6 rounded ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
    </div>
  );
}

export default function AdminGithubPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [weeks, setWeeks] = useState(8);
  const [repo, setRepo] = useState('');
  const [username, setUsername] = useState('');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linksOpen, setLinksOpen] = useState(false);
  const [inputByProfileId, setInputByProfileId] = useState<Record<string, string>>({});

  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [calendarActivity, setCalendarActivity] = useState<ActivityRow[]>([]);
  const [linkMetaMap, setLinkMetaMap] = useState<Record<string, LinkMeta>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [calendarRepo, setCalendarRepo] = useState('');
  const [calendarUsername, setCalendarUsername] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingCalendarActivity, setLoadingCalendarActivity] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingByProfileId, setSavingByProfileId] = useState<Record<string, boolean>>({});
  const [removingByProfileId, setRemovingByProfileId] = useState<Record<string, boolean>>({});

  const [message, setMessage] = useState<MessageState>(null);
  const isDark = mounted && resolvedTheme !== 'light';

  async function fetchProfiles() {
    setLoadingProfiles(true);
    try {
      const res = await fetch('/api/admin/profiles?roles=admin,dev', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao carregar perfis');
      setProfiles(data ?? []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Falha ao carregar perfis' });
    } finally {
      setLoadingProfiles(false);
    }
  }

  async function fetchLinks() {
    setLoadingLinks(true);
    try {
      const res = await fetch('/api/admin/github/links', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao carregar vínculos');

      const linkRows: LinkRow[] = data?.links ?? [];
      setLinks(linkRows);

      const nextInputs: Record<string, string> = {};
      for (const p of profiles) nextInputs[p.id] = '';
      for (const l of linkRows) nextInputs[l.profile_id] = l.github_username ?? '';
      setInputByProfileId(current => ({ ...nextInputs, ...current }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Falha ao carregar vínculos' });
    } finally {
      setLoadingLinks(false);
    }
  }

  async function fetchActivity() {
    setLoadingActivity(true);
    try {
      const params = new URLSearchParams();
      params.set('weeks', String(weeks));
      if (repo) params.set('repo', repo);
      if (username) params.set('username', username);

      const res = await fetch(`/api/admin/github/activity?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao carregar atividade');

      setActivity(data?.activity ?? []);
      setLinkMetaMap(data?.links ?? {});
      setLastSyncedAt(data?.last_synced_at ?? null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Falha ao carregar atividade' });
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }

  async function fetchDailyCalendarActivity() {
    setLoadingCalendarActivity(true);
    try {
      const params = new URLSearchParams();
      params.set('month', calendarMonth);
      if (calendarRepo) params.set('repo', calendarRepo);
      if (calendarUsername) params.set('username', calendarUsername);

      const res = await fetch(`/api/admin/github/daily?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao carregar calendário diário');
      const rows: DailyActivityRow[] = data?.days ?? [];
      setCalendarActivity(rows.map(row => ({
        github_username: calendarUsername || 'all',
        repo: calendarRepo || 'all',
        week_start: row.date,
        commits: row.commits,
        prs_opened: row.prs_opened,
        prs_merged: row.prs_merged,
        synced_at: '',
      })));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Falha ao carregar calendário diário' });
      setCalendarActivity([]);
    } finally {
      setLoadingCalendarActivity(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, repo, username]);

  useEffect(() => {
    fetchDailyCalendarActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, calendarRepo, calendarUsername, calendarMonth]);

  const usernames = useMemo(() => {
    const set = new Set<string>();
    for (const l of links) set.add(l.github_username);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [links]);

  const teamSummary = useMemo(() => {
    let commits = 0;
    let prsOpened = 0;
    let prsMerged = 0;
    for (const row of activity) {
      commits += row.commits || 0;
      prsOpened += row.prs_opened || 0;
      prsMerged += row.prs_merged || 0;
    }
    return { commits, prsOpened, prsMerged };
  }, [activity]);

  const byDevRows = useMemo(() => {
    const map: Record<string, {
      github_username: string;
      commits: number;
      prs_opened: number;
      prs_merged: number;
      activeWeeks: Set<string>;
    }> = {};

    for (const row of activity) {
      if (!map[row.github_username]) {
        map[row.github_username] = {
          github_username: row.github_username,
          commits: 0,
          prs_opened: 0,
          prs_merged: 0,
          activeWeeks: new Set(),
        };
      }
      map[row.github_username].commits += row.commits || 0;
      map[row.github_username].prs_opened += row.prs_opened || 0;
      map[row.github_username].prs_merged += row.prs_merged || 0;
      if ((row.commits || 0) + (row.prs_opened || 0) + (row.prs_merged || 0) > 0) {
        map[row.github_username].activeWeeks.add(row.week_start);
      }
    }

    return Object.values(map)
      .map(item => ({ ...item, weeks_active: item.activeWeeks.size }))
      .sort((a, b) => b.commits - a.commits);
  }, [activity]);

  const weeklyData = useMemo(() => {
    if (username) {
      const map: Record<string, { commits: number; prs_opened: number; prs_merged: number }> = {};
      for (const row of activity) {
        if (!map[row.week_start]) map[row.week_start] = { commits: 0, prs_opened: 0, prs_merged: 0 };
        map[row.week_start].commits += row.commits || 0;
        map[row.week_start].prs_opened += row.prs_opened || 0;
        map[row.week_start].prs_merged += row.prs_merged || 0;
      }
      return { groupedByRepo: false, rows: Object.entries(map).map(([week, metrics]) => ({ week, ...metrics })) };
    }

    if (repo) {
      const map: Record<string, { commits: number; prs_opened: number; prs_merged: number }> = {};
      for (const row of activity) {
        if (!map[row.week_start]) map[row.week_start] = { commits: 0, prs_opened: 0, prs_merged: 0 };
        map[row.week_start].commits += row.commits || 0;
        map[row.week_start].prs_opened += row.prs_opened || 0;
        map[row.week_start].prs_merged += row.prs_merged || 0;
      }
      return { groupedByRepo: false, rows: Object.entries(map).map(([week, metrics]) => ({ week, ...metrics })) };
    }

    const byRepo: Record<string, Record<string, { commits: number; prs_opened: number; prs_merged: number }>> = {};
    for (const row of activity) {
      if (!byRepo[row.repo]) byRepo[row.repo] = {};
      if (!byRepo[row.repo][row.week_start]) byRepo[row.repo][row.week_start] = { commits: 0, prs_opened: 0, prs_merged: 0 };
      byRepo[row.repo][row.week_start].commits += row.commits || 0;
      byRepo[row.repo][row.week_start].prs_opened += row.prs_opened || 0;
      byRepo[row.repo][row.week_start].prs_merged += row.prs_merged || 0;
    }

    return {
      groupedByRepo: true,
      repos: Object.entries(byRepo).map(([repoName, weekMap]) => {
        const rows = Object.entries(weekMap).map(([week, metrics]) => ({ week, ...metrics }));
        const subtotal = rows.reduce(
          (acc, curr) => ({
            commits: acc.commits + curr.commits,
            prs_opened: acc.prs_opened + curr.prs_opened,
            prs_merged: acc.prs_merged + curr.prs_merged,
          }),
          { commits: 0, prs_opened: 0, prs_merged: 0 }
        );
        return { repo: repoName, rows, subtotal };
      }),
    };
  }, [activity, repo, username]);

  const dailyHeatmap = useMemo(() => {
    const totalsByDay: Record<string, number> = {};
    for (const row of calendarActivity) {
      const total = (row.commits || 0) + (row.prs_opened || 0) + (row.prs_merged || 0);
      totalsByDay[row.week_start] = (totalsByDay[row.week_start] ?? 0) + total;
    }

    const [yearStr, monthStr] = calendarMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return { weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], cells: [] as Array<{ date: string | null; value: number; level: 0 | 1 | 2 | 3 | 4 }> };

    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mondayBasedOffset = (firstDay.getUTCDay() + 6) % 7;

    const daysList: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
      daysList.push(date);
    }

    const max = Math.max(0, ...daysList.map(day => totalsByDay[day] ?? 0));
    const cells: Array<{ date: string | null; value: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
    for (let i = 0; i < mondayBasedOffset; i++) {
      cells.push({ date: null, value: 0, level: 0 });
    }
    for (const day of daysList) {
      const value = totalsByDay[day] ?? 0;
      cells.push({ date: day, value, level: resolveHeatLevel(value, max) });
    }

    return { weekdays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], cells };
  }, [calendarActivity, calendarMonth]);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/github/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao sincronizar');
      setMessage({
        type: 'success',
        text: `Sincronização concluída: ${data?.rows_upserted ?? 0} linhas atualizadas.`,
      });
      await fetchActivity();
      await fetchLinks();
      await fetchDailyCalendarActivity();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Erro na sincronização' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveLink(profileId: string) {
    const value = (inputByProfileId[profileId] ?? '').trim();
    if (!value) {
      setMessage({ type: 'error', text: 'Informe um username do GitHub antes de salvar.' });
      return;
    }

    setSavingByProfileId(prev => ({ ...prev, [profileId]: true }));
    setMessage(null);
    try {
      const res = await fetch('/api/admin/github/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, github_username: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao salvar vínculo');
      setMessage({ type: 'success', text: 'Vínculo salvo com sucesso.' });
      await fetchLinks();
      await fetchActivity();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Erro ao salvar vínculo' });
    } finally {
      setSavingByProfileId(prev => ({ ...prev, [profileId]: false }));
    }
  }

  async function handleRemoveLink(profileId: string) {
    setRemovingByProfileId(prev => ({ ...prev, [profileId]: true }));
    setMessage(null);
    try {
      const res = await fetch('/api/admin/github/links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao remover vínculo');
      setInputByProfileId(prev => ({ ...prev, [profileId]: '' }));
      setMessage({ type: 'success', text: 'Vínculo removido.' });
      await fetchLinks();
      await fetchActivity();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message ?? 'Erro ao remover vínculo' });
    } finally {
      setRemovingByProfileId(prev => ({ ...prev, [profileId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-[1380px] mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/portal/admin/tasks"
              className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/[0.18] transition-all"
              title="Voltar para tasks"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center">
              <Github className="w-4.5 h-4.5 text-zinc-700 dark:text-zinc-100" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Atividade GitHub</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">{formatDateTime(lastSyncedAt)}</p>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-200">
          ⚠️ Estas métricas são indicadores auxiliares de atividade técnica. Não representam produtividade individual nem são usadas como KPI.
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4">
          <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Período</label>
              <select
                value={weeks}
                onChange={e => setWeeks(Number(e.target.value))}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
              >
                {WEEK_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Repositório</label>
              <select
                value={repo}
                onChange={e => setRepo(e.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
              >
                {REPO_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Desenvolvedor</label>
              <select
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
              >
                <option value="">Todos</option>
                {usernames.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 overflow-hidden">
          <button
            onClick={() => setLinksOpen(value => !value)}
            className="w-full px-4 py-3 border-b border-zinc-200 dark:border-white/[0.06] flex items-center justify-between text-left"
          >
            <span className="text-sm font-bold">Vínculos Dev ↔ GitHub</span>
            {linksOpen ? <ChevronUp className="w-4 h-4 text-zinc-400 dark:text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-400" />}
          </button>

          {linksOpen && (
            <div className="p-4 space-y-3">
              {(loadingProfiles || loadingLinks) && (
                <div className="space-y-2">
                  <SkeletonRow isDark={isDark} />
                  <SkeletonRow isDark={isDark} />
                </div>
              )}

              {!loadingProfiles && !loadingLinks && profiles.length === 0 && (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum profile com role admin/dev encontrado.</div>
              )}

              {!loadingProfiles && !loadingLinks && profiles.map(profile => (
                <div key={profile.id} className="grid lg:grid-cols-[minmax(0,1fr)_240px_auto_auto] grid-cols-1 gap-2 items-center rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-slate-50 dark:bg-zinc-950 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} isDark={isDark} />
                    <span className="text-sm font-medium truncate">{profile.full_name}</span>
                  </div>

                  <input
                    value={inputByProfileId[profile.id] ?? ''}
                    onChange={e => setInputByProfileId(prev => ({ ...prev, [profile.id]: e.target.value }))}
                    placeholder="github_username"
                    className="h-9 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
                  />

                  <button
                    onClick={() => handleSaveLink(profile.id)}
                    disabled={!!savingByProfileId[profile.id]}
                    className="h-9 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {savingByProfileId[profile.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </button>

                  <button
                    onClick={() => handleRemoveLink(profile.id)}
                    disabled={!!removingByProfileId[profile.id]}
                    className="h-9 px-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {removingByProfileId[profile.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
          {loadingActivity ? (
            <>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4 animate-pulse h-24" />
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4 animate-pulse h-24" />
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4 animate-pulse h-24" />
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Commits totais</p>
                <p className="text-3xl font-extrabold mt-2">{teamSummary.commits}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">PRs abertas</p>
                <p className="text-3xl font-extrabold mt-2">{teamSummary.prsOpened}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">PRs merged</p>
                <p className="text-3xl font-extrabold mt-2">{teamSummary.prsMerged}</p>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <h2 className="text-sm font-bold">Calendário de atividade</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">Semanas mais intensas ficam com cor mais forte</span>
          </div>

          <div className="grid md:grid-cols-3 grid-cols-1 gap-3 mb-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Calendário por repositório</label>
              <select
                value={calendarRepo}
                onChange={e => setCalendarRepo(e.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
              >
                {REPO_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Calendário por desenvolvedor</label>
              <select
                value={calendarUsername}
                onChange={e => setCalendarUsername(e.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50"
              >
                <option value="">Todos</option>
                {usernames.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Mês</label>
              <input
                type="month"
                value={calendarMonth}
                onChange={e => setCalendarMonth(e.target.value)}
                className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {loadingCalendarActivity ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando calendário...
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
            <div className="inline-grid grid-cols-7 gap-1.5">
              {dailyHeatmap.weekdays.map(day => (
                <span key={day} className="text-[10px] text-zinc-500 dark:text-zinc-500 text-center">{day}</span>
              ))}
              {dailyHeatmap.cells.map((cell, index) => {
                if (!cell.date) {
                  return <span key={`blank-${index}`} className="h-4 w-4" />;
                }
                const color = getHeatColor(cell.level, isDark);
                return (
                  <div key={cell.date} className="flex flex-col items-center gap-1">
                    <div
                      title={`${new Date(`${cell.date}T00:00:00`).toLocaleDateString('pt-BR')} • ${cell.value} evento(s)`}
                      className="h-4 w-4 rounded-[3px] border"
                      style={{
                        backgroundColor: color,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  </div>
                );
              })}
            </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
            <span>Menos</span>
            {[0, 1, 2, 3, 4].map(level => (
              <span
                key={level}
                className="inline-block h-3.5 w-3.5 rounded-[3px] border"
                style={{
                  backgroundColor: getHeatColor(level as 0 | 1 | 2 | 3 | 4, isDark),
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              />
            ))}
            <span>Mais</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.06] text-sm font-bold">Atividade por desenvolvedor</div>
          <div className="px-4 py-2 text-[11px] text-zinc-500 grid grid-cols-12 gap-3 uppercase tracking-wider font-bold">
            <span className="col-span-4">Nome</span>
            <span className="col-span-2">GitHub</span>
            <span className="col-span-1">Commits</span>
            <span className="col-span-1">PRs abertas</span>
            <span className="col-span-1">PRs merged</span>
            <span className="col-span-3">Semanas ativas</span>
          </div>
          <div className="px-4 pb-3">
            {loadingActivity && (
              <>
                <SkeletonRow isDark={isDark} />
                <SkeletonRow isDark={isDark} />
                <SkeletonRow isDark={isDark} />
              </>
            )}

            {!loadingActivity && byDevRows.length === 0 && (
              <div className="py-6 text-sm text-zinc-500 dark:text-zinc-400">Sem dados para os filtros atuais.</div>
            )}

            {!loadingActivity && byDevRows.map(row => {
              const meta = linkMetaMap[row.github_username];
              const displayName = meta?.full_name || row.github_username;
              return (
                <div key={row.github_username} className="grid grid-cols-12 gap-3 py-2.5 border-t border-zinc-200 dark:border-white/[0.06] text-sm">
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <Avatar name={displayName} avatarUrl={meta?.avatar_url} isDark={isDark} />
                    <span className="truncate">{displayName}</span>
                  </div>
                  <div className="col-span-2 text-zinc-600 dark:text-zinc-300 truncate">@{row.github_username}</div>
                  <div className="col-span-1 tabular-nums">{row.commits}</div>
                  <div className="col-span-1 tabular-nums">{row.prs_opened}</div>
                  <div className="col-span-1 tabular-nums">{row.prs_merged}</div>
                  <div className="col-span-3 tabular-nums">{row.weeks_active}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.06] text-sm font-bold">
            Frequência semanal — {username ? (linkMetaMap[username]?.full_name ?? username) : 'time completo'}
          </div>

          <div className="p-4">
            {loadingActivity && (
                <div className="space-y-2">
                <SkeletonRow isDark={isDark} />
                <SkeletonRow isDark={isDark} />
              </div>
            )}

            {!loadingActivity && !weeklyData.groupedByRepo && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 dark:text-zinc-500 text-[11px] uppercase tracking-wider">
                    <th className="text-left py-2">Semana</th>
                    <th className="text-left py-2">Commits</th>
                    <th className="text-left py-2">PRs abertas</th>
                    <th className="text-left py-2">PRs merged</th>
                  </tr>
                </thead>
                <tbody>
                  {(weeklyData.rows ?? []).map((row: any) => (
                    <tr key={row.week} className="border-t border-zinc-200 dark:border-white/[0.06]">
                      <td className="py-2 tabular-nums">{formatWeekStart(row.week)}</td>
                      <td className="py-2 tabular-nums">{row.commits}</td>
                      <td className="py-2 tabular-nums">{row.prs_opened}</td>
                      <td className="py-2 tabular-nums">{row.prs_merged}</td>
                    </tr>
                  ))}
                  {(weeklyData.rows ?? []).length === 0 && (
                    <tr>
                      <td className="py-4 text-zinc-500 dark:text-zinc-400" colSpan={4}>Sem dados semanais para os filtros atuais.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {!loadingActivity && weeklyData.groupedByRepo && (
              <div className="space-y-4">
                {(weeklyData.repos ?? []).map((repoGroup: any) => (
                  <div key={repoGroup.repo} className="rounded-xl border border-zinc-200 dark:border-white/[0.06] overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-white/[0.06] text-sm font-semibold">
                      {repoGroup.repo}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500 dark:text-zinc-500 text-[11px] uppercase tracking-wider">
                          <th className="text-left py-2 px-3">Semana</th>
                          <th className="text-left py-2">Commits</th>
                          <th className="text-left py-2">PRs abertas</th>
                          <th className="text-left py-2 pr-3">PRs merged</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repoGroup.rows.map((row: any) => (
                          <tr key={`${repoGroup.repo}-${row.week}`} className="border-t border-zinc-200 dark:border-white/[0.06]">
                            <td className="py-2 px-3 tabular-nums">{formatWeekStart(row.week)}</td>
                            <td className="py-2 tabular-nums">{row.commits}</td>
                            <td className="py-2 tabular-nums">{row.prs_opened}</td>
                            <td className="py-2 pr-3 tabular-nums">{row.prs_merged}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-zinc-950/70">
                          <td className="py-2 px-3 font-semibold">Subtotal</td>
                          <td className="py-2 tabular-nums font-semibold">{repoGroup.subtotal.commits}</td>
                          <td className="py-2 tabular-nums font-semibold">{repoGroup.subtotal.prs_opened}</td>
                          <td className="py-2 pr-3 tabular-nums font-semibold">{repoGroup.subtotal.prs_merged}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
                {(weeklyData.repos ?? []).length === 0 && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Sem dados semanais para o período atual.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
