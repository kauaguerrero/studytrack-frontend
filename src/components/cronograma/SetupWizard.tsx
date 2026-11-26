'use client';

// Primeiro acesso: 3 passos, sem IA. O plano é gerado na hora pelo backend.

import { useState } from 'react';
import { Loader2, CalendarDays, Clock, Gauge, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ElevatedCard } from '@/components/partners/founder-ui';
import { AREA_STYLE, WEEKDAY_LONG, cronogramaFetch, formatDayMonth, parseISODate, type Area, type ClassSummary, type LevelingSummary } from '@/lib/cronograma';

const AREAS: Exclude<Area, 'geral'>[] = ['matematica', 'natureza', 'humanas', 'linguagens'];
const MAX_DAY_MINUTES = 840; // 14h por dia (mesmo teto do backend)
const CONFIDENCE = ['Muito insegura(o)', 'Insegura(o)', 'Ok', 'Segura(o)', 'Muito segura(o)'];

export function SetupWizard({
  defaults,
  klass,
  leveling,
  onCreated,
}: {
  defaults: { exam_date: string; days_per_week: number; hours_per_day: number };
  /** Turma do aluno: a data da prova e os dias de revisão vêm dela. */
  klass?: ClassSummary | null;
  /** Com nivelamento, o resultado dele é o ponto de partida: sem autoavaliação. */
  leveling?: LevelingSummary | null;
  onCreated: () => void;
}) {
  const levelingRows = leveling ? Object.entries(leveling.subjects).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')) : [];
  const classExam = klass?.exam_date ?? null;
  const [step, setStep] = useState(0);
  const [examDate, setExamDate] = useState(defaults.exam_date);
  const [capacity, setCapacity] = useState<number[]>(() => {
    const days = Math.max(1, Math.min(7, defaults.days_per_week || 5));
    // Teto = máximo do slider (14h); senão o slider trava no fim e o total mostra outra coisa.
    const minutes = Math.max(30, Math.min(MAX_DAY_MINUTES, (defaults.hours_per_day || 2) * 60));
    return Array.from({ length: 7 }, (_, wd) => (wd < days ? minutes : 0));
  });
  const [confidence, setConfidence] = useState<Record<Exclude<Area, 'geral'>, number>>({ matematica: 2, natureza: 2, humanas: 2, linguagens: 2 });
  const [saving, setSaving] = useState(false);
  // Horário em que começa a estudar em cada dia (opcional): "" = não informado.
  const [startTimes, setStartTimes] = useState<string[]>(() => Array(7).fill(''));

  const weekly = capacity.reduce((a, b) => a + b, 0);

  const create = async () => {
    setSaving(true);
    try {
      await cronogramaFetch('/setup', {
        method: 'POST',
        body: JSON.stringify({
          // Mesma data da turma: não envia, e o plano continua acompanhando a turma.
          ...(classExam && examDate === classExam ? {} : { exam_date: examDate }),
          start_times: Object.fromEntries(startTimes.map((t, wd) => [String(wd), t]).filter(([wd, t]) => t && capacity[Number(wd)] > 0)),
          capacity: Object.fromEntries(capacity.map((m, wd) => [String(wd), m])),
          ...(levelingRows.length ? {} : { self_assessment: Object.fromEntries(AREAS.map((a) => [a, confidence[a] / 4])) }),
        }),
      });
      toast.success('Cronograma criado!');
      onCreated();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ElevatedCard className="w-full" accentColor="var(--brand-ink)">
      <div className="p-5 lg:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--brand-ink)' }}>
          Passo {step + 1} de 3
        </p>

        {step === 0 && (
          <div className="mt-2 space-y-4">
            <h2 className="font-display flex items-center gap-2 text-[22px] font-black text-slate-900 dark:text-white">
              <CalendarDays className="h-5 w-5" /> Quando é a sua prova?
            </h2>
            <p className="text-[13.5px] text-slate-600 dark:text-white/65">
              O cronograma distribui o conteúdo até essa data e garante que as revisões terminem antes dela.
            </p>
            {classExam && (
              <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600 dark:bg-white/5 dark:text-white/65">
                Sua turma <b>{klass!.name}</b> faz a prova em <b>{formatDayMonth(classExam)} de {parseISODate(classExam).getFullYear()}</b>.
                {examDate !== classExam && (
                  <> Você escolheu outra data.{' '}
                    <button type="button" onClick={() => setExamDate(classExam)} className="font-bold underline" style={{ color: 'var(--brand-ink)' }}>Usar a data da turma</button>
                  </>
                )}
              </p>
            )}
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              aria-label="Data da prova"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[15px] font-semibold text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          </div>
        )}

        {step === 1 && (
          <div className="mt-2 space-y-4">
            <h2 className="font-display flex items-center gap-2 text-[22px] font-black text-slate-900 dark:text-white">
              <Clock className="h-5 w-5" /> Quanto tempo você tem por dia?
            </h2>
            <p className="text-[13.5px] text-slate-600 dark:text-white/65">
              Seja realista: um plano que cabe na sua rotina funciona melhor que um plano perfeito. Dá para mudar depois.
              {klass ? ' Conte só o tempo fora das aulas da turma: elas aparecem à parte no quadro.' : ''}
            </p>
            <div className="grid gap-2">
              {WEEKDAY_LONG.map((label, wd) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-20 text-[13px] font-semibold text-slate-700 dark:text-white/75">{label}</span>
                  <input type="range" min={0} max={MAX_DAY_MINUTES} step={15} value={capacity[wd]}
                    aria-label={`Minutos de estudo na ${label}`}
                    onChange={(e) => setCapacity((c) => c.map((v, i) => (i === wd ? Number(e.target.value) : v)))}
                    className="flex-1" style={{ accentColor: 'var(--brand-ink)' }} />
                  <span className="w-16 text-right text-[13px] font-bold text-slate-900 dark:text-white">
                    {capacity[wd] === 0 ? 'folga' : `${Math.floor(capacity[wd] / 60)}h${capacity[wd] % 60 ? String(capacity[wd] % 60).padStart(2, '0') : ''}`}
                  </span>
                  <input type="time" value={startTimes[wd]} disabled={capacity[wd] === 0}
                    aria-label={`Horário de início na ${label}`} title="Que horas você começa (opcional)"
                    onChange={(e) => setStartTimes((t) => t.map((v, i) => (i === wd ? e.target.value : v)))}
                    className="w-[92px] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[12.5px] text-slate-900 disabled:opacity-30 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
                </div>
              ))}
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-white/50">Total: <b>{Math.round(weekly / 6) / 10}h por semana</b></p>
          </div>
        )}

        {step === 2 && levelingRows.length > 0 && (
          <div className="mt-2 space-y-4">
            <h2 className="font-display flex items-center gap-2 text-[22px] font-black text-slate-900 dark:text-white">
              <Gauge className="h-5 w-5" /> Seu ponto de partida
            </h2>
            <p className="text-[13.5px] text-slate-600 dark:text-white/65">
              Vem do seu nivelamento. Matérias com nota mais baixa ganham mais prioridade; conforme você responde questões, o seu desempenho real passa a valer mais.
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
              {levelingRows.map(([subject, r]) => (
                <li key={subject} className="flex items-center justify-between px-3 py-2 text-[13px]">
                  <span className="font-semibold text-slate-800 dark:text-white/80">{subject}</span>
                  <span className="text-slate-500 dark:text-white/55">{r.band} · {Math.round(r.percentage)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 2 && levelingRows.length === 0 && (
          <div className="mt-2 space-y-4">
            <h2 className="font-display flex items-center gap-2 text-[22px] font-black text-slate-900 dark:text-white">
              <Gauge className="h-5 w-5" /> Como você se sente em cada área?
            </h2>
            <p className="text-[13.5px] text-slate-600 dark:text-white/65">
              Opcional. Áreas em que você se sente inseguro(a) ganham mais prioridade. Conforme você responde questões, o seu desempenho real passa a valer mais.
            </p>
            {AREAS.map((a) => (
              <div key={a}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-slate-800 dark:text-white/80">{AREA_STYLE[a].label}</span>
                  <span className="text-slate-500 dark:text-white/50">{CONFIDENCE[confidence[a]]}</span>
                </div>
                <input type="range" min={0} max={4} step={1} value={confidence[a]} aria-label={`Confiança em ${AREA_STYLE[a].label}`}
                  onChange={(e) => setConfidence((c) => ({ ...c, [a]: Number(e.target.value) }))}
                  className="w-full" style={{ accentColor: AREA_STYLE[a].dot }} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || saving}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:invisible dark:text-white/60 dark:hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={(step === 0 && !examDate) || (step === 1 && weekly < 60)}
              className="inline-flex items-center gap-1 rounded-full px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand-primary)' }}>
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={create} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Montar meu cronograma
            </button>
          )}
        </div>
      </div>
    </ElevatedCard>
  );
}
