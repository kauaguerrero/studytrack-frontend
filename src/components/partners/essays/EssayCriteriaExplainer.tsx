'use client';

import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';

interface Props {
  essayType: EssayType;
  className?: string;
}

interface CriterionInfo {
  name: string;
  range: string;
  levels: { score: string; text: string }[];
  note?: string;
}

/** Detalhamento por banca. Hoje só VUNESP/UNESP tem o texto completo; as demais
 * caem no resumo genérico montado a partir de ESSAY_TYPE_CONFIGS. */
const DETAILED: Partial<Record<EssayType, { intro: string; criteria: CriterionInfo[]; zero: string }>> = {
  vunesp: {
    intro:
      'Sua redação recebe uma nota em 4 critérios (A, B, C e D). A soma vai de 0 a 14 e depois é convertida para a escala do edital.',
    criteria: [
      {
        name: 'Critério A: Tema',
        range: '0 a 3',
        levels: [
          { score: '0', text: 'Não aborda nem os assuntos mais gerais da proposta.' },
          { score: '1', text: 'Toca em apenas um dos assuntos que o tema envolve.' },
          { score: '2', text: 'Relaciona dois dos assuntos do tema, mas sem chegar ao recorte exato da proposta.' },
          { score: '3', text: 'Discute exatamente o recorte proposto, com todos os seus elementos.' },
        ],
      },
      {
        name: 'Critério B: Gênero, tipo de texto e coerência',
        range: '0 a 4',
        levels: [
          { score: '0', text: 'Escreveu outro gênero, como carta, narração ou poema.' },
          { score: '1', text: 'A dissertação não predomina, ou os argumentos ficam soltos, ou faltam duas partes do texto.' },
          { score: '2', text: 'Falta uma parte (introdução, desenvolvimento ou conclusão), os argumentos são superficiais, há contradições ou o texto conversa com o leitor.' },
          { score: '3', text: 'Texto dissertativo-argumentativo completo, com posicionamento. Tem lacunas pontuais e nenhuma contradição.' },
          { score: '4', text: 'Objetivo e impessoal, com argumentos autorais bem desenvolvidos, progressão clara e tudo convergindo para a tese.' },
        ],
        note: 'Falar com o leitor, usar imperativo (como "pense bem" ou "façam sua parte") ou se referir à prova e à coletânea trava a nota em 2. Usar "eu acho" ou "na minha opinião" trava a nota em 3.',
      },
      {
        name: 'Critério C: Modalidade',
        range: '1 a 4',
        levels: [
          { score: '1', text: 'Excesso de desvios, ou muitos desvios com alguns graves para o nível avaliado.' },
          { score: '2', text: 'Muitos desvios gramaticais e de convenção da escrita.' },
          { score: '3', text: 'Desvios eventuais.' },
          { score: '4', text: 'Raros desvios e nenhum grave.' },
        ],
        note: 'Avalia ortografia, pontuação, acentuação, crase, concordância, regência, construção das frases, vocabulário e formalidade. Texto com até 15 linhas perde 1 ponto neste critério. Com até 20 linhas, não alcança o 4.',
      },
      {
        name: 'Critério D: Coesão',
        range: '1 a 3',
        levels: [
          { score: '1', text: 'Conectivos escassos ou mal usados, frases truncadas, parágrafos muito curtos ou texto em bloco único.' },
          { score: '2', text: 'Uso satisfatório. Pode haver parágrafos de um único período.' },
          { score: '3', text: 'Uso adequado, variado e sem falhas, ligando bem as partes do texto.' },
        ],
      },
    ],
    zero: 'Zera a redação: fugir ao tema ou ao gênero, identificar-se, entregar em branco, escrever em outra língua, letra ilegível, menos de 8 linhas autorais, cópia predominante da coletânea ou da internet, ou marcas propositais de anulação.',
  },
};

export function EssayCriteriaExplainer({ essayType, className }: Props) {
  const cfg = ESSAY_TYPE_CONFIGS[essayType];
  if (!cfg || cfg.competencies.length === 0) return null;

  const detailed = DETAILED[essayType];

  return (
    <details
      className={`group rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40 ${className ?? ''}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span>Como funciona a correção {cfg.label}</span>
        <span className="text-xs font-normal text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500">
          ▾
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-200 px-3.5 py-3 text-[13px] leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {detailed ? (
          <>
            <p>{detailed.intro}</p>
            {detailed.criteria.map((c) => (
              <div key={c.name} className="space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {c.name} <span className="font-normal text-slate-400 dark:text-slate-500">({c.range})</span>
                </p>
                <ul className="space-y-0.5">
                  {c.levels.map((l) => (
                    <li key={l.score} className="flex gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-slate-200 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {l.score}
                      </span>
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
                {c.note && (
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">{c.note}</p>
                )}
              </div>
            ))}
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {detailed.zero}
            </p>
          </>
        ) : (
          <>
            <p>
              Sua redação recebe uma nota em {cfg.competencies.length} critérios, somando até {cfg.total_max} pontos.
            </p>
            <ul className="space-y-1">
              {cfg.competencies.map((name, i) => {
                const opts = cfg.score_options[i] ?? [];
                const lo = opts[0] ?? 0;
                const hi = opts[opts.length - 1] ?? 0;
                return (
                  <li key={name} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 rounded bg-slate-200 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      {lo} a {hi}
                    </span>
                    <span>{name}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
