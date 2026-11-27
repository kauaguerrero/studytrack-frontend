'use client';

// Aluno informa o CPF para a escola ligar o cadastro dele ao financeiro (Galileu).
// O CPF só passa a valer depois que o gestor aprova; a tela só mostra o CPF mascarado.

import { useEffect, useState } from 'react';
import { Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { formatCpfInput, integrationsFetch, isValidCpf, type MyCpf } from '@/lib/integrations';

export function StudentCpfCard() {
  const { org } = useOrg();
  const [data, setData] = useState<MyCpf | null>(null);
  const [cpf, setCpf] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    integrationsFetch<MyCpf>(org.slug, '/my-cpf')
      .then((r) => { if (alive) setData(r); })
      .catch((e) => { if (alive) setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao carregar o CPF.' }); });
    return () => { alive = false; };
  }, [org.slug]);

  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await integrationsFetch<MyCpf>(org.slug, '/my-cpf', { method: 'PUT', body: JSON.stringify({ cpf }) });
      setData(r); setCpf('');
      setMsg({ ok: true, text: r.pending ? 'CPF enviado. A escola precisa aprovar.' : 'Esse já é o seu CPF cadastrado.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao enviar.' });
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="CPF para o financeiro" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 sm:p-6">
      <h3 className="text-base font-black text-slate-900 dark:text-white">CPF para o financeiro</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
        A escola usa o CPF para ligar a sua conta às suas parcelas. Ele só vale depois que a escola aprova.
      </p>
      {data?.cpf && (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> CPF cadastrado: <b>{data.cpf}</b>
        </p>
      )}
      {data?.pending && (
        <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" /> Aguardando a escola aprovar: <b>{data.pending}</b>
        </p>
      )}
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input inputMode="numeric" autoComplete="off" aria-label="Seu CPF" placeholder="000.000.000-00"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          value={cpf} onChange={(e) => setCpf(formatCpfInput(e.target.value))} />
        <button type="submit" disabled={busy || !isValidCpf(cpf)}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-primary, #0f172a)' }}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {data?.cpf || data?.pending ? 'Trocar CPF' : 'Enviar CPF'}
        </button>
      </form>
      {cpf.replace(/\D/g, '').length === 11 && !isValidCpf(cpf) && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-300">CPF inválido. Confira os números.</p>
      )}
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>{msg.text}</p>}
    </section>
  );
}
