"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportError } from "@/lib/reportError";
import { X, Trophy, Lock, Users } from "lucide-react";
import { getAchievementIcon, getDifficultyStyle } from "@/lib/achievement-icons";

interface RecentAchievement {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  organization_name: string | null;
  achievement_id: string;
  achievement_title: string;
  achievement_icon: string | null;
  difficulty: string | null;
  unlocked_at: string;
}

interface Summary {
  total_unlocked: number;
  total_locked: number;
  total_possible: number;
  students_count: number;
  achievements_per_student: number;
  period_days: number;
  unlocked_in_period: number;
}

interface Props {
  apiUrl: string;
  onClose: () => void;
}

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Tudo", days: 365 },
] as const;

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

export default function AchievementsDetailModal({ apiUrl, onClose }: Props) {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [list, setList] = useState<RecentAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (period: number) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [summaryRes, listRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/achievements/summary?days=${period}`, { headers }),
        fetch(`${apiUrl}/api/admin/achievements/recent?days=${period}&limit=50`, { headers }),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (listRes.ok) setList((await listRes.json()).achievements ?? []);
    } catch (err) {
      console.error("Erro ao buscar detalhe de conquistas:", err);
      void reportError("AchievementsDetailModalError", String(err));
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { fetchData(days); }, [days, fetchData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, #F59E0B 16%, white)' }}
            >
              <Trophy className="h-[18px] w-[18px]" style={{ color: '#B45309' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Conquistas dos Alunos</p>
              <p className="text-xs text-slate-400">Desbloqueios em toda a base B2B</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Filtro de período */}
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

          {/* Resumo geral (não muda com o período — é o total acumulado) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-3 text-center" style={{ background: 'color-mix(in srgb, #059669 7%, transparent)' }}>
              <p className="flex items-center justify-center gap-1 text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                <Trophy className="h-4 w-4" /> {summary?.total_unlocked ?? "—"}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Desbloqueadas</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: 'color-mix(in srgb, #64748b 8%, transparent)' }}>
              <p className="flex items-center justify-center gap-1 text-lg font-black tabular-nums text-slate-600 dark:text-slate-300">
                <Lock className="h-4 w-4" /> {summary?.total_locked ?? "—"}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">A desbloquear</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: 'color-mix(in srgb, #4f46e5 7%, transparent)' }}>
              <p className="flex items-center justify-center gap-1 text-lg font-black tabular-nums text-indigo-700 dark:text-indigo-400">
                <Users className="h-4 w-4" /> {summary?.students_count ?? "—"}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Alunos (base)</p>
            </div>
          </div>

          {summary && (
            <p className="text-center text-[11px] text-slate-400 dark:text-white/40">
              {summary.unlocked_in_period} desbloqueio{summary.unlocked_in_period === 1 ? "" : "s"} no período selecionado ·
              {" "}{summary.total_possible} conquistas possíveis no total ({summary.students_count} alunos × {summary.achievements_per_student})
            </p>
          )}

          {/* Lista de desbloqueios no período */}
          <div>
            <p className="mb-2.5 text-[13px] font-bold text-slate-700 dark:text-white/80">
              Desbloqueios no período <span className="font-semibold text-slate-400 dark:text-white/35">({list.length})</span>
            </p>

            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
              </div>
            ) : list.length === 0 ? (
              <p className="text-sm italic text-slate-400 dark:text-white/30">Nenhuma conquista desbloqueada nesse período</p>
            ) : (
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
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
          </div>
        </div>
      </div>
    </div>
  );
}
