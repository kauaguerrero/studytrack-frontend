'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Users, Activity, BookOpen, FileText, TrendingUp, ArrowUpRight,
  Trophy, Award, Star,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgStats {
  total_students: number;
  active_today: number;
  active_week: number;
  questions_week: number;
  simulados_month: number;
  plan_distribution: Record<string, number>;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_tier: string;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  simulados_month: number;
  accuracy_pct: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  b2b_student: 'Básico',
  b2b_pro: 'Pro',
};

const PLAN_COLORS = [
  'var(--brand-primary)',
  'var(--brand-secondary)',
  'var(--brand-accent)',
  '#334155',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  color: '#f8fafc',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Card dark com suporte a cor de acento via CSS variable ou cor fixa.
 * accentColor define a tinta do background e da borda.
 */
function TintedCard({
  children,
  className,
  accentColor,
  accentStrength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  accentStrength?: number;
}) {
  const bg = accentColor
    ? `color-mix(in srgb, ${accentColor} ${accentStrength}%, #0f172a)`
    : 'rgb(255 255 255 / 0.05)';
  const border = accentColor
    ? `color-mix(in srgb, ${accentColor} 20%, transparent)`
    : 'rgb(255 255 255 / 0.10)';

  return (
    <Card
      className={cn('backdrop-blur', className)}
      style={{ background: bg, borderColor: border }}
    >
      {children}
    </Card>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  loading,
  accentColor,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
  accentColor: string;
}) {
  const bg      = `color-mix(in srgb, ${accentColor} 13%, #0f172a)`;
  const border  = `color-mix(in srgb, ${accentColor} 28%, transparent)`;
  const iconBg  = `color-mix(in srgb, ${accentColor} 20%, transparent)`;
  const glowBg  = `radial-gradient(circle at top right, color-mix(in srgb, ${accentColor} 14%, transparent), transparent 70%)`;

  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5',
        'backdrop-blur border',
        'hover:brightness-110',
        'transition-all duration-300 group',
        href && 'cursor-pointer'
      )}
      style={{ background: bg, borderColor: border }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: glowBg }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-xl" style={{ background: iconBg }}>
            <Icon className="h-4 w-4" style={{ color: accentColor }} />
          </div>
          {href && (
            <ArrowUpRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
          )}
        </div>

        {loading ? (
          <div className="h-9 w-24 bg-white/10 rounded-lg animate-pulse" />
        ) : (
          <div className="text-4xl font-black text-white tracking-tight">{value}</div>
        )}

        <p className="text-xs font-semibold text-white/50 mt-1">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const { org } = useOrg();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

      try {
        const [resStats, resStudents] = await Promise.all([
          fetch(`${api}/api/partners/${org.slug}/stats`, { headers }),
          fetch(`${api}/api/partners/${org.slug}/students?limit=10&sort=last_activity_date`, { headers }),
        ]);

        if (resStats.ok) setStats(await resStats.json());
        if (resStudents.ok) {
          const data = await resStudents.json();
          setStudents(data.students ?? []);
        }
      } catch (err) {
        console.error('[PartnerDashboard] erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [org.slug]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const planChartData = stats
    ? Object.entries(stats.plan_distribution).map(([key, count]) => ({
        name: PLAN_LABELS[key] ?? key,
        value: count,
      }))
    : [];

  const topStudents = [...students]
    .sort((a, b) => b.questions_week - a.questions_week)
    .slice(0, 5);

  const activeRate = stats
    ? Math.round((stats.active_week / Math.max(stats.total_students, 1)) * 100)
    : 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PartnerLayout>
      <div className="space-y-6 min-h-full bg-slate-950 -mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 pt-4 md:px-8 md:pt-8 pb-8">

        {/* ── Hero Header ───────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 mb-2"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 20%, #0f172a) 0%, #0f172a 60%)',
          }}
        >
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
            style={{ background: 'var(--brand-primary)' }}
          />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">
                Central de Inteligência
              </p>
              <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
              <p className="text-sm text-white/50 mt-1">Visão geral de {org.name}</p>
            </div>
            <Badge className="text-xs border-white/20 bg-white/10 text-white backdrop-blur shrink-0">
              {org.plan_tier === 'b2b_pro' ? '⚡ Plano Pro' : 'Plano Básico'}
            </Badge>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            title="Alunos Cadastrados"
            value={stats?.total_students ?? '—'}
            subtitle={`de ${org.max_students} vagas`}
            icon={Users}
            href={`/partners/${org.slug}/alunos`}
            loading={loading}
            accentColor="var(--brand-primary)"
          />
          <KpiCard
            title="Ativos na Semana"
            value={stats?.active_week ?? '—'}
            subtitle={`${activeRate}% do total`}
            icon={Activity}
            loading={loading}
            accentColor="var(--brand-secondary)"
          />
          <KpiCard
            title="Questões esta Semana"
            value={stats?.questions_week ?? '—'}
            subtitle="respondidas pela turma"
            icon={BookOpen}
            loading={loading}
            accentColor="var(--brand-accent)"
          />
          <KpiCard
            title="Simulados este Mês"
            value={stats?.simulados_month ?? '—'}
            subtitle="realizados pela turma"
            icon={FileText}
            loading={loading}
            accentColor="#8b5cf6"
          />
        </div>

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Distribuição de Planos — tinta secondary */}
          <TintedCard accentColor="var(--brand-secondary)" accentStrength={7}>
            <CardHeader>
              <CardTitle className="text-sm text-white/80 font-bold">
                Distribuição de Planos
              </CardTitle>
              <p className="text-xs text-white/35">Alunos por tipo de acesso</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 w-full bg-white/10 rounded-xl animate-pulse" />
              ) : planChartData.length > 0 ? (
                <>
                  {/* Pie sem legenda interna */}
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={planChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {planChartData.map((_, i) => (
                          <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${v} alunos`]}
                        contentStyle={TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legenda customizada — espaçada e com fonte mais pesada */}
                  <div className="flex flex-col gap-2.5 mt-4 px-1">
                    {planChartData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                          />
                          <span className="text-sm font-semibold text-white/75">
                            {entry.name}
                          </span>
                        </div>
                        <span
                          className="text-sm font-black tabular-nums"
                          style={{ color: PLAN_COLORS[i % PLAN_COLORS.length] }}
                        >
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-white/30 py-10">Nenhum aluno ainda</p>
              )}
            </CardContent>
          </TintedCard>

          {/* Ranking da Semana — tinta primary */}
          <TintedCard accentColor="var(--brand-primary)" accentStrength={6} className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm text-white/80 font-bold">
                    Ranking da Semana
                  </CardTitle>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                   bg-white/5 text-white/30 border border-white/10">
                    TOP 5
                  </span>
                </div>
                <p className="text-xs text-white/35">
                  Questões respondidas esta semana
                </p>
              </div>
              <Link
                href={`/partners/${org.slug}/alunos`}
                className="text-xs font-medium flex items-center gap-1 shrink-0"
                style={{ color: 'var(--brand-primary)' }}
              >
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : topStudents.length === 0 ? (
                <p className="text-center text-sm text-white/30 py-8">Nenhum aluno ativo ainda</p>
              ) : (
                <div className="space-y-2">
                  {topStudents.map((student, idx) => {
                    const max = topStudents[0].questions_week || 1;
                    const pct = Math.round((student.questions_week / max) * 100);
                    const barOpacity = Math.max(0.3, 1 - idx * 0.15);

                    const today = new Date().toISOString().slice(0, 10);
                    const isOnline = student.last_activity_date === today;

                    const RankIcon =
                      idx === 0 ? Trophy :
                      idx === 1 ? Award :
                      idx === 2 ? Star : null;

                    const rankColor =
                      idx === 0 ? '#f59e0b' :   // gold
                      idx === 1 ? '#94a3b8' :   // silver
                      '#cd7c2f';                 // bronze

                    return (
                      <Link
                        key={student.id}
                        href={`/partners/${org.slug}/alunos/${student.id}`}
                        className="group block"
                      >
                        <div
                          className={cn(
                            'relative flex items-center gap-3 rounded-xl p-3',
                            'hover:bg-white/5 transition-all duration-200',
                            idx === 0 && 'bg-white/5 ring-1 ring-white/10',
                          )}
                        >
                          {/* Rank icon */}
                          <div className="w-8 shrink-0 flex items-center justify-center">
                            {RankIcon ? (
                              <RankIcon
                                className="h-4 w-4"
                                style={{ color: rankColor }}
                              />
                            ) : (
                              <span className="text-xs font-black text-white/20">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Avatar + indicador online */}
                          <div className="relative shrink-0">
                            {student.avatar_url ? (
                              <Image
                                src={student.avatar_url}
                                alt={student.full_name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                                style={{
                                  background: `color-mix(in srgb, var(--brand-primary) ${Math.max(6, 30 - idx * 4)}%, #1e293b)`,
                                }}
                              >
                                {(student.full_name || '?')[0].toUpperCase()}
                              </div>
                            )}
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1 ring-slate-900" />
                              </span>
                            )}
                          </div>

                          {/* Nome + stats + barra */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-semibold text-white/80 truncate group-hover:text-white transition-colors">
                                {student.full_name?.split(' ')[0] || '—'}
                              </span>
                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                <span
                                  className="text-xs font-black tabular-nums"
                                  style={{ color: 'var(--brand-primary)', opacity: barOpacity }}
                                >
                                  {student.questions_week} Questões
                                </span>
                                <span className="text-white/15 text-xs">·</span>
                                <span
                                  className="text-xs font-bold tabular-nums text-white/35"
                                >
                                  {student.simulados_month} Simulados
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg,
                                    color-mix(in srgb, var(--brand-primary) ${Math.round(barOpacity * 100)}%, #1e293b),
                                    var(--brand-primary))`,
                                  opacity: barOpacity,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </TintedCard>
        </div>

        {/* ── Tabela de Atividade Recente — tinta accent ────────────────────── */}
        <TintedCard accentColor="var(--brand-accent)" accentStrength={5}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm text-white/80 font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--brand-accent)' }} />
                Atividade Recente
              </CardTitle>
              <p className="text-xs text-white/35">Últimos alunos ativos</p>
            </div>
            <Link
              href={`/partners/${org.slug}/alunos`}
              className="text-xs font-medium flex items-center gap-1 shrink-0"
              style={{ color: 'var(--brand-primary)' }}
            >
              Ver tabela completa <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-white/10 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="text-center text-sm text-white/30 py-8">
                Nenhum aluno cadastrado ainda.{' '}
                <Link
                  href={`/partners/${org.slug}/alunos/convidar`}
                  className="underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Importar alunos
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[10px] text-white/30 uppercase tracking-widest">
                      <th className="pb-3 font-medium">Aluno</th>
                      <th className="pb-3 font-medium text-center">Plano</th>
                      <th className="pb-3 font-medium text-center">Q/semana</th>
                      <th className="pb-3 font-medium text-center">Simulados</th>
                      <th className="pb-3 font-medium text-center">Acertos%</th>
                      <th className="pb-3 font-medium text-center">Últ. atividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3">
                          <Link
                            href={`/partners/${org.slug}/alunos/${s.id}`}
                            className="font-semibold text-white hover:underline"
                          >
                            {s.full_name || '—'}
                          </Link>
                          <p className="text-xs text-white/30">{s.email}</p>
                        </td>
                        <td className="py-3 text-center">
                          <Badge className="text-[10px] border-white/10 bg-white/5 text-white/60">
                            {PLAN_LABELS[s.plan_tier] ?? s.plan_tier}
                          </Badge>
                        </td>
                        <td className="py-3 text-center font-medium text-white/70">
                          {s.questions_week}
                        </td>
                        <td className="py-3 text-center text-white/50">
                          {s.simulados_month}
                        </td>
                        <td className="py-3 text-center">
                          {s.accuracy_pct != null ? (
                            <span
                              className={s.accuracy_pct < 60 ? 'text-rose-400' : ''}
                              style={
                                s.accuracy_pct >= 60
                                  ? { color: 'var(--brand-primary)' }
                                  : undefined
                              }
                            >
                              {s.accuracy_pct}%
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center text-xs text-white/30">
                          {s.last_activity_date ?? 'Nunca'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </TintedCard>

      </div>
    </PartnerLayout>
  );
}
