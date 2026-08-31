export type EssayType = 'enem' | 'ufu' | 'ueg' | 'fuvest' | 'vunesp' | 'geral';

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
// VUNESP/UNESP (critérios vigentes, ref. Vestibular Meio de Ano 2024):
//   A – Tema ........................ 0–3
//   B – Gênero/tipo e coerência ..... 0–4
//   C – Modalidade .................. 1–4  (sem 0 — redação não anulada tem no mínimo 1)
//   D – Coesão ...................... 1–3  (sem 0)
// Soma bruta (NC): 0–14. Nota final do edital: NF = NC × 28 / 14 (= NC × 2).
// O sistema guarda/exibe a nota BRUTA (0–14); a conversão p/ 28 é do edital.
// Regras do Critério C que o corretor aplica à mão (não automatizáveis aqui):
//   - texto com ≤15 linhas (fora título): -1 ponto só no C;
//   - texto com ≤20 linhas (fora título): C não pode chegar ao máximo.

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
    // Escala bruta: A=0–3, B=0–4, C=1–4, D=1–3 → soma 0–14 → NF = NC × 28 / 14
    competencies: [
      'Tema (A): abordagem do tema proposto',
      'Gênero, tipo de texto e coerência (B): texto dissertativo-argumentativo, tese defendida, progressão e ausência de contradições',
      'Modalidade (C): norma-padrão, ortografia, pontuação, concordância, regência, precisão lexical e registro',
      'Coesão (D): conectivos, retomadas, paragrafação e articulação entre as partes',
    ],
    score_options: [
      [0, 1, 2, 3],         // A – Tema (0–3)
      [0, 1, 2, 3, 4],      // B – Gênero/tipo e coerência (0–4)
      [1, 2, 3, 4],         // C – Modalidade (1–4, sem 0)
      [1, 2, 3],            // D – Coesão (1–3, sem 0)
    ],
    total_max: 14,
  },
  geral: {
    label: 'Geral',
    competencies: [],
    score_options: [],
    total_max: 1000,
  },
};

export const VALID_ESSAY_TYPES = Object.keys(ESSAY_TYPE_CONFIGS) as EssayType[];
