"use client";

import { useCallback, useEffect, useState } from "react";
import { getAchievementIcon, getDifficultyStyle } from "@/lib/achievement-icons";
import { fetchAdminJSON, buildOrgQuery } from "./api";
import Pagination from "./Pagination";
import type { HistoryResponse, RecentAchievement } from "./types";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Tudo", days: 365 },
] as const;

const LIMIT = 20;

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function StudentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

interface Props {
  apiUrl: string;
  orgId: string | null;
}

export default function HistoryTab({ apiUrl, orgId }: Props) {
  const [days, setDays] = useState<number>(30);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<RecentAchievement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const path = `/api/admin/achievements/history?days=${days}&page=${page}&limit=${LIMIT}${buildOrgQuery(orgId)}`;
    const res = await fetchAdminJSON<HistoryResponse>(apiUrl, path);
    if (res) {
      setList(res.achievements);
      setTotal(res.total);
    }
    setLoading(false);
  }, [apiUrl, days, page, orgId]);

  // Trocar período/org volta pra primeira página (o total muda de escopo).
  useEffect(() => { setPage(1); }, [days, orgId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Período</p>
        <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                days === p.days
                  ? "bg-white text-amber-600 shadow-sm dark:bg-slate-900"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm italic text-slate-400 dark:text-white/30">Nenhuma conquista desbloqueada nesse período</p>
      ) : (
        <div className="space-y-1.5">
          {list.map((a, idx) => {
            const Icon = getAchievementIcon(a.achievement_icon);
            const style = getDifficultyStyle(a.difficulty);
            return (
              <div
                key={`${a.student_id}-${a.achievement_id}-${idx}`}
                className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 dark:border-white/10"
              >
                <StudentAvatar name={a.student_name} avatarUrl={a.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-white/85">
                    {a.student_name}
                    {a.organization_name && (
                      <span className="ml-1.5 font-normal text-slate-400 dark:text-white/35">· {a.organization_name}</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/50">
                    <span className={`flex h-4 w-4 items-center justify-center rounded ${style.iconBg} ${style.iconText}`}>
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                    {a.achievement_title}
                  </p>
                </div>
                <span className="shrink-0 text-[10.5px] text-slate-400 dark:text-white/35">{fmtRelative(a.unlocked_at)}</span>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </div>
  );
}
