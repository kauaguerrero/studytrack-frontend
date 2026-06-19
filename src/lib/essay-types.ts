export type EssayType = 'enem' | 'ufu' | 'ueg' | 'fuvest' | 'vunesp';

export interface EssayTypeConfig {
  label: string;
  competencies: string[];
  /** One score-options array per competency (same index as competencies). */
  score_options: number[][];
  total_max: number;
}

const _enem    = [0, 40, 80, 120, 160, 200];
const _ueg     = [0, 5, 10, 15, 20];
// FUVEST: 4 critérios com pesos 3, 2, 3, 2 (escala interna 0–5, multiplicado pelo peso)
const _fuvestP3 = [0, 3, 6, 9, 12, 15]; // peso 3 → máx 15 pts
const _fuvestP2 = [0, 2, 4, 6, 8, 10];  // peso 2 → máx 10 pts
// VUNESP: escala bruta 0–11 (convertida para escala do edital via NF = NC × 28 / 11)

export const ESSAY_TYPE_CONFIGS: Record<EssayType, EssayTypeConfig> = {
  enem: {
    label: 'ENEM',
    competencies: [
      'Domínio da norma culta da língua escrita',
      'Compreensão da proposta e aplicação de conceitos',
      'Seleção e organização das informações',
      'Conhecimento dos mecanismos linguísticos',
      'Proposta de intervenção',
    ],
    score_options: [_enem, _enem, _enem, _enem, _enem],
    total_max: 1000,
  },
  ufu: {
    label: 'UFU',
    competencies: [
      'Proposta temática',
      'Gênero do discurso',
      'Leitura, compreensão e repertório',
      'Coesão e coerência textuais',
      'Convenções de escrita',
    ],
    score_options: [
      [0, 5, 10, 15, 20],   // Proposta temática (máx 20)
      [0, 5, 10, 15, 20],   // Gênero do discurso (máx 20)
      [0, 2, 4, 6, 8],      // Leitura e repertório (máx 8)
      [0, 5, 10, 15, 20],   // Coesão e coerência (máx 20)
      [0, 3, 6, 9, 12],     // Convenções de escrita (máx 12)
    ],
    total_max: 80,
  },
  ueg: {
    label: 'UEG',
    competencies: [
      'Capacidade de leitura e senso crítico',
      'Uso consciente da coletânea',
      'Modalidade textual',
      'Norma-padrão da Língua Portuguesa',
      'Coesão e coerência',
    ],
    score_options: [_ueg, _ueg, _ueg, _ueg, _ueg],
    total_max: 100,
  },
  fuvest: {
    label: 'FUVEST',
    // Pesos: C1=3, C2=2, C3=3, C4=2 (total 10 × 5 pts = 50 pts)
    competencies: [
      'Desenvolvimento do tema, uso da coletânea e autoria (peso 3)',
      'Atendimento ao gênero e ao tipo de texto (peso 2)',
      'Coesão, coerência e progressão textual (peso 3)',
      'Domínio da norma-padrão e vocabulário (peso 2)',
    ],
    score_options: [_fuvestP3, _fuvestP2, _fuvestP3, _fuvestP2],
    total_max: 50,
  },
  vunesp: {
    label: 'VUNESP',
    // Escala bruta: A=0–3, B=0–4, C=0–2, D=0–2 → soma 0–11 → NF = NC × 28 / 11
    competencies: [
      'Tema (A) — adequação ao tema proposto',
      'Estrutura, gênero/tipo e coerência (B) — dissertação argumentativa, tese e progressão',
      'Língua, modalidade e registro (C) — norma-padrão, vocabulário e formalidade',
      'Coesão (D) — conectivos, retomadas e articulação entre parágrafos',
    ],
    score_options: [
      [0, 1, 2, 3],      // A – Tema (máx 3)
      [0, 1, 2, 3, 4],   // B – Estrutura/gênero/coerência (máx 4)
      [0, 1, 2],         // C – Língua/modalidade/registro (máx 2)
      [0, 1, 2],         // D – Coesão (máx 2)
    ],
    total_max: 11,
  },
};

export const VALID_ESSAY_TYPES = Object.keys(ESSAY_TYPE_CONFIGS) as EssayType[];
