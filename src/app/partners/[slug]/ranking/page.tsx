'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Trophy, Award, Star, ArrowUpRight } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_name?: string | null;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  accuracy_pct: number | null;
}

type MetricWindow = 'today' | 'week' | 'month' | 'total';

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export default function FounderRankingPage() {
  const { org } = useOrg();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricWindow, setMetricWindow] = useState<MetricWindow>('week');

  const metricLabel = { today: 'Hoje', week: 'Esta semana', month: 'Este mês', total: 'Total' }[metricWindow];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

      try {
        let page = 1;
        const all: Student[] = [];
        while (true) {
          const res = await fetch(`${api}/api/partners/${org.slug}/students?limit=100&page=${page}&sort=full_name&order=asc`, { headers });
          if (!res.ok) break;
          const payload = await res.json();
          const batch: Student[] = Array.isArray(payload?.students) ? payload.students : [];
          all.push(...batch);
          if (all.length >= (payload?.total ?? 0) || batch.length < 100) break;
          page++;
        }
        setStudents(all);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [org.slug]);

  const getQ = (s: Student) => metricWindow === 'today' ? s.questions_today : metricWindow === 'week' ? s.questions_week : metricWindow === 'month' ? s.questions_month : s.questions_total;
  const getSim = (s: Student) => metricWindow === 'today' ? s.simulados_today : metricWindow === 'week' ? s.simulados_week : metricWindow === 'month' ? s.simulados_month : s.simulados_total;

  const sorted = useMemo(() => [...students].sort((a, b) =>
    getQ(b) - getQ(a) || getSim(b) - getSim(a) || (b.last_activity_date || '').localeCompare(a.last_activity_date || '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [students, metricWindow]);

  const todayKey = toBrtDateKey(new Date());
  const maxQ = getQ(sorted[0]) || 1;

  return (
    <PartnerLayout>
      <div className="space-y-6 min-h-full">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-1">Atividade dos Alunos</p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Ranking</h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              {loading ? '...' : `${sorted.length} aluno${sorted.length !== 1 ? 's' : ''}`} · ordenado por questões e simulados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-white/40">Período</span>
            <Select value={metricWindow} onValueChange={(v) => setMetricWindow(v as MetricWindow)}>
              <SelectTrigger className="h-9 w-[160px] text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">Ranking · {metricLabel}</span>
            <span className="text-xs text-slate-400 dark:text-white/25">{sorted.length} alunos</span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-white/10 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-white/30">Nenhum aluno cadastrado</p>
            </div>
          ) : (
            <div className="p-2">
              {sorted.map((student, idx) => {
                const q = getQ(student);
                const sim = getSim(student);
                const pct = Math.round((q / maxQ) * 100);
                const isOnline = student.last_activity_date === todayKey;
                const RankIcon = idx === 0 ? Trophy : idx === 1 ? Award : idx === 2 ? Star : null;
                const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#cd7c2f';

                return (
                  <Link key={student.id} href={`/partners/${org.slug}/alunos/${student.id}`} className="group block">
                    <div className={cn(
                      'relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150',
                      'hover:bg-slate-50 dark:hover:bg-white/5',
                      idx === 0 && 'bg-slate-50 dark:bg-white/5',
                    )}>
                      {/* Rank */}
                      <div className="w-8 shrink-0 flex items-center justify-center">
                        {RankIcon ? (
                          <RankIcon className="h-4 w-4" style={{ color: rankColor }} />
                        ) : (
                          <span className="text-xs font-bold text-slate-400 dark:text-white/25">#{idx + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {student.avatar_url ? (
                          <Image src={student.avatar_url} alt={student.full_name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                            style={{ background: `color-mix(in srgb, var(--brand-primary) ${Math.max(6, 30 - idx * 2)}%, #1e293b)` }}>
                            {(student.full_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                          </span>
                        )}
                      </div>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-700 dark:text-white/80 truncate">
                            {student.full_name || '—'}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-black tabular-nums" style={{ color: 'var(--brand-primary)' }}>
                              {q} Q
                            </span>
                            <span className="text-slate-300 dark:text-white/15 text-xs">·</span>
                            <span className="text-xs font-bold tabular-nums text-slate-400 dark:text-white/35">
                              {sim} Sim
                            </span>
                            {student.accuracy_pct != null && (
                              <>
                                <span className="text-slate-300 dark:text-white/15 text-xs">·</span>
                                <span className={`text-xs font-bold tabular-nums ${student.accuracy_pct < 60 ? 'text-rose-400' : ''}`}
                                  style={student.accuracy_pct >= 60 ? { color: 'var(--brand-primary)' } : undefined}>
                                  {student.accuracy_pct}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: 'var(--brand-primary)', opacity: Math.max(0.25, 1 - idx * 0.04) }} />
                        </div>
                      </div>

                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 dark:text-white/15 group-hover:text-slate-500 dark:group-hover:text-white/40 transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
}
