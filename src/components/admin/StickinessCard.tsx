"use client";

import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Zap, Flame, CheckCircle2, XCircle, RotateCcw, Target } from "lucide-react";

interface WhatsappInfo {
  last_at: string | null;
  direction: string | null;
}

interface QuestionInfo {
  last_at: string | null;
  subject: string | null;
  is_correct: boolean | null;
}

interface DauProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  plan_tier: string | null;
  last_activity_date: string | null;
  monthly_points: number;
  current_streak: number;
  onboarding_completed: boolean | null;
  last_whatsapp: WhatsappInfo | null;
  last_question: QuestionInfo | null;
  /** Quando não-nulo: dias sem atividade antes de voltar a aparecer hoje (>= 3). */
  returned_after_days: number | null;
}

interface HealthData {
  dau: number;
  mau: number;
  stickiness: number;
  expired_trials?: number;
  churn_risk_users?: number;
  dau_profiles?: DauProfile[];
}

interface Props {
  health: HealthData;
  apiUrl: string;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function stickinessColor(val: number): string {
  if (val > 20) return "text-emerald-600 dark:text-emerald-400";
  if (val >= 10) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function planBadgeClass(tier: string | null): string {
  switch (tier) {
    case "pro":   return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
    case "elite": return "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900";
    default:      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
}

function StudentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// Cartão de métrica principal (DAU / MAU / Retenção) — padrão visual do dashboard de founder.
function StatTile({ label, value, valueClassName, accentColor }: {
  label: string;
  value: string | number;
  valueClassName?: string;
  accentColor: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{ background: `color-mix(in srgb, ${accentColor} 7%, transparent)` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 40%, white))` }}
      />
      <p className={`font-display text-[26px] font-black tabular-nums ${valueClassName ?? 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">{label}</p>
    </div>
  );
}

export default function StickinessCard({ health }: Props) {
  // b2b_test já é filtrado no backend, mas mantemos o filtro aqui como reforço.
  const profiles = (health.dau_profiles ?? []).filter((p) => p.plan_tier !== "b2b_test");

  // Estatísticas derivadas dos alunos ativos hoje — dá contexto além da contagem crua.
  const activeCount = profiles.length;
  const withStreak = profiles.filter((p) => p.current_streak > 0).length;
  const avgStreak = activeCount ? profiles.reduce((sum, p) => sum + p.current_streak, 0) / activeCount : 0;
  const answered = profiles.filter((p) => p.last_question?.is_correct != null);
  const correctCount = answered.filter((p) => p.last_question?.is_correct === true).length;
  const accuracyPct = answered.length ? Math.round((correctCount / answered.length) * 100) : null;
  const returnedUsers = profiles.filter((p) => p.returned_after_days != null);
  const maxReturnGap = returnedUsers.length
    ? Math.max(...returnedUsers.map((p) => p.returned_after_days as number))
    : 0;

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white p-5 dark:bg-slate-900 partner-elevated-card lg:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #F59E0B, color-mix(in srgb, #F59E0B 40%, white))' }}
      />

      <div className="mb-5 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'color-mix(in srgb, #F59E0B 16%, white)' }}
        >
          <Zap className="h-[18px] w-[18px]" style={{ color: '#B45309' }} />
        </div>
        <div>
          <h3 className="font-display text-base font-black text-slate-900 dark:text-white">Fidelidade de Uso (Stickiness)</h3>
          <p className="text-[11.5px] text-slate-400 dark:text-white/40">DAU/MAU por último dia com atividade</p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="DAU (24h)" value={health.dau} accentColor="#2563eb" />
        <StatTile label="MAU (30d)" value={health.mau} accentColor="#4f46e5" />
        <StatTile
          label="Retenção DAU/MAU"
          value={`${health.stickiness}%`}
          valueClassName={stickinessColor(health.stickiness)}
          accentColor="#059669"
        />
      </div>

      {/* MÉTRICAS SECUNDÁRIAS */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-red-700 dark:text-red-300">Inativos 7d (B2B)</p>
            <p className="text-lg font-black tabular-nums text-red-800 dark:text-red-200">{health.expired_trials ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-orange-100 bg-orange-50 p-3 dark:border-orange-900/40 dark:bg-orange-950/30">
          <Activity className="h-4 w-4 shrink-0 text-orange-500" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-orange-700 dark:text-orange-300">Inativos 30d (B2B)</p>
            <p className="text-lg font-black tabular-nums text-orange-800 dark:text-orange-200">{health.churn_risk_users ?? 0}</p>
          </div>
        </div>
      </div>

      {/* TABELA DAU */}
      <div className="mt-5">
        <p className="mb-2.5 text-[13px] font-bold text-slate-700 dark:text-white/80">
          Ativos hoje <span className="font-semibold text-slate-400 dark:text-white/35">({activeCount} usuário{activeCount === 1 ? '' : 's'})</span>
        </p>

        {activeCount === 0 ? (
          <p className="text-sm italic text-slate-400 dark:text-white/30">Nenhum usuário ativo nas últimas 24h</p>
        ) : (
          <>
            {/* Chips de estatísticas do grupo ativo hoje */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                <Flame className="h-3 w-3" /> {withStreak}/{activeCount} com sequência ativa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                <Zap className="h-3 w-3" /> streak médio {avgStreak.toFixed(1)}d
              </span>
              {accuracyPct !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <Target className="h-3 w-3" /> {accuracyPct}% de acerto na última questão
                </span>
              )}
              {returnedUsers.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                  <RotateCcw className="h-3 w-3" /> {returnedUsers.length} volt{returnedUsers.length === 1 ? 'ou' : 'aram'} após até {maxReturnGap}d sumido{maxReturnGap === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase tracking-wide dark:bg-white/5 dark:text-white/35">
                    <th className="px-3 py-2 text-left font-bold">Nome</th>
                    <th className="px-3 py-2 text-left font-bold">Plano</th>
                    <th className="px-3 py-2 text-right font-bold">Pontos</th>
                    <th className="px-3 py-2 text-right font-bold">Streak</th>
                    <th className="px-3 py-2 text-left font-bold">Última questão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {profiles.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="max-w-[140px] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <StudentAvatar name={p.full_name} avatarUrl={p.avatar_url} />
                          <span className="truncate font-semibold text-slate-800 dark:text-white/85">{p.full_name}</span>
                          {p.returned_after_days != null && (
                            <span
                              className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                              title={`Sem atividade por ${p.returned_after_days} dias antes de voltar hoje`}
                            >
                              <RotateCcw className="h-2.5 w-2.5" /> {p.returned_after_days}d
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${planBadgeClass(p.plan_tier)}`}>
                          {p.plan_tier ?? "free"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-white/60">
                        {p.monthly_points}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {p.current_streak > 0
                          ? <span className="inline-flex items-center gap-1 font-semibold tabular-nums"><Flame className="h-3.5 w-3.5 text-orange-500" />{p.current_streak}d</span>
                          : <span className="text-slate-300 dark:text-white/20">—</span>}
                      </td>
                      <td className="max-w-[160px] px-3 py-2 text-slate-600 dark:text-white/60">
                        {p.last_question
                          ? <span className="inline-flex items-center gap-1" title={p.last_question.subject ?? ""}>{p.last_question.is_correct ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />} {p.last_question.subject ?? "?"} · {fmtRelative(p.last_question.last_at)}</span>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
