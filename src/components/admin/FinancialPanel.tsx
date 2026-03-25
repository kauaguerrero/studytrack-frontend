'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import {
  DollarSign, TrendingDown, TrendingUp, Brain, MessageCircle,
  Package, Plus, RefreshCw, Sparkles, X, Loader2, FlaskConical, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FinancialData {
  period: { from: string; to: string };
  revenue: { total_brl: number; total_net_brl: number; total_fees_brl: number; count: number };
  costs: {
    anthropic: { total_brl: number; total_tokens: number };
    whatsapp: { total_brl: number; source: string };
    manual: { total_brl: number; items: ManualExpenseItem[] };
    total_brl: number;
  };
  profit: { gross_brl: number; margin_pct: number };
}

interface ManualExpenseItem {
  category: string;
  description: string | null;
  amount_brl: number;
  reference_month: string;
}

interface ChartPoint {
  label: string;
  receita: number;
  custos: number;
  lucro: number;
}

type Period = 'monthly' | 'semiannual' | 'annual';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORY_LABELS: Record<string, string> = {
  flyio: 'Fly.io (Infra)',
  google_cloud: 'Google Cloud',
  mathpix: 'Mathpix',
  whatsapp: 'WhatsApp Business (Meta)',
  other: 'Outro',
};

function monthRange(offsetMonths: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function weekRange(weekOffset: number): { from: string; to: string; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - weekOffset * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt2 = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    from: fmt2(start),
    to: fmt2(end),
    label: `Sem ${4 - weekOffset}`,
  };
}

function currentPeriodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (period === 'monthly') {
    return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: today };
  }
  if (period === 'semiannual') {
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return {
      from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
      to: today,
    };
  }
  // annual
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    to: today,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FinancialPanel() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // test transactions
  const [testTxCount, setTestTxCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const now = new Date();
    const key = `st_test_tx_${now.getFullYear()}_${now.getMonth() + 1}`;
    return parseInt(localStorage.getItem(key) ?? '0', 10) || 0;
  });
  const [testTxEditing, setTestTxEditing] = useState(false);
  const [testTxInput, setTestTxInput] = useState('');

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // add expense form
  const [expCategory, setExpCategory] = useState('google_cloud');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expMonth, setExpMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expLoading, setExpLoading] = useState(false);

  const supabase = createClient();

  // ── Fetch main data ─────────────────────────────────────────────────────

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { from, to } = currentPeriodRange(p);
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(
        `${apiUrl}/api/admin/stats/financial?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('FinancialPanel fetchData:', e);
      void reportError("FinancialPanelError", String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch chart history ──────────────────────────────────────────────────

  const fetchChart = useCallback(async (p: Period) => {
    setChartLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

      let ranges: { from: string; to: string; label: string }[];

      if (p === 'monthly') {
        // 4 weeks (most recent = last, oldest = first)
        ranges = [3, 2, 1, 0].map((offset) => weekRange(offset));
      } else {
        const count = p === 'semiannual' ? 6 : 12;
        const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        ranges = Array.from({ length: count }, (_, i) => {
          const offset = count - 1 - i;
          const { from, to } = monthRange(offset);
          const d = new Date(from);
          return { from, to, label: MONTHS[d.getMonth()] };
        });
      }

      const results: ChartPoint[] = [];
      for (const { from, to, label } of ranges) {
        try {
          const res = await fetch(
            `${apiUrl}/api/admin/stats/financial?from=${from}&to=${to}`,
            { headers: { Authorization: `Bearer ${session.access_token}` } },
          );
          if (!res.ok) {
            results.push({ label, receita: 0, custos: 0, lucro: 0 });
            continue;
          }
          const d: FinancialData = await res.json();
          results.push({
            label,
            receita: d.revenue.total_brl,
            custos: d.costs.total_brl,
            lucro: d.profit.gross_brl,
          });
        } catch {
          results.push({ label, receita: 0, custos: 0, lucro: 0 });
        }
      }

      setChartData(results);
    } catch (e) {
      console.error('FinancialPanel fetchChart:', e);
      void reportError("FinancialPanelError", String(e));
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
    fetchChart(period);
  }, [period, fetchData, fetchChart]);

  // ── Claude analysis ──────────────────────────────────────────────────────

  async function handleAnalysis() {
    if (!data) return;
    setAnalysisOpen(true);
    setAnalysisText('');
    setAnalysisLoading(true);
    try {
      const res = await fetch('/api/admin/financial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      setAnalysisText(json.analysis ?? json.error ?? 'Sem resposta');
    } catch (e: unknown) {
      setAnalysisText(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAnalysisLoading(false);
    }
  }

  // ── Add expense ──────────────────────────────────────────────────────────

  async function handleAddExpense() {
    if (!expAmount || !expMonth) return;
    setExpLoading(true);
    try {
      const res = await fetch('/api/admin/financial/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expCategory,
          description: expDescription || null,
          amount_brl: parseFloat(expAmount),
          reference_month: expMonth,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setExpDescription('');
        setExpAmount('');
        await fetchData(period);
        await fetchChart(period);
      }
    } catch (e) {
      console.error(e);
      void reportError("FinancialPanelError", String(e));
    } finally {
      setExpLoading(false);
    }
  }

  // ── Test transactions ────────────────────────────────────────────────────

  function saveTestTx(count: number) {
    const now = new Date();
    const key = `st_test_tx_${now.getFullYear()}_${now.getMonth() + 1}`;
    localStorage.setItem(key, String(count));
    setTestTxCount(count);
    setTestTxEditing(false);
  }

  // Deduction = avg net ticket * test count
  const avgNetTicket = data && data.revenue.count > 0
    ? data.revenue.total_net_brl / data.revenue.count
    : 0;
  const testDeduction = Math.round(avgNetTicket * testTxCount * 100) / 100;
  const adjustedRevenue = data ? Math.max(0, data.revenue.total_net_brl - testDeduction) : 0;

  // ── Render ───────────────────────────────────────────────────────────────

  const profit = data?.profit.gross_brl ?? 0;
  const profitPositive = profit >= 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <DollarSign className="w-5 h-5 text-emerald-500" /> Painel Financeiro
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period tabs */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-medium">
            {(['monthly', 'semiannual', 'annual'] as Period[]).map((p) => {
              const label = p === 'monthly' ? 'Mensal' : p === 'semiannual' ? 'Semestral' : 'Anual';
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 transition-colors ${period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { fetchData(period); fetchChart(period); }}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={handleAnalysis}
            disabled={!data || loading}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Análise com Claude
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando dados financeiros...
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-400">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* BIG NUMBERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Receita */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Receita Líquida
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">
                      R$ {fmt(testTxCount > 0 ? adjustedRevenue : data.revenue.total_net_brl)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bruto: R$ {fmt(data.revenue.total_brl)}
                      {' · '}
                      <span className="text-red-400">Taxa Asaas: −R$ {fmt(data.revenue.total_fees_brl)}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-xs text-slate-400">{data.revenue.count} pagamentos</p>
                      {testTxCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-medium">
                          <FlaskConical className="w-3 h-3" /> Transações de teste: {testTxCount}
                        </span>
                      )}
                    </div>

                    {/* Test tx editor */}
                    <div className="mt-2">
                      {testTxEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={data.revenue.count}
                            value={testTxInput}
                            onChange={(e) => setTestTxInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTestTx(Math.max(0, parseInt(testTxInput || '0', 10)));
                              if (e.key === 'Escape') setTestTxEditing(false);
                            }}
                            autoFocus
                            placeholder="0"
                            className="w-16 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => saveTestTx(Math.max(0, parseInt(testTxInput || '0', 10)))}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setTestTxEditing(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setTestTxInput(String(testTxCount)); setTestTxEditing(true); }}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <FlaskConical className="w-3 h-3" />
                          {testTxCount > 0 ? 'Editar transações de teste' : 'Definir transações de teste'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg ml-3 flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custos */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Custos Totais</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">R$ {fmt(data.costs.total_brl)}</p>
                    <p className="text-xs text-slate-400 mt-1">IA + WhatsApp + Infra</p>
                  </div>
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lucro */}
            <Card className={`border-l-4 ${profitPositive ? 'border-l-indigo-500' : 'border-l-red-600'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lucro Bruto</p>
                    <p className={`text-3xl font-bold mt-1 ${profitPositive ? 'text-indigo-600' : 'text-red-600'}`}>
                      R$ {fmt(profit)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Margem: <span className={`font-semibold ${profitPositive ? 'text-indigo-500' : 'text-red-500'}`}>
                        {data.profit.margin_pct}%
                      </span>
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${profitPositive ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
                    <TrendingUp className={`w-5 h-5 ${profitPositive ? 'text-indigo-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BREAKDOWN DE CUSTOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Anthropic / IA */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" /> IA (Gemini / Anthropic)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-2xl font-bold text-purple-700">R$ {fmt(data.costs.anthropic.total_brl)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {data.costs.anthropic.total_tokens.toLocaleString()} tokens
                </p>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-indigo-500" /> WhatsApp Business
                  </span>
                  <button
                    onClick={() => { setExpCategory('whatsapp'); setAddOpen(true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    <Plus className="w-3 h-3" /> Adicionar custo Meta
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {data.costs.whatsapp.total_brl > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-indigo-700">R$ {fmt(data.costs.whatsapp.total_brl)}</p>
                    <p className="text-xs text-slate-400 mt-1">Valor inserido manualmente via painel Meta</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nenhum custo cadastrado. Adicione o valor mensal via{' '}
                    <span className="font-medium">Meta → Business Manager → Faturamento</span>.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Infraestrutura & Outros (gastos manuais unificados) */}
            <Card className="sm:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-500" /> Infraestrutura &amp; Outros
                  </span>
                  <button
                    onClick={() => { setExpCategory('flyio'); setAddOpen(true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                  R$ {fmt(data.costs.manual.total_brl)}
                </p>
                {data.costs.manual.items.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {data.costs.manual.items.map((item, i) => (
                      <li key={i} className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {CATEGORY_LABELS[item.category] ?? item.category}
                          {item.description ? ` — ${item.description}` : ''}
                        </span>
                        <span className="font-medium">R$ {fmt(item.amount_brl)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Nenhum gasto cadastrado. Adicione Fly.io, Google Cloud, Mathpix, etc.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CHART */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Evolução financeira
                {chartLoading && <Loader2 className="inline w-3.5 h-3.5 animate-spin ml-2 text-slate-400" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [`R$ ${fmt(Number(value))}`]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="custos" name="Custos" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                  {chartLoading ? 'Carregando gráfico...' : 'Sem dados para o período.'}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Modal: Adicionar gasto manual ─────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-base font-bold">Adicionar gasto manual</DialogTitle>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoria</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="flyio">Fly.io (Infra)</option>
                <option value="google_cloud">Google Cloud</option>
                <option value="mathpix">Mathpix</option>
                <option value="whatsapp">WhatsApp Business (Meta)</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Descrição (opcional)</label>
              <input
                type="text"
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                placeholder="ex: Cloud Run, OCR API..."
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mês de referência</label>
              <input
                type="month"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddOpen(false)}
                className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddExpense}
                disabled={expLoading || !expAmount}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-40 transition-colors"
              >
                {expLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Análise Claude ─────────────────────────────────────────── */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Análise Financeira — Claude
            </DialogTitle>
            <button onClick={() => setAnalysisOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto flex-1">
            {analysisLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Analisando dados...
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{analysisText}</ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
