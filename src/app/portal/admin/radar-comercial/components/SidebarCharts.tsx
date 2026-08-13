'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { RegionData, MetricLayer } from '../types';
import { FUNNEL_ORDER, FUNNEL_LABELS, metricValue, METRIC_LAYERS } from '../constants';

function TopRanking({ regions, metric }: { regions: RegionData[]; metric: MetricLayer }) {
  const sorted = [...regions]
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
    .slice(0, 10);

  const maxVal = Math.max(1, ...sorted.map(r => metricValue(r, metric)));

  const metricLabel = METRIC_LAYERS.find(m => m.key === metric)?.shortLabel ?? metric;

  const format = (v: number) => {
    if (metric === 'conversao') return `${v.toFixed(1)}%`;
    if (metric === 'ticket') return `R$ ${Math.round(v / 1000)}k`;
    return String(Math.round(v));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
        Ranking — {metricLabel}
      </h3>
      <div className="space-y-1.5">
        {sorted.map((r, i) => {
          const val = metricValue(r, metric);
          const pct = (val / maxVal) * 100;
          return (
            <div key={r.key} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-slate-400 dark:text-zinc-500 font-mono shrink-0">{i + 1}</span>
              <span className="w-8 font-semibold text-slate-700 dark:text-zinc-300 truncate shrink-0">
                {r.key}
              </span>
              <div className="flex-1 min-w-0 h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-slate-500 dark:text-zinc-400 tabular-nums shrink-0 w-12 text-right">
                {format(val)}
              </span>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-slate-400 dark:text-zinc-500 text-xs py-2 text-center">Sem dados</p>
        )}
      </div>
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: Record<string, number> }) {
  const data = FUNNEL_ORDER
    .filter(s => (funnel[s] ?? 0) > 0)
    .map(s => ({ label: FUNNEL_LABELS[s] ?? s, count: funnel[s] ?? 0 }));

  const maxCount = Math.max(1, ...data.map(d => d.count));

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
        Funil CRM
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 22)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, maxCount]} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '4px 10px',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [v, 'Leads']}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.label === FUNNEL_LABELS['fechado']
                    ? '#10b981'
                    : entry.label === FUNNEL_LABELS['perdido']
                    ? '#f43f5e'
                    : '#818cf8'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SidebarCharts({
  regions,
  funnel,
  activeMetric,
}: {
  regions: RegionData[];
  funnel: Record<string, number>;
  activeMetric: MetricLayer;
}) {
  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <TopRanking regions={regions} metric={activeMetric} />
      <div className="border-t border-slate-100 dark:border-zinc-800" />
      <FunnelChart funnel={funnel} />
    </div>
  );
}
