'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Facet = { bank: string | null; role: string | null; subject: string | null; discipline: string | null; count?: number };
export type ContestQuota = { subjects: string[]; topic: string; topics?: string[]; qty: number };
type Candidate = { id: string; subject: string; discipline?: string | null; difficulty?: string | null; alternatives_intro?: string | null; context?: string | null; images?: unknown; alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>; correct_alternative?: string | null; testlet_group_id?: string | null; metadata?: { testlet_order?: number; testlet_total?: number; [key: string]: unknown } | null };

export function ContestQuotaBuilder({ slug, onGenerated, onStart, starting = false, brandTextColor = '#ffffff', startLabel }: { slug: string; onGenerated?: (questions: Candidate[], bank: string, role: string) => void; onStart?: (bank: string, role: string, quotas: ContestQuota[]) => void; starting?: boolean; brandTextColor?: string; startLabel?: string }) {
  const [facets, setFacets] = useState<Facet[]>([]);
  const [bank, setBank] = useState('');
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<ContestQuota[]>([{ subjects: [], topic: '', qty: 10 }]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const unique = (v: Array<string | null>) => [...new Set(v.filter((x): x is string => Boolean(x)))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const current = facets.filter(f => (!bank || f.bank === bank) && (!role || f.role === role));
  const subjects = unique(current.map(f => f.subject));
  const availableFor = (row: ContestQuota) => current.filter(f => f.subject && row.subjects.includes(f.subject) && (!(row.topics || []).length || Boolean(f.discipline && row.topics?.includes(f.discipline)))).reduce((sum, f) => sum + (f.count ?? 1), 0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setCatalogLoading(true);
      setCatalogError(false);
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const url = onStart ? '/api/proxy/questions/facets?question_type=concurso' : `${api}/api/partners/${slug}/assessment/questions/facets?question_type=concurso`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = await res.json(); setFacets(data.data || []);
      } catch { if (!controller.signal.aborted) { setCatalogError(true); toast.error('Não foi possível carregar o catálogo de concursos.'); } }
      finally { if (!controller.signal.aborted) setCatalogLoading(false); }
    })();
    return () => controller.abort();
  }, [api, slug, Boolean(onStart), catalogAttempt]);
  const update = (index: number, value: Partial<ContestQuota>) => setRows(prev => prev.map((r,i) => i === index ? { ...r, ...value } : r));
  async function generate() {
    if (!bank || rows.some(r => !r.subjects.length || !Number.isInteger(r.qty) || r.qty < 1) || rows.reduce((n,r) => n + r.qty,0) > 180) { toast.error('Selecione banca, matérias e quantidades válidas (máximo 180).'); return; }
    if (rows.some(r => r.qty > availableFor(r))) { toast.error('Reduza a quantidade dos grupos que ultrapassam a disponibilidade.'); return; }
    if (onStart) { onStart(bank, role, rows); return; }
    setLoading(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/compose`, { method:'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type':'application/json' }, body: JSON.stringify({ bank, role: role || null, compositions: rows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na composição.');
      onGenerated?.(data.questions, bank, role); toast.success('Questões selecionadas. Confira o simulado.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na composição.'); } finally { setLoading(false); }
  }
  return <div className="space-y-5">
    <p className="text-sm text-slate-600 dark:text-slate-300">Monte grupos de questões por matéria. Você pode combinar matérias no mesmo grupo e escolher assuntos quando selecionar apenas uma.</p>
    {catalogLoading && <p role="status" className="text-sm text-slate-500">Carregando bancas e matérias disponíveis...</p>}
    {catalogError && <div role="alert" className="rounded-xl border border-amber-300 p-3 text-sm text-amber-800 dark:text-amber-300">Não foi possível carregar as opções. <button type="button" onClick={() => setCatalogAttempt(n => n + 1)} className="font-bold underline">Tentar novamente</button></div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banca<select aria-label="Banca" value={bank} onChange={e => { setBank(e.target.value); setRole(''); setRows([{subjects:[],topic:'',qty:10}]); }} className="block w-full rounded-xl border p-3 text-sm font-semibold normal-case tracking-normal text-slate-900 dark:bg-slate-800 dark:text-slate-100"><option value="">Selecione a banca</option>{unique(facets.map(f => f.bank)).map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cargo<select aria-label="Cargo" value={role} onChange={e => { setRole(e.target.value); setRows([{subjects:[],topic:'',qty:10}]); }} className="block w-full rounded-xl border p-3 text-sm font-semibold normal-case tracking-normal text-slate-900 dark:bg-slate-800 dark:text-slate-100"><option value="">Todos os cargos</option>{unique(facets.filter(f => !bank || f.bank === bank).map(f => f.role)).map(v => <option key={v}>{v}</option>)}</select></label>
    </div>
    {rows.map((row,index) => <div key={index} className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center justify-between"><strong className="text-sm text-slate-900 dark:text-slate-100">Grupo {index+1}</strong>{rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_,i) => i !== index))} className="min-h-11 px-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Remover</button>}</div>
      {!bank && <p className="text-sm text-slate-500">Selecione uma banca para ver as matérias disponíveis.</p>}
      {bank && subjects.length === 0 && <p className="text-sm text-slate-500">Nenhuma matéria disponível para esta seleção.</p>}
      <div className="flex flex-wrap gap-3">{subjects.map(subject => <label key={subject} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 has-[:checked]:border-[var(--brand-primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={row.subjects.includes(subject)} onChange={e => update(index,{ subjects: e.target.checked ? [...row.subjects,subject] : row.subjects.filter(s=>s!==subject), topic:'', topics:[] })} /> {subject}</label>)}</div>
      {row.subjects.length === 1 && <div><p className="mb-1 text-xs text-slate-500">Assuntos opcionais (sem seleção: todos)</p><div className="flex max-h-28 flex-wrap gap-3 overflow-y-auto">{unique(current.filter(f => f.subject===row.subjects[0]).map(f=>f.discipline)).map(t => <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 has-[:checked]:border-[var(--brand-primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] dark:border-slate-700 dark:text-slate-200"><input type="checkbox" checked={(row.topics || []).includes(t)} onChange={e => update(index,{topics:e.target.checked ? [...(row.topics || []),t] : (row.topics || []).filter(value=>value!==t)})} /> {t}</label>)}</div></div>}
      {row.subjects.length > 0 && <p className="text-xs text-slate-500">Disponíveis neste grupo: {availableFor(row)}. Grupos sobrepostos compartilham questões; a seleção final verifica a disponibilidade conjunta.</p>}
      {row.subjects.length > 0 && row.qty > availableFor(row) && <p role="status" className="text-xs font-semibold text-amber-700 dark:text-amber-400">A quantidade deste grupo supera as questões disponíveis.</p>}
      <div className="flex items-center gap-3"><label htmlFor={`quota-${index}`} className="text-sm">Quantidade</label><input id={`quota-${index}`} aria-label={`Quantidade da quota ${index+1}`} type="number" min="1" max="180" value={row.qty} onChange={e=>update(index,{qty:Number(e.target.value)})} className="w-24 rounded-xl border p-2 dark:bg-slate-800" /></div>
    </div>)}
    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total: {rows.reduce((n, r) => n + (Number.isFinite(r.qty) ? r.qty : 0), 0)} questões · máximo de 180</p><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={()=>setRows([...rows,{subjects:[],topic:'',qty:10}])} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Adicionar grupo</button><button type="button" disabled={loading || starting || catalogLoading || catalogError} onClick={()=>void generate()} style={{ background: 'var(--brand-primary, #4f46e5)', color: brandTextColor }} className="min-h-11 flex-1 rounded-xl px-4 py-2 font-bold disabled:opacity-50">{loading || starting?'Preparando...':(startLabel ?? (onStart?'Iniciar simulado':'Selecionar questões'))}</button></div>
  </div>;
}
