// Constantes e helpers puros do formulário de "Simulado Aleatório" do founder
// (`/partners/[slug]/simulados`) — extraídos de SimuladosFounderClient.tsx pra
// serem a única fonte de verdade compartilhada entre o formulário legado de
// edição e o NovoSimuladoAleatorioWizard (criação).
import { VESTIBULAR_BANK_LABELS } from '@/lib/simuladoBanks';

export const BANK_LABELS = VESTIBULAR_BANK_LABELS;

export function formatCargoLabel(value: string): string {
  return value.replace(/(^|[\s/-])(\p{L})/gu, (_match, prefix: string, letter: string) =>
    prefix + letter.toLocaleUpperCase('pt-BR'));
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', misto: 'Misto',
};

const FORMAT_LABELS: Record<string, string> = {
  custom: 'Personalizado', linguagens: 'Linguagens, Códigos e suas Tecnologias',
  humanas: 'Ciências Humanas e suas Tecnologias',
  natureza: 'Ciências da Natureza e suas Tecnologias',
  matematica: 'Matemática e suas Tecnologias',
  dia1: 'Dia 1 ENEM', dia2: 'Dia 2 ENEM', completo: 'Prova completa',
};

// `value` pode ser um datetime-local cru (sem timezone, "2026-11-03T14:30")
// vindo direto de um form ainda não salvo, ou um ISO completo já vindo do
// backend — em ambos os casos o Date resultante é exibido no horário de
// Brasília, consistente com o que o founder digitou/vai ver depois de salvo.
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

export function formatLabel(bank: string, format: string): string {
  return bank === 'UNESP' && format === 'completo'
    ? '1ª fase: Conhecimentos Gerais'
    : FORMAT_LABELS[format] ?? format;
}

// Formatos disponíveis por banca
export const FORMATS_BY_BANK: Record<string, string[]> = {
  ENEM:  ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'dia1', 'dia2', 'completo'],
  UFU:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UEG:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UFG:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UNESP: ['custom', 'completo'],
  Todas: ['custom'],
};

// Quantidade fixa de questões por banca/formato (espelha o backend).
// Usada como valor padrão ao trocar banca/formato — para bancas com
// distribuição proporcional (ver PROPORTIONAL_COMPLETE_BANKS abaixo), o
// campo continua editável e este número é só o ponto de partida sugerido.
export const BLOCK_QTY: Record<string, Record<string, number>> = {
  ENEM: { linguagens: 45, humanas: 45, natureza: 45, matematica: 45, dia1: 90, dia2: 90, completo: 180 },
  UFU:  { linguagens: 20, humanas: 20, natureza: 15, matematica: 10, completo: 65 },
  UEG:  { linguagens: 13, humanas: 13, natureza: 13, matematica: 13, completo: 52 },
  UFG:  { linguagens: 24, humanas: 24, natureza: 24, matematica: 24, completo: 96 },
  UNESP: { completo: 90 },
};

// Bancas cujo formato "completo" tem distribuição por áreas conhecida e
// sabe reescalar essa distribuição proporcionalmente para qualquer
// quantidade total (espelha simulado_service.py::_scale_subject_quota /
// _scale_area_distribution no backend) — por isso, ao contrário das demais,
// a quantidade fica editável mesmo no formato "completo".
const PROPORTIONAL_COMPLETE_BANKS = new Set(['UFU', 'UEG', 'UFG']);

export function resolveQty(bank: string, format: string): number | null {
  return BLOCK_QTY[bank]?.[format] ?? null; // null = custom, qty editável
}

export function isQtyLocked(bank: string, format: string): boolean {
  if (format === 'completo' && PROPORTIONAL_COMPLETE_BANKS.has(bank)) return false;
  return resolveQty(bank, format) !== null;
}

// Distribuição do sorteio por matéria. UFU define esses números no guia;
// UEG e UFG fixam as quantidades por área, não por disciplina. Os valores
// por disciplina destas duas bancas são uma aproximação do produto.
// Espelha as constantes homônimas em simulado_service.py.
const UFU_COMPLETE_SUBJECT_DISTRIBUTION: Record<string, number> = {
  'Língua Portuguesa': 10, 'Literatura': 5, '__idioma__': 5,
  'Matemática': 10, 'Biologia': 5, 'Física': 5, 'Química': 5,
  'Geografia': 5, 'História': 5, 'Filosofia': 5, 'Sociologia': 5,
};

const UEG_COMPLETE_AREA_DISTRIBUTION: Record<string, Record<string, number>> = {
  linguagens: {
    'Língua Portuguesa': 9, '__idioma__': 4,
  },
  matematica: { 'Matemática': 13 },
  natureza: { 'Biologia': 5, 'Física': 4, 'Química': 4 },
  humanas: { 'História': 4, 'Geografia': 3, 'Filosofia': 3, 'Sociologia': 3 },
};

const UFG_COMPLETE_SUBJECT_DISTRIBUTION: Record<string, number> = {
  'Língua Portuguesa': 24, 'Matemática': 24, 'Biologia': 8, 'Física': 8, 'Química': 8,
  'História': 6, 'Geografia': 6, 'Filosofia': 6, 'Sociologia': 6,
};

// Reescala uma distribuição fixa por matéria para um total diferente,
// preservando a proporção original (método do maior resto / Hamilton) —
// espelha _scale_subject_quota no backend. Sem isso, um corte simples
// zeraria as matérias menores (ex.: Sociologia) num total menor.
function scaleSubjectQuota(base: Record<string, number>, targetQty: number): Record<string, number> {
  const subjects = Object.keys(base);
  const totalBase = subjects.reduce((sum, s) => sum + Math.max(0, base[s]), 0);
  if (totalBase <= 0 || targetQty <= 0) {
    return Object.fromEntries(subjects.map((s) => [s, 0]));
  }
  const exact: Record<string, number> = {};
  const scaled: Record<string, number> = {};
  for (const s of subjects) {
    exact[s] = (Math.max(0, base[s]) * targetQty) / totalBase;
    scaled[s] = Math.floor(exact[s]);
  }
  let remainder = targetQty - subjects.reduce((sum, s) => sum + scaled[s], 0);
  const order = [...subjects].sort((a, b) => (exact[b] - scaled[b]) - (exact[a] - scaled[a]));
  for (let i = 0; i < order.length && remainder > 0; i += 1, remainder -= 1) {
    scaled[order[i]] += 1;
  }
  return scaled;
}

// Monta o resumo "Distribuição estimada" já reescalado para a quantidade
// escolhida (form.qty) — em vez do texto fixo de antes, que só refletia o
// total oficial (96/65/52) e ficava errado assim que a quantidade mudasse.
export function buildDistributionHintLines(bank: string, qty: number): string[] | null {
  if (!qty || qty <= 0) return null;
  if (bank === 'UFU') {
    const d = scaleSubjectQuota(UFU_COMPLETE_SUBJECT_DISTRIBUTION, qty);
    return [
      `Português ${d['Língua Portuguesa']}, Literatura ${d['Literatura']}, Língua Estrangeira ${d['__idioma__']} (um idioma à escolha: Inglês, Espanhol ou Francês)`,
      `Matemática ${d['Matemática']}`,
      `Biologia ${d['Biologia']}, Física ${d['Física']}, Química ${d['Química']}`,
      `Geografia ${d['Geografia']}, História ${d['História']}, Filosofia ${d['Filosofia']}, Sociologia ${d['Sociologia']}`,
      `Total ${qty} questões objetivas`,
    ];
  }
  if (bank === 'UEG') {
    const areaTotals = Object.fromEntries(
      Object.entries(UEG_COMPLETE_AREA_DISTRIBUTION).map(([area, quota]) => [area, Object.values(quota).reduce((a, b) => a + b, 0)]),
    );
    const scaledAreaTotals = scaleSubjectQuota(areaTotals, qty);
    return [
      `Linguagens ${scaledAreaTotals['linguagens']} (Português e língua estrangeira; composição do banco de questões)`,
      `Matemática ${scaledAreaTotals['matematica']}`,
      `Natureza ${scaledAreaTotals['natureza']} (Biologia, Física e Química)`,
      `Humanas ${scaledAreaTotals['humanas']} (História, Geografia, Filosofia e Sociologia)`,
      `Total ${qty} questões objetivas`,
    ];
  }
  if (bank === 'UFG') {
    const d = scaleSubjectQuota(UFG_COMPLETE_SUBJECT_DISTRIBUTION, qty);
    const natureza = d['Biologia'] + d['Física'] + d['Química'];
    const humanas = d['História'] + d['Geografia'] + d['Filosofia'] + d['Sociologia'];
    return [
      `Linguagens ${d['Língua Portuguesa']} (inclui língua estrangeira escolhida: 6 de idioma e 18 gerais quando o bloco tem 24 questões)`,
      `Matemática ${d['Matemática']}`,
      `Natureza ${natureza} (Biologia ${d['Biologia']}, Física ${d['Física']} e Química ${d['Química']})`,
      `Humanas ${humanas} (História ${d['História']}, Geografia ${d['Geografia']}, Filosofia ${d['Filosofia']} e Sociologia ${d['Sociologia']})`,
      `Total ${qty} questões objetivas`,
    ];
  }
  return null;
}

export const WEIGHT_KEYS_BY_BANK: Record<string, string[]> = {
  ENEM: ['Linguagens', 'Humanas', 'Natureza', 'Matemática'],
  UFU: [
    'Língua Portuguesa', 'Literatura', 'Língua Estrangeira', 'Matemática',
    'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Filosofia', 'Sociologia',
  ],
  UEG: ['Linguagens', 'Matemática', 'Natureza', 'Humanas'],
  UFG: ['Linguagens', 'Matemática', 'Natureza', 'Humanas'],
  Todas: [],
};

export const UEG_GROUP_PRESETS: Record<'I' | 'II' | 'III', Record<string, number>> = {
  I: { Linguagens: 2.5, Matemática: 4, Natureza: 2.5, Humanas: 1 },
  II: { Linguagens: 3, Matemática: 3, Natureza: 3, Humanas: 1 },
  III: { Linguagens: 4, Matemática: 2, Natureza: 1, Humanas: 3 },
};

export const UEG_GROUP_COURSES: Record<'I' | 'II' | 'III', string> = {
  I: 'Engenharia Agrícola, Engenharia Civil, Química Industrial',
  II: 'Agronomia, Biomedicina, Ciências Biológicas, Educação Física, Farmácia, Fisioterapia, Medicina Veterinária, Zootecnia',
  III: 'Arquitetura e Urbanismo e demais cursos do grupo III no edital',
};

// Formulário do "Simulado Aleatório" — NÃO inclui modalidade/local: essas
// decisões são tomadas uma única vez na Etapa 1 do seletor de tipo e vivem
// como estado próprio em SimuladosFounderClient (ver `modality`/`locationName`/
// `locationAddress`), nunca duplicadas aqui, pra não ter dois lugares com a
// mesma decisão podendo divergir.
export const EMPTY_FORM = {
  title: '',
  bank: 'ENEM',
  // Cargo do concurso — só tem sentido quando o simulado é de concurso
  // (`simuladoFormat === 'concurso'`, decidido fora deste form); vestibular
  // nunca usa este campo.
  role: '',
  format: 'custom',
  subject: '',
  difficulty: 'misto',
  qty: 10,
  time_limit_secs: '',
  starts_at: '',
  ends_at: '',
  weights: {} as Record<string, number>,
  allow_retry: true,
  // Default true: garante que o founder sempre consiga ver um preview 100%
  // idêntico ao que será enviado (ver SimuladoPreviewModal / preview endpoint).
  // Desligar volta ao sorteio individual por aluno (sem preview garantido).
  same_for_all_students: true,
  ueg_weight_group: null as 'I' | 'II' | 'III' | null,
  instructions: '',
};

export type FounderSimuladoFormState = typeof EMPTY_FORM;
