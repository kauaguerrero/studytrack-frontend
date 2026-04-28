export type EssayType = 'enem' | 'ufu' | 'ueg';

export interface EssayTypeConfig {
  label: string;
  competencies: string[];
  /** One score-options array per competency (same index as competencies). */
  score_options: number[][];
  total_max: number;
}

const _enem = [0, 40, 80, 120, 160, 200];
const _ueg  = [0, 5, 10, 15, 20];

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
};

export const VALID_ESSAY_TYPES = Object.keys(ESSAY_TYPE_CONFIGS) as EssayType[];
