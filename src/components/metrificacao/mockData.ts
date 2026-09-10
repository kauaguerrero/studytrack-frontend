import type { TierLevel } from "./reportTheme";

// ─────────────────────────────────────────────────────────────────────────
// O simulado (UFG 2026) e o parceiro (OPUS Redação) são reais — mantidos de
// propósito para o vídeo-case da seção seguinte não ficar desconexo do
// resto da página. Os NÚMEROS e os NOMES DE ALUNOS abaixo, porém, são 100%
// FICTÍCIOS: nenhum aluno real, risco real ou nota real aparece aqui. A
// estrutura (chaves) espelha o que os relatórios reais entregam (ver
// studytrack-backend/app/services/analytics/class_report_insights.py e
// individual_report_insights.py).
// ─────────────────────────────────────────────────────────────────────────

export const EXAM_NAME = "Simulado UFG 2026";
export const ORG_NAME = "OPUS Redação";

export interface DisciplineScore {
  name: string;
  questions: number;
  pct: number;
}

export interface DifficultyMapRow {
  discipline: string;
  content: string;
  pct: number;
  tier: TierLevel;
}

export interface QuestionRow {
  code: string;
  discipline: string;
  pct: number;
  signal?: string;
}

export interface StudentRow {
  name: string;
  pct: number;
}

export interface AtRiskStudent {
  name: string;
  pct: number;
  gapPp: number;
  weakDiscipline: string;
}

export interface SegmentRow {
  tier: TierLevel | "bom";
  label: string;
  count: number;
  pctOfClass: number;
  color: string;
}

export const classReport = {
  examName: EXAM_NAME,
  orgName: ORG_NAME,
  kpis: {
    participation: { done: 24, total: 26 },
    participationRate: 92.3,
    avgScore: 41.6,
    medianScore: 42.0,
    avgTime: "1h35min",
    questionCount: 50,
    bestScore: 78.0,
    worstScore: 6.0,
  },
  highlights: {
    strongPoint: { discipline: "Biologia", pct: 52.3 },
    mainDifficulty: { discipline: "Espanhol", pct: 24.0 },
    attentionCount: 4,
  },
  gradeDistribution: [
    { range: "0-20%", students: 3 },
    { range: "21-40%", students: 8 },
    { range: "41-60%", students: 7 },
    { range: "61-80%", students: 5 },
    { range: "81-100%", students: 1 },
  ],
  keyNumbers: { mean: 41.6, median: 42.0, best: 78.0, worst: 6.0, stdDev: 18.4 },
  disciplines: [
    { name: "Biologia", questions: 4, pct: 52.3 },
    { name: "Inglês", questions: 3, pct: 49.1 },
    { name: "Sociologia", questions: 3, pct: 45.0 },
    { name: "Geografia", questions: 3, pct: 40.7 },
    { name: "Filosofia", questions: 3, pct: 39.0 },
    { name: "Matemática", questions: 12, pct: 36.5 },
    { name: "Física", questions: 4, pct: 34.8 },
    { name: "Língua Portuguesa", questions: 9, pct: 33.2 },
    { name: "Química", questions: 4, pct: 31.0 },
    { name: "História", questions: 3, pct: 29.4 },
    { name: "Espanhol", questions: 3, pct: 24.0 },
  ] as DisciplineScore[],
  difficultyMap: [
    { discipline: "Química", content: "Química Geral e Atomística", pct: 17.0, tier: "critico" },
    { discipline: "Espanhol", content: "Interpretação de Texto", pct: 24.0, tier: "critico" },
    { discipline: "Matemática", content: "Logaritmos", pct: 22.0, tier: "critico" },
    { discipline: "Geografia", content: "Conceitos e Tipologias", pct: 23.0, tier: "critico" },
    { discipline: "História", content: "Idade Contemporânea", pct: 26.0, tier: "critico" },
    { discipline: "Geografia", content: "Meio Ambiente e Sustentabilidade", pct: 58.0, tier: "atencao" },
  ] as DifficultyMapRow[],
  mostCorrect: [
    { code: "Q3", discipline: "Inglês", pct: 75.0 },
    { code: "Q13", discipline: "Matemática", pct: 62.5 },
    { code: "Q26", discipline: "Biologia", pct: 61.0 },
  ] as QuestionRow[],
  mostWrong: [
    { code: "Q6", discipline: "Língua Portuguesa", pct: 8.0 },
    { code: "Q45", discipline: "Filosofia", pct: 9.0 },
    { code: "Q9", discipline: "Língua Portuguesa", pct: 12.0 },
  ] as QuestionRow[],
  criticalQuestions: [
    { code: "Q1", discipline: "Espanhol", pct: 24.0, signal: "tempo acima da média, resposta concentrada numa alternativa errada" },
    { code: "Q6", discipline: "Língua Portuguesa", pct: 8.0, signal: "tempo acima da média" },
  ] as QuestionRow[],
  timePerDiscipline: [
    { name: "Espanhol", time: "3min48s" },
    { name: "Geografia", time: "2min25s" },
    { name: "Matemática", time: "2min14s" },
    { name: "Língua Portuguesa", time: "2min02s" },
    { name: "Física", time: "1min41s" },
  ],
  topStudents: [
    { name: "Rafael Andrade Souza", pct: 78.0 },
    { name: "Beatriz Lima Ferreira", pct: 71.5 },
    { name: "Gustavo Ramos Teixeira", pct: 65.0 },
  ] as StudentRow[],
  atRiskStudents: [
    { name: "Camila dos Santos Rocha", pct: 6.0, gapPp: 35.6, weakDiscipline: "Química" },
    { name: "Diego Martins Pereira", pct: 14.0, gapPp: 27.6, weakDiscipline: "Espanhol" },
  ] as AtRiskStudent[],
  segmentation: [
    { tier: "bom", label: "Bom desempenho", count: 3, pctOfClass: 13, color: "#2563EB" },
    { tier: "atencao" as TierLevel, label: "Intermediário", count: 14, pctOfClass: 58, color: "#94A3B8" },
    { tier: "atencao" as TierLevel, label: "Atenção", count: 3, pctOfClass: 13, color: "#F59E0B" },
    { tier: "critico" as TierLevel, label: "Alto risco", count: 4, pctOfClass: 16, color: "#EF4444" },
  ] as SegmentRow[],
  diagnostics: [
    "A turma apresentou maior domínio em Biologia, com 52.3% de acerto médio.",
    "Espanhol apresentou 24.0% de acerto — 28.3 p.p. abaixo de Biologia — sendo a área com maior necessidade de intervenção.",
    "Química Geral e Atomística concentra o menor desempenho da turma, com 17.0% de acerto.",
    "4 alunos apresentaram desempenho pelo menos 15 p.p. abaixo da média da turma nesta prova.",
  ],
  recommendations: [
    { title: "Para a próxima aula", text: "Priorizar revisão de Química Geral e Atomística — conteúdo com menor taxa de acerto neste simulado." },
    { title: "Para a turma", text: "Aplicar uma lista de exercícios direcionada para Interpretação de Texto em Espanhol." },
    { title: "Para alunos em atenção", text: "Realizar acompanhamento individual dos 4 alunos identificados nesta análise." },
    { title: "Próximo simulado", text: "Monitorar a evolução de Espanhol e verificar se a intervenção reduziu o percentual de erros." },
  ],
  summary:
    "Em síntese: a turma apresenta desempenho abaixo do esperado, com bom domínio em Biologia (52.3%), mas dificuldade concentrada em Espanhol (24.0%). A recomendação principal é uma intervenção direcionada em Química Geral e Atomística, com acompanhamento individual dos alunos em atenção.",
};

export const individualReport = {
  studentName: "Rafael Andrade Souza",
  examName: EXAM_NAME,
  kpis: {
    scorePct: 78.0,
    correct: 39,
    total: 50,
    examTime: "1h22min",
    avgTimePerQuestion: "1min39s",
    classPosition: { rank: 1, total: 24 },
    evolutionPp: 9.4,
  },
  howWasIt:
    "Você teve um desempenho acima da média da turma, com 78.0% de acertos. Seu melhor resultado foi em Biologia, enquanto Espanhol concentra sua principal oportunidade de evolução.",
  vsClass: [
    { label: "Você", pct: 78.0, emphasis: true },
    { label: "Média da turma", pct: 41.6 },
    { label: "Melhor da turma", pct: 78.0 },
    { label: "Mediana da turma", pct: 42.0 },
  ],
  byArea: [
    { name: "Biologia", pct: 100.0, questions: "4/4", classAvg: 52.3, tier: "dominio" as TierLevel },
    { name: "Inglês", pct: 100.0, questions: "3/3", classAvg: 49.1, tier: "dominio" as TierLevel },
    { name: "Física", pct: 100.0, questions: "4/4", classAvg: 34.8, tier: "dominio" as TierLevel },
    { name: "Geografia", pct: 66.7, questions: "2/3", classAvg: 40.7, tier: "dominio" as TierLevel },
    { name: "Matemática", pct: 58.3, questions: "7/12", classAvg: 36.5, tier: "dominio" as TierLevel },
    { name: "Espanhol", pct: 33.3, questions: "1/3", classAvg: 24.0, tier: "atencao" as TierLevel },
  ],
  goingWell: [
    { label: "História Antiga (História)", pct: 100.0, note: "16 questões já respondidas" },
    { label: "Botânica (Biologia)", pct: 100.0, note: "37 questões já respondidas" },
  ],
  needsWork: [
    { label: "Espanhol", pct: 28.0, note: "8 questões já respondidas" },
    { label: "Geometria Espacial (Matemática)", pct: 33.3, note: "6 questões já respondidas" },
  ],
  masteryMap: [
    { discipline: "Matemática", content: "Grandezas Proporcionais", pct: 50.0, questions: 12, tier: "atencao" as TierLevel },
    { discipline: "Espanhol", content: "Interpretação de Texto", pct: 28.0, questions: 8, tier: "critico" as TierLevel },
    { discipline: "Física", content: "Cinemática", pct: 100.0, questions: 13, tier: "dominio" as TierLevel },
    { discipline: "Química", content: "Química Ambiental", pct: 100.0, questions: 36, tier: "dominio" as TierLevel },
  ],
  questionsToReview: [
    { code: "Q4", discipline: "Língua Portuguesa", topic: "Literatura Contemporânea", marked: "C", correct: "D", note: "Você também tem 81.2% de acerto histórico nesse conteúdo — o erro aqui não é isolado, vale revisar." },
    { code: "Q17", discipline: "Matemática", topic: "Logaritmos", marked: "B", correct: "E" },
  ],
  time: {
    total: "1h22min",
    avgPerQuestion: "1min39s",
    fastest: { code: "Q33", time: "0min05s" },
    slowest: { code: "Q22", time: "14min02s" },
    byArea: [
      { name: "Matemática", time: "3min42s" },
      { name: "Inglês", time: "2min20s" },
      { name: "História", time: "1min48s" },
    ],
  },
  evolution: [
    { period: "2026-06", pct: 68.0, questions: 61 },
    { period: "2026-07", pct: 74.5, questions: 480 },
    { period: "2026-08", pct: 79.8, questions: 705 },
    { period: "2026-09", pct: 77.4, questions: 92 },
  ],
  actionPlan: [
    { title: "1 — Prioridade — Espanhol", text: "28.0% de acerto histórico. Revise os conceitos fundamentais e resolva de 10 a 15 questões desse conteúdo nas próximas sessões." },
    { title: "2 — Revisão", text: "Revise as questões 4, 17 deste simulado — todas com o gabarito e o porquê de errar disponíveis na seção anterior." },
    { title: "3 — Acompanhamento", text: "Reavalie seu desempenho em Espanhol no próximo simulado para confirmar se a revisão funcionou." },
  ],
  raioX: {
    bestPoint: { label: "Biologia", pct: 100.0 },
    mainDifficulty: { label: "Espanhol", pct: 33.3 },
    biggestAlert: { label: "Espanhol", pct: 28.0 },
    historicalEvolutionPp: 9.4,
  },
  summary:
    "Em síntese: seu desempenho nesta prova foi de 78.0%, com melhor resultado em Biologia. Olhando seu histórico completo na plataforma, Espanhol é o ponto que mais precisa de atenção (28.0% de acerto). Priorize a revisão desse conteúdo antes do próximo simulado.",
};
