// =============================================================================
// StudyTrack — Dados mock para tutoriais/demos
// =============================================================================
//
// CONTEXTO: Criado em Jul/2026 para gravar tutorial da org "Ave Palavra".
// Injeta dados falsos realistas em todos os portais de /partners/[slug]/.
//
// COMO USAR (abordagem atual — simples, mas requer cuidado):
//   1. Copiar este arquivo para: studytrack-frontend/src/lib/tutorial-mock.ts
//   2. Adicionar guard em cada página:  if (TUTORIAL_MODE) { setData(MOCK_...); return; }
//   3. Gravar o tutorial com TUTORIAL_MODE = true
//   4. Ao terminar: git restore src/app/partners/ && rm src/lib/tutorial-mock.ts
//
// ABORDAGEM FUTURA PLANEJADA (org demo com reset):
//   Em vez de injetar mocks no código, criar uma org demo persistente no Supabase
//   (ex: slug "{org}-demo", is_demo=true) com dois botões no painel admin:
//     - "Sincronizar branding" → copia cores/logo/módulos da org real para a demo
//     - "Resetar dados"       → repopula com os dados abaixo via seed script
//   Assim o tutorial roda no produto real, sem nenhuma mudança de código.
//   Ver discussão: conversa de Jul/2026 sobre demo org vs branch tutorial.
//
// PERSONAGEM PRINCIPAL: Ana Paula Costa (uid 1) — aluna premium, alta performance
// ORG DE REFERÊNCIA: Ave Palavra (slug "ave")
// =============================================================================

export const TUTORIAL_MODE = true;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const uid = (n: number) =>
  `${n.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

// ─── OrgStats ──────────────────────────────────────────────────────────────────

export const MOCK_STATS = {
  total_students: 42,
  active_today: 11, prev_active_today: 9,
  active_week: 34,  prev_active_week: 29,
  active_month: 40, prev_active_month: 37,
  active_total: 42,
  questions_today: 243,   prev_questions_today: 198,
  questions_week: 2487,   prev_questions_week: 2103,
  questions_month: 9214,  prev_questions_month: 8401,
  questions_total: 47832,
  simulados_today: 3,  prev_simulados_today: 2,
  simulados_week: 19,  prev_simulados_week: 15,
  simulados_month: 61, prev_simulados_month: 54,
  simulados_total: 214,
  plan_distribution: { premium: 28, basico: 10, trial: 4 },
};

export const MOCK_ESSAYS_COUNT = { today: 4, week: 14, month: 52, total: 214 };

// ─── Analytics ─────────────────────────────────────────────────────────────────

export const MOCK_ANALYTICS = {
  questions_series: [
    { date: '2026-07-19', total: 283 }, { date: '2026-07-20', total: 312 },
    { date: '2026-07-21', total: 387 }, { date: '2026-07-22', total: 421 },
    { date: '2026-07-23', total: 398 }, { date: '2026-07-24', total: 415 },
    { date: '2026-07-25', total: 271 },
  ],
  accuracy_series: [
    { date: '2026-07-19', accuracy_pct: 58.2 }, { date: '2026-07-20', accuracy_pct: 60.1 },
    { date: '2026-07-21', accuracy_pct: 62.3 }, { date: '2026-07-22', accuracy_pct: 63.8 },
    { date: '2026-07-23', accuracy_pct: 64.1 }, { date: '2026-07-24', accuracy_pct: 65.7 },
    { date: '2026-07-25', accuracy_pct: 66.2 },
  ],
  subjects: [
    { subject: 'Inglês',               total: 312, correct: 246, accuracy_pct: 78.8 },
    { subject: 'Filosofia/Sociologia', total: 287, correct: 213, accuracy_pct: 74.2 },
    { subject: 'Biologia',             total: 398, correct: 279, accuracy_pct: 70.1 },
    { subject: 'História',             total: 341, correct: 232, accuracy_pct: 68.0 },
    { subject: 'Química',              total: 367, correct: 231, accuracy_pct: 63.0 },
    { subject: 'Física',               total: 289, correct: 165, accuracy_pct: 57.1 },
    { subject: 'Matemática',           total: 493, correct: 266, accuracy_pct: 54.0 },
  ],
};

// ─── Video ─────────────────────────────────────────────────────────────────────

export const MOCK_VIDEO_ADOPTION = { pct: 71.4, num: 30, den: 42 };

export const MOCK_VIDEO_KPI = {
  summary: {
    adoption_weekly_pct: 71.4, adoption_weekly_num: 30, adoption_weekly_den: 42,
    avg_completion_pct: 66.2, at_risk_students: 7, module_coverage_pct: 88.1,
  },
  funnel: { started: 39, reached_50: 32, completed_80: 26 },
  alerts: [{ level: 'warning' as const, title: '7 alunos em risco', message: 'Sem acesso nos últimos 7 dias.', action: 'Enviar lembrete' }],
  lesson_table: [
    { lesson_id: '1e000001-0000-4000-8000-000000000001', lesson_title: 'Funções do 1º Grau',       module_id: '0d000001-0000-4000-8000-000000000001', module_title: 'Módulo 1 — Fundamentos ENEM', started: 39, reached_50: 34, completed: 29, completion_rate_pct: 74.4, avg_watched_pct: 71.2 },
    { lesson_id: '1e000002-0000-4000-8000-000000000002', lesson_title: 'Funções do 2º Grau',       module_id: '0d000001-0000-4000-8000-000000000001', module_title: 'Módulo 1 — Fundamentos ENEM', started: 36, reached_50: 29, completed: 24, completion_rate_pct: 66.7, avg_watched_pct: 65.3 },
    { lesson_id: '1e000003-0000-4000-8000-000000000003', lesson_title: 'Progressões (PA e PG)',    module_id: '0d000001-0000-4000-8000-000000000001', module_title: 'Módulo 1 — Fundamentos ENEM', started: 31, reached_50: 24, completed: 18, completion_rate_pct: 58.1, avg_watched_pct: 59.7 },
    { lesson_id: '1e000004-0000-4000-8000-000000000004', lesson_title: 'Geometria Plana',          module_id: '0d000001-0000-4000-8000-000000000001', module_title: 'Módulo 1 — Fundamentos ENEM', started: 27, reached_50: 19, completed: 14, completion_rate_pct: 51.9, avg_watched_pct: 52.1 },
    { lesson_id: '1e000005-0000-4000-8000-000000000005', lesson_title: 'Estrutura da Redação ENEM',module_id: '0d000002-0000-4000-8000-000000000002', module_title: 'Módulo 2 — Redação e Linguagens', started: 38, reached_50: 33, completed: 30, completion_rate_pct: 78.9, avg_watched_pct: 77.4 },
    { lesson_id: '1e000006-0000-4000-8000-000000000006', lesson_title: 'Conectivos e Coesão',      module_id: '0d000002-0000-4000-8000-000000000002', module_title: 'Módulo 2 — Redação e Linguagens', started: 35, reached_50: 28, completed: 23, completion_rate_pct: 65.7, avg_watched_pct: 63.8 },
    { lesson_id: '1e000007-0000-4000-8000-000000000007', lesson_title: 'Competências I e II',      module_id: '0d000002-0000-4000-8000-000000000002', module_title: 'Módulo 2 — Redação e Linguagens', started: 32, reached_50: 26, completed: 21, completion_rate_pct: 65.6, avg_watched_pct: 62.1 },
    { lesson_id: '1e000008-0000-4000-8000-000000000008', lesson_title: 'Competências III, IV e V', module_id: '0d000002-0000-4000-8000-000000000002', module_title: 'Módulo 2 — Redação e Linguagens', started: 28, reached_50: 21, completed: 15, completion_rate_pct: 53.6, avg_watched_pct: 54.3 },
  ],
  dropoff: { lt25: 3, from25to50: 7, from50to80: 13, gte80: 19 },
  students_total: 42, lessons_total: 8, period_days: 7 as const, module_id: null,
};

export const MOCK_VIDEO_MODULES = {
  modules: [
    {
      id: '0d000001-0000-4000-8000-000000000001', title: 'Módulo 1 — Fundamentos ENEM',
      description: 'Matemática, Física e Química com foco no ENEM.', display_order: 1, is_active: true,
      lessons: [
        { id: '1e000001-0000-4000-8000-000000000001', title: 'Funções do 1º Grau',    description: null, bunny_video_id: 'tutorial-vid-01', thumbnail_url: null, duration_secs: 1847, status: 'ready' as const, display_order: 1, is_active: true },
        { id: '1e000002-0000-4000-8000-000000000002', title: 'Funções do 2º Grau',    description: null, bunny_video_id: 'tutorial-vid-02', thumbnail_url: null, duration_secs: 2103, status: 'ready' as const, display_order: 2, is_active: true },
        { id: '1e000003-0000-4000-8000-000000000003', title: 'Progressões (PA e PG)', description: null, bunny_video_id: 'tutorial-vid-03', thumbnail_url: null, duration_secs: 2410, status: 'ready' as const, display_order: 3, is_active: true },
        { id: '1e000004-0000-4000-8000-000000000004', title: 'Geometria Plana',       description: null, bunny_video_id: 'tutorial-vid-04', thumbnail_url: null, duration_secs: 1920, status: 'ready' as const, display_order: 4, is_active: true },
      ],
      progress: { total: 4, completed: 3, pct: 75 },
    },
    {
      id: '0d000002-0000-4000-8000-000000000002', title: 'Módulo 2 — Redação e Linguagens',
      description: 'Estrutura de texto, coesão e as 5 competências do ENEM.', display_order: 2, is_active: true,
      lessons: [
        { id: '1e000005-0000-4000-8000-000000000005', title: 'Estrutura da Redação ENEM', description: null, bunny_video_id: 'tutorial-vid-05', thumbnail_url: null, duration_secs: 2234, status: 'ready' as const, display_order: 1, is_active: true },
        { id: '1e000006-0000-4000-8000-000000000006', title: 'Conectivos e Coesão',       description: null, bunny_video_id: 'tutorial-vid-06', thumbnail_url: null, duration_secs: 1678, status: 'ready' as const, display_order: 2, is_active: true },
        { id: '1e000007-0000-4000-8000-000000000007', title: 'Competências I e II',       description: null, bunny_video_id: 'tutorial-vid-07', thumbnail_url: null, duration_secs: 2891, status: 'ready' as const, display_order: 3, is_active: true },
        { id: '1e000008-0000-4000-8000-000000000008', title: 'Competências III, IV e V',  description: null, bunny_video_id: 'tutorial-vid-08', thumbnail_url: null, duration_secs: 3241, status: 'ready' as const, display_order: 4, is_active: true },
      ],
      progress: { total: 4, completed: 2, pct: 50 },
    },
  ],
  has_library: true,
};

// ─── Students ──────────────────────────────────────────────────────────────────

function makeStudent(n: number, name: string, qWeek: number, lastActivity: string, planTier: string) {
  const isPremium = planTier === 'b2b_premium';
  const todayActive = lastActivity === '2026-07-25';
  const qToday = todayActive ? Math.round(qWeek * 0.14) : 0;
  const accBase = qWeek > 0 ? 55 + ((n * 7 + 13) % 24) : null;
  const email = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + '@ave.com';
  return {
    id: uid(n), full_name: name, email, avatar_url: null as null,
    plan_tier: planTier, plan_name: isPremium ? 'Plano Premium' : 'Plano Básico',
    plan_id: null as null, plan_assignment_status: 'active' as const,
    plan_last_payment_at: null as null, essay_credits_remaining: null as null,
    essay_credits_limit: null as null, essay_credits_period: null as null,
    last_activity_date: lastActivity, joined_organization_at: '2026-02-10T00:00:00',
    questions_today: qToday, questions_week: qWeek,
    questions_month: Math.round(qWeek * 3.6), questions_total: Math.round(qWeek * 17),
    simulados_today: 0, simulados_week: qWeek > 50 ? 1 : 0,
    simulados_month: qWeek > 50 ? 3 : 0, simulados_total: Math.max(0, Math.round(qWeek / 25)),
    accuracy_pct: accBase, accuracy_today: (todayActive && qToday > 0) ? accBase : null,
    accuracy_week: accBase, accuracy_month: accBase !== null ? accBase - 2 : null,
    accuracy_total: accBase !== null ? accBase - 4 : null,
    essays_today: 0, essays_week: 0, essays_month: qWeek > 80 ? 1 : 0,
    essays_total: Math.max(0, Math.round(qWeek / 100)),
  };
}

const ANA_PAULA = {
  id: uid(1), full_name: 'Ana Paula Costa', email: 'ana.paula@ave.com',
  avatar_url: null as null, plan_tier: 'b2b_premium', plan_name: 'Plano Premium',
  plan_id: null as null, plan_assignment_status: 'active' as const,
  plan_last_payment_at: null as null, essay_credits_remaining: null as null,
  essay_credits_limit: null as null, essay_credits_period: null as null,
  last_activity_date: '2026-07-25', joined_organization_at: '2026-02-10T00:00:00',
  questions_today: 47, questions_week: 312, questions_month: 1089, questions_total: 4832,
  simulados_today: 0, simulados_week: 4, simulados_month: 14, simulados_total: 51,
  accuracy_pct: 78, accuracy_today: 81, accuracy_week: 78, accuracy_month: 76, accuracy_total: 74,
  essays_today: 0, essays_week: 3, essays_month: 9, essays_total: 31,
};

const LUCAS = {
  id: uid(2), full_name: 'Lucas Ferreira', email: 'lucas.ferreira@ave.com',
  avatar_url: null as null, plan_tier: 'b2b_premium', plan_name: 'Plano Premium',
  plan_id: null as null, plan_assignment_status: 'active' as const,
  plan_last_payment_at: null as null, essay_credits_remaining: null as null,
  essay_credits_limit: null as null, essay_credits_period: null as null,
  last_activity_date: '2026-07-25', joined_organization_at: '2026-02-10T00:00:00',
  questions_today: 31, questions_week: 187, questions_month: 623, questions_total: 2341,
  simulados_today: 0, simulados_week: 2, simulados_month: 7, simulados_total: 24,
  accuracy_pct: 62, accuracy_today: 65, accuracy_week: 62, accuracy_month: 60, accuracy_total: 58,
  essays_today: 0, essays_week: 1, essays_month: 3, essays_total: 11,
};

const BRUNO = {
  id: uid(3), full_name: 'Bruno Mendes', email: 'bruno.mendes@ave.com',
  avatar_url: null as null, plan_tier: 'b2b_basico', plan_name: 'Plano Básico',
  plan_id: null as null, plan_assignment_status: 'active' as const,
  plan_last_payment_at: null as null, essay_credits_remaining: null as null,
  essay_credits_limit: null as null, essay_credits_period: null as null,
  last_activity_date: '2026-07-22', joined_organization_at: '2026-03-01T00:00:00',
  questions_today: 0, questions_week: 43, questions_month: 121, questions_total: 387,
  simulados_today: 0, simulados_week: 0, simulados_month: 2, simulados_total: 7,
  accuracy_pct: 51, accuracy_today: null, accuracy_week: 51, accuracy_month: 53, accuracy_total: 52,
  essays_today: 0, essays_week: 0, essays_month: 0, essays_total: 2,
};

export const MOCK_STUDENTS = [
  ANA_PAULA, LUCAS, BRUNO,
  ...([
    ['Gabriela Alves',    94,  '2026-07-25', 'b2b_premium'],
    ['Rafael Santos',    108,  '2026-07-24', 'b2b_premium'],
    ['Isabela Lima',      87,  '2026-07-25', 'b2b_premium'],
    ['Pedro Rodrigues',   72,  '2026-07-24', 'b2b_basico'],
    ['Camila Pereira',   119,  '2026-07-23', 'b2b_premium'],
    ['Mateus Souza',      63,  '2026-07-25', 'b2b_basico'],
    ['Juliana Oliveira',  48,  '2026-07-24', 'b2b_basico'],
    ['Thiago Costa',      55,  '2026-07-22', 'b2b_premium'],
    ['Leticia Ferreira',  41,  '2026-07-25', 'b2b_basico'],
    ['Diego Carvalho',    78,  '2026-07-23', 'b2b_premium'],
    ['Beatriz Martins',   32,  '2026-07-24', 'b2b_premium'],
    ['Henrique Araujo',   67,  '2026-07-21', 'b2b_premium'],
    ['Fernanda Ribeiro',  51,  '2026-07-25', 'b2b_basico'],
    ['Victor Gomes',      44,  '2026-07-23', 'b2b_premium'],
    ['Amanda Silva',      29,  '2026-07-22', 'b2b_basico'],
    ['Leonardo Nunes',    83,  '2026-07-24', 'b2b_premium'],
    ['Priscila Barbosa',  37,  '2026-07-25', 'b2b_premium'],
    ['Rodrigo Cardoso',   61,  '2026-07-20', 'b2b_basico'],
    ['Mariana Rocha',     45,  '2026-07-24', 'b2b_premium'],
    ['Felipe Nascimento', 58,  '2026-07-23', 'b2b_premium'],
    ['Natalia Correia',   22,  '2026-07-21', 'b2b_basico'],
    ['Eduardo Moreira',   74,  '2026-07-25', 'b2b_premium'],
    ['Renata Dias',       39,  '2026-07-22', 'b2b_premium'],
    ['Gustavo Teixeira',  91,  '2026-07-24', 'b2b_premium'],
    ['Carla Freitas',     26,  '2026-07-18', 'b2b_basico'],
    ['João Melo',         54,  '2026-07-23', 'b2b_basico'],
    ['Ligia Castro',      17,  '2026-07-20', 'b2b_trial'],
    ['Samuel Xavier',     66,  '2026-07-25', 'b2b_premium'],
    ['Milena Macedo',     49,  '2026-07-24', 'b2b_premium'],
    ['Caio Pinto',        33,  '2026-07-22', 'b2b_basico'],
    ['Larissa Borges',    57,  '2026-07-23', 'b2b_premium'],
    ['Vinicius Monteiro', 42,  '2026-07-19', 'b2b_basico'],
    ['Débora Lima',        8,  '2026-07-15', 'b2b_trial'],
    ['Thales Queiroz',    71,  '2026-07-24', 'b2b_premium'],
    ['Stephany Azevedo',  36,  '2026-07-25', 'b2b_basico'],
    ['Igor Campos',        0,  '2026-07-08', 'b2b_trial'],
    ['Talita Fonseca',    23,  '2026-07-21', 'b2b_basico'],
    ['Murilo Guimarães',   0,  '2026-06-30', 'b2b_trial'],
    ['Carolina Vieira',   47,  '2026-07-24', 'b2b_premium'],
  ] as const).map(([name, qWeek, lastActivity, planTier], i) =>
    makeStudent(i + 4, name as string, qWeek as number, lastActivity as string, planTier as string)
  ),
];

// ─── Student detail pages (3 alunos detalhados) ────────────────────────────────

export const MOCK_STUDENT_DETAILS: Record<string, unknown> = {
  [uid(1)]: {
    profile: {
      id: uid(1), full_name: 'Ana Paula Costa', email: 'ana.paula@ave.com',
      plan_tier: 'b2b_premium', plan_name: 'Plano Premium', plan_assignment_status: 'active',
      plan_last_payment_at: null, last_activity_date: '2026-07-25',
      joined_organization_at: '2026-02-10T00:00:00', avatar_url: null,
      focus_area: 'Ciências Humanas', study_pace: 'intense', hours_per_day: 4, days_per_week: 6, current_streak: 12,
    },
    metrics: { questions_today: 47, questions_week: 312, questions_month: 1089, questions_total: 4832, simulados_month: 14, simulados_total: 51, accuracy_pct: 78 },
    subject_breakdown: [
      { subject: 'Inglês',     total: 89,  correct: 72, accuracy_pct: 80.9 },
      { subject: 'Biologia',   total: 134, correct: 101, accuracy_pct: 75.4 },
      { subject: 'História',   total: 98,  correct: 74, accuracy_pct: 75.5 },
      { subject: 'Português',  total: 112, correct: 83, accuracy_pct: 74.1 },
      { subject: 'Química',    total: 87,  correct: 58, accuracy_pct: 66.7 },
      { subject: 'Física',     total: 76,  correct: 47, accuracy_pct: 61.8 },
      { subject: 'Matemática', total: 143, correct: 81, accuracy_pct: 56.6 },
    ],
    weekly_evolution: [
      { week_start: '2026-06-30', total: 267, accuracy_pct: 71.2 },
      { week_start: '2026-07-07', total: 289, accuracy_pct: 73.8 },
      { week_start: '2026-07-14', total: 301, accuracy_pct: 75.4 },
      { week_start: '2026-07-21', total: 312, accuracy_pct: 78.1 },
    ],
    daily_evolution: [
      { date: '2026-07-19', total: 40, accuracy_pct: 75.0 }, { date: '2026-07-20', total: 48, accuracy_pct: 77.1 },
      { date: '2026-07-21', total: 45, accuracy_pct: 77.8 }, { date: '2026-07-22', total: 52, accuracy_pct: 78.8 },
      { date: '2026-07-23', total: 50, accuracy_pct: 78.0 }, { date: '2026-07-24', total: 56, accuracy_pct: 80.4 },
      { date: '2026-07-25', total: 21, accuracy_pct: 81.0 },
    ],
    recent_answers: [
      { id: 'ra000001-0000-4000-8000-000000000001', question_id: 'q01', selected_option: 'A', is_correct: true,  subject: 'Biologia',   created_at: '2026-07-25T10:15:00' },
      { id: 'ra000001-0000-4000-8000-000000000002', question_id: 'q02', selected_option: 'C', is_correct: true,  subject: 'Inglês',     created_at: '2026-07-25T10:12:00' },
      { id: 'ra000001-0000-4000-8000-000000000003', question_id: 'q03', selected_option: 'B', is_correct: false, subject: 'Matemática', created_at: '2026-07-25T10:08:00' },
      { id: 'ra000001-0000-4000-8000-000000000004', question_id: 'q04', selected_option: 'D', is_correct: true,  subject: 'História',   created_at: '2026-07-25T10:05:00' },
      { id: 'ra000001-0000-4000-8000-000000000005', question_id: 'q05', selected_option: 'A', is_correct: true,  subject: 'Biologia',   created_at: '2026-07-25T10:01:00' },
    ],
    recent_simulados: [
      { id: '5a000001-0000-4000-8000-000000000001', config: { format: 'humanas',  bank: 'ENEM', qty: 45 }, score: 39, total_questions: 45, tri_score: 680.2, time_taken_secs: 4320, completed_at: '2026-07-22T15:30:00' },
      { id: '5a000002-0000-4000-8000-000000000002', config: { format: 'natureza', bank: 'ENEM', qty: 45 }, score: 31, total_questions: 45, tri_score: 641.8, time_taken_secs: 5100, completed_at: '2026-07-19T16:00:00' },
    ],
    essay_stats: { delivered_count: 31, corrected_count: 29, avg_score: 768, best_score: 820, trend: 'up', trend_delta: 24 },
    essay_evolution: [
      { id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', total_score: 760, average_score: null },
      { id: 'ea000002-0000-4000-8000-000000000002', status: 'corrected', submitted_at: '2026-07-14T09:00:00', corrected_at: '2026-07-15T11:30:00', total_score: 740, average_score: null },
      { id: 'ea000003-0000-4000-8000-000000000003', status: 'corrected', submitted_at: '2026-07-07T10:00:00', corrected_at: '2026-07-08T14:00:00', total_score: 720, average_score: null },
    ],
    essay_competency_avgs: [
      { competency: 1, avg: 160, count: 29 }, { competency: 2, avg: 172, count: 29 },
      { competency: 3, avg: 144, count: 29 }, { competency: 4, avg: 152, count: 29 }, { competency: 5, avg: 140, count: 29 },
    ],
  },
  [uid(2)]: {
    profile: {
      id: uid(2), full_name: 'Lucas Ferreira', email: 'lucas.ferreira@ave.com',
      plan_tier: 'b2b_premium', plan_name: 'Plano Premium', plan_assignment_status: 'active',
      plan_last_payment_at: null, last_activity_date: '2026-07-25',
      joined_organization_at: '2026-02-10T00:00:00', avatar_url: null,
      focus_area: null, study_pace: 'moderate', hours_per_day: 2, days_per_week: 5, current_streak: 5,
    },
    metrics: { questions_today: 31, questions_week: 187, questions_month: 623, questions_total: 2341, simulados_month: 7, simulados_total: 24, accuracy_pct: 62 },
    subject_breakdown: [
      { subject: 'Inglês',     total: 54, correct: 37, accuracy_pct: 68.5 },
      { subject: 'Biologia',   total: 78, correct: 51, accuracy_pct: 65.4 },
      { subject: 'Português',  total: 91, correct: 57, accuracy_pct: 62.6 },
      { subject: 'História',   total: 67, correct: 41, accuracy_pct: 61.2 },
      { subject: 'Química',    total: 58, correct: 34, accuracy_pct: 58.6 },
      { subject: 'Física',     total: 49, correct: 27, accuracy_pct: 55.1 },
      { subject: 'Matemática', total: 89, correct: 47, accuracy_pct: 52.8 },
    ],
    weekly_evolution: [
      { week_start: '2026-06-30', total: 148, accuracy_pct: 56.1 }, { week_start: '2026-07-07', total: 163, accuracy_pct: 58.3 },
      { week_start: '2026-07-14', total: 172, accuracy_pct: 60.5 }, { week_start: '2026-07-21', total: 187, accuracy_pct: 62.0 },
    ],
    daily_evolution: [
      { date: '2026-07-19', total: 24, accuracy_pct: 58.3 }, { date: '2026-07-20', total: 29, accuracy_pct: 60.7 },
      { date: '2026-07-21', total: 27, accuracy_pct: 59.3 }, { date: '2026-07-22', total: 32, accuracy_pct: 62.5 },
      { date: '2026-07-23', total: 31, accuracy_pct: 64.5 }, { date: '2026-07-24', total: 33, accuracy_pct: 63.6 },
      { date: '2026-07-25', total: 11, accuracy_pct: 65.0 },
    ],
    recent_answers: [
      { id: 'rb000001-0000-4000-8000-000000000001', question_id: 'q11', selected_option: 'B', is_correct: true,  subject: 'Inglês',     created_at: '2026-07-25T09:45:00' },
      { id: 'rb000001-0000-4000-8000-000000000002', question_id: 'q12', selected_option: 'D', is_correct: false, subject: 'Matemática', created_at: '2026-07-25T09:42:00' },
      { id: 'rb000001-0000-4000-8000-000000000003', question_id: 'q13', selected_option: 'A', is_correct: true,  subject: 'Biologia',   created_at: '2026-07-25T09:39:00' },
    ],
    recent_simulados: [
      { id: '5a000003-0000-4000-8000-000000000003', config: { format: 'linguagens', bank: 'ENEM', qty: 45 }, score: 28, total_questions: 45, tri_score: 602.4, time_taken_secs: 5400, completed_at: '2026-07-21T17:00:00' },
    ],
    essay_stats: { delivered_count: 11, corrected_count: 10, avg_score: 692, best_score: 740, trend: 'up', trend_delta: 12 },
    essay_evolution: [
      { id: 'eb000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-21T14:00:00', corrected_at: '2026-07-22T10:00:00', total_score: 700, average_score: null },
    ],
    essay_competency_avgs: [
      { competency: 1, avg: 148, count: 10 }, { competency: 2, avg: 152, count: 10 },
      { competency: 3, avg: 132, count: 10 }, { competency: 4, avg: 140, count: 10 }, { competency: 5, avg: 120, count: 10 },
    ],
  },
  [uid(3)]: {
    profile: {
      id: uid(3), full_name: 'Bruno Mendes', email: 'bruno.mendes@ave.com',
      plan_tier: 'b2b_basico', plan_name: 'Plano Básico', plan_assignment_status: 'active',
      plan_last_payment_at: null, last_activity_date: '2026-07-22',
      joined_organization_at: '2026-03-01T00:00:00', avatar_url: null,
      focus_area: null, study_pace: 'slow', hours_per_day: 1, days_per_week: 3, current_streak: 0,
    },
    metrics: { questions_today: 0, questions_week: 43, questions_month: 121, questions_total: 387, simulados_month: 2, simulados_total: 7, accuracy_pct: 51 },
    subject_breakdown: [
      { subject: 'Português',  total: 89, correct: 48, accuracy_pct: 53.9 },
      { subject: 'Matemática', total: 67, correct: 32, accuracy_pct: 47.8 },
      { subject: 'Biologia',   total: 54, correct: 29, accuracy_pct: 53.7 },
      { subject: 'História',   total: 41, correct: 22, accuracy_pct: 53.7 },
      { subject: 'Química',    total: 36, correct: 17, accuracy_pct: 47.2 },
    ],
    weekly_evolution: [
      { week_start: '2026-06-30', total: 61, accuracy_pct: 50.8 }, { week_start: '2026-07-07', total: 58, accuracy_pct: 52.1 },
      { week_start: '2026-07-14', total: 49, accuracy_pct: 51.0 }, { week_start: '2026-07-21', total: 43, accuracy_pct: 50.5 },
    ],
    daily_evolution: [
      { date: '2026-07-19', total: 14, accuracy_pct: 50.0 }, { date: '2026-07-20', total: 11, accuracy_pct: 54.5 },
      { date: '2026-07-21', total: 9,  accuracy_pct: 44.4 }, { date: '2026-07-22', total: 9,  accuracy_pct: 55.6 },
    ],
    recent_answers: [
      { id: 'rc000001-0000-4000-8000-000000000001', question_id: 'q21', selected_option: 'B', is_correct: false, subject: 'Matemática', created_at: '2026-07-22T16:20:00' },
      { id: 'rc000001-0000-4000-8000-000000000002', question_id: 'q22', selected_option: 'A', is_correct: true,  subject: 'Português',  created_at: '2026-07-22T16:17:00' },
      { id: 'rc000001-0000-4000-8000-000000000003', question_id: 'q23', selected_option: 'C', is_correct: false, subject: 'Química',    created_at: '2026-07-22T16:14:00' },
    ],
    recent_simulados: [
      { id: '5a000004-0000-4000-8000-000000000004', config: { format: 'custom', bank: 'ENEM', qty: 20 }, score: 9, total_questions: 20, tri_score: null, time_taken_secs: 2400, completed_at: '2026-07-15T11:00:00' },
    ],
    essay_stats: { delivered_count: 2, corrected_count: 2, avg_score: 560, best_score: 580, trend: 'down', trend_delta: -20 },
    essay_evolution: [
      { id: 'ec000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-10T09:00:00', corrected_at: '2026-07-11T14:00:00', total_score: 580, average_score: null },
      { id: 'ec000002-0000-4000-8000-000000000002', status: 'corrected', submitted_at: '2026-06-25T10:00:00', corrected_at: '2026-06-26T11:00:00', total_score: 540, average_score: null },
    ],
    essay_competency_avgs: [
      { competency: 1, avg: 120, count: 2 }, { competency: 2, avg: 116, count: 2 },
      { competency: 3, avg: 108, count: 2 }, { competency: 4, avg: 112, count: 2 }, { competency: 5, avg: 104, count: 2 },
    ],
  },
};

// Essay lists for student profile pages (filtradas por student_id)
export const MOCK_STUDENT_ESSAYS: Record<string, unknown[]> = {
  [uid(1)]: [
    { id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', total_score: 760, average_score: null, theme: 'A importância da empatia na sociedade contemporânea', student: [{ id: uid(1) }], student_id: uid(1) },
    { id: 'ea000002-0000-4000-8000-000000000002', status: 'corrected', submitted_at: '2026-07-14T09:00:00', corrected_at: '2026-07-15T11:30:00', total_score: 740, average_score: null, theme: 'Desigualdade social no Brasil', student: [{ id: uid(1) }], student_id: uid(1) },
    { id: 'ea000003-0000-4000-8000-000000000003', status: 'corrected', submitted_at: '2026-07-07T10:00:00', corrected_at: '2026-07-08T14:00:00', total_score: 720, average_score: null, theme: 'O papel da educação na democracia', student: [{ id: uid(1) }], student_id: uid(1) },
  ],
  [uid(2)]: [
    { id: 'eb000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-21T14:00:00', corrected_at: '2026-07-22T10:00:00', total_score: 700, average_score: null, theme: 'Violência nas escolas brasileiras', student: [{ id: uid(2) }], student_id: uid(2) },
  ],
  [uid(3)]: [
    { id: 'ec000001-0000-4000-8000-000000000001', status: 'corrected', submitted_at: '2026-07-10T09:00:00', corrected_at: '2026-07-11T14:00:00', total_score: 580, average_score: null, theme: 'Combate à desinformação digital', student: [{ id: uid(3) }], student_id: uid(3) },
    { id: 'ec000002-0000-4000-8000-000000000002', status: 'corrected', submitted_at: '2026-06-25T10:00:00', corrected_at: '2026-06-26T11:00:00', total_score: 540, average_score: null, theme: 'Saúde mental na adolescência', student: [{ id: uid(3) }], student_id: uid(3) },
  ],
};

// ─── Simulados ─────────────────────────────────────────────────────────────────

export const MOCK_SIMULADOS = [
  {
    id: '5a000010-0000-4000-8000-000000000010',
    title: 'ENEM Simulado I',
    config: { format: 'dia1', bank: 'ENEM', subject: null, difficulty: 'misto', qty: 90, time_limit_secs: 18000, allow_retry: false, same_for_all_students: true },
    starts_at: '2026-07-14T08:00:00.000Z',
    ends_at: '2026-07-14T23:59:00.000Z',
    status: 'ended' as const,
    created_at: '2026-07-10T10:00:00.000Z',
    modality: 'online' as const,
    metrics: { total_sessions: 40, completed_sessions: 37, unique_students: 38, avg_score_pct: 64.2, best_score_pct: 89.1, worst_score_pct: 31.2 },
  },
  {
    id: '5a000011-0000-4000-8000-000000000011',
    title: 'Simulado Ciências da Natureza',
    config: { format: 'natureza', bank: 'ENEM', subject: null, difficulty: 'misto', qty: 45, time_limit_secs: 9000, allow_retry: false, same_for_all_students: true },
    starts_at: '2026-07-07T08:00:00.000Z',
    ends_at: '2026-07-07T23:59:00.000Z',
    status: 'ended' as const,
    created_at: '2026-07-03T10:00:00.000Z',
    modality: 'online' as const,
    metrics: { total_sessions: 31, completed_sessions: 28, unique_students: 29, avg_score_pct: 58.4, best_score_pct: 82.2, worst_score_pct: 24.4 },
  },
  {
    id: '5a000012-0000-4000-8000-000000000012',
    title: 'Simulado Setembro — Geral',
    config: { format: 'completo', bank: 'ENEM', subject: null, difficulty: 'misto', qty: 180, time_limit_secs: 36000, allow_retry: false, same_for_all_students: true },
    starts_at: '2026-09-06T08:00:00.000Z',
    ends_at: null,
    status: 'scheduled' as const,
    created_at: '2026-07-20T10:00:00.000Z',
    modality: 'online' as const,
    metrics: { total_sessions: 0, completed_sessions: 0, unique_students: 0, avg_score_pct: null, best_score_pct: null, worst_score_pct: null },
  },
];

// ─── Simulado I — Ranking & Analytics ─────────────────────────────────────────

const SIM1_ID = '5a000010-0000-4000-8000-000000000010';

export const MOCK_SIMULADO_RANKINGS: Record<string, unknown[]> = {
  [SIM1_ID]: [
    { position:  1, student_id: uid(1),  full_name: 'Ana Paula Costa',   avatar_url: null, score: 80, total_questions: 90, score_pct: 88.9, tri_score: 712.4, time_taken_secs: 14200 },
    { position:  2, student_id: uid(8),  full_name: 'Camila Pereira',    avatar_url: null, score: 75, total_questions: 90, score_pct: 83.3, tri_score: 685.3, time_taken_secs: 15800 },
    { position:  3, student_id: uid(4),  full_name: 'Gabriela Alves',    avatar_url: null, score: 72, total_questions: 90, score_pct: 80.0, tri_score: 671.8, time_taken_secs: 16200 },
    { position:  4, student_id: uid(27), full_name: 'Gustavo Teixeira',  avatar_url: null, score: 68, total_questions: 90, score_pct: 75.6, tri_score: 652.1, time_taken_secs: 17100 },
    { position:  5, student_id: uid(5),  full_name: 'Rafael Santos',     avatar_url: null, score: 67, total_questions: 90, score_pct: 74.4, tri_score: 648.7, time_taken_secs: 15400 },
    { position:  6, student_id: uid(6),  full_name: 'Isabela Lima',      avatar_url: null, score: 65, total_questions: 90, score_pct: 72.2, tri_score: 638.2, time_taken_secs: 16800 },
    { position:  7, student_id: uid(13), full_name: 'Diego Carvalho',    avatar_url: null, score: 62, total_questions: 90, score_pct: 68.9, tri_score: 622.4, time_taken_secs: 18200 },
    { position:  8, student_id: uid(31), full_name: 'Samuel Xavier',     avatar_url: null, score: 61, total_questions: 90, score_pct: 67.8, tri_score: 617.9, time_taken_secs: 17600 },
    { position:  9, student_id: uid(22), full_name: 'Mariana Rocha',     avatar_url: null, score: 60, total_questions: 90, score_pct: 66.7, tri_score: 612.3, time_taken_secs: 18900 },
    { position: 10, student_id: uid(19), full_name: 'Leonardo Nunes',    avatar_url: null, score: 58, total_questions: 90, score_pct: 64.4, tri_score: 601.8, time_taken_secs: 17400 },
    { position: 11, student_id: uid(2),  full_name: 'Lucas Ferreira',    avatar_url: null, score: 57, total_questions: 90, score_pct: 63.3, tri_score: 596.5, time_taken_secs: 18600 },
    { position: 12, student_id: uid(11), full_name: 'Thiago Costa',      avatar_url: null, score: 55, total_questions: 90, score_pct: 61.1, tri_score: 585.1, time_taken_secs: 19200 },
    { position: 13, student_id: uid(23), full_name: 'Felipe Nascimento',  avatar_url: null, score: 54, total_questions: 90, score_pct: 60.0, tri_score: 578.4, time_taken_secs: 18800 },
    { position: 14, student_id: uid(25), full_name: 'Eduardo Moreira',   avatar_url: null, score: 52, total_questions: 90, score_pct: 57.8, tri_score: 568.3, time_taken_secs: 17900 },
    { position: 15, student_id: uid(16), full_name: 'Fernanda Ribeiro',  avatar_url: null, score: 50, total_questions: 90, score_pct: 55.6, tri_score: 555.7, time_taken_secs: 20100 },
    { position: 16, student_id: uid(7),  full_name: 'Pedro Rodrigues',   avatar_url: null, score: 48, total_questions: 90, score_pct: 53.3, tri_score: 544.2, time_taken_secs: 19600 },
    { position: 17, student_id: uid(34), full_name: 'Larissa Borges',    avatar_url: null, score: 46, total_questions: 90, score_pct: 51.1, tri_score: 532.8, time_taken_secs: 21200 },
    { position: 18, student_id: uid(9),  full_name: 'Mateus Souza',      avatar_url: null, score: 42, total_questions: 90, score_pct: 46.7, tri_score: 512.4, time_taken_secs: 20800 },
    { position: 19, student_id: uid(3),  full_name: 'Bruno Mendes',      avatar_url: null, score: 38, total_questions: 90, score_pct: 42.2, tri_score: 490.1, time_taken_secs: 22400 },
    { position: 20, student_id: uid(10), full_name: 'Juliana Oliveira',  avatar_url: null, score: 28, total_questions: 90, score_pct: 31.2, tri_score: 451.3, time_taken_secs: 23100 },
  ],
};

export const MOCK_SIMULADO_ANALYTICS: Record<string, unknown> = {
  [SIM1_ID]: {
    weighted_applied: false,
    kpis: {
      participants: 38,
      sessions_total: 40,
      completion_rate_pct: 92.5,
      avg_score_pct: 64.2,
      median_score_pct: 63.3,
      best_score_pct: 88.9,
      worst_score_pct: 31.2,
    },
    students: [
      { position:  1, student_id: uid(1),  full_name: 'Ana Paula Costa',  avatar_url: null, score: 80, total_questions: 90, score_pct: 88.9, time_taken_secs: 14200, completed_at: '2026-07-14T18:03:20Z', best_subject: { name: 'Língua Portuguesa', correct: 19, total: 20, pct: 95.0 }, worst_subject: { name: 'Filosofia', correct: 7, total: 11, pct: 63.6 } },
      { position:  2, student_id: uid(8),  full_name: 'Camila Pereira',   avatar_url: null, score: 75, total_questions: 90, score_pct: 83.3, time_taken_secs: 15800, completed_at: '2026-07-14T18:23:20Z', best_subject: { name: 'Geografia', correct: 10, total: 11, pct: 90.9 }, worst_subject: { name: 'Filosofia', correct: 6, total: 11, pct: 54.5 } },
      { position:  3, student_id: uid(4),  full_name: 'Gabriela Alves',   avatar_url: null, score: 72, total_questions: 90, score_pct: 80.0, time_taken_secs: 16200, completed_at: '2026-07-14T18:30:00Z', best_subject: { name: 'Inglês', correct: 5, total: 5,  pct: 100.0 }, worst_subject: { name: 'Sociologia', correct: 5, total: 10, pct: 50.0 } },
      { position:  4, student_id: uid(27), full_name: 'Gustavo Teixeira', avatar_url: null, score: 68, total_questions: 90, score_pct: 75.6, time_taken_secs: 17100, completed_at: '2026-07-14T18:45:00Z', best_subject: { name: 'Inglês', correct: 5, total: 5,  pct: 100.0 }, worst_subject: { name: 'Sociologia', correct: 4, total: 10, pct: 40.0 } },
      { position:  5, student_id: uid(5),  full_name: 'Rafael Santos',    avatar_url: null, score: 67, total_questions: 90, score_pct: 74.4, time_taken_secs: 15400, completed_at: '2026-07-14T18:16:40Z', best_subject: { name: 'Língua Portuguesa', correct: 16, total: 20, pct: 80.0 }, worst_subject: { name: 'Artes', correct: 2, total: 5,  pct: 40.0 } },
      { position:  6, student_id: uid(6),  full_name: 'Isabela Lima',     avatar_url: null, score: 65, total_questions: 90, score_pct: 72.2, time_taken_secs: 16800, completed_at: '2026-07-14T18:40:00Z', best_subject: { name: 'História', correct: 9, total: 11, pct: 81.8 }, worst_subject: { name: 'Artes', correct: 2, total: 5,  pct: 40.0 } },
      { position:  7, student_id: uid(13), full_name: 'Diego Carvalho',   avatar_url: null, score: 62, total_questions: 90, score_pct: 68.9, time_taken_secs: 18200, completed_at: '2026-07-14T19:03:20Z', best_subject: { name: 'Inglês', correct: 4, total: 5,  pct: 80.0 }, worst_subject: { name: 'Filosofia', correct: 5, total: 11, pct: 45.5 } },
      { position:  8, student_id: uid(31), full_name: 'Samuel Xavier',    avatar_url: null, score: 61, total_questions: 90, score_pct: 67.8, time_taken_secs: 17600, completed_at: '2026-07-14T18:53:20Z', best_subject: { name: 'Língua Portuguesa', correct: 15, total: 20, pct: 75.0 }, worst_subject: { name: 'Sociologia', correct: 4, total: 10, pct: 40.0 } },
      { position:  9, student_id: uid(22), full_name: 'Mariana Rocha',    avatar_url: null, score: 60, total_questions: 90, score_pct: 66.7, time_taken_secs: 18900, completed_at: '2026-07-14T19:15:00Z', best_subject: { name: 'Geografia', correct: 9, total: 11, pct: 81.8 }, worst_subject: { name: 'Filosofia', correct: 5, total: 11, pct: 45.5 } },
      { position: 10, student_id: uid(2),  full_name: 'Lucas Ferreira',   avatar_url: null, score: 57, total_questions: 90, score_pct: 63.3, time_taken_secs: 18600, completed_at: '2026-07-14T19:10:00Z', best_subject: { name: 'Inglês', correct: 4, total: 5,  pct: 80.0 }, worst_subject: { name: 'Filosofia', correct: 4, total: 11, pct: 36.4 } },
    ],
    question_distribution: [
      {
        question_id: 'qd100001-0000-4000-8000-000000000001', position: 1,
        subject: 'Língua Portuguesa', discipline: 'Língua Portuguesa', difficulty: 'medio',
        context: 'Leia o trecho a seguir, extraído de conto contemporâneo brasileiro.',
        statement: 'A linguagem utilizada pelo narrador no trecho pode ser classificada predominantemente como:',
        alternatives: [
          { letter: 'A', text: 'formal e erudita, marcada pelo uso de arcaísmos e inversões sintáticas.' },
          { letter: 'B', text: 'coloquial e regional, com traços dialetais do sertão nordestino.' },
          { letter: 'C', text: 'técnica e objetiva, sem elementos de subjetividade.' },
          { letter: 'D', text: 'poética e metafórica, com predominância de figuras de linguagem.' },
          { letter: 'E', text: 'jornalística e impessoal, seguindo o padrão da norma culta escrita.' },
        ],
        images: [], correct_option: 'D',
        attempts: 38, correct_count: 29, omitted_count: 0, omission_pct: 0,
        avg_time_secs: 112, accuracy_pct: 76.3,
        option_distribution: { A: 2, B: 3, C: 1, D: 29, E: 3 },
      },
      {
        question_id: 'qd100002-0000-4000-8000-000000000002', position: 12,
        subject: 'Inglês', discipline: 'Língua Estrangeira', difficulty: 'facil',
        context: 'Read the following excerpt from a scientific article about artificial intelligence.',
        statement: 'According to the text, the main challenge of AI development is:',
        alternatives: [
          { letter: 'A', text: 'the high cost of hardware and infrastructure.' },
          { letter: 'B', text: 'ensuring that systems act ethically and transparently.' },
          { letter: 'C', text: 'finding enough data to train neural networks.' },
          { letter: 'D', text: 'replacing human labor in manufacturing industries.' },
          { letter: 'E', text: 'developing faster programming languages.' },
        ],
        images: [], correct_option: 'B',
        attempts: 38, correct_count: 32, omitted_count: 0, omission_pct: 0,
        avg_time_secs: 95, accuracy_pct: 84.2,
        option_distribution: { A: 2, B: 32, C: 1, D: 2, E: 1 },
      },
      {
        question_id: 'qd100003-0000-4000-8000-000000000003', position: 28,
        subject: 'Artes', discipline: 'Arte e Cultura', difficulty: 'dificil',
        context: 'Analise a obra "O Mestiço" de Cândido Portinari, produzida em 1934.',
        statement: 'A representação do trabalhador rural na tela de Portinari dialoga com qual movimento artístico brasileiro?',
        alternatives: [
          { letter: 'A', text: 'Neoclassicismo acadêmico, influenciado pelos modelos europeus do século XIX.' },
          { letter: 'B', text: 'Arte concreta, com ênfase na geometria e na abstração das formas.' },
          { letter: 'C', text: 'Modernismo social, comprometido com a identidade e as mazelas do povo brasileiro.' },
          { letter: 'D', text: 'Impressionismo, com foco na captação da luz e das sensações imediatas.' },
          { letter: 'E', text: 'Surrealismo, explorando o inconsciente e imagens oníricas.' },
        ],
        images: [], correct_option: 'C',
        attempts: 37, correct_count: 19, omitted_count: 1, omission_pct: 2.6,
        avg_time_secs: 148, accuracy_pct: 51.4,
        option_distribution: { A: 8, B: 3, C: 19, D: 5, E: 2 },
      },
      {
        question_id: 'qd100004-0000-4000-8000-000000000004', position: 51,
        subject: 'História', discipline: 'História do Brasil', difficulty: 'medio',
        context: 'Considere o contexto da Proclamação da República brasileira em 1889.',
        statement: 'A transição do regime monárquico para o republicano no Brasil foi marcada principalmente por:',
        alternatives: [
          { letter: 'A', text: 'uma revolução popular liderada por operários e camponeses insatisfeitos com a monarquia.' },
          { letter: 'B', text: 'um golpe militar articulado por setores do Exército insatisfeitos e apoiados pela elite cafeeira.' },
          { letter: 'C', text: 'uma crise diplomática com Portugal que forçou a abdicação de Dom Pedro II.' },
          { letter: 'D', text: 'um plebiscito nacional no qual a maioria da população optou pelo regime republicano.' },
          { letter: 'E', text: 'pressões externas de potências europeias contrárias ao regime escravocrata imperial.' },
        ],
        images: [], correct_option: 'B',
        attempts: 38, correct_count: 25, omitted_count: 0, omission_pct: 0,
        avg_time_secs: 130, accuracy_pct: 65.8,
        option_distribution: { A: 5, B: 25, C: 3, D: 2, E: 3 },
      },
      {
        question_id: 'qd100005-0000-4000-8000-000000000005', position: 78,
        subject: 'Filosofia', discipline: 'Filosofia', difficulty: 'dificil',
        context: 'Leia o seguinte fragmento de "A República" de Platão, no qual Sócrates discute a natureza da justiça.',
        statement: 'Para Platão, a justiça na cidade-Estado (pólis) é alcançada quando:',
        alternatives: [
          { letter: 'A', text: 'todos os cidadãos participam igualmente das decisões políticas por meio da democracia direta.' },
          { letter: 'B', text: 'as leis são elaboradas pelo povo e seguidas por todos sem distinção de classe.' },
          { letter: 'C', text: 'cada classe social exerce a função que lhe é naturalmente adequada, sem interferir nas demais.' },
          { letter: 'D', text: 'a propriedade privada é abolida e os bens são distribuídos igualmente entre os cidadãos.' },
          { letter: 'E', text: 'o Estado garante liberdade irrestrita a todos os indivíduos, sem hierarquias.' },
        ],
        images: [], correct_option: 'C',
        attempts: 37, correct_count: 16, omitted_count: 1, omission_pct: 2.6,
        avg_time_secs: 162, accuracy_pct: 43.2,
        option_distribution: { A: 9, B: 4, C: 16, D: 5, E: 3 },
      },
    ],
  },
};

// ─── Essays overview ────────────────────────────────────────────────────────────

const ESSAY_TEXT_ANA = `A empatia, enquanto capacidade de compreender e compartilhar sentimentos alheios, constitui pilar fundamental para o tecido social contemporâneo. Numa era marcada pela fragmentação digital e pelo individualismo crescente, a ausência dessa habilidade produz consequências nefastas ao convívio coletivo.

Em primeiro lugar, cabe analisar como a cultura da virtualidade compromete os vínculos empáticos. A mediação tecnológica reduz as interações humanas a fragmentos textuais, desprovidos das nuances emotivas presenciais. Nesse contexto, estudos da Universidade de Michigan revelam queda de 40% nos indicadores de empatia entre jovens universitários nas últimas décadas — reflexo de uma socialização crescentemente superficial.

Ademais, sob perspectiva histórica, sociedades que negligenciam a empatia tendem à intolerância sistêmica. O filósofo Richard Rorty demonstrou que comunidades empáticas constroem redes de solidariedade mais resilientes, capazes de enfrentar crises coletivas com maior coesão e menor fragmentação.

Portanto, o Estado e a sociedade civil devem promover a educação socioemocional desde a infância, integrando práticas de escuta ativa ao currículo nacional. Simultaneamente, plataformas digitais têm a responsabilidade de redesenhar seus algoritmos para ampliar, em vez de restringir, a exposição a perspectivas diversas. Tais medidas, articuladas, são fundamentais para restituir à empatia seu papel estruturante na vida em sociedade.`;

export const MOCK_ESSAYS_OVERVIEW = {
  essay_type_filter: 'enem',
  metrics: {
    received_week: 14,
    historical_received_week: 0,
    pending_count: 4,
    avg_score: 724,
    highest_score: 800,
    lowest_score: 560,
    ranking: [
      { student_id: uid(1), full_name: 'Ana Paula Costa', avatar_url: null, avg_score: 740, last_essay_at: '2026-07-23T10:30:00' },
      { student_id: uid(2), full_name: 'Lucas Ferreira',  avatar_url: null, avg_score: 700, last_essay_at: '2026-07-21T14:00:00' },
      { student_id: uid(4), full_name: 'Gabriela Alves',  avatar_url: null, avg_score: 682, last_essay_at: '2026-07-20T09:00:00' },
      { student_id: uid(5), full_name: 'Rafael Santos',   avatar_url: null, avg_score: 671, last_essay_at: '2026-07-18T11:00:00' },
      { student_id: uid(7), full_name: 'Juliana Oliveira',avatar_url: null, avg_score: 655, last_essay_at: '2026-07-16T10:00:00' },
    ],
    competency_scores: [
      { competency: 1, avg: 152, count: 47 }, { competency: 2, avg: 158, count: 47 },
      { competency: 3, avg: 138, count: 47 }, { competency: 4, avg: 144, count: 47 }, { competency: 5, avg: 132, count: 47 },
    ],
    weakest_competency: { competency: 5, avg: 132 },
    avg_correction_days: 0.8,
    improvement_rate: 7.2,
    second_corrections_count: 3,
  },
  pending_items: [
    { id: 'ep000002-0000-4000-8000-000000000002', status: 'pending', essay_type: 'enem', theme: 'Mobilidade urbana no Brasil', submitted_at: '2026-07-24T15:30:00', corrected_at: null, total_score: null, text: 'A mobilidade urbana é um dos maiores desafios das cidades brasileiras...', student: { id: uid(6), full_name: 'Isabela Lima', email: 'isabela.lima@ave.com', avatar_url: null } },
    { id: 'ep000003-0000-4000-8000-000000000003', status: 'pending', essay_type: 'enem', theme: 'Violência contra a mulher', submitted_at: '2026-07-24T11:00:00', corrected_at: null, total_score: null, text: 'A violência doméstica configura grave violação dos direitos humanos...', student: { id: uid(8), full_name: 'Camila Pereira', email: 'camila.pereira@ave.com', avatar_url: null } },
    { id: 'ep000004-0000-4000-8000-000000000004', status: 'pending', essay_type: 'enem', theme: 'Crise hídrica no Brasil', submitted_at: '2026-07-23T14:00:00', corrected_at: null, total_score: null, text: 'A escassez de água potável afeta milhões de brasileiros...', student: { id: uid(9), full_name: 'Thiago Costa', email: 'thiago.costa@ave.com', avatar_url: null } },
    { id: 'ep000005-0000-4000-8000-000000000005', status: 'pending', essay_type: 'enem', theme: 'Saúde mental entre jovens', submitted_at: '2026-07-23T09:30:00', corrected_at: null, total_score: null, text: 'Nos últimos anos, os índices de ansiedade e depressão entre adolescentes...', student: { id: uid(2), full_name: 'Lucas Ferreira', email: 'lucas.ferreira@ave.com', avatar_url: null } },
  ],
  corrected_items: [
    { id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', status: 'corrected', essay_type: 'enem', theme: 'O impacto da inteligência artificial no mercado de trabalho', submitted_at: '2026-07-26T10:00:00', corrected_at: '2026-07-26T23:41:47', total_score: 760, average_score: null, text: 'A ascensão da inteligência artificial redefine, de maneira sem precedentes, as relações entre o ser humano e o trabalho...', student: { id: '4d9124fa-83a6-4929-9525-2d8539d648c7', full_name: 'Aluno Teste Ave', email: 'alunotesteave@gmail.com', avatar_url: null } },
    { id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected', essay_type: 'enem', theme: 'A importância da empatia na sociedade contemporânea', submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', total_score: 760, average_score: null, text: ESSAY_TEXT_ANA, student: { id: uid(1), full_name: 'Ana Paula Costa', email: 'ana.paula@ave.com', avatar_url: null } },
    { id: 'ea000011-0000-4000-8000-000000000011', status: 'corrected', essay_type: 'enem', theme: 'Desigualdade social no Brasil',              submitted_at: '2026-07-22T09:00:00', corrected_at: '2026-07-23T10:00:00', total_score: 740, average_score: null, text: 'A desigualdade social é uma das marcas históricas do Brasil...', student: { id: uid(1), full_name: 'Ana Paula Costa', email: 'ana.paula@ave.com', avatar_url: null } },
    { id: 'eb000001-0000-4000-8000-000000000001', status: 'corrected', essay_type: 'enem', theme: 'Violência nas escolas brasileiras',           submitted_at: '2026-07-21T14:00:00', corrected_at: '2026-07-22T10:00:00', total_score: 700, average_score: null, text: 'A violência no ambiente escolar representa um obstáculo ao desenvolvimento...', student: { id: uid(2), full_name: 'Lucas Ferreira', email: 'lucas.ferreira@ave.com', avatar_url: null } },
    { id: 'ea000012-0000-4000-8000-000000000012', status: 'corrected', essay_type: 'enem', theme: 'Fake news e democracia',                      submitted_at: '2026-07-20T10:00:00', corrected_at: '2026-07-21T09:00:00', total_score: 720, average_score: null, text: 'A desinformação digital representa ameaça à democracia...', student: { id: uid(4), full_name: 'Gabriela Alves', email: 'gabriela.alves@ave.com', avatar_url: null } },
    { id: 'ea000013-0000-4000-8000-000000000013', status: 'corrected', essay_type: 'enem', theme: 'Segurança alimentar no Brasil',               submitted_at: '2026-07-19T11:00:00', corrected_at: '2026-07-20T14:00:00', total_score: 680, average_score: null, text: 'A insegurança alimentar afeta milhões de famílias brasileiras...', student: { id: uid(5), full_name: 'Rafael Santos', email: 'rafael.santos@ave.com', avatar_url: null } },
    { id: 'ea000014-0000-4000-8000-000000000014', status: 'corrected', essay_type: 'enem', theme: 'Acesso à internet no Brasil',                 submitted_at: '2026-07-18T09:30:00', corrected_at: '2026-07-19T11:30:00', total_score: 660, average_score: null, text: 'O acesso à internet ainda é desigual no território brasileiro...', student: { id: uid(7), full_name: 'Juliana Oliveira', email: 'juliana.oliveira@ave.com', avatar_url: null } },
    { id: 'ea000015-0000-4000-8000-000000000015', status: 'corrected', essay_type: 'enem', theme: 'Trabalho infantil no Brasil',                 submitted_at: '2026-07-17T10:00:00', corrected_at: '2026-07-18T09:00:00', total_score: 640, average_score: null, text: 'O trabalho infantil priva crianças do direito à educação...', student: { id: uid(12), full_name: 'Beatriz Martins', email: 'beatriz.martins@ave.com', avatar_url: null } },
    { id: 'ec000001-0000-4000-8000-000000000001', status: 'corrected', essay_type: 'enem', theme: 'Combate à desinformação digital',             submitted_at: '2026-07-10T09:00:00', corrected_at: '2026-07-11T14:00:00', total_score: 580, average_score: null, text: 'A proliferação de notícias falsas representa um risco...', student: { id: uid(3), full_name: 'Bruno Mendes', email: 'bruno.mendes@ave.com', avatar_url: null } },
    { id: 'ea000016-0000-4000-8000-000000000016', status: 'corrected', essay_type: 'enem', theme: 'Racismo estrutural no Brasil',                submitted_at: '2026-07-09T11:00:00', corrected_at: '2026-07-10T10:00:00', total_score: 760, average_score: null, text: 'O racismo estrutural permeia todas as esferas da sociedade brasileira...', student: { id: uid(6), full_name: 'Isabela Lima', email: 'isabela.lima@ave.com', avatar_url: null } },
    { id: 'ea000017-0000-4000-8000-000000000017', status: 'corrected', essay_type: 'enem', theme: 'Envelhecimento da população brasileira',       submitted_at: '2026-07-08T14:00:00', corrected_at: '2026-07-09T09:00:00', total_score: 700, average_score: null, text: 'O envelhecimento acelerado da população impõe novos desafios ao Estado...', student: { id: uid(16), full_name: 'Leonardo Nunes', email: 'leonardo.nunes@ave.com', avatar_url: null } },
  ],
  pagination: {
    pending:   { page: 1, limit: 10, total: 5,  total_pages: 1 },
    corrected: { page: 1, limit: 10, total: 47, total_pages: 5 },
  },
};

// ─── Associados ────────────────────────────────────────────────────────────────

// Summary KPIs para a página de lista de associados
export const MOCK_ASSOCIATE_SUMMARY = {
  total_associates: 3,
  active_associates: 3,
  inactive_associates: 0,
  pending_essays: 5,
  corrections_in_window: 14,
  total_corrections: 87,
  avg_turnaround_hours: 3.2,
  avg_essay_score: 718,
};

// Trend semanal de correções (linha do tempo na página de lista)
export const MOCK_ASSOCIATE_TREND = [
  { date: '2026-07-19', corrections: 2 },
  { date: '2026-07-20', corrections: 3 },
  { date: '2026-07-21', corrections: 1 },
  { date: '2026-07-22', corrections: 4 },
  { date: '2026-07-23', corrections: 2 },
  { date: '2026-07-24', corrections: 3 },
  { date: '2026-07-25', corrections: 2 },
];

// Variantes de stats por associado — distribuídas ciclicamente pelos IDs reais
export const MOCK_ASSOCIATE_STATS_VARIANTS = [
  { corrections_in_window: 8, total_corrections: 52, avg_essay_score: 732, avg_turnaround_hours: 2.8 },
  { corrections_in_window: 4, total_corrections: 27, avg_essay_score: 701, avg_turnaround_hours: 4.1 },
  { corrections_in_window: 2, total_corrections: 8,  avg_essay_score: 688, avg_turnaround_hours: 6.2 },
];

// Métricas para a página de detalhe do associado
export const MOCK_ASSOC_METRICS = {
  corrections_today: 2,
  corrections_week: 8,
  corrections_month: 24,
  corrections_total: 52,
  avg_essay_score: 732,
  best_essay_score: 820,
  avg_turnaround_hours: 2.8,
  pending_essays: 5,
};

// 28 dias de evolução diária de correções
export const MOCK_ASSOC_DAILY_EVOLUTION = (() => {
  const base = new Date('2026-06-27');
  const series = [1,0,2,1,3,2,1,0,2,1,3,4,2,1,0,2,3,2,1,2,1,3,2,4,2,3,2,2];
  const scores = [720,null,710,730,725,740,715,null,728,718,732,745,738,722,null,708,712,725,735,740,748,738,742,756,730,742,738,732];
  const turnarounds = [3.2,null,2.8,3.5,2.6,2.4,3.8,null,2.9,3.1,2.7,2.4,2.8,3.2,null,3.6,3.4,3.0,2.8,2.5,2.4,2.7,2.6,2.2,2.8,2.5,2.7,2.9];
  return series.map((corrections, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      corrections,
      avg_score: scores[i] as number | null,
      avg_turnaround_hours: turnarounds[i] as number | null,
    };
  });
})();

// Médias por competência ENEM
export const MOCK_ASSOC_COMPETENCY_AVGS = [
  { competency: 'C1', avg: 158, count: 47 },
  { competency: 'C2', avg: 163, count: 47 },
  { competency: 'C3', avg: 147, count: 47 },
  { competency: 'C4', avg: 151, count: 47 },
  { competency: 'C5', avg: 144, count: 47 },
];

// Últimas correções realizadas
export const MOCK_ASSOC_RECENT_CORRECTIONS = [
  { essay_id: 'ea000001-0000-4000-8000-000000000001', student_name: 'Ana Paula Costa',   submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', total_score: 760, turnaround_hours: 21.7 },
  { essay_id: 'eb000001-0000-4000-8000-000000000001', student_name: 'Lucas Ferreira',     submitted_at: '2026-07-22T14:00:00', corrected_at: '2026-07-23T10:00:00', total_score: 700, turnaround_hours: 20.0 },
  { essay_id: 'ea000011-0000-4000-8000-000000000011', student_name: 'Ana Paula Costa',   submitted_at: '2026-07-22T09:00:00', corrected_at: '2026-07-22T22:30:00', total_score: 740, turnaround_hours: 13.5 },
  { essay_id: 'ea000012-0000-4000-8000-000000000012', student_name: 'Gabriela Alves',    submitted_at: '2026-07-20T10:00:00', corrected_at: '2026-07-21T09:00:00', total_score: 720, turnaround_hours: 23.0 },
  { essay_id: 'ea000013-0000-4000-8000-000000000013', student_name: 'Rafael Santos',     submitted_at: '2026-07-19T11:00:00', corrected_at: '2026-07-20T14:00:00', total_score: 680, turnaround_hours: 27.0 },
  { essay_id: 'ea000014-0000-4000-8000-000000000014', student_name: 'Juliana Oliveira',  submitted_at: '2026-07-18T09:30:00', corrected_at: '2026-07-19T11:30:00', total_score: 660, turnaround_hours: 26.0 },
  { essay_id: 'ea000015-0000-4000-8000-000000000015', student_name: 'Beatriz Martins',   submitted_at: '2026-07-17T10:00:00', corrected_at: '2026-07-18T09:00:00', total_score: 640, turnaround_hours: 23.0 },
  { essay_id: 'ea000016-0000-4000-8000-000000000016', student_name: 'Isabela Lima',      submitted_at: '2026-07-16T09:00:00', corrected_at: '2026-07-17T08:00:00', total_score: 760, turnaround_hours: 23.0 },
  { essay_id: 'ea000017-0000-4000-8000-000000000017', student_name: 'Leonardo Nunes',    submitted_at: '2026-07-15T14:00:00', corrected_at: '2026-07-16T10:00:00', total_score: 700, turnaround_hours: 20.0 },
  { essay_id: 'ec000001-0000-4000-8000-000000000001', student_name: 'Bruno Mendes',      submitted_at: '2026-07-10T09:00:00', corrected_at: '2026-07-11T14:00:00', total_score: 580, turnaround_hours: 29.0 },
];

// ─── Portal do Aluno (student/*) ───────────────────────────────────────────────

// 30 dias de histórico de atividade — Ana Paula, ~45 questões/dia, folgas domingo
export const MOCK_STUDENT_ACTIVITY_HISTORY = [
  { usage_date: '2026-06-26', questions_count: 38, simulations_count: 0, correct_count: 29 },
  { usage_date: '2026-06-27', questions_count: 42, simulations_count: 0, correct_count: 32 },
  { usage_date: '2026-06-28', questions_count: 35, simulations_count: 0, correct_count: 27 },
  { usage_date: '2026-06-29', questions_count: 0,  simulations_count: 0, correct_count: 0  },
  { usage_date: '2026-06-30', questions_count: 45, simulations_count: 1, correct_count: 34 },
  { usage_date: '2026-07-01', questions_count: 41, simulations_count: 0, correct_count: 31 },
  { usage_date: '2026-07-02', questions_count: 43, simulations_count: 1, correct_count: 33 },
  { usage_date: '2026-07-03', questions_count: 39, simulations_count: 0, correct_count: 29 },
  { usage_date: '2026-07-04', questions_count: 44, simulations_count: 0, correct_count: 34 },
  { usage_date: '2026-07-05', questions_count: 36, simulations_count: 0, correct_count: 27 },
  { usage_date: '2026-07-06', questions_count: 0,  simulations_count: 0, correct_count: 0  },
  { usage_date: '2026-07-07', questions_count: 47, simulations_count: 1, correct_count: 36 },
  { usage_date: '2026-07-08', questions_count: 43, simulations_count: 0, correct_count: 33 },
  { usage_date: '2026-07-09', questions_count: 45, simulations_count: 0, correct_count: 34 },
  { usage_date: '2026-07-10', questions_count: 41, simulations_count: 0, correct_count: 31 },
  { usage_date: '2026-07-11', questions_count: 46, simulations_count: 0, correct_count: 35 },
  { usage_date: '2026-07-12', questions_count: 38, simulations_count: 1, correct_count: 29 },
  { usage_date: '2026-07-13', questions_count: 12, simulations_count: 0, correct_count: 9  },
  { usage_date: '2026-07-14', questions_count: 49, simulations_count: 1, correct_count: 38 },
  { usage_date: '2026-07-15', questions_count: 44, simulations_count: 1, correct_count: 34 },
  { usage_date: '2026-07-16', questions_count: 43, simulations_count: 0, correct_count: 33 },
  { usage_date: '2026-07-17', questions_count: 47, simulations_count: 0, correct_count: 37 },
  { usage_date: '2026-07-18', questions_count: 45, simulations_count: 0, correct_count: 35 },
  { usage_date: '2026-07-19', questions_count: 40, simulations_count: 1, correct_count: 30 },
  { usage_date: '2026-07-20', questions_count: 0,  simulations_count: 0, correct_count: 0  },
  { usage_date: '2026-07-21', questions_count: 45, simulations_count: 1, correct_count: 35 },
  { usage_date: '2026-07-22', questions_count: 52, simulations_count: 1, correct_count: 41 },
  { usage_date: '2026-07-23', questions_count: 50, simulations_count: 0, correct_count: 39 },
  { usage_date: '2026-07-24', questions_count: 56, simulations_count: 0, correct_count: 45 },
  { usage_date: '2026-07-25', questions_count: 21, simulations_count: 0, correct_count: 17 },
];

export const MOCK_STUDENT_ANALYTICS = {
  overview: {
    total_questions: 4832, accuracy_percentage: 74,
    current_streak: 12,   longest_streak: 21,
    total_xp: 4832,       total_simulados: 51,
  },
  performance_by_subject: [
    { subject: 'Inglês',               total: 1513, correct: 1224, accuracy: 80.9 },
    { subject: 'Biologia',             total: 2278, correct: 1717, accuracy: 75.4 },
    { subject: 'História',             total: 1666, correct: 1258, accuracy: 75.5 },
    { subject: 'Português',            total: 1904, correct: 1411, accuracy: 74.1 },
    { subject: 'Filosofia/Sociologia', total: 1037, correct: 753,  accuracy: 72.6 },
    { subject: 'Química',              total: 1479, correct: 986,  accuracy: 66.7 },
    { subject: 'Física',               total: 1292, correct: 799,  accuracy: 61.8 },
    { subject: 'Matemática',           total: 2431, correct: 1376, accuracy: 56.6 },
  ],
  performance_by_topic: [] as unknown[],
  activity_history: MOCK_STUDENT_ACTIVITY_HISTORY,
};

// EssayListItem[] para DashboardState.essays
export const MOCK_STUDENT_ESSAY_LIST_ITEMS = [
  { id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected' as const, essay_type: 'enem' as const, submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', total_score: 760,  average_score: null, theme: 'A importância da empatia na sociedade contemporânea' },
  { id: 'ea000002-0000-4000-8000-000000000002', status: 'corrected' as const, essay_type: 'enem' as const, submitted_at: '2026-07-14T09:00:00', corrected_at: '2026-07-15T11:30:00', total_score: 740,  average_score: null, theme: 'Desigualdade social no Brasil' },
  { id: 'ea000003-0000-4000-8000-000000000003', status: 'corrected' as const, essay_type: 'enem' as const, submitted_at: '2026-07-07T10:00:00', corrected_at: '2026-07-08T14:00:00', total_score: 720,  average_score: null, theme: 'O papel da educação na democracia' },
];

// EssayDetail[] para DashboardState.essayDetails
export const MOCK_STUDENT_ESSAY_DETAILS = [
  {
    id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected' as const, essay_type: 'enem',
    total_score: 760, average_score: null,
    submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00',
    competency_scores: [
      { competency: 1, score: 160, comment: 'Bom domínio da norma culta da língua portuguesa.' },
      { competency: 2, score: 172, comment: 'Excelente compreensão e desenvolvimento do tema.' },
      { competency: 3, score: 144, comment: 'Argumentação sólida com repertório sociocultural pertinente.' },
      { competency: 4, score: 152, comment: 'Boa coesão e coerência textual.' },
      { competency: 5, score: 140, comment: 'Proposta de intervenção detalhada e respeitosa dos direitos humanos.' },
    ],
    general_comment: 'Redação de alto nível! Foco em aprimorar a proposta de intervenção nas próximas redações.',
  },
  {
    id: 'ea000002-0000-4000-8000-000000000002', status: 'corrected' as const, essay_type: 'enem',
    total_score: 740, average_score: null,
    submitted_at: '2026-07-14T09:00:00', corrected_at: '2026-07-15T11:30:00',
    competency_scores: [
      { competency: 1, score: 160, comment: null }, { competency: 2, score: 160, comment: null },
      { competency: 3, score: 140, comment: null }, { competency: 4, score: 148, comment: null },
      { competency: 5, score: 132, comment: null },
    ],
    general_comment: null,
  },
  {
    id: 'ea000003-0000-4000-8000-000000000003', status: 'corrected' as const, essay_type: 'enem',
    total_score: 720, average_score: null,
    submitted_at: '2026-07-07T10:00:00', corrected_at: '2026-07-08T14:00:00',
    competency_scores: [
      { competency: 1, score: 156, comment: null }, { competency: 2, score: 156, comment: null },
      { competency: 3, score: 136, comment: null }, { competency: 4, score: 144, comment: null },
      { competency: 5, score: 128, comment: null },
    ],
    general_comment: null,
  },
];

// Simulados curtos (sem results_by_subject) para DashboardState.simuladoSessions
export const MOCK_STUDENT_SIMULADO_SESSIONS = [
  { id: '5a000001-0000-4000-8000-000000000001', score: 39, total_questions: 45, percentage: 86.7, tri_score: 680.2, time_taken_secs: 4320,  completed_at: '2026-07-22T15:30:00' },
  { id: '5a000002-0000-4000-8000-000000000002', score: 31, total_questions: 45, percentage: 68.9, tri_score: 641.8, time_taken_secs: 5100,  completed_at: '2026-07-19T16:00:00' },
  { id: '5a000003-0000-4000-8000-000000000003', score: 35, total_questions: 45, percentage: 77.8, tri_score: 660.3, time_taken_secs: 4700,  completed_at: '2026-07-15T14:00:00' },
  { id: '5a000004-0000-4000-8000-000000000004', score: 29, total_questions: 45, percentage: 64.4, tri_score: 622.1, time_taken_secs: 5800,  completed_at: '2026-07-12T11:00:00' },
  { id: '5a000005-0000-4000-8000-000000000005', score: 68, total_questions: 90, percentage: 75.6, tri_score: null,   time_taken_secs: 10800, completed_at: '2026-07-07T17:00:00' },
  { id: '5a000006-0000-4000-8000-000000000006', score: 36, total_questions: 45, percentage: 80.0, tri_score: 659.8, time_taken_secs: 4600,  completed_at: '2026-07-02T15:00:00' },
];

// Estado completo passado para DesempenhoClient via SSR
export const MOCK_STUDENT_DASHBOARD_STATE = {
  analytics: MOCK_STUDENT_ANALYTICS,
  essays: MOCK_STUDENT_ESSAY_LIST_ITEMS,
  essayDetails: MOCK_STUDENT_ESSAY_DETAILS,
  summary: {
    monthly_points: 4203, rank_position: 1, points_to_top3: 0, prize_cutoff: 3,
    month_label: 'Julho/26', monthly_goal: 5000, goal_reached: false,
    goal_progress_pct: 84, shield_count: 3,
    progress_tier: 'gold', next_tier: 'diamond', points_to_next_tier: 797,
  },
  ranking: {
    ranking: [
      { rank: 1,  user_id: uid(1),  full_name: 'Ana Paula Costa',    monthly_points: 4203 },
      { rank: 2,  user_id: uid(4),  full_name: 'Gabriela Alves',     monthly_points: 3871 },
      { rank: 3,  user_id: uid(5),  full_name: 'Rafael Santos',      monthly_points: 3412 },
      { rank: 4,  user_id: uid(8),  full_name: 'Camila Pereira',     monthly_points: 3108 },
      { rank: 5,  user_id: uid(6),  full_name: 'Isabela Lima',       monthly_points: 2847 },
      { rank: 6,  user_id: uid(16), full_name: 'Leonardo Nunes',     monthly_points: 2634 },
      { rank: 7,  user_id: uid(10), full_name: 'Diego Carvalho',     monthly_points: 2441 },
      { rank: 8,  user_id: uid(25), full_name: 'Samuel Xavier',      monthly_points: 2287 },
      { rank: 9,  user_id: uid(24), full_name: 'Gustavo Teixeira',   monthly_points: 2103 },
      { rank: 10, user_id: uid(2),  full_name: 'Lucas Ferreira',     monthly_points: 1928 },
    ],
    user_context: { position: 1 },
  },
  simuladoSessions: MOCK_STUDENT_SIMULADO_SESSIONS,
  credits: null as null,
};

// Feed de atividade recente (student dashboard)
export const MOCK_ACTIVITY_FEED = [
  { type: 'question' as const, subject: 'Biologia',   is_correct: true,  timestamp: '2026-07-25T10:15:00' },
  { type: 'question' as const, subject: 'Inglês',     is_correct: true,  timestamp: '2026-07-25T10:12:00' },
  { type: 'question' as const, subject: 'Matemática', is_correct: false, timestamp: '2026-07-25T10:08:00' },
  { type: 'question' as const, subject: 'História',   is_correct: true,  timestamp: '2026-07-25T10:05:00' },
  { type: 'question' as const, subject: 'Biologia',   is_correct: true,  timestamp: '2026-07-25T10:01:00' },
  { type: 'simulado' as const, total_questions: 45,   score: 39,         timestamp: '2026-07-22T15:30:00' },
  { type: 'essay' as const,    status: 'corrected',   essay_type: 'enem',timestamp: '2026-07-24T08:15:00' },
  { type: 'question' as const, subject: 'Química',    is_correct: true,  timestamp: '2026-07-24T09:00:00' },
  { type: 'question' as const, subject: 'Português',  is_correct: false, timestamp: '2026-07-24T08:55:00' },
  { type: 'question' as const, subject: 'Física',     is_correct: true,  timestamp: '2026-07-24T08:50:00' },
  { type: 'question' as const, subject: 'Inglês',     is_correct: true,  timestamp: '2026-07-24T08:45:00' },
  { type: 'question' as const, subject: 'Biologia',   is_correct: true,  timestamp: '2026-07-24T08:40:00' },
  { type: 'question' as const, subject: 'História',   is_correct: false, timestamp: '2026-07-23T10:30:00' },
  { type: 'question' as const, subject: 'Matemática', is_correct: true,  timestamp: '2026-07-23T10:25:00' },
  { type: 'question' as const, subject: 'Química',    is_correct: true,  timestamp: '2026-07-23T10:20:00' },
];

// Essays do aluno na página /student/redacoes (Essay type — inclui text_preview)
export const MOCK_STUDENT_ESSAYS_FOR_REDACOES = [
  {
    // Redação real no Supabase — corrigida pelo founder no tutorial. UUID real permite carregar o detalhe via API.
    id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', status: 'corrected' as const, essay_type: 'enem' as const,
    submitted_at: '2026-07-26T10:00:00', corrected_at: '2026-07-26T23:41:47', seen_at: null,
    total_score: 760, average_score: null,
    text_preview: 'A ascensão da inteligência artificial redefine, de maneira sem precedentes, as relações entre o ser humano e o trabalho...',
    theme: 'O impacto da inteligência artificial no mercado de trabalho', is_historical: false,
  },
  {
    id: 'ea000001-0000-4000-8000-000000000001', status: 'corrected' as const, essay_type: 'enem' as const,
    submitted_at: '2026-07-23T10:30:00', corrected_at: '2026-07-24T08:15:00', seen_at: null,
    total_score: 760, average_score: null,
    text_preview: 'A empatia, enquanto capacidade de compreender e compartilhar sentimentos alheios, constitui pilar fundamental para o tecido social contemporâneo...',
    theme: 'A importância da empatia na sociedade contemporânea', is_historical: false,
  },
  {
    id: 'ea000002-0000-4000-8000-000000000002', status: 'corrected' as const, essay_type: 'enem' as const,
    submitted_at: '2026-07-14T09:00:00', corrected_at: '2026-07-15T11:30:00', seen_at: null,
    total_score: 740, average_score: null,
    text_preview: 'A desigualdade social é uma das marcas históricas mais persistentes do Brasil, com raízes no período colonial...',
    theme: 'Desigualdade social no Brasil', is_historical: false,
  },
  {
    id: 'ea000003-0000-4000-8000-000000000003', status: 'corrected' as const, essay_type: 'enem' as const,
    submitted_at: '2026-07-07T10:00:00', corrected_at: '2026-07-08T14:00:00', seen_at: null,
    total_score: 720, average_score: null,
    text_preview: 'Desde os primórdios da democracia moderna, a educação tem sido reconhecida como instrumento essencial de formação cidadã...',
    theme: 'O papel da educação na democracia', is_historical: false,
  },
  {
    id: 'ep000005-0000-4000-8000-000000000005', status: 'pending' as const, essay_type: 'enem' as const,
    submitted_at: '2026-07-23T09:30:00', corrected_at: null, seen_at: null,
    total_score: null, average_score: null,
    text_preview: 'Nos últimos anos, os índices de ansiedade e depressão entre adolescentes têm crescido de forma alarmante...',
    theme: 'Saúde mental entre jovens', is_historical: false,
  },
];

// Competency scores para exibição na página /student/redacoes
export const MOCK_STUDENT_ESSAY_COMPETENCY_SCORES = [
  // Redação real corrigida no tutorial
  { essay_id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', competency: 1, score: 120, correction_round: 1 },
  { essay_id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', competency: 2, score: 200, correction_round: 1 },
  { essay_id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', competency: 3, score: 120, correction_round: 1 },
  { essay_id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', competency: 4, score: 120, correction_round: 1 },
  { essay_id: 'ed01a9a7-78f9-4ac1-8eca-70432a0d4e3e', competency: 5, score: 200, correction_round: 1 },
  { essay_id: 'ea000001-0000-4000-8000-000000000001', competency: 1, score: 160, correction_round: 1 },
  { essay_id: 'ea000001-0000-4000-8000-000000000001', competency: 2, score: 172, correction_round: 1 },
  { essay_id: 'ea000001-0000-4000-8000-000000000001', competency: 3, score: 144, correction_round: 1 },
  { essay_id: 'ea000001-0000-4000-8000-000000000001', competency: 4, score: 152, correction_round: 1 },
  { essay_id: 'ea000001-0000-4000-8000-000000000001', competency: 5, score: 140, correction_round: 1 },
  { essay_id: 'ea000002-0000-4000-8000-000000000002', competency: 1, score: 160, correction_round: 1 },
  { essay_id: 'ea000002-0000-4000-8000-000000000002', competency: 2, score: 160, correction_round: 1 },
  { essay_id: 'ea000002-0000-4000-8000-000000000002', competency: 3, score: 140, correction_round: 1 },
  { essay_id: 'ea000002-0000-4000-8000-000000000002', competency: 4, score: 148, correction_round: 1 },
  { essay_id: 'ea000002-0000-4000-8000-000000000002', competency: 5, score: 132, correction_round: 1 },
  { essay_id: 'ea000003-0000-4000-8000-000000000003', competency: 1, score: 156, correction_round: 1 },
  { essay_id: 'ea000003-0000-4000-8000-000000000003', competency: 2, score: 156, correction_round: 1 },
  { essay_id: 'ea000003-0000-4000-8000-000000000003', competency: 3, score: 136, correction_round: 1 },
  { essay_id: 'ea000003-0000-4000-8000-000000000003', competency: 4, score: 144, correction_round: 1 },
  { essay_id: 'ea000003-0000-4000-8000-000000000003', competency: 5, score: 128, correction_round: 1 },
];

// Histórico de simulados (/student/simulado/historico) — inclui campo percentage
export const MOCK_SIMULADO_HISTORY = [
  { id: '5a000001-0000-4000-8000-000000000001', config: { format: 'humanas',   bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 39, total_questions: 45, percentage: 86.7, tri_score: 680.2, time_taken_secs: 4320,  completed_at: '2026-07-22T15:30:00' },
  { id: '5a000002-0000-4000-8000-000000000002', config: { format: 'natureza',  bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 31, total_questions: 45, percentage: 68.9, tri_score: 641.8, time_taken_secs: 5100,  completed_at: '2026-07-19T16:00:00' },
  { id: '5a000003-0000-4000-8000-000000000003', config: { format: 'linguagens',bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 35, total_questions: 45, percentage: 77.8, tri_score: 660.3, time_taken_secs: 4700,  completed_at: '2026-07-15T14:00:00' },
  { id: '5a000004-0000-4000-8000-000000000004', config: { format: 'matematica',bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 29, total_questions: 45, percentage: 64.4, tri_score: 622.1, time_taken_secs: 5800,  completed_at: '2026-07-12T11:00:00' },
  { id: '5a000005-0000-4000-8000-000000000005', config: { format: 'dia1',      bank: 'ENEM', difficulty: 'misto', qty: 90 }, score: 68, total_questions: 90, percentage: 75.6, tri_score: null,   time_taken_secs: 10800, completed_at: '2026-07-07T17:00:00' },
  { id: '5a000006-0000-4000-8000-000000000006', config: { format: 'humanas',   bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 36, total_questions: 45, percentage: 80.0, tri_score: 659.8, time_taken_secs: 4600,  completed_at: '2026-07-02T15:00:00' },
  { id: '5a000007-0000-4000-8000-000000000007', config: { format: 'natureza',  bank: 'ENEM', difficulty: 'misto', qty: 45 }, score: 30, total_questions: 45, percentage: 66.7, tri_score: 638.4, time_taken_secs: 5300,  completed_at: '2026-06-28T16:30:00' },
];

// Sessions completas para /student/simulado dashboard (com started_at e results_by_subject para gráficos)
export const MOCK_SIMULADO_SESSIONS_STUDENT = [
  {
    id: '5a000001-0000-4000-8000-000000000001',
    config: { format: 'humanas', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 39, total_questions: 45, percentage: 86.7, tri_score: 680.2,
    time_taken_secs: 4320, started_at: '2026-07-22T14:17:00', completed_at: '2026-07-22T15:30:00',
    results_by_subject: {
      'História':   { correct: 16, total: 18, percentage: 88.9 },
      'Geografia':  { correct: 14, total: 16, percentage: 87.5 },
      'Filosofia':  { correct: 5,  total: 6,  percentage: 83.3 },
      'Sociologia': { correct: 4,  total: 5,  percentage: 80.0 },
    },
  },
  {
    id: '5a000002-0000-4000-8000-000000000002',
    config: { format: 'natureza', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 31, total_questions: 45, percentage: 68.9, tri_score: 641.8,
    time_taken_secs: 5100, started_at: '2026-07-19T14:35:00', completed_at: '2026-07-19T16:00:00',
    results_by_subject: {
      'Biologia': { correct: 13, total: 18, percentage: 72.2 },
      'Química':  { correct: 10, total: 15, percentage: 66.7 },
      'Física':   { correct: 8,  total: 12, percentage: 66.7 },
    },
  },
  {
    id: '5a000003-0000-4000-8000-000000000003',
    config: { format: 'linguagens', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 35, total_questions: 45, percentage: 77.8, tri_score: 660.3,
    time_taken_secs: 4700, started_at: '2026-07-15T12:42:00', completed_at: '2026-07-15T14:00:00',
    results_by_subject: {
      'Português': { correct: 13, total: 15, percentage: 86.7 },
      'Inglês':    { correct: 10, total: 12, percentage: 83.3 },
      'Artes':     { correct: 7,  total: 10, percentage: 70.0 },
      'Espanhol':  { correct: 5,  total: 8,  percentage: 62.5 },
    },
  },
  {
    id: '5a000004-0000-4000-8000-000000000004',
    config: { format: 'matematica', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 29, total_questions: 45, percentage: 64.4, tri_score: 622.1,
    time_taken_secs: 5800, started_at: '2026-07-12T09:23:00', completed_at: '2026-07-12T11:00:00',
    results_by_subject: {
      'Matemática': { correct: 29, total: 45, percentage: 64.4 },
    },
  },
  {
    id: '5a000005-0000-4000-8000-000000000005',
    config: { format: 'dia1', bank: 'ENEM', difficulty: 'misto', qty: 90 },
    score: 68, total_questions: 90, percentage: 75.6, tri_score: null,
    time_taken_secs: 10800, started_at: '2026-07-07T14:00:00', completed_at: '2026-07-07T17:00:00',
    results_by_subject: {
      'Português':  { correct: 25, total: 30, percentage: 83.3 },
      'Inglês':     { correct: 18, total: 22, percentage: 81.8 },
      'Artes':      { correct: 7,  total: 10, percentage: 70.0 },
      'Filosofia':  { correct: 4,  total: 6,  percentage: 66.7 },
      'Sociologia': { correct: 4,  total: 5,  percentage: 80.0 },
      'História':   { correct: 6,  total: 8,  percentage: 75.0 },
      'Geografia':  { correct: 4,  total: 9,  percentage: 44.4 },
    },
  },
  {
    id: '5a000006-0000-4000-8000-000000000006',
    config: { format: 'humanas', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 36, total_questions: 45, percentage: 80.0, tri_score: 659.8,
    time_taken_secs: 4600, started_at: '2026-07-02T13:44:00', completed_at: '2026-07-02T15:00:00',
    results_by_subject: {
      'História':   { correct: 14, total: 18, percentage: 77.8 },
      'Geografia':  { correct: 12, total: 16, percentage: 75.0 },
      'Filosofia':  { correct: 5,  total: 6,  percentage: 83.3 },
      'Sociologia': { correct: 5,  total: 5,  percentage: 100.0 },
    },
  },
  {
    id: '5a000007-0000-4000-8000-000000000007',
    config: { format: 'natureza', bank: 'ENEM', difficulty: 'misto', qty: 45 },
    score: 30, total_questions: 45, percentage: 66.7, tri_score: 638.4,
    time_taken_secs: 5300, started_at: '2026-06-28T15:02:00', completed_at: '2026-06-28T16:30:00',
    results_by_subject: {
      'Biologia': { correct: 11, total: 18, percentage: 61.1 },
      'Química':  { correct: 11, total: 15, percentage: 73.3 },
      'Física':   { correct: 8,  total: 12, percentage: 66.7 },
    },
  },
];

// Ranking geral mock para /student/simulado (o aluno tutorial é o 1º)
export const MOCK_SIMULADO_RANKING_STUDENT = {
  ranking: [
    { position: 1,  user_id: uid(1),  full_name: 'Ana Paula Costa',  percentage: 87, is_calibration: false },
    { position: 2,  user_id: uid(3),  full_name: 'Beatriz Souza',    percentage: 82, is_calibration: false },
    { position: 3,  user_id: uid(4),  full_name: 'Gabriela Alves',   percentage: 79, is_calibration: false },
    { position: 4,  user_id: uid(5),  full_name: 'Rafael Santos',    percentage: 75, is_calibration: false },
    { position: 5,  user_id: uid(6),  full_name: 'Isabela Lima',     percentage: 71, is_calibration: false },
    { position: 6,  user_id: uid(7),  full_name: 'Thiago Mendes',    percentage: 69, is_calibration: false },
    { position: 7,  user_id: uid(8),  full_name: 'Camila Pereira',   percentage: 66, is_calibration: false },
    { position: 8,  user_id: uid(9),  full_name: 'Fernanda Costa',   percentage: 63, is_calibration: false },
    { position: 9,  user_id: uid(10), full_name: 'Diego Carvalho',   percentage: 61, is_calibration: false },
    { position: 10, user_id: uid(2),  full_name: 'Lucas Ferreira',   percentage: 58, is_calibration: false },
  ],
  user_position: 1,
  user_best: { percentage: 87 },
};

// Simulados agendados ativos para /student/simulado (o "ENEM Simulado I" como active/aberto)
export const MOCK_SCHEDULED_SIMULADOS_STUDENT = [
  {
    id: SIM1_ID,
    title: 'ENEM Simulado I',
    config: { format: 'dia1', bank: 'ENEM', qty: 90 },
    status: 'active',
    starts_at: '2026-07-20T08:00:00',
    ends_at: '2026-07-30T23:59:59',
    already_completed: false,
    modality: 'online' as const,
    location_name: null,
    location_address: null,
    has_printed_submission: false,
    online_session: null,
    metrics: { total_sessions: 38, unique_students: 38, avg_score_pct: 64.2 },
  },
];

// ─── Demo org guard ───────────────────────────────────────────────────────────

export const DEMO_SLUG = 'studytrack';
export const isDemoOrg = (slug: string): boolean => slug === DEMO_SLUG;

// ─── Founder Ranking ────────────────────────────────────────────────────────
export const MOCK_FOUNDER_RANKING = {
  prize_cutoff: 3,
  ranking: [
    { user_id: '00000001-0000-4000-8000-000000000001', full_name: 'Ana Paula Costa',  avatar_url: null, monthly_points: 4203, rank: 1, current_streak: 12 },
    { user_id: '00000004-0000-4000-8000-000000000004', full_name: 'Gabriela Alves',   avatar_url: null, monthly_points: 3871, rank: 2, current_streak: 8 },
    { user_id: '00000005-0000-4000-8000-000000000005', full_name: 'Rafael Santos',    avatar_url: null, monthly_points: 3412, rank: 3, current_streak: 6 },
    { user_id: '00000008-0000-4000-8000-000000000008', full_name: 'Camila Pereira',   avatar_url: null, monthly_points: 3108, rank: 4, current_streak: 5 },
    { user_id: '00000006-0000-4000-8000-000000000006', full_name: 'Isabela Lima',     avatar_url: null, monthly_points: 2847, rank: 5, current_streak: 4 },
    { user_id: '00000013-0000-4000-8000-000000000013', full_name: 'Leonardo Nunes',   avatar_url: null, monthly_points: 2634, rank: 6, current_streak: 7 },
    { user_id: '00000011-0000-4000-8000-000000000011', full_name: 'Diego Carvalho',   avatar_url: null, monthly_points: 2441, rank: 7, current_streak: 3 },
    { user_id: '00000027-0000-4000-8000-000000000027', full_name: 'Samuel Xavier',    avatar_url: null, monthly_points: 2287, rank: 8, current_streak: 9 },
    { user_id: '00000024-0000-4000-8000-000000000024', full_name: 'Gustavo Teixeira', avatar_url: null, monthly_points: 2103, rank: 9, current_streak: 2 },
    { user_id: '00000002-0000-4000-8000-000000000002', full_name: 'Lucas Ferreira',   avatar_url: null, monthly_points: 1928, rank: 10, current_streak: 5 },
  ],
};

// ─── Titles Journey (student/titulos) ───────────────────────────────────────
export const MOCK_TITLES_JOURNEY = {
  enabled: true,
  month_reference: '2026-07-01',
  monthly_points: 4203,
  progress_tier: 'gold',
  next_tier: 'diamond',
  points_to_next_tier: 797,
  identity_profile: {
    identity_title: 'Estudante Dedicado',
    identity_title_icon: null,
  },
  milestones: [
    { tier: 'bronze',   label: 'Bronze',   min_points: 0,    max_points: 999,   reached: true },
    { tier: 'silver',   label: 'Prata',    min_points: 1000, max_points: 1999,  reached: true },
    { tier: 'gold',     label: 'Ouro',     min_points: 2000, max_points: 4999,  reached: true },
    { tier: 'diamond',  label: 'Diamante', min_points: 5000, max_points: 9999,  reached: false },
    { tier: 'legend',   label: 'Lendário', min_points: 10000, max_points: null, reached: false },
  ],
};

export const MOCK_TITLES_HISTORY = {
  history: [
    { month_reference: '2026-06-01', progress_tier: 'silver', monthly_points: 2847, rank_position: 2 },
    { month_reference: '2026-05-01', progress_tier: 'silver', monthly_points: 2103, rank_position: 4 },
    { month_reference: '2026-04-01', progress_tier: 'bronze', monthly_points: 1241, rank_position: 7 },
  ],
};

export const MOCK_CHECKIN_STATUS = { required: false, completed: false };

// ─── Simulado Resultados (founder) ──────────────────────────────────────────
export const MOCK_SIMULADO_PARTICIPANTS = [
  { id: 'p001', source: 'online' as const, student_id: '00000001-0000-4000-8000-000000000001', student_name: 'Ana Paula Costa',  score: 80, total_questions: 90, percentage: 88.9, graded_at: '2026-07-14T18:03:20Z', results_by_subject: { 'Língua Portuguesa': { correct: 19, total: 20, percentage: 95 }, 'História': { correct: 16, total: 18, percentage: 88.9 } } },
  { id: 'p002', source: 'online' as const, student_id: '00000008-0000-4000-8000-000000000008', student_name: 'Camila Pereira',   score: 75, total_questions: 90, percentage: 83.3, graded_at: '2026-07-14T18:23:20Z', results_by_subject: { 'Língua Portuguesa': { correct: 17, total: 20, percentage: 85 }, 'História': { correct: 14, total: 18, percentage: 77.8 } } },
  { id: 'p003', source: 'online' as const, student_id: '00000004-0000-4000-8000-000000000004', student_name: 'Gabriela Alves',   score: 72, total_questions: 90, percentage: 80.0, graded_at: '2026-07-14T18:30:00Z', results_by_subject: { 'Inglês': { correct: 5, total: 5, percentage: 100 }, 'História': { correct: 13, total: 18, percentage: 72.2 } } },
  { id: 'p004', source: 'online' as const, student_id: '00000005-0000-4000-8000-000000000005', student_name: 'Rafael Santos',    score: 67, total_questions: 90, percentage: 74.4, graded_at: '2026-07-14T18:16:40Z', results_by_subject: { 'Língua Portuguesa': { correct: 16, total: 20, percentage: 80 }, 'Artes': { correct: 2, total: 5, percentage: 40 } } },
  { id: 'p005', source: 'online' as const, student_id: '00000006-0000-4000-8000-000000000006', student_name: 'Isabela Lima',     score: 65, total_questions: 90, percentage: 72.2, graded_at: '2026-07-14T18:40:00Z', results_by_subject: { 'História': { correct: 9, total: 11, percentage: 81.8 } } },
  { id: 'p006', source: 'online' as const, student_id: '00000002-0000-4000-8000-000000000002', student_name: 'Lucas Ferreira',   score: 57, total_questions: 90, percentage: 63.3, graded_at: '2026-07-14T19:10:00Z', results_by_subject: { 'Inglês': { correct: 4, total: 5, percentage: 80 } } },
  { id: 'p007', source: 'online' as const, student_id: '00000003-0000-4000-8000-000000000003', student_name: 'Bruno Mendes',     score: 38, total_questions: 90, percentage: 42.2, graded_at: '2026-07-14T22:10:00Z', results_by_subject: { 'Língua Portuguesa': { correct: 9, total: 20, percentage: 45 } } },
];
