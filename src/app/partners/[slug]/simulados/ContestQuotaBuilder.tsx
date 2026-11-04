'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Facet = { bank: string | null; role: string | null; subject: string | null; discipline: string | null; count?: number };
export type ContestQuota = { subjects: string[]; topic: string; topics?: string[]; qty: number };
type Candidate = { id: string; subject: string; discipline?: string | null; difficulty?: string | null; alternatives_intro?: string | null; context?: string | null; images?: unknown; alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>; correct_alternative?: string | null; testlet_group_id?: string | null; metadata?: { testlet_order?: number; testlet_total?: number; [key: string]: unknown } | null };

export function ContestQuotaBuilder({ slug, onGenerated, onStart }: { slug: string; onGenerated?: (questions: Candidate[], bank: string, role: string) => void; onStart?: (bank: string, role: string, quotas: ContestQuota[]) => void }) {
  const [facets, setFacets] = useState<Facet[]>([]);
  const [bank, setBank] = useState('');
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<ContestQuota[]>([{ subjects: [], topic: '', qty: 10 }]);
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const unique = (v: Array<string | null>) => [...new Set(v.filter((x): x is string => Boolean(x)))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const current = facets.filter(f => (!bank || f.bank === bank) && (!role || f.role === role));
  const subjects = unique(current.map(f => f.subject));
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const url = onStart ? '/api/proxy/questions/facets?question_type=concurso' : `${api}/api/partners/${slug}/assessment/questions/facets?question_type=concurso`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: controller.signal });
        if (!res.ok) throw new Error();
        const data = await res.json(); setFacets(data.data || []);
      } catch { if (!controller.signal.aborted) toast.error('Não foi possível carregar o catálogo de concursos.'); }
    })();
    return () => controller.abort();
  }, [api, slug, Boolean(onStart)]);
  const update = (index: number, value: Partial<ContestQuota>) => setRows(prev => prev.map((r,i) => i === index ? { ...r, ...value } : r));
  async function generate() {
    if (!bank || rows.some(r => !r.subjects.length || r.qty < 1) || rows.reduce((n,r) => n + r.qty,0) > 180) { toast.error('Selecione banca, matérias e quantidades válidas (máximo 180).'); return; }
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
  return <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900">
    <p className="text-sm text-slate-600 dark:text-slate-300">Defina as quotas. Para combinar matérias, marque mais de uma na mesma quota.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <select aria-label="Banca" value={bank} onChange={e => { setBank(e.target.value); setRole(''); setRows([{subjects:[],topic:'',qty:10}]); }} className="rounded-xl border p-3 dark:bg-slate-800"><option value="">Selecione a banca</option>{unique(facets.map(f => f.bank)).map(v => <option key={v}>{v}</option>)}</select>
      <select aria-label="Cargo" value={role} onChange={e => { setRole(e.target.value); setRows([{subjects:[],topic:'',qty:10}]); }} className="rounded-xl border p-3 dark:bg-slate-800"><option value="">Todos os cargos</option>{unique(facets.filter(f => !bank || f.bank === bank).map(f => f.role)).map(v => <option key={v}>{v}</option>)}</select>
    </div>
    {rows.map((row,index) => <div key={index} className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center justify-between"><strong>Quota {index+1}</strong><button type="button" onClick={() => setRows(rows.filter((_,i) => i !== index))} disabled={rows.length===1}>Remover</button></div>
      <div className="flex flex-wrap gap-3">{subjects.map(subject => <label key={subject} className="text-sm"><input type="checkbox" checked={row.subjects.includes(subject)} onChange={e => update(index,{ subjects: e.target.checked ? [...row.subjects,subject] : row.subjects.filter(s=>s!==subject), topic:'', topics:[] })} /> {subject}</label>)}</div>
      {row.subjects.length === 1 && <div><p className="mb-1 text-xs text-slate-500">Assuntos opcionais (sem seleção: todos)</p><div className="flex max-h-28 flex-wrap gap-3 overflow-y-auto">{unique(current.filter(f => f.subject===row.subjects[0]).map(f=>f.discipline)).map(t => <label key={t} className="text-xs"><input type="checkbox" checked={(row.topics || []).includes(t)} onChange={e => update(index,{topics:e.target.checked ? [...(row.topics || []),t] : (row.topics || []).filter(value=>value!==t)})} /> {t}</label>)}</div></div>}
      {row.subjects.length > 0 && <p className="text-xs text-slate-500">Disponíveis nesta quota: {current.filter(f => f.subject && row.subjects.includes(f.subject) && (!(row.topics || []).length || Boolean(f.discipline && row.topics?.includes(f.discipline)))).reduce((sum, f) => sum + (f.count ?? 1), 0)}. Quotas sobrepostas compartilham questões; a seleção final verifica a disponibilidade conjunta.</p>}
      <div className="flex items-center gap-3"><label htmlFor={`quota-${index}`} className="text-sm">Quantidade</label><input id={`quota-${index}`} aria-label={`Quantidade da quota ${index+1}`} type="number" min="1" max="180" value={row.qty} onChange={e=>update(index,{qty:Number(e.target.value)})} className="w-24 rounded-xl border p-2 dark:bg-slate-800" /></div>
    </div>)}
    <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setRows([...rows,{subjects:[],topic:'',qty:10}])} className="rounded-xl border px-4 py-2">Adicionar quota</button><button type="button" disabled={loading} onClick={()=>void generate()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">{loading?'Selecionando...':onStart?'Iniciar simulado':'Selecionar questões'}</button></div>
  </div>;
}
