// Gera o payload persistido em `organizations.demo_stats` na criação de uma org demo.
// O shape de cada seção espelha exatamente a resposta das rotas reais que o backend
// passa a servir a partir desse blob (ver studytrack-backend/app/blueprints/enterprise/
// partners.py, videos.py e api/routes/essay_routes.py) — assim nenhuma página do
// frontend precisa saber que os dados são mockados, só checar `org.is_mock`.
//
// Valores inspirados no antigo studytrack-frontend/studytrack-tutorial-mock.ts
// (hardcoded pra um único slug), reorganizados aqui pra qualquer org demo nova.

const uid = (n: number) =>
  `${n.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const SUBJECTS = ['Matemática', 'Português', 'Biologia', 'História', 'Química', 'Física', 'Inglês', 'Filosofia/Sociologia'];

const STUDENT_NAMES: [name: string, qWeek: number, planTier: 'b2b_premium' | 'b2b_basico' | 'b2b_trial'][] = [
  ['Ana Beatriz Costa', 312, 'b2b_premium'],
  ['Lucas Ferreira', 187, 'b2b_premium'],
  ['Gabriela Alves', 94, 'b2b_premium'],
  ['Rafael Santos', 108, 'b2b_premium'],
  ['Isabela Lima', 87, 'b2b_premium'],
  ['Pedro Rodrigues', 72, 'b2b_basico'],
  ['Camila Pereira', 119, 'b2b_premium'],
  ['Mateus Souza', 63, 'b2b_basico'],
  ['Juliana Oliveira', 48, 'b2b_basico'],
  ['Thiago Costa', 55, 'b2b_premium'],
  ['Leticia Ferreira', 41, 'b2b_basico'],
  ['Diego Carvalho', 78, 'b2b_premium'],
  ['Beatriz Martins', 32, 'b2b_premium'],
  ['Henrique Araujo', 67, 'b2b_premium'],
  ['Fernanda Ribeiro', 51, 'b2b_basico'],
  ['Victor Gomes', 44, 'b2b_premium'],
  ['Amanda Silva', 29, 'b2b_basico'],
  ['Leonardo Nunes', 83, 'b2b_premium'],
  ['Priscila Barbosa', 37, 'b2b_premium'],
  ['Ligia Castro', 17, 'b2b_trial'],
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
    questions_month: Math.round(qWeek * 3.6),
    questions_total: Math.round(qWeek * 17),
    simulados_today: 0,
    simulados_week: qWeek > 50 ? 1 : 0,
    simulados_month: qWeek > 50 ? 3 : 0,
    simulados_total: Math.max(0, Math.round(qWeek / 25)),
    essays_today: 0,
    essays_week: qWeek > 100 ? 1 : 0,
    essays_month: qWeek > 60 ? 1 : 0,
    essays_total: Math.max(0, Math.round(qWeek / 90)),
    accuracy_pct: accBase,
    accuracy_today: qToday > 0 ? accBase : null,
    accuracy_week: accBase,
    accuracy_month: accBase !== null ? accBase - 2 : null,
    accuracy_total: accBase !== null ? accBase - 4 : null,
  };
}

function buildStudents() {
  return STUDENT_NAMES.map(([name, qWeek, planTier], i) =>
    buildStudent(i + 1, name, qWeek, planTier, qWeek === 0 ? 10 : i % 5)
  );
}

function buildSubjects() {
  return SUBJECTS.map((subject, i) => {
    const total = 280 + ((i * 37) % 220);
    const accuracy_pct = 55 + ((i * 11) % 25);
    return { subject, total, correct: Math.round((total * accuracy_pct) / 100), accuracy_pct };
  });
}

function buildAnalyticsWindow(days: number, totalPerDay: number) {
  const questions_series = Array.from({ length: days }, (_, i) => ({
    date: daysAgoISO(days - 1 - i),
    total: Math.max(0, Math.round(totalPerDay * (0.75 + 0.5 * Math.sin(i)))),
  }));
  const accuracy_series = Array.from({ length: days }, (_, i) => ({
    date: daysAgoISO(days - 1 - i),
    accuracy_pct: Math.round((58 + i * 0.6) * 10) / 10,
  }));
  return { questions_series, accuracy_series, subjects: buildSubjects() };
}

function buildActivityFeed(students: ReturnType<typeof buildStudents>) {
  const feed: Record<string, unknown>[] = [];
  students.slice(0, 8).forEach((s, i) => {
    feed.push({
      type: 'question',
      student_id: s.id,
      student_name: s.full_name,
      subject: SUBJECTS[i % SUBJECTS.length],
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

export function buildDemoStatsSeed() {
  const students = buildStudents();
  const totalStudents = students.length;
  const activeToday = students.filter((s) => s.last_activity_date === TODAY()).length;

  const stats = {
    total_students: totalStudents,
    active_today: activeToday, prev_active_today: Math.max(0, activeToday - 2),
    active_week: totalStudents - 2, prev_active_week: totalStudents - 4,
    active_month: totalStudents, prev_active_month: totalStudents - 1,
    active_total: totalStudents,
    questions_today: 243, prev_questions_today: 198,
    questions_week: 2487, prev_questions_week: 2103,
    questions_month: 9214, prev_questions_month: 8401,
    questions_total: 47832,
    simulados_today: 3, prev_simulados_today: 2,
    simulados_week: 19, prev_simulados_week: 15,
    simulados_month: 61, prev_simulados_month: 54,
    simulados_total: 214,
    plan_distribution: {
      b2b_premium: students.filter((s) => s.plan_tier === 'b2b_premium').length,
      b2b_basico: students.filter((s) => s.plan_tier === 'b2b_basico').length,
      b2b_trial: students.filter((s) => s.plan_tier === 'b2b_trial').length,
    },
  };

  const analytics = {
    today: buildAnalyticsWindow(1, 240),
    week: buildAnalyticsWindow(7, 350),
    month: buildAnalyticsWindow(30, 300),
    total: buildAnalyticsWindow(30, 300),
  };

  const activity_feed = buildActivityFeed(students);

  const video_kpis = {
    summary: {
      adoption_weekly_pct: 71.4, adoption_weekly_num: 14, adoption_weekly_den: totalStudents,
      avg_completion_pct: 66.2, at_risk_students: 4, module_coverage_pct: 88.1,
    },
    funnel: { started: 18, reached_50: 15, completed_80: 12 },
    alerts: [{ level: 'warning', title: `${4} alunos em risco`, message: 'Sem acesso nos últimos 7 dias.', action: 'Enviar lembrete' }],
    lesson_table: [
      { lesson_id: uid(901), lesson_title: 'Funções do 1º Grau', module_id: uid(801), module_title: 'Módulo 1 — Fundamentos ENEM', started: 18, reached_50: 15, completed: 12, completion_rate_pct: 66.7, avg_watched_pct: 68.2 },
      { lesson_id: uid(902), lesson_title: 'Estrutura da Redação ENEM', module_id: uid(802), module_title: 'Módulo 2 — Redação e Linguagens', started: 17, reached_50: 14, completed: 13, completion_rate_pct: 76.5, avg_watched_pct: 74.1 },
    ],
    dropoff: { lt25: 2, from25to50: 4, from50to80: 6, gte80: 8 },
    students_total: totalStudents, lessons_total: 8, period_days: 7, module_id: null,
  };

  const essays_count = { today: 1, week: 6, month: 22, total: 96 };

  const essays_metrics = {
    received_week: 6,
    historical_received_week: 0,
    avg_score: 712,
    highest_score: 800,
    lowest_score: 540,
    pending_count: 2,
    second_corrections_count: 1,
    ranking: students.slice(0, 5).map((s, i) => ({
      student_id: s.id,
      full_name: s.full_name,
      avatar_url: null,
      avg_score: 760 - i * 22,
      last_essay_at: daysAgoDateTime(1 + i, 9),
    })),
  };

  const protagonist = students[0];

  const student_view = {
    activity_feed: activity_feed.slice(0, 12),
    last_activity: { type: 'question', subject: 'Biologia', timestamp: daysAgoDateTime(0, 10) },
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
        { id: 'questions_500', category: 'questions', title: '500 questões', description: 'Responda 500 questões.', icon: 'target', target: 500, progress: 312, unlocked: false },
        { id: 'essays_5', category: 'essays', title: '5 redações corrigidas', description: 'Envie 5 redações.', icon: 'pen-line', target: 5, progress: 3, unlocked: false },
      ],
      unlocked_count: 1,
      total_count: 3,
    },
    dashboard_summary: {
      firstName: protagonist.full_name.split(' ')[0],
      currentStreak: 7,
      questionsCount: protagonist.questions_total,
      simuladosCount: protagonist.simulados_total,
    },
  };

  // Template genérico pra página de detalhe de aluno (/alunos/[id]) — o backend
  // sobrescreve profile.{id,full_name,email,...} com os dados reais do aluno
  // clicado, então uma única ficha detalhada serve pra qualquer um dos alunos.
  const student_detail_template = {
    profile: {
      focus_area: 'Ciências Humanas', study_pace: 'intense', hours_per_day: 3, days_per_week: 6, current_streak: 7,
    },
    metrics: {
      questions_today: protagonist.questions_today, questions_week: protagonist.questions_week,
      questions_month: protagonist.questions_month, questions_total: protagonist.questions_total,
      simulados_month: protagonist.simulados_month, simulados_total: protagonist.simulados_total,
      accuracy_pct: protagonist.accuracy_pct,
    },
    subject_breakdown: buildSubjects(),
    weekly_evolution: [
      { week_start: daysAgoISO(28), total: 267, accuracy_pct: 71.2 },
      { week_start: daysAgoISO(21), total: 289, accuracy_pct: 73.8 },
      { week_start: daysAgoISO(14), total: 301, accuracy_pct: 75.4 },
      { week_start: daysAgoISO(7), total: 312, accuracy_pct: 78.1 },
    ],
    daily_evolution: Array.from({ length: 7 }, (_, i) => ({
      date: daysAgoISO(6 - i), total: 38 + i * 3, accuracy_pct: Math.round((75 + i) * 10) / 10,
    })),
    recent_answers: SUBJECTS.slice(0, 5).map((subject, i) => ({
      id: uid(500 + i), question_id: `q0${i + 1}`, selected_option: 'A', is_correct: i % 3 !== 0,
      subject, created_at: daysAgoDateTime(0, 10, i * 3),
    })),
    recent_simulados: [
      { id: uid(601), config: { format: 'humanas', bank: 'ENEM', qty: 45 }, score: 39, total_questions: 45, tri_score: 680.2, time_taken_secs: 4320, completed_at: daysAgoDateTime(3, 15) },
      { id: uid(602), config: { format: 'natureza', bank: 'ENEM', qty: 45 }, score: 31, total_questions: 45, tri_score: 641.8, time_taken_secs: 5100, completed_at: daysAgoDateTime(6, 16) },
    ],
    essay_stats: { delivered_count: 12, corrected_count: 11, avg_score: 712, best_score: 780, trend: 'up', trend_delta: 18 },
    essay_evolution: [
      { id: uid(701), status: 'corrected', submitted_at: daysAgoDateTime(2, 10), corrected_at: daysAgoDateTime(1, 8), total_score: 720, average_score: null },
      { id: uid(702), status: 'corrected', submitted_at: daysAgoDateTime(9, 9), corrected_at: daysAgoDateTime(8, 11), total_score: 700, average_score: null },
    ],
    essay_competency_avgs: [1, 2, 3, 4, 5].map((competency) => ({ competency, avg: 130 + competency * 6, count: 11 })),
    essay_by_type: [],
  };

  return { stats, analytics, students, activity_feed, video_kpis, essays_count, essays_metrics, student_view, student_detail_template };
}
