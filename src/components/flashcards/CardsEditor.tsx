'use client';

// Lista de cartões em rascunho (frente/verso) + importar planilha. Usado pela
// coordenação (baralho da escola) e pelo aluno (baralho próprio).

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2, Plus, Trash2 } from 'lucide-react';
import { parseCardsCsv, type CardDraft } from '@/lib/flashcards';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function CardsEditor({ slug, csvPath, cards, onChange }: {
  slug: string;
  csvPath: '/flashcard-decks/parse-csv' | '/flashcards/parse-csv';
  cards: CardDraft[];
  onChange: (c: CardDraft[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const set = (k: number, patch: Partial<CardDraft>) => onChange(cards.map((c, i) => (i === k ? { ...c, ...patch } : c)));

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parseCardsCsv(slug, csvPath, file);
      onChange([...cards.filter((c) => c.front.trim() || c.back.trim()), ...rows]);
      toast.success(`${rows.length} cartões importados.`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao importar.'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {cards.map((c, k) => (
          <li key={k} className="grid gap-2 rounded-xl border border-slate-200 p-2 dark:border-white/10 sm:grid-cols-[24px_1fr_1fr_auto] sm:items-start">
            <span className="pt-1.5 text-xs font-bold tabular-nums text-slate-400">{k + 1}</span>
            <textarea aria-label={`Frente do cartão ${k + 1}`} rows={2} className={inputCls} placeholder="Frente (pergunta)" value={c.front}
              onChange={(e) => set(k, { front: e.target.value })} />
            <textarea aria-label={`Verso do cartão ${k + 1}`} rows={2} className={inputCls} placeholder="Verso (resposta)" value={c.back}
              onChange={(e) => set(k, { back: e.target.value })} />
            <button type="button" aria-label={`Remover cartão ${k + 1}`} onClick={() => onChange(cards.filter((_, i) => i !== k))}
              className="justify-self-end rounded-lg p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([...cards, { front: '', back: '' }])}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/10 dark:text-white/80">
          <Plus className="h-3.5 w-3.5" /> Cartão
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Planilha de cartões"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={importing} title="Colunas: frente; verso"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-white/80">
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Importar planilha
        </button>
      </div>
    </div>
  );
}
