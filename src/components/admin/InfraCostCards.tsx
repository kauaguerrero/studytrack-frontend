"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  ScanText,
  Server,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { KpiCard } from "@/components/partners/founder-ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProviderKey = "gcp" | "mathpix" | "fly";
type Status = "ok" | "not_configured" | "error";

interface ProviderSummary {
  provider: ProviderKey;
  status: Status;
  granularity: "daily" | "month_to_date";
  mtd_usd: number | null;
  today_usd: number | null;
  prev_day_usd: number | null;
}

interface SeriesPoint {
  date: string;
  gcp: number | null;
  mathpix: number | null;
  fly: number | null;
}

interface InfraCostResponse {
  month: string;
  today: string;
  updated_at: string | null;
  providers: ProviderSummary[];
  series: SeriesPoint[];
}

const META: Record<
  ProviderKey,
  { label: string; icon: typeof Cloud; accent: string }
> = {
  gcp: { label: "Google Cloud", icon: Cloud, accent: "#2563eb" },
  mathpix: { label: "Mathpix", icon: ScanText, accent: "#16a34a" },
  fly: { label: "Fly.io", icon: Server, accent: "#7c3aed" },
};

const ORDER: ProviderKey[] = ["gcp", "mathpix", "fly"];

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n > 0 && n < 0.01) return "< $0,01";
  return `$${n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function subtitleFor(p: ProviderSummary): string {
  if (p.status === "not_configured") {
    return p.provider === "gcp"
      ? "Billing export p/ BigQuery pendente"
      : "Sem credenciais configuradas";
  }
  if (p.status === "error") return "Erro na última coleta";
  if (p.today_usd !== null && Number.isFinite(p.today_usd)) {
    const sign = p.today_usd > 0 ? "+" : "";
    return `${sign}${formatUSD(p.today_usd)} hoje`;
  }
  return "Mês até agora";
}

interface TooltipEntry {
  name: string;
  value: number | null;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1.5 font-bold text-slate-800 dark:text-slate-100">
        Dia {label}
      </p>
      {payload.map((e) => (
        <p key={e.name} className="text-slate-500 dark:text-slate-400">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: e.color }}
          />
          {e.name}:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatUSD(e.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function InfraCostCards() {
  const [data, setData] = useState<InfraCostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/infra-costs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const providers = useMemo(() => {
    const map = new Map(data?.providers.map((p) => [p.provider, p]) ?? []);
    return ORDER.map(
      (key): ProviderSummary =>
        map.get(key) ?? {
          provider: key,
          status: "not_configured",
          granularity: "daily",
          mtd_usd: null,
          today_usd: null,
          prev_day_usd: null,
        }
    );
  }, [data]);

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((pt) => ({
        dm: Number(pt.date.slice(8, 10)),
        gcp: pt.gcp,
        mathpix: pt.mathpix,
        fly: pt.fly,
      })),
    [data]
  );

  const hasAnySeries = chartData.some(
    (d) => d.gcp !== null || d.mathpix !== null || d.fly !== null
  );

  const totalMtd = providers.reduce(
    (acc, p) => acc + (p.status === "ok" && p.mtd_usd ? p.mtd_usd : 0),
    0
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        {providers.map((p) => {
          const meta = META[p.provider];
          return (
            <KpiCard
              key={p.provider}
              title={meta.label}
              value={p.status === "ok" ? formatUSD(p.mtd_usd) : "—"}
              subtitle={subtitleFor(p)}
              icon={meta.icon}
              accentColor={meta.accent}
              accentHex={meta.accent}
              delta={null}
              loading={loading}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LineChartIcon className="h-4 w-4 text-indigo-500" />
          Ver evolução no mês
        </button>
        {!loading && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Total {monthLabel(data?.month ?? "").toLowerCase()}:{" "}
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {formatUSD(totalMtd)}
            </span>
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Custo de infra — {monthLabel(data?.month ?? "")}
            </DialogTitle>
          </DialogHeader>

          {hasAnySeries ? (
            <>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <XAxis
                      dataKey="dm"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      width={52}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="plainline"
                    />
                    <Line
                      type="monotone"
                      dataKey="gcp"
                      name="Google Cloud"
                      stroke={META.gcp.accent}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="mathpix"
                      name="Mathpix"
                      stroke={META.mathpix.accent}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="fly"
                      name="Fly.io"
                      stroke={META.fly.accent}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Custo acumulado do mês, atualizado 1×/dia (~05:30 BRT).
                {providers.some((p) => p.status !== "ok") &&
                  " Provedores sem dados: " +
                    providers
                      .filter((p) => p.status !== "ok")
                      .map(
                        (p) =>
                          `${META[p.provider].label} (${
                            p.status === "not_configured"
                              ? "não configurado"
                              : "erro"
                          })`
                      )
                      .join(", ") +
                    "."}
              </p>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              Ainda não há snapshots deste mês. A primeira coleta roda de manhã
              (~05:30 BRT) — ou dispare o cron{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">
                infra_cost_snapshot
              </code>{" "}
              manualmente.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
