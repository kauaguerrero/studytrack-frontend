// Gera o payload persistido em `organizations.demo_stats` na criação de uma org demo.
// O shape de cada seção espelha exatamente a resposta das rotas reais que o backend
// passa a servir a partir desse blob (ver studytrack-backend/app/blueprints/enterprise/
// partners.py, videos.py e api/routes/essay_routes.py) — assim nenhuma página do
// frontend precisa saber que os dados são mockados, só checar `org.is_mock`.
//
// Valores inspirados no antigo studytrack-frontend/studytrack-tutorial-mock.ts
// (hardcoded pra um único slug), reorganizados aqui pra qualquer org demo nova.
//
// Duas regras guiam os números gerados aqui:
//   1. Nada de valor redondo. "20 alunos / 1.000 questões" denuncia dado de
//      brinquedo; "27 alunos / 3.673 questões" passa por operação real.
//   2. Os agregados são derivados dos alunos, nunca cravados à parte. Antes,
//      `stats.questions_week` era uma constante solta que não batia com a soma
//      da lista de alunos — um gestor que conferisse a conta via a costura.

const uid = (n: number) =>
  `${n.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

// PRNG determinístico (mulberry32). Dá números irregulares e reprodutíveis: o
// mesmo preset sempre gera a mesma demo, sem o aspecto artificial de séries
// calculadas por seno ou por múltiplos exatos.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Peso relativo de cada matéria no volume de questões da org. */
export type SubjectWeights = Readonly<Record<string, number>>;

export interface DemoSeedPreset {
  /** Elenco de alunos: [nome, questões na semana, plano]. */
  students?: ReadonlyArray<readonly [string, number, PlanTier]>;
  /** Distribuição por matéria. Os pesos são normalizados internamente. */
  subjectWeights?: SubjectWeights;
  /** Área de foco exibida na ficha do aluno (/alunos/[id]). */
  focusArea?: string;
  /** Semente do PRNG — troque para variar os números entre orgs. */
  seed?: number;
}

type PlanTier = 'b2b_premium' | 'b2b_basico' | 'b2b_trial';

// Distribuição padrão: cursinho generalista, sem matéria dominante.
const DEFAULT_SUBJECT_WEIGHTS: SubjectWeights = {
  'Matemática': 17,
  'Português': 15,
  'Biologia': 12,
  'História': 11,
  'Química': 11,
  'Física': 11,
  'Geografia': 9,
  'Inglês': 7,
  'Filosofia/Sociologia': 7,
};

// Cursinho de Ciências da Natureza com Física à frente. Mantém todas as áreas
// presentes — o banco de questões é completo e o painel precisa mostrar isso —
// mas o gráfico de desempenho deixa óbvio onde está o foco do curso.
export const PHYSICS_SUBJECT_WEIGHTS: SubjectWeights = {
  'Física': 29,
  'Matemática': 18,
  'Química': 14,
  'Biologia': 11,
  'Português': 8,
  'História': 6,
  'Geografia': 5,
  'Filosofia/Sociologia': 5,
  'Inglês': 4,
};

// 27 alunos: número quebrado e volume suficiente pra encher ranking, funil de
// vídeo e distribuição de planos sem o painel parecer vazio.
const DEFAULT_STUDENTS: ReadonlyArray<readonly [string, number, PlanTier]> = [
  ['Ana Beatriz Costa', 317, 'b2b_premium'],
  ['Lucas Ferreira', 189, 'b2b_premium'],
  ['Rafael Santos', 163, 'b2b_premium'],
  ['Camila Pereira', 141, 'b2b_premium'],
  ['Gabriela Alves', 131, 'b2b_premium'],
  ['Isabela Lima', 118, 'b2b_premium'],
  ['Leonardo Nunes', 106, 'b2b_premium'],
  ['Diego Carvalho', 93, 'b2b_premium'],
  ['Henrique Araujo', 87, 'b2b_premium'],
  ['Pedro Rodrigues', 79, 'b2b_basico'],
  ['Marina Teixeira', 74, 'b2b_premium'],
  ['Mateus Souza', 68, 'b2b_basico'],
  ['Thiago Costa', 61, 'b2b_premium'],
  ['Fernanda Ribeiro', 57, 'b2b_basico'],
  ['Victor Gomes', 52, 'b2b_premium'],
  ['Juliana Oliveira', 49, 'b2b_basico'],
  ['Caio Monteiro', 46, 'b2b_premium'],
  ['Leticia Ferreira', 43, 'b2b_basico'],
  ['Priscila Barbosa', 39, 'b2b_premium'],
  ['Rodrigo Vasconcelos', 36, 'b2b_basico'],
  ['Beatriz Martins', 33, 'b2b_premium'],
  ['Amanda Silva', 29, 'b2b_basico'],
  ['Eduardo Pacheco', 26, 'b2b_basico'],
  ['Larissa Fontes', 23, 'b2b_basico'],
  ['Ligia Castro', 19, 'b2b_trial'],
  ['Murilo Bastos', 14, 'b2b_trial'],
  ['Sofia Rezende', 11, 'b2b_trial'],
];

const TODAY = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysAgoDateTime = (n: number, hh = 10, mm = 0) => {
  const d = new Date(Date.now() - n * 86400000);
  d.setUTCHours(hh, mm, 0, 0);
  return d.toISOString();
};

function buildStudent(n: number, name: string, qWeek: number, planTier: string, lastActivityDaysAgo: number) {
  const isPremium = planTier === 'b2b_premium';
  const qToday = lastActivityDaysAgo === 0 ? Math.round(qWeek * 0.14) : 0;
  const accBase = qWeek > 0 ? 52 + ((n * 7 + 13) % 28) : null;
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  // Multiplicadores levemente distintos por aluno: o mês de um não é exatamente
  // 3,6× a semana do outro, como seria com um fator único para todos.
  const monthFactor = 3.4 + ((n * 13) % 9) / 10;
  const totalFactor = 15.6 + ((n * 7) % 41) / 10;
  return {
    id: uid(n),
    full_name: name,
    email: `${slug}@demo.studytrack.internal`,
    avatar_url: null,
    plan_tier: planTier,
    plan_id: null,
    plan_name: isPremium ? 'Plano Premium' : planTier === 'b2b_trial' ? 'Trial' : 'Plano Básico',
    plan_price_cents: isPremium ? 19900 : planTier === 'b2b_trial' ? 0 : 9900,
    plan_duration_days: 30,
    plan_assignment_status: 'active',
    plan_last_payment_at: null,
    essay_credits_limit: isPremium ? 8 : 2,
    essay_credits_period: 'monthly',
    essay_credits_used: isPremium ? 3 : 1,
    essay_credits_remaining: isPremium ? 5 : 1,
    last_activity_date: daysAgoISO(lastActivityDaysAgo),
    joined_organization_at: daysAgoDateTime(120 + n),
    questions_today: qToday,
    questions_week: qWeek,
    questions_month: Math.round(qWeek * monthFactor),
    questions_total: Math.round(qWeek * totalFactor),
    simulados_today: 0,
    // Cadência própria por aluno: se todo mundo ativo fizesse exatamente 3
    // simulados no mês, o agregado cairia em múltiplos exatos e entregaria o
    // dado como sintético.
    simulados_week: qWeek > 50 ? 1 + ((n * 5) % 2) : qWeek > 28 ? (n * 3) % 2 : 0,
    simulados_month: qWeek > 50 ? 3 + ((n * 7) % 4) : qWeek > 28 ? 1 + ((n * 3) % 2) : (n * 2) % 2,
    simulados_total: Math.max(0, Math.round(qWeek / (17 + ((n * 11) % 13)))),
    essays_today: 0,
    essays_week: qWeek > 100 ? 1 : 0,
    essays_month: qWeek > 60 ? 1 + ((n * 3) % 2) : qWeek > 30 ? 1 : 0,
    // Acumulado desde a entrada na org, não o recorte do mês — por isso o
    // divisor bem menor que o de essays_month.
    essays_total: Math.max(0, Math.round(qWeek / (11 + ((n * 7) % 19)))),
    accuracy_pct: accBase,
    accuracy_today: qToday > 0 ? accBase : null,
    accuracy_week: accBase,
    accuracy_month: accBase !== null ? accBase - 2 : null,
    accuracy_total: accBase !== null ? accBase - 4 : null,
  };
}

function buildStudents(roster: ReadonlyArray<readonly [string, number, PlanTier]>) {
  return roster.map(([name, qWeek, planTier], i) =>
    buildStudent(i + 1, name, qWeek, planTier, qWeek === 0 ? 10 : i % 5)
  );
}

// Distribui um total de questões entre as matérias conforme os pesos do preset,
// com acerto variando por matéria. É esse recorte que comunica a identidade do
// curso no painel — num cursinho de Física, Física precisa dominar o gráfico.
function buildSubjects(weights: SubjectWeights, totalQuestions: number, rand: () => number) {
  const entries = Object.entries(weights);
  const weightSum = entries.reduce((acc, [, w]) => acc + w, 0);
  return entries.map(([subject, weight]) => {
    const share = weight / weightSum;
    // ±6% de ruído pra que as fatias não sejam proporções exatas do peso.
    const total = Math.max(7, Math.round(totalQuestions * share * (0.94 + rand() * 0.12)));
    const accuracy_pct = Math.round((54 + rand() * 24) * 10) / 10;
    return { subject, total, correct: Math.round((total * accuracy_pct) / 100), accuracy_pct };
  });
}

function buildAnalyticsWindow(
  days: number,
  totalPerDay: number,
  weights: SubjectWeights,
  subjectTotal: number,
  rand: () => number,
) {
  const questions_series = Array.from({ length: days }, (_, i) => ({
    date: daysAgoISO(days - 1 - i),
    // Fins de semana rendem menos; o resto oscila de forma irregular.
    total: (() => {
      const weekday = new Date(Date.now() - (days - 1 - i) * 86400000).getUTCDay();
      const weekendDip = weekday === 0 || weekday === 6 ? 0.52 : 1;
      return Math.max(0, Math.round(totalPerDay * weekendDip * (0.68 + rand() * 0.64)));
    })(),
  }));
  // Tendência de alta suave com ruído — evita a linha reta perfeita.
  const accuracy_series = Array.from({ length: days }, (_, i) => ({
    date: daysAgoISO(days - 1 - i),
    accuracy_pct: Math.round((57.4 + (i / Math.max(1, days - 1)) * 7.3 + (rand() - 0.5) * 3.4) * 10) / 10,
  }));
  return { questions_series, accuracy_series, subjects: buildSubjects(weights, subjectTotal, rand) };
}

function buildActivityFeed(students: ReturnType<typeof buildStudents>, subjects: string[]) {
  const feed: Record<string, unknown>[] = [];
  students.slice(0, 8).forEach((s, i) => {
    feed.push({
      type: 'question',
      student_id: s.id,
      student_name: s.full_name,
      subject: subjects[i % subjects.length],
      is_correct: i % 3 !== 0,
      timestamp: daysAgoDateTime(0, 10, i * 4),
    });
  });
  students.slice(0, 4).forEach((s, i) => {
    feed.push({
      type: 'simulado',
      student_id: s.id,
      student_name: s.full_name,
      subject: null,
      total_questions: 45,
      status: 'completed',
      timestamp: daysAgoDateTime(1 + i, 16),
    });
  });
  students.slice(0, 3).forEach((s, i) => {
    feed.push({
      type: 'essay',
      student_id: s.id,
      student_name: s.full_name,
      essay_type: 'enem',
      status: 'corrected',
      score: 680 + i * 40,
      timestamp: daysAgoDateTime(1 + i, 9),
    });
  });
  return feed.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

export function buildDemoStatsSeed(preset: DemoSeedPreset = {}) {
  const roster = preset.students ?? DEFAULT_STUDENTS;
  const weights = preset.subjectWeights ?? DEFAULT_SUBJECT_WEIGHTS;
  const subjectNames = Object.keys(weights);
  const rand = rng(preset.seed ?? 0x57d7a0);

  const students = buildStudents(roster);
  const totalStudents = students.length;
  const activeToday = students.filter((s) => s.last_activity_date === TODAY()).length;

  // Agregados somados a partir dos alunos: o total do painel sempre fecha com a
  // lista nominal, e sai quebrado por construção.
  const sum = (key: keyof ReturnType<typeof buildStudent>) =>
    students.reduce((acc, s) => acc + ((s[key] as number) ?? 0), 0);

  const questionsToday = sum('questions_today');
  const questionsWeek = sum('questions_week');
  const questionsMonth = sum('questions_month');
  const questionsTotal = sum('questions_total');
  const simuladosWeek = sum('simulados_week');
  const simuladosMonth = sum('simulados_month');
  const simuladosTotal = sum('simulados_total');

  // Períodos anteriores: variação irregular de alguns por cento, ora acima, ora
  // abaixo — um painel em que tudo cresce no mesmo ritmo não convence.
  const prev = (v: number, factor: number) => Math.round(v * factor);

  const stats = {
    total_students: totalStudents,
    active_today: activeToday, prev_active_today: Math.max(0, activeToday - 3),
    active_week: totalStudents - 3, prev_active_week: totalStudents - 7,
    active_month: totalStudents - 1, prev_active_month: totalStudents - 4,
    active_total: totalStudents,
    questions_today: questionsToday, prev_questions_today: prev(questionsToday, 0.83),
    questions_week: questionsWeek, prev_questions_week: prev(questionsWeek, 0.91),
    questions_month: questionsMonth, prev_questions_month: prev(questionsMonth, 1.04),
    questions_total: questionsTotal,
    simulados_today: 3, prev_simulados_today: 5,
    simulados_week: simuladosWeek, prev_simulados_week: prev(simuladosWeek, 0.82),
    simulados_month: simuladosMonth, prev_simulados_month: prev(simuladosMonth, 0.89),
    simulados_total: simuladosTotal,
    plan_distribution: {
      b2b_premium: students.filter((s) => s.plan_tier === 'b2b_premium').length,
      b2b_basico: students.filter((s) => s.plan_tier === 'b2b_basico').length,
      b2b_trial: students.filter((s) => s.plan_tier === 'b2b_trial').length,
    },
  };

  const analytics = {
    today: buildAnalyticsWindow(1, Math.round(questionsWeek / 7), weights, questionsToday, rand),
    week: buildAnalyticsWindow(7, Math.round(questionsWeek / 7), weights, questionsWeek, rand),
    month: buildAnalyticsWindow(30, Math.round(questionsMonth / 30), weights, questionsMonth, rand),
    total: buildAnalyticsWindow(30, Math.round(questionsMonth / 30), weights, questionsTotal, rand),
  };

  const activity_feed = buildActivityFeed(students, subjectNames);

  const videoStarted = Math.round(totalStudents * 0.74);
  const videoReached50 = Math.round(videoStarted * 0.83);
  const videoCompleted = Math.round(videoStarted * 0.67);
  const atRisk = Math.max(1, Math.round(totalStudents * 0.17));
  const topSubject = subjectNames[0];

  const video_kpis = {
    summary: {
      adoption_weekly_pct: Math.round((videoStarted / totalStudents) * 1000) / 10,
      adoption_weekly_num: videoStarted,
      adoption_weekly_den: totalStudents,
      avg_completion_pct: 63.8, at_risk_students: atRisk, module_coverage_pct: 86.4,
    },
    funnel: { started: videoStarted, reached_50: videoReached50, completed_80: videoCompleted },
    alerts: [{ level: 'warning', title: `${atRisk} alunos em risco`, message: 'Sem acesso nos últimos 7 dias.', action: 'Enviar lembrete' }],
    lesson_table: [
      { lesson_id: uid(901), lesson_title: `${topSubject} — Fundamentos`, module_id: uid(801), module_title: `Módulo 1 — ${topSubject} do zero`, started: videoStarted, reached_50: videoReached50, completed: videoCompleted, completion_rate_pct: 64.3, avg_watched_pct: 67.9 },
      { lesson_id: uid(902), lesson_title: 'Estrutura da Redação ENEM', module_id: uid(802), module_title: 'Módulo 2 — Redação e Linguagens', started: videoStarted - 2, reached_50: videoReached50 - 3, completed: videoCompleted - 1, completion_rate_pct: 71.6, avg_watched_pct: 73.2 },
    ],
    dropoff: { lt25: 3, from25to50: 5, from50to80: 7, gte80: videoCompleted },
    students_total: totalStudents, lessons_total: 11, period_days: 7, module_id: null,
  };

  const essaysTotal = sum('essays_total');
  const essaysMonth = sum('essays_month');
  const essaysWeek = sum('essays_week');

  const essays_count = { today: 2, week: essaysWeek, month: essaysMonth, total: essaysTotal };

  const essays_metrics = {
    received_week: essaysWeek,
    historical_received_week: 0,
    avg_score: 708,
    highest_score: 824,
    lowest_score: 516,
    pending_count: 3,
    second_corrections_count: 2,
    ranking: students.slice(0, 5).map((s, i) => ({
      student_id: s.id,
      full_name: s.full_name,
      avatar_url: null,
      // Degraus irregulares entre as colocações.
      avg_score: [782, 759, 741, 726, 703][i],
      last_essay_at: daysAgoDateTime(1 + i, 9),
    })),
  };

  const protagonist = students[0];

  const student_view = {
    activity_feed: activity_feed.slice(0, 12),
    last_activity: { type: 'question', subject: topSubject, timestamp: daysAgoDateTime(0, 10) },
    daily_mission: {
      available: true,
      mission: { id: 'demo-mission', title: 'Missão do dia', description: 'Responda 10 questões e mantenha sua sequência.', bonus_points: 50 },
      actions: [
        { type: 'answer_questions', label: 'Responder questões', qty: 10, progress: 7, done: false },
        { type: 'check_in', label: 'Fazer check-in', qty: 1, progress: 1, done: true },
      ],
      completed: false,
      just_completed: false,
      points_awarded: 0,
    },
    onboarding_checklist: {
      steps: [
        { id: 'profile', title: 'Completar perfil', done: true, rewarded: true, just_rewarded: false, bonus_points: 20 },
        { id: 'first_question', title: 'Responder a primeira questão', done: true, rewarded: true, just_rewarded: false, bonus_points: 20 },
        { id: 'first_simulado', title: 'Fazer o primeiro simulado', done: false, rewarded: false, just_rewarded: false, bonus_points: 30 },
      ],
      all_done: false,
      newly_rewarded_titles: [],
    },
    achievements: {
      achievements: [
        { id: 'streak_7', category: 'streak', title: 'Sequência de 7 dias', description: 'Estude por 7 dias seguidos.', icon: 'flame', target: 7, progress: 7, unlocked: true },
        { id: 'questions_500', category: 'questions', title: '500 questões', description: 'Responda 500 questões.', icon: 'target', target: 500, progress: 317, unlocked: false },
        { id: 'essays_5', category: 'essays', title: '5 redações corrigidas', description: 'Envie 5 redações.', icon: 'pen-line', target: 5, progress: 3, unlocked: false },
      ],
      unlocked_count: 1,
      total_count: 3,
    },
    dashboard_summary: {
      firstName: protagonist.full_name.split(' ')[0],
      currentStreak: 9,
      questionsCount: protagonist.questions_total,
      simuladosCount: protagonist.simulados_total,
    },
  };

  // Template genérico pra página de detalhe de aluno (/alunos/[id]) — o backend
  // sobrescreve profile.{id,full_name,email,...} com os dados reais do aluno
  // clicado, então uma única ficha detalhada serve pra qualquer um dos alunos.
  const student_detail_template = {
    profile: {
      focus_area: preset.focusArea ?? 'Ciências da Natureza', study_pace: 'intense', hours_per_day: 3, days_per_week: 6, current_streak: 9,
    },
    metrics: {
      questions_today: protagonist.questions_today, questions_week: protagonist.questions_week,
      questions_month: protagonist.questions_month, questions_total: protagonist.questions_total,
      simulados_month: protagonist.simulados_month, simulados_total: protagonist.simulados_total,
      accuracy_pct: protagonist.accuracy_pct,
    },
    subject_breakdown: buildSubjects(weights, protagonist.questions_total, rand),
    weekly_evolution: [
      { week_start: daysAgoISO(28), total: 271, accuracy_pct: 69.4 },
      { week_start: daysAgoISO(21), total: 243, accuracy_pct: 73.1 },
      { week_start: daysAgoISO(14), total: 308, accuracy_pct: 71.8 },
      { week_start: daysAgoISO(7), total: 317, accuracy_pct: 77.6 },
    ],
    daily_evolution: Array.from({ length: 7 }, (_, i) => ({
      date: daysAgoISO(6 - i),
      total: Math.round(31 + rand() * 27),
      accuracy_pct: Math.round((71 + rand() * 11) * 10) / 10,
    })),
    recent_answers: subjectNames.slice(0, 5).map((subject, i) => ({
      id: uid(500 + i), question_id: `q0${i + 1}`, selected_option: 'A', is_correct: i % 3 !== 0,
      subject, created_at: daysAgoDateTime(0, 10, i * 3),
    })),
    recent_simulados: [
      { id: uid(601), config: { format: 'natureza', bank: 'ENEM', qty: 45 }, score: 37, total_questions: 45, tri_score: 673.4, time_taken_secs: 4387, completed_at: daysAgoDateTime(3, 15) },
      { id: uid(602), config: { format: 'matematica', bank: 'ENEM', qty: 45 }, score: 31, total_questions: 45, tri_score: 638.9, time_taken_secs: 5126, completed_at: daysAgoDateTime(6, 16) },
    ],
    essay_stats: { delivered_count: 13, corrected_count: 11, avg_score: 708, best_score: 824, trend: 'up', trend_delta: 23 },
    essay_evolution: [
      { id: uid(701), status: 'corrected', submitted_at: daysAgoDateTime(2, 10), corrected_at: daysAgoDateTime(1, 8), total_score: 724, average_score: null },
      { id: uid(702), status: 'corrected', submitted_at: daysAgoDateTime(9, 9), corrected_at: daysAgoDateTime(8, 11), total_score: 697, average_score: null },
    ],
    essay_competency_avgs: [
      { competency: 1, avg: 147, count: 11 },
      { competency: 2, avg: 152, count: 11 },
      { competency: 3, avg: 134, count: 11 },
      { competency: 4, avg: 141, count: 11 },
      { competency: 5, avg: 128, count: 11 },
    ],
    essay_by_type: [],
  };

  return { stats, analytics, students, activity_feed, video_kpis, essays_count, essays_metrics, student_view, student_detail_template };
}
