'use client';

// Aluno: "Financeiro" — parcelas do Galileu (só leitura): vencidas, em aberto e
// pagas, com o link do boleto/fatura e o WhatsApp do financeiro da escola.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, MessageCircle, Wallet } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { whatsappHref } from '@/lib/org-comms';
import {
  formatBRL, formatDateBR, groupInstallments, integrationsFetch, type Installment, type MyFinance,
} from '@/lib/integrations';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5';

export function StudentFinance() {
  const { org } = useOrg();
  const [data, setData] = useState<MyFinance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await integrationsFetch<MyFinance>(org.slug, '/my-finance')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar o financeiro.'); }
  }, [org.slug]);
  useEffect(() => { void load(); }, [load]);

  const wa = whatsappHref(data?.whatsapp_finance ?? org.whatsapp_finance ?? null);
  const waButton = wa && (
    <a href={wa} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-emerald-700">
      <MessageCircle className="h-4 w-4" /> Falar com o financeiro
    </a>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><Wallet className="h-6 w-6" /> Financeiro</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/55">Suas parcelas, direto do sistema da escola.</p>
        </div>
        {waButton}
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : !data ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : !data.linked ? (
        <p className={`${card} mt-6 text-sm text-slate-600 dark:text-white/70`}>
          Seu cadastro ainda não foi ligado ao financeiro da escola. Fale com o financeiro para resolver.
        </p>
      ) : (
        <FinanceBody data={data} />
      )}
    </div>
  );
}

function FinanceBody({ data }: { data: MyFinance }) {
  const g = groupInstallments(data.installments);
  const s = data.summary;
  return (
    <>
      {s && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className={`${card} ${s.overdue_count ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : ''}`}>
            <p className="text-xs text-slate-500 dark:text-white/50">Vencidas</p>
            <p className={`text-xl font-black ${s.overdue_count ? 'text-red-700 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}>{formatBRL(s.overdue_total)}</p>
            <p className="text-xs text-slate-500 dark:text-white/50">{s.overdue_count} parcela(s)</p>
          </div>
          <div className={card}>
            <p className="text-xs text-slate-500 dark:text-white/50">Em aberto</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{formatBRL(s.open_total)}</p>
            <p className="text-xs text-slate-500 dark:text-white/50">{s.next_due ? `próxima em ${formatDateBR(s.next_due)}` : `${s.open_count} parcela(s)`}</p>
          </div>
          <div className={card}>
            <p className="text-xs text-slate-500 dark:text-white/50">Pagas</p>
            <p className="text-xl font-black text-slate-900 dark:text-white">{s.paid_count}</p>
            <p className="text-xs text-slate-500 dark:text-white/50">parcela(s)</p>
          </div>
        </div>
      )}
      <Group title="Vencidas" icon={<AlertTriangle className="h-4 w-4 text-red-500" />} items={g.vencidas} empty="Nenhuma parcela vencida." />
      <Group title="Em aberto" items={g.abertas} empty="Nenhuma parcela em aberto." />
      <Group title="Pagas" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} items={g.pagas} empty="Nenhuma parcela paga ainda." />
      <p className="mt-6 text-xs text-slate-400 dark:text-white/40">
        Os dados vêm do Galileu e podem levar alguns minutos para atualizar depois de um pagamento.
      </p>
    </>
  );
}

function Group({ title, icon, items, empty }: { title: string; icon?: React.ReactNode; items: Installment[]; empty: string }) {
  return (
    <section className="mt-6" aria-label={title}>
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500 dark:text-white/50">{icon}{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-white/40">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((i) => (
            <li key={i.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{i.description || (i.kind === 'mensalidade' ? 'Mensalidade' : 'Cobrança')}</p>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {i.status === 'paga' ? `Paga em ${formatDateBR(i.paid_date)}` : `Vence em ${formatDateBR(i.due_date)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-900 dark:text-white">{formatBRL(i.status === 'paga' ? (i.paid_amount ?? i.amount) : i.amount)}</span>
                {i.link && i.status !== 'paga' && (
                  <a href={i.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10">
                    Boleto <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
