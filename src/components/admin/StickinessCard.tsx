"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Zap, FlaskConical, Flame, CornerDownLeft, CornerDownRight, CheckCircle2, XCircle } from "lucide-react";
import RetentionAnalysisModal from "@/components/admin/RetentionAnalysisModal";

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
  plan_tier: string | null;
  last_activity_date: string | null;
  total_points: number;
  current_streak: number;
  trial_days: number | null;
  onboarding_completed: boolean | null;
  last_whatsapp: WhatsappInfo | null;
  last_question: QuestionInfo | null;
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
  if (val > 20) return "text-green-600";
  if (val >= 10) return "text-amber-500";
  return "text-red-500";
}

function planBadgeClass(tier: string | null): string {
  switch (tier) {
    case "pro":   return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border-emerald-200";
    case "elite": return "bg-violet-50 dark:bg-violet-950/40 text-violet-700 border-violet-200";
    default:      return "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200";
  }
}

export default function StickinessCard({ health, apiUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const profiles = health.dau_profiles ?? [];

  return (
    <>
      <Card className="hover:border-slate-300 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-amber-500" /> Fidelidade de Uso (Stickiness)
          </CardTitle>
          <CardDescription>DAU/MAU por último dia com atividade (last_activity_date).</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* MÉTRICAS PRINCIPAIS */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{health.dau}</p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">DAU (24h)</p>
            </div>
            <div className="h-px" />
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{health.mau}</p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">MAU (30d)</p>
            </div>
            <div className="col-span-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className={`text-2xl font-bold ${stickinessColor(health.stickiness)}`}>
                {health.stickiness}%
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Retenção DAU/MAU</p>
            </div>
          </div>

          {/* MÉTRICAS SECUNDÁRIAS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Trials expirados</p>
                <p className="text-xl font-bold text-red-800 dark:text-red-200">{health.expired_trials ?? 0}</p>
              </div>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 p-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">Risco de churn (+30d)</p>
                <p className="text-xl font-bold text-orange-800 dark:text-orange-200">{health.churn_risk_users ?? 0}</p>
              </div>
            </div>
          </div>

          {/* TABELA DAU */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Ativos hoje ({health.dau} usuários)
            </p>
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum usuário ativo nas últimas 24h</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                      <th className="px-3 py-2 text-left font-semibold">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold">Plano</th>
                      <th className="px-3 py-2 text-right font-semibold">Pts</th>
                      <th className="px-3 py-2 text-right font-semibold">Streak</th>
                      <th className="px-3 py-2 text-right font-semibold">Trial</th>
                      <th className="px-3 py-2 text-left font-semibold">Último WhatsApp</th>
                      <th className="px-3 py-2 text-left font-semibold">Última questão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profiles.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                          {p.full_name}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[10px] ${planBadgeClass(p.plan_tier)}`}>
                            {p.plan_tier ?? "free"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          {p.total_points}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.current_streak > 0
                            ? <span className="inline-flex items-center gap-1 font-medium"><Flame className="w-3.5 h-3.5 text-orange-500" />{p.current_streak}d</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">
                          {p.trial_days != null ? `${p.trial_days}d` : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {p.last_whatsapp
                            ? <span className="inline-flex items-center gap-1">{p.last_whatsapp.direction === "inbound" ? <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />} {fmtRelative(p.last_whatsapp.last_at)}</span>
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[140px]">
                          {p.last_question
                            ? <span className="inline-flex items-center gap-1" title={p.last_question.subject ?? ""}>{p.last_question.is_correct ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />} {p.last_question.subject ?? "?"} · {fmtRelative(p.last_question.last_at)}</span>
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BOTÃO GEMINI */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={profiles.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <FlaskConical className="w-4 h-4" /> Analisar com Gemini
          </button>
        </CardContent>
      </Card>

      <RetentionAnalysisModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        health={health}
        apiUrl={apiUrl}
      />
    </>
  );
}
