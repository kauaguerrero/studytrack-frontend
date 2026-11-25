'use client';

// Editor do gabarito: quantidade de questões, letras (clique ou colar "ABCDA…"),
// matéria/disciplina por faixa de questões, anular, e importar planilha.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  OPTIONS, SUBJECT_SUGGESTIONS, applyLetters, emptyItems, parseAnswerKeyCsv,
  type KeyItemDraft, type Option,
} from '@/lib/answer-key';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

export function AnswerKeyEditor({ slug, items, onChange }: { slug: string; items: KeyItemDraft[]; onChange: (i: KeyItemDraft[]) => void }) {
  const [paste, setPaste] = useState('');
  const [range, setRange] = useState({ from: '1', to: String(items.length || 1), subject: '', discipline: '' });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setItem = (n: number, patch: Partial<KeyItemDraft>) =>
    onChange(items.map((i) => (i.number === n ? { ...i, ...patch } : i)));

  const applyRange = () => {
    const a = Math.max(1, parseInt(range.from, 10) || 1);
    const b = Math.min(items.length, parseInt(range.to, 10) || items.length);
    if (!range.subject.trim()) { toast.error('Informe a matéria.'); return; }
    onChange(items.map((i) => (i.number >= a && i.number <= b
      ? { ...i, subject: range.subject.trim(), discipline: range.discipline.trim() || i.discipline } : i)));
    setRange((r) => ({ ...r, from: String(b + 1), to: String(items.length), discipline: '' }));
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseAnswerKeyCsv(slug, file);
      onChange(rows.map((r, k) => ({ number: r.number ?? k + 1, correct_option: r.correct_option, subject: r.subject,
        discipline: r.discipline ?? '', annulled: r.annulled })));
      toast.success(`${rows.length} questões importadas. Confira antes de salvar.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao importar.'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="space-y-4">
      <datalist id="answer-key-subjects">{SUBJECT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
        <div>
          <label className={labelCls} htmlFor="ak-qty">Nº de questões</label>
          <input id="ak-qty" type="number" min={1} max={200} className={inputCls} value={items.length || ''}
            onChange={(e) => onChange(emptyItems(Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0)), items))} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ak-paste">Colar respostas (ex.: ABCDA EBCAD…; * = anulada)</label>
          <div className="flex gap-2">
            <input id="ak-paste" className={inputCls} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="ABCDAEBCAD" />
            <button type="button" disabled={!paste.trim() || !items.length} onClick={() => { onChange(applyLetters(items, paste)); setPaste(''); }}
              className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">Aplicar</button>
          </div>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Planilha do gabarito"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importing}
            title="Colunas: numero; gabarito; materia; disciplina; anulada"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Importar planilha
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-[70px_70px_1fr_1fr_auto] sm:items-end">
          <div><label className={labelCls} htmlFor="ak-from">Da</label>
            <input id="ak-from" className={inputCls} inputMode="numeric" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ak-to">até a</label>
            <input id="ak-to" className={inputCls} inputMode="numeric" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ak-rsubj">Matéria</label>
            <input id="ak-rsubj" className={inputCls} list="answer-key-subjects" value={range.subject} onChange={(e) => setRange({ ...range, subject: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="ak-rdisc">Disciplina (opcional)</label>
            <input id="ak-rdisc" className={inputCls} value={range.discipline} onChange={(e) => setRange({ ...range, discipline: e.target.value })} /></div>
          <button type="button" onClick={applyRange} className="h-[34px] rounded-lg bg-slate-900 px-3 text-xs font-bold text-white dark:bg-white dark:text-slate-900">Aplicar às questões</button>
        </div>
      )}

      {items.length > 0 && (
        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs text-slate-500 dark:bg-slate-900">
              <tr><th className="px-2 py-2">Nº</th><th className="px-2 py-2">Resposta</th><th className="px-2 py-2">Matéria</th>
                <th className="hidden px-2 py-2 sm:table-cell">Disciplina</th><th className="px-2 py-2">Anulada</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((i) => (
                <tr key={i.number} className={i.annulled ? 'opacity-60' : ''}>
                  <td className="px-2 py-1.5 font-bold tabular-nums text-slate-700 dark:text-slate-200">{i.number}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-0.5" role="radiogroup" aria-label={`Resposta da questão ${i.number}`}>
                      {OPTIONS.map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={i.correct_option === o} disabled={i.annulled}
                          onClick={() => setItem(i.number, { correct_option: o as Option })}
                          className={`h-7 w-7 rounded-md text-xs font-bold ${i.correct_option === o ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-1.5"><input className={inputCls} list="answer-key-subjects" aria-label={`Matéria da questão ${i.number}`}
                    value={i.subject} onChange={(e) => setItem(i.number, { subject: e.target.value })} /></td>
                  <td className="hidden px-2 py-1.5 sm:table-cell"><input className={inputCls} aria-label={`Disciplina da questão ${i.number}`}
                    value={i.discipline} onChange={(e) => setItem(i.number, { discipline: e.target.value })} /></td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={i.annulled} aria-label={`Anular questão ${i.number}`}
                      onChange={(e) => setItem(i.number, { annulled: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
