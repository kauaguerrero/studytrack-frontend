'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Users, MessageCircle, Loader2, ChevronDown, CheckCircle2,
  XCircle, AlertTriangle, Clock, X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscriber {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
  plan_tier: string;
  subscription_status: string | null;
  trial_start_date: string | null;
  created_at: string;
  payment_confirmed: boolean;
  last_payment_date: string | null;
  next_due_date: string | null;
  days_remaining: number | null;
  asaas_status: string | null;
  asaas_error?: string;
}

type PlanFilter = 'all' | 'pro' | 'elite';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function PaymentBadge({ sub }: { sub: Subscriber }) {
  if (sub.payment_confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Confirmado
      </span>
    );
  }
  const s = (sub.asaas_status ?? '').toUpperCase();
  if (s === 'NO_SUBSCRIPTION') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> Sem assinatura
      </span>
    );
  }
  if (s === 'INACTIVE' || s === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Inativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> {sub.asaas_status ?? 'Desconhecido'}
    </span>
  );
}

function DaysRemainingCell({ days }: { days: number | null }) {
  if (days === null) return <span className="text-slate-400">—</span>;
  if (days <= 5)  return <span className="font-semibold text-red-600">{days}d</span>;
  if (days <= 15) return <span className="font-semibold text-amber-600">{days}d</span>;
  return <span className="font-semibold text-emerald-600">{days}d</span>;
}

function PlanBadge({ tier }: { tier: string }) {
  if (tier === 'elite') {
    return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold">Elite</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold">Pro</Badge>;
}

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'elite', label: 'Elite' },
] as const;

// ---------------------------------------------------------------------------
// Plan dropdown per row
// ---------------------------------------------------------------------------

function PlanDropdown({
  userId,
  currentPlan,
  onChanged,
}: {
  userId: string;
  currentPlan: string;
  onChanged: (userId: string, plan: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSelect(plan: string) {
    if (plan === currentPlan) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/admin/subscribers/${userId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ plan_tier: plan }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      onChanged(userId, plan);
      toast.success(`Plano atualizado para ${plan.toUpperCase()}`);
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Plano'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          {PLAN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                opt.value === currentPlan ? 'text-indigo-600 font-semibold' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {opt.label} {opt.value === currentPlan && '✓'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" style={{ width: `${60 + (i + j) * 7}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribersModal({ isOpen, onClose }: Props) {
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchSubscribers = useCallback(async (plan: PlanFilter) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(
        `${apiUrl}/api/admin/subscribers?plan=${plan}&page=1&page_size=50`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json.subscribers ?? []);
      }
    } catch (e) {
      console.error('SubscribersModal fetch:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSubscribers(filter);
  }, [isOpen, filter, fetchSubscribers]);

  function handlePlanChanged(userId: string, newPlan: string) {
    setSubscribers((prev) =>
      prev.map((s) => s.id === userId ? { ...s, plan_tier: newPlan } : s),
    );
  }

  const tabs: { value: PlanFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pro', label: 'Pro' },
    { value: 'elite', label: 'Elite' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-6xl w-[calc(100%-2rem)] max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Assinantes Pro &amp; Elite
            </DialogTitle>
            {!loading && (
              <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                {subscribers.length} {subscribers.length === 1 ? 'assinante' : 'assinantes'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Tab filter */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-medium">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 transition-colors ${
                    filter === tab.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 backdrop-blur z-10">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Plano</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Últ. Pagamento</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Próx. Venc.</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Restam</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum assinante encontrado</p>
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[180px] truncate">
                      {sub.full_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {sub.whatsapp_phone ? (
                        <a
                          href={`https://wa.me/${sub.whatsapp_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {sub.whatsapp_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge tier={sub.plan_tier} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PaymentBadge sub={sub} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {fmtDate(sub.last_payment_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {fmtDate(sub.next_due_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DaysRemainingCell days={sub.days_remaining} />
                    </td>
                    <td className="px-4 py-3">
                      <PlanDropdown
                        userId={sub.id}
                        currentPlan={sub.plan_tier}
                        onChanged={handlePlanChanged}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
