"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";

interface AIUsageItem {
  id: string;
  feature_label: string;
  category: string;
  model_name: string;
  org_name: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
  created_at: string;
}

type FxSource = "awesomeapi" | "fallback";

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s atrás`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d atrás`;
  const diffMo = Math.floor(diffD / 30);
  return `${diffMo}m atrás`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatBRL(value: number | null): string {
  if (value == null) return "—";
  // Valores por item são centavos de real; o total do mês costuma ser maior.
  const digits = Math.abs(value) < 0.1 ? 4 : 2;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function AIUsageRecentCard() {
  const [items, setItems] = useState<AIUsageItem[]>([]);
  const [monthCostUsd, setMonthCostUsd] = useState<number | null>(null);
  const [usdBrl, setUsdBrl] = useState<number | null>(null);
  const [fxSource, setFxSource] = useState<FxSource | null>(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fxLoading, setFxLoading] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/admin/ai-usage/recent")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setMonthCostUsd(d.month_cost_usd ?? null);
        setUsdBrl(d.usd_brl ?? null);
        setFxSource(d.usd_brl_source ?? null);
        setFxUpdatedAt(d.usd_brl_updated_at ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Re-render timestamps every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Só re-puxa a cotação do dólar — não bate no banco (sem egress, sem polling).
  async function refreshFx() {
    setFxLoading(true);
    try {
      const r = await fetch("/api/admin/ai-usage/fx");
      const d = await r.json();
      if (d?.usd_brl != null) {
        setUsdBrl(d.usd_brl);
        setFxSource(d.usd_brl_source ?? null);
        setFxUpdatedAt(d.usd_brl_updated_at ?? null);
      }
    } catch {
      // silencioso — mantém a cotação anterior
    } finally {
      setFxLoading(false);
    }
  }

  const toBrl = (usd: number | null): number | null =>
    usd == null || usdBrl == null ? null : usd * usdBrl;

  const fxTitle =
    fxSource === "fallback"
      ? "Câmbio fixo (awesomeapi indisponível)"
      : fxUpdatedAt
        ? `Cotação awesomeapi de ${fxUpdatedAt}`
        : "Cotação awesomeapi";

  return (
    <Card className="border-t-4 border-t-violet-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Últimos gastos com IA
        </CardTitle>

        <div className="mt-1.5 space-y-0.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>
              Gasto nesse mês:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                {loading ? "…" : formatBRL(toBrl(monthCostUsd))}
              </span>
            </span>
            <button
              type="button"
              onClick={refreshFx}
              disabled={fxLoading || loading}
              title="Atualizar cotação do dólar (não consulta o banco)"
              className="text-slate-400 hover:text-violet-500 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${fxLoading ? "animate-spin" : ""}`} />
            </button>
          </p>
          {!loading && usdBrl != null && (
            <p className="text-[10px] text-slate-400 tabular-nums" title={fxTitle}>
              câmbio USD {formatBRL(usdBrl)}
              {fxSource === "fallback" && " · fixo"}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhuma atividade registrada ainda.
          </p>
        )}

        {!loading && items.map((item) => (
          <div
            key={item.id}
            className="relative rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-3"
          >
            {/* Linha superior: atividade + categoria */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {item.feature_label}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                    {item.category}
                  </span>
                  {item.org_name && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {item.org_name}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.model_name}
                  </span>
                </div>
              </div>

              {/* Custo */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatBRL(toBrl(item.cost_usd))}
                </p>
                <p className="text-[10px] text-slate-400 tabular-nums">
                  {formatTokens(item.total_tokens)} tokens
                </p>
              </div>
            </div>

            {/* Tokens breakdown */}
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <span>
                <span className="text-blue-500 font-semibold">↑</span>{" "}
                {formatTokens(item.input_tokens)} in
              </span>
              <span>
                <span className="text-emerald-500 font-semibold">↓</span>{" "}
                {formatTokens(item.output_tokens)} out
              </span>
            </div>

            {/* Tempo relativo — canto inferior direito */}
            <p className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 tabular-nums">
              {relativeTime(item.created_at)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
