import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Map as MapIcon,
  CheckCircle2,
  Lock,
  Flame,
  BookOpen,
  Calculator,
  Microscope,
  Globe2,
  Sparkles,
  Zap,
  Star,
  Trophy,
  Target,
  Shield,
  Sword,
  Crown,
  Crosshair,
  Swords,
  BarChart2,
  BookMarked,
  Award,
  Timer,
  Flag,
  TrendingUp,
  Medal,
  Footprints,
} from "lucide-react";

// ─── TITLES ────────────────────────────────────────────────────────────────────

const TITLES = [
  { min: 0,  max: 5,   label: "Calouro Curioso",          icon: Footprints, color: "from-slate-400 to-slate-500",    text: "text-slate-500"  },
  { min: 5,  max: 15,  label: "Desbravador Iniciante",     icon: MapIcon,    color: "from-green-400 to-emerald-500",  text: "text-emerald-600" },
  { min: 15, max: 30,  label: "Estudante Dedicado",        icon: BookMarked, color: "from-blue-400 to-sky-500",       text: "text-blue-600"  },
  { min: 30, max: 50,  label: "Guerreiro do Conhecimento", icon: Sword,      color: "from-violet-400 to-purple-500",  text: "text-violet-600" },
  { min: 50, max: 70,  label: "Estrategista Avançado",     icon: Target,     color: "from-orange-400 to-amber-500",   text: "text-amber-600" },
  { min: 70, max: 85,  label: "Mestre em Formação",        icon: Shield,     color: "from-rose-400 to-pink-500",      text: "text-rose-600"  },
  { min: 85, max: 95,  label: "Sábio do ENEM",             icon: Star,       color: "from-yellow-400 to-orange-500",  text: "text-yellow-600" },
  { min: 95, max: 101, label: "Lenda Aprovada",            icon: Crown,      color: "from-yellow-300 to-yellow-500",  text: "text-yellow-500" },
];

function getTitle(pct: number) {
  return TITLES.find(t => pct >= t.min && pct < t.max) ?? TITLES[0];
}

// ─── SUBJECTS ──────────────────────────────────────────────────────────────────

const SUBJECT_META: Record<string, {
  label: string; shortLabel: string;
  icon: any; gradient: string; ring: string; glow: string;
}> = {
  "Linguagens": {
    label: "Linguagens e Códigos", shortLabel: "Linguagens",
    icon: BookOpen,
    gradient: "from-rose-500 to-pink-600",
    ring: "ring-rose-400",
    glow: "shadow-rose-200 dark:shadow-rose-900/40",
  },
  "Matemática": {
    label: "Matemática e suas Tecnologias", shortLabel: "Matemática",
    icon: Calculator,
    gradient: "from-blue-500 to-indigo-600",
    ring: "ring-blue-400",
    glow: "shadow-blue-200 dark:shadow-blue-900/40",
  },
  "Ciências da Natureza": {
    label: "Ciências da Natureza", shortLabel: "Ciências Nat.",
    icon: Microscope,
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-400",
    glow: "shadow-emerald-200 dark:shadow-emerald-900/40",
  },
  "Ciências Humanas": {
    label: "Ciências Humanas", shortLabel: "Ciências Hum.",
    icon: Globe2,
    gradient: "from-amber-500 to-orange-600",
    ring: "ring-amber-400",
    glow: "shadow-amber-200 dark:shadow-amber-900/40",
  },
};

function getSubjectMeta(subject: string) {
  return SUBJECT_META[subject] ?? {
    label: subject, shortLabel: subject,
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-600",
    ring: "ring-violet-400",
    glow: "shadow-violet-200 dark:shadow-violet-900/40",
  };
}

// ─── BADGES ────────────────────────────────────────────────────────────────────

type BadgeDef = {
  id: string; name: string; desc: string;
  icon: any; color: string; bgColor: string;
  check: (s: Stats) => boolean;
  progress?: (s: Stats) => { current: number; max: number };
};

type Stats = {
  totalAnswers: number;
  totalCorrect: number;
  accuracy: number;
  completedNodes: number;
  gameSessions: number;
  completedGoals: number;
  streak: number;
};

const BADGES: BadgeDef[] = [
  {
    id: "first-question",
    name: "Primeira Questão",
    desc: "Responda sua 1ª questão",
    icon: Zap,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40",
    check: s => s.totalAnswers >= 1,
  },
  {
    id: "50-questions",
    name: "Meio Centenário",
    desc: "50 questões respondidas",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    check: s => s.totalAnswers >= 50,
    progress: s => ({ current: Math.min(s.totalAnswers, 50), max: 50 }),
  },
  {
    id: "250-questions",
    name: "Veterano",
    desc: "250 questões respondidas",
    icon: Award,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/40",
    check: s => s.totalAnswers >= 250,
    progress: s => ({ current: Math.min(s.totalAnswers, 250), max: 250 }),
  },
  {
    id: "500-questions",
    name: "Lendário",
    desc: "500 questões respondidas",
    icon: Medal,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
    check: s => s.totalAnswers >= 500,
    progress: s => ({ current: Math.min(s.totalAnswers, 500), max: 500 }),
  },
  {
    id: "accuracy-70",
    name: "Mira Certeira",
    desc: "70%+ de precisão (mín. 30 questões)",
    icon: Crosshair,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    check: s => s.totalAnswers >= 30 && s.accuracy >= 70,
  },
  {
    id: "accuracy-90",
    name: "Atirador de Elite",
    desc: "90%+ de precisão (mín. 50 questões)",
    icon: Swords,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/40",
    check: s => s.totalAnswers >= 50 && s.accuracy >= 90,
  },
  {
    id: "5-nodes",
    name: "Explorador",
    desc: "5 tópicos concluídos",
    icon: MapIcon,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
    check: s => s.completedNodes >= 5,
    progress: s => ({ current: Math.min(s.completedNodes, 5), max: 5 }),
  },
  {
    id: "25-nodes",
    name: "Cartógrafo",
    desc: "25 tópicos concluídos",
    icon: BarChart2,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40",
    check: s => s.completedNodes >= 25,
    progress: s => ({ current: Math.min(s.completedNodes, 25), max: 25 }),
  },
  {
    id: "50-nodes",
    name: "Mestre dos Tópicos",
    desc: "50 tópicos concluídos",
    icon: TrendingUp,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
    check: s => s.completedNodes >= 50,
    progress: s => ({ current: Math.min(s.completedNodes, 50), max: 50 }),
  },
  {
    id: "speedrun",
    name: "Velocista",
    desc: "Jogue 1 partida no Speedrun",
    icon: Timer,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    check: s => s.gameSessions >= 1,
  },
  {
    id: "5-goals",
    name: "Meta Cumprida",
    desc: "Conclua 5 metas",
    icon: Flag,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    check: s => s.completedGoals >= 5,
    progress: s => ({ current: Math.min(s.completedGoals, 5), max: 5 }),
  },
  {
    id: "streak-7",
    name: "Imparável",
    desc: "7 dias de sequência de estudos",
    icon: Flame,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    check: s => s.streak >= 7,
    progress: s => ({ current: Math.min(s.streak, 7), max: 7 }),
  },
];

// ─── PAGE ──────────────────────────────────────────────────────────────────────

export default async function StudyMapPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/login");

  const [
    { data: nodes },
    { data: progress },
    { data: answers },
    { count: gameSessions },
    { count: completedGoals },
    { data: profileData },
  ] = await Promise.all([
    supabase.from("knowledge_nodes").select("id, subject, topic, difficulty, importance_score").order("subject"),
    supabase.from("student_progress").select("node_id, status, mastery_level").eq("user_id", user.id),
    supabase.from("user_answers").select("subject, is_correct"),
    supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
    supabase.from("profiles").select("current_streak").eq("id", user.id).single(),
  ]);

  // ── Compute progress per node
  const progressMap = new Map<string, { status: string; mastery_level: number }>();
  for (const p of progress || []) {
    progressMap.set(p.node_id, { status: p.status || "locked", mastery_level: p.mastery_level || 0 });
  }

  const nodesWithProg = (nodes || []).map(n => ({
    ...n,
    status: progressMap.get(n.id)?.status || "locked",
    mastery_level: progressMap.get(n.id)?.mastery_level || 0,
  }));

  // ── Group by subject
  const groupedMap = new Map<string, typeof nodesWithProg>();
  for (const n of nodesWithProg) {
    const arr = groupedMap.get(n.subject) || [];
    arr.push(n);
    groupedMap.set(n.subject, arr);
  }

  type SubjectSummary = {
    subject: string;
    meta: ReturnType<typeof getSubjectMeta>;
    completed: number;
    total: number;
    weightedProgress: number;
  };

  const subjects: SubjectSummary[] = Array.from(groupedMap.entries()).map(([subject, sNodes]) => {
    const completed = sNodes.filter(n => n.status === "completed" || n.status === "mastered").length;
    const totalWeight = sNodes.reduce((s, n) => s + n.importance_score, 0);
    const earnedWeight = sNodes
      .filter(n => n.status === "completed" || n.status === "mastered")
      .reduce((s, n) => s + n.importance_score, 0);
    return {
      subject,
      meta: getSubjectMeta(subject),
      completed,
      total: sNodes.length,
      weightedProgress: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    };
  });

  // Sort by a fixed canonical ENEM order, then fallback alpha
  const ENEM_ORDER = ["Linguagens", "Ciências Humanas", "Ciências da Natureza", "Matemática"];
  subjects.sort((a, b) => {
    const ia = ENEM_ORDER.indexOf(a.subject);
    const ib = ENEM_ORDER.indexOf(b.subject);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.subject.localeCompare(b.subject);
  });

  // ── Global stats
  const totalNodes = nodesWithProg.length;
  const totalCompleted = nodesWithProg.filter(n => n.status === "completed" || n.status === "mastered").length;
  const overallPercent = totalNodes > 0 ? Math.round((totalCompleted / totalNodes) * 100) : 0;

  const totalAnswers = (answers || []).length;
  const totalCorrect = (answers || []).filter(a => a.is_correct).length;
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const stats: Stats = {
    totalAnswers,
    totalCorrect,
    accuracy,
    completedNodes: totalCompleted,
    gameSessions: gameSessions ?? 0,
    completedGoals: completedGoals ?? 0,
    streak: profileData?.current_streak ?? 0,
  };

  // ── Title
  const currentTitle = getTitle(overallPercent);
  const nextTitle = TITLES.find(t => t.min > overallPercent);
  const titleProgress = nextTitle
    ? Math.round(((overallPercent - currentTitle.min) / (currentTitle.max - currentTitle.min)) * 100)
    : 100;

  // ── Badges
  const unlockedBadges = BADGES.filter(b => b.check(stats));
  const lockedBadges = BADGES.filter(b => !b.check(stats));

  return (
    <div className="min-h-screen pb-24 max-w-3xl mx-auto">

      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/portal/student/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar ao Dashboard
        </Link>
      </div>

      {/* ── SECTION 1: HERO / TÍTULO ─────────────────────────────────── */}
      <TitleHero
        title={currentTitle}
        nextTitle={nextTitle}
        overallPercent={overallPercent}
        titleProgress={titleProgress}
        totalCompleted={totalCompleted}
        totalNodes={totalNodes}
        unlockedCount={unlockedBadges.length}
        totalBadges={BADGES.length}
      />

      {/* ── SECTION 2: ROADMAP ───────────────────────────────────────── */}
      <div className="mt-10 mb-10">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 inline-block" />
          Rota do ENEM
        </h2>
        <Roadmap subjects={subjects} overallPercent={overallPercent} />
      </div>

      {/* ── SECTION 3: BADGES ────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 inline-block" />
          Conquistas
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {unlockedBadges.length}/{BADGES.length} desbloqueadas
        </p>
        <BadgeGrid badges={BADGES} stats={stats} />
      </div>

    </div>
  );
}

// ─── TITLE HERO ────────────────────────────────────────────────────────────────

function TitleHero({
  title, nextTitle, overallPercent, titleProgress,
  totalCompleted, totalNodes, unlockedCount, totalBadges,
}: {
  title: typeof TITLES[number];
  nextTitle: typeof TITLES[number] | undefined;
  overallPercent: number;
  titleProgress: number;
  totalCompleted: number;
  totalNodes: number;
  unlockedCount: number;
  totalBadges: number;
}) {
  const TitleIcon = title.icon;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* subtle gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${title.color} opacity-[0.06]`} />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Badge icon */}
          <div className={`shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${title.color} flex items-center justify-center shadow-xl ${
            title.min >= 95 ? "ring-4 ring-yellow-400/50" : ""
          }`}>
            <TitleIcon size={36} className="text-white drop-shadow" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Seu Título
            </p>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${title.text}`}>
              {title.label}
            </h1>

            {nextTitle && (
              <p className="text-xs text-muted-foreground mt-1">
                Próximo: <span className="font-semibold text-foreground">{nextTitle.label}</span>
                {" "}— alcance {nextTitle.min}% do edital
              </p>
            )}

            {/* Progress to next title */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{overallPercent}% do edital coberto</span>
                {nextTitle && <span>{nextTitle.min}%</span>}
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${title.color} transition-all duration-1000`}
                  style={{ width: `${titleProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border">
          <MiniStat label="Tópicos concluídos" value={`${totalCompleted}/${totalNodes}`} />
          <MiniStat label="Cobertura do edital" value={`${overallPercent}%`} />
          <MiniStat label="Conquistas" value={`${unlockedCount}/${totalBadges}`} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg sm:text-xl font-black text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ─── ROADMAP ───────────────────────────────────────────────────────────────────

function Roadmap({ subjects, overallPercent }: {
  subjects: Array<{ subject: string; meta: ReturnType<typeof getSubjectMeta>; completed: number; total: number; weightedProgress: number }>;
  overallPercent: number;
}) {
  // Build checkpoints: Start + each subject + End
  const allCheckpoints = [
    { type: "start" as const },
    ...subjects.map(s => ({ type: "subject" as const, data: s })),
    { type: "end" as const },
  ];

  return (
    <div className="relative">
      {allCheckpoints.map((checkpoint, idx) => {
        const isLeft = idx % 2 === 0; // alternates: left, right, left...
        const isLast = idx === allCheckpoints.length - 1;
        const isFirst = idx === 0;

        return (
          <div key={idx} className="relative">
            {/* Connector line going down */}
            {!isLast && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[64px] w-0.5 h-[calc(100%-16px)] z-0">
                {/* Background track */}
                <div className="absolute inset-0 bg-border rounded-full" />
                {/* Colored fill based on progress — fill if subject is done */}
                {checkpoint.type === "subject" && checkpoint.data.weightedProgress >= 50 && (
                  <div className={`absolute inset-0 bg-gradient-to-b ${checkpoint.data.meta.gradient} rounded-full`} />
                )}
                {checkpoint.type === "start" && (
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-400 to-blue-500 rounded-full" />
                )}
              </div>
            )}

            {/* Checkpoint row — alternates alignment on desktop */}
            <div className={`relative z-10 flex items-start gap-4 pb-8 ${
              isLeft ? "flex-row" : "flex-row-reverse sm:flex-row-reverse"
            }`}>

              {/* Content card — hidden on mobile for non-left if special, always shown on sm+ */}
              <div className={`flex-1 ${isLeft ? "pr-4 sm:pr-6" : "pl-4 sm:pl-6"} ${
                !isLeft ? "hidden sm:block" : ""
              }`}>
                {checkpoint.type === "start" && (
                  <StartCard />
                )}
                {checkpoint.type === "subject" && isLeft && (
                  <SubjectCard data={checkpoint.data} />
                )}
                {checkpoint.type === "end" && isLeft && (
                  <EndCard />
                )}
              </div>

              {/* Center node */}
              <div className="shrink-0 flex flex-col items-center">
                {checkpoint.type === "start" && <StartNode />}
                {checkpoint.type === "subject" && <SubjectNode data={checkpoint.data} />}
                {checkpoint.type === "end" && <EndNode />}
              </div>

              {/* Right side card */}
              <div className={`flex-1 ${isLeft ? "pl-4 sm:pl-6" : "pr-4 sm:pr-6"}`}>
                {checkpoint.type === "start" && !isLeft && (
                  <StartCard />
                )}
                {checkpoint.type === "subject" && !isLeft && (
                  <SubjectCard data={checkpoint.data} />
                )}
                {checkpoint.type === "end" && !isLeft && (
                  <EndCard />
                )}
                {/* Empty spacer for left-side items on right column */}
                {((checkpoint.type === "start" && isLeft) ||
                  (checkpoint.type === "subject" && isLeft) ||
                  (checkpoint.type === "end" && isLeft)) && (
                  <div />
                )}
              </div>
            </div>

            {/* Mobile: show card below node for right-side items */}
            {!isLeft && checkpoint.type === "subject" && (
              <div className="sm:hidden -mt-4 pb-4 pl-2">
                <SubjectCard data={checkpoint.data} />
              </div>
            )}
            {!isLeft && checkpoint.type === "end" && (
              <div className="sm:hidden -mt-4 pb-4 pl-2">
                <EndCard />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StartNode() {
  return (
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg ring-4 ring-background">
      <Footprints size={22} className="text-white" />
    </div>
  );
}

function StartCard() {
  return (
    <div className="bg-muted/60 border border-border rounded-2xl p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Início</p>
      <p className="font-bold text-foreground text-sm mt-0.5">Início da Jornada</p>
      <p className="text-xs text-muted-foreground mt-1">Todo grande estudante começa do zero.</p>
    </div>
  );
}

function SubjectNode({ data }: { data: { meta: ReturnType<typeof getSubjectMeta>; weightedProgress: number } }) {
  const Icon = data.meta.icon;
  const done = data.weightedProgress >= 100;
  const active = data.weightedProgress > 0;

  return (
    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${data.meta.gradient} flex items-center justify-center shadow-lg ring-4 ring-background ${
      done ? "ring-2 ring-offset-2 ring-offset-background " + data.meta.ring : ""
    } relative`}>
      <Icon size={22} className="text-white" />
      {done && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-background">
          <CheckCircle2 size={11} className="text-white" />
        </span>
      )}
      {active && !done && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-background">
          <Flame size={10} className="text-white" />
        </span>
      )}
    </div>
  );
}

function SubjectCard({ data }: { data: { subject: string; meta: ReturnType<typeof getSubjectMeta>; completed: number; total: number; weightedProgress: number } }) {
  const { meta, completed, total, weightedProgress } = data;

  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-foreground text-sm">{meta.shortLabel}</p>
        <span className={`text-sm font-black tabular-nums bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent`}>
          {weightedProgress}%
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-700`}
          style={{ width: `${weightedProgress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {completed}/{total} tópicos concluídos
      </p>
    </div>
  );
}

function EndNode() {
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-xl ring-4 ring-background ring-offset-2 ring-offset-background ring-yellow-400/50">
      <Trophy size={26} className="text-white drop-shadow" />
    </div>
  );
}

function EndCard() {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-2xl p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Destino Final</p>
      <p className="font-bold text-foreground text-sm mt-0.5">Aprovação no ENEM</p>
      <p className="text-xs text-muted-foreground mt-1">Continue estudando. Você vai chegar lá!</p>
    </div>
  );
}

// ─── BADGE GRID ────────────────────────────────────────────────────────────────

function BadgeGrid({ badges, stats }: { badges: BadgeDef[]; stats: Stats }) {
  // Unlocked first, then locked
  const sorted = [...badges].sort((a, b) => {
    const au = a.check(stats) ? 0 : 1;
    const bu = b.check(stats) ? 0 : 1;
    return au - bu;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {sorted.map(badge => {
        const unlocked = badge.check(stats);
        const prog = badge.progress?.(stats);
        const Icon = badge.icon;

        return (
          <div
            key={badge.id}
            className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col items-center text-center transition-all ${
              unlocked
                ? "bg-card border-border shadow-sm"
                : "bg-muted/40 border-border/50 opacity-60"
            }`}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
              unlocked ? badge.bgColor : "bg-muted"
            }`}>
              {unlocked ? (
                <Icon size={22} className={badge.color} />
              ) : (
                <Lock size={18} className="text-muted-foreground" />
              )}
            </div>

            <p className={`text-sm font-bold leading-tight mb-1 ${
              unlocked ? "text-foreground" : "text-muted-foreground"
            }`}>
              {badge.name}
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">{badge.desc}</p>

            {/* Progress bar for partially completed badges */}
            {!unlocked && prog && (
              <div className="w-full mt-3">
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/50 rounded-full"
                    style={{ width: `${Math.round((prog.current / prog.max) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  {prog.current}/{prog.max}
                </p>
              </div>
            )}

            {/* Unlocked checkmark */}
            {unlocked && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
