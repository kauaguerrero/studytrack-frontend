'use client';

// Chat com o agente do cronograma. A IA só SUGERE: toda resposta vira uma
// prévia (cards destacados no quadro) que o aluno confirma ou descarta.
// Chips de sugestão rápida resolvem os pedidos comuns sem IA (não gastam a cota).

import { useState } from 'react';
import { ArrowUp, Loader2, Sparkles, Check, X, Undo2, MoveRight, Plus, Minus } from 'lucide-react';
import { AREA_STYLE, addDays, formatDayMonth, type Area, type Proposal } from '@/lib/cronograma';

type ChipBody = { chip: string; payload?: Record<string, string> };

const AREAS: Area[] = ['matematica', 'natureza', 'humanas', 'linguagens'];

export function AgentChat({
  today,
  proposal,
  busy,
  canUndo,
  onSend,
  onChip,
  onConfirm,
  onDiscard,
  onUndo,
}: {
  today: string;
  proposal: Proposal | null;
  busy: boolean;
  canUndo: boolean;
  onSend: (message: string) => void;
  onChip: (body: ChipBody) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  onUndo: () => void;
}) {
  const [text, setText] = useState('');
  const [picker, setPicker] = useState<'more_subject' | 'review_mistakes' | 'exam_day' | null>(null);
  const [examDate, setExamDate] = useState(addDays(today, 3));

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  const changes = proposal
    ? proposal.diff.moved.length + proposal.diff.added.length + proposal.diff.removed.length
    : 0;

  return (
    <div className="space-y-2.5">
      {proposal && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-500/40 dark:bg-amber-500/10" aria-live="polite">
          <p className="flex items-start gap-2 text-[13px] text-slate-800 dark:text-white/85">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{proposal.reply || (proposal.status === 'proposed' ? 'Preparei estas mudanças:' : 'Não consegui aplicar esse pedido.')}</span>
          </p>
          {proposal.status === 'proposed' && (
            <>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-6 text-[12px] text-slate-700 dark:text-white/70">
                {proposal.diff.moved.slice(0, 8).map((m) => (
                  <li key={`m-${m.id}`} className="flex items-center gap-1">
                    <span className="truncate">{m.topic}</span>
                    <span className="shrink-0 text-slate-500">{formatDayMonth(m.from!)} <MoveRight className="inline h-3 w-3" /> {formatDayMonth(m.to!)}</span>
                  </li>
                ))}
                {proposal.diff.added.slice(0, 5).map((a, k) => (
                  <li key={`a-${k}`} className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Plus className="h-3 w-3" /><span className="truncate">{a.topic}</span><span className="shrink-0">({formatDayMonth(a.to!)})</span>
                  </li>
                ))}
                {proposal.diff.removed.slice(0, 5).map((r) => (
                  <li key={`r-${r.id}`} className="flex items-center gap-1 text-slate-500">
                    <Minus className="h-3 w-3" /><span className="truncate">{r.topic}</span><span className="shrink-0">sai de {formatDayMonth(r.from!)}</span>
                  </li>
                ))}
                {changes > 18 && <li className="text-slate-500">e mais {changes - 18} ajustes…</li>}
                {changes === 0 && <li className="text-slate-500">Ajuste nas configurações (capacidade/prioridade); o quadro se reorganiza ao confirmar.</li>}
              </ul>
              {proposal.warnings.map((w, k) => (
                <p key={k} className="mt-1 pl-6 text-[11.5px] font-semibold text-amber-800 dark:text-amber-200">{w.message}</p>
              ))}
              <div className="mt-2.5 flex justify-end gap-2">
                <button type="button" onClick={onDiscard} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-white disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10">
                  <X className="h-3.5 w-3.5" /> Descartar
                </button>
                <button type="button" onClick={onConfirm} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'var(--brand-primary)' }}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmar
                </button>
              </div>
            </>
          )}
          {proposal.status === 'failed' && (
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={onDiscard} className="text-[12px] font-semibold text-slate-600 hover:underline dark:text-white/60">Fechar</button>
            </div>
          )}
        </div>
      )}

      <div className="relative rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:ring-2 dark:border-white/10 dark:bg-slate-900"
        style={{ ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--brand-primary) 40%, transparent)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Peça uma mudança: “quinta tenho consulta, tira tudo” ou “quero focar em química essa semana”"
          aria-label="Mensagem para o assistente do cronograma"
          className="block w-full resize-none bg-transparent px-2.5 py-2 pr-12 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/35"
          disabled={busy || !!proposal}
        />
        <button type="button" onClick={send} disabled={busy || !text.trim() || !!proposal} aria-label="Enviar"
          className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full text-white transition disabled:opacity-40"
          style={{ background: 'var(--brand-primary)' }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip disabled={busy || !!proposal} onClick={() => onChip({ chip: 'skip_tomorrow' })}>Não vou estudar amanhã</Chip>
        <Chip disabled={busy || !!proposal} onClick={() => onChip({ chip: 'lighter_week' })}>Semana mais leve</Chip>
        <Chip disabled={busy || !!proposal} active={picker === 'more_subject'} onClick={() => setPicker(picker === 'more_subject' ? null : 'more_subject')}>Focar em uma área</Chip>
        <Chip disabled={busy || !!proposal} active={picker === 'review_mistakes'} onClick={() => setPicker(picker === 'review_mistakes' ? null : 'review_mistakes')}>Revisar uma área</Chip>
        <Chip disabled={busy || !!proposal} active={picker === 'exam_day'} onClick={() => setPicker(picker === 'exam_day' ? null : 'exam_day')}>Tenho prova na escola</Chip>
        {canUndo && !proposal && (
          <button type="button" onClick={onUndo} disabled={busy}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10">
            <Undo2 className="h-3.5 w-3.5" /> Desfazer última
          </button>
        )}
      </div>

      {(picker === 'more_subject' || picker === 'review_mistakes') && (
        <div className="flex flex-wrap gap-1.5">
          {AREAS.map((a) => (
            <button key={a} type="button"
              onClick={() => { onChip({ chip: picker, payload: { subject: a } }); setPicker(null); }}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${AREA_STYLE[a].chip}`}>
              {AREA_STYLE[a].label}
            </button>
          ))}
        </div>
      )}
      {picker === 'exam_day' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[12px] text-slate-600 dark:text-white/60" htmlFor="cronograma-exam-day">Dia da prova:</label>
          <input id="cronograma-exam-day" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px] text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          <button type="button" onClick={() => { onChip({ chip: 'exam_day', payload: { date: examDate } }); setPicker(null); }}
            className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
            Liberar o dia
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-45 ${active ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-white/75'}`}
      style={active ? { background: 'var(--brand-primary)' } : undefined}>
      {children}
    </button>
  );
}
