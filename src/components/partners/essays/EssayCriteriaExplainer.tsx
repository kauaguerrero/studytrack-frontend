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
  enem: {
    intro:
      'Sua redação é corrigida por pelo menos dois avaliadores independentes, em 5 competências que valem de 0 a 200 pontos cada (níveis 0, 40, 80, 120, 160 e 200). A nota de cada avaliador é a soma das 5 competências (até 1000) e a nota final é a média das duas. Diferença maior que 100 no total, ou maior que 80 em uma competência, gera uma terceira correção.',
    criteria: [
      {
        name: 'Competência 1: domínio da escrita formal',
        range: '0 a 200',
        levels: [
          { score: '0', text: 'Demonstra desconhecimento da modalidade escrita formal.' },
          { score: '40', text: 'Domínio precário, com desvios gramaticais, de registro e de convenções da escrita frequentes e variados.' },
          { score: '80', text: 'Domínio insuficiente, com muitos desvios gramaticais, de registro e de convenções da escrita.' },
          { score: '120', text: 'Domínio mediano, com alguns desvios gramaticais e de convenções da escrita.' },
          { score: '160', text: 'Bom domínio, com poucos desvios gramaticais e de convenções da escrita.' },
          { score: '200', text: 'Excelente domínio; eventuais desvios só são aceitos como exceção e sem repetição.' },
        ],
        note: 'Olha a construção das frases (períodos completos, sem truncamento) e os desvios de ortografia, pontuação, acentuação, crase, concordância, regência, registro (nada de informalidade ou gíria) e vocabulário.',
      },
      {
        name: 'Competência 2: proposta e texto dissertativo-argumentativo',
        range: '0 a 200',
        levels: [
          { score: '0', text: 'Fuga ao tema ou texto que não é dissertativo-argumentativo. Nestes casos a redação é anulada (0 em tudo).' },
          { score: '40', text: 'Apresenta o assunto tangenciando o tema, ou domínio precário do texto dissertativo-argumentativo, com traços constantes de outros tipos de texto.' },
          { score: '80', text: 'Desenvolve o tema copiando trechos dos textos motivadores, ou sem a estrutura de proposição, argumentação e conclusão.' },
          { score: '120', text: 'Argumentação previsível e domínio mediano do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.' },
          { score: '160', text: 'Argumentação consistente e bom domínio do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.' },
          { score: '200', text: 'Argumentação consistente, repertório sociocultural produtivo e excelente domínio do texto dissertativo-argumentativo.' },
        ],
        note: 'Tangenciar o tema (falar só do assunto amplo) limita esta competência a 40 e ainda derruba as Competências 3 e 5. Repertório "de bolso" (referência decorada, sem ligação real com o tema) não conta como produtivo.',
      },
      {
        name: 'Competência 3: seleção e organização em defesa do ponto de vista',
        range: '0 a 200',
        levels: [
          { score: '0', text: 'Informações, fatos e opiniões sem relação com o tema e sem defesa de um ponto de vista.' },
          { score: '40', text: 'Informações pouco relacionadas ao tema ou incoerentes, sem defesa de um ponto de vista.' },
          { score: '80', text: 'Informações relacionadas ao tema, mas desorganizadas ou contraditórias e presas aos argumentos dos textos motivadores.' },
          { score: '120', text: 'Informações relacionadas ao tema, presas aos textos motivadores e pouco organizadas, em defesa de um ponto de vista.' },
          { score: '160', text: 'Informações relacionadas ao tema, organizadas, com indícios de autoria, em defesa de um ponto de vista.' },
          { score: '200', text: 'Informações relacionadas ao tema de forma consistente e organizada, com autoria, em defesa de um ponto de vista.' },
        ],
        note: 'Avalia se há um projeto de texto (planejamento) e se cada argumento é de fato desenvolvido, e não só citado.',
      },
      {
        name: 'Competência 4: coesão e mecanismos linguísticos',
        range: '0 a 200',
        levels: [
          { score: '0', text: 'Não articula as informações.' },
          { score: '40', text: 'Articula as partes do texto de forma precária.' },
          { score: '80', text: 'Articula de forma insuficiente, com muitas inadequações, e usa poucos recursos de coesão.' },
          { score: '120', text: 'Articula de forma mediana, com inadequações, e usa um repertório pouco variado de recursos de coesão.' },
          { score: '160', text: 'Articula as partes do texto com poucas inadequações e repertório variado de recursos de coesão.' },
          { score: '200', text: 'Articula bem as partes do texto e usa um repertório variado de recursos de coesão.' },
        ],
        note: 'Conectivos e operadores argumentativos, retomadas (pronomes, sinônimos) e paragrafação. Usar conectivo demais ou de forma forçada também conta como inadequação.',
      },
      {
        name: 'Competência 5: proposta de intervenção',
        range: '0 a 200',
        levels: [
          { score: '0', text: 'Não apresenta proposta de intervenção, ou apresenta uma sem relação com o tema.' },
          { score: '40', text: 'Proposta vaga, precária ou ligada apenas ao assunto amplo.' },
          { score: '80', text: 'Proposta relacionada ao tema, mas pouco desenvolvida ou solta em relação à discussão do texto.' },
          { score: '120', text: 'Proposta mediana, relacionada ao tema e articulada à discussão.' },
          { score: '160', text: 'Proposta bem elaborada, relacionada ao tema e articulada à discussão.' },
          { score: '200', text: 'Proposta muito bem elaborada e detalhada, relacionada ao tema e articulada à discussão.' },
        ],
        note: 'Proposta completa: ação + quem executa (agente) + meio ou modo de execução + efeito ou finalidade + um detalhamento. Proposta que desrespeita os direitos humanos zera esta competência.',
      },
    ],
    zero: 'Zera a redação (0 nas 5 competências): fuga total ao tema; texto que não é dissertativo-argumentativo; até 7 linhas (texto insuficiente); trecho de propósito desconectado do tema; identificar-se fora do campo próprio; folha em branco; texto em outra língua; letra ilegível; impropérios ou desenhos. Cópia dos textos motivadores ou do caderno de questões não é contada nas linhas.',
  },
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
