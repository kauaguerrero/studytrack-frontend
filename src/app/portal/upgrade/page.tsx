"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, BookOpen, Zap, CheckCircle2, Trophy,
  ShieldCheck, CreditCard, QrCode, Copy, Loader2,
  AlertCircle, Sparkles, ChevronRight, X, Star,
  ClipboardList, Target, TrendingUp, Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TrialStats {
  streak: number;
  questions: number;
  correct: number;
  accuracy: number;
  xp: number;
  level: number;
  levelProgress: number;
  bestSubjectName: string | null;
  bestSubjectPct: number;
  worstSubjectName: string | null;
  worstSubjectPct: number;
  subjectBreakdown: Array<{ subject: string; total: number; correct: number; accuracy: number }>;
  simulados: number;
  tasksCompleted: number;
  highScore: number;
  goalsCompleted: number;
  goalsActive: number;
  activityLast30: number[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "basic",
    name: "Básico",
    priceStr: "R$ 14,90",
    perDay: "R$0,50",
    cta: "Escolher Básico",
    highlight: false,
    disabled: false,
    badge: null as string | null,
    features: ["Missão diária no WhatsApp", "Banco de questões", "Cronograma automático"],
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-200",
    checkoutGrad: "from-emerald-600 to-teal-600",
  },
  {
    id: "pro",
    name: "Pro Aprovação",
    priceStr: "R$ 29,90",
    perDay: "R$1",
    cta: "Ativar meu plano Pro",
    highlight: true,
    disabled: false,
    badge: "Mais Escolhido",
    features: ["Tudo do Básico", "Simulados completos", "Tutor de Exatas passo a passo"],
    gradient: "from-blue-600 to-indigo-700",
    ring: "ring-blue-300",
    checkoutGrad: "from-blue-600 to-indigo-700",
  },
  {
    id: "elite",
    name: "Redação Master",
    priceStr: "R$ 49,90",
    perDay: "R$1,67",
    cta: "Em breve",
    highlight: false,
    disabled: true,
    badge: "Em breve",
    features: ["Tudo do Pro", "Correção ilimitada de redações", "Feedback por competência"],
    gradient: "from-violet-500 to-fuchsia-600",
    ring: "ring-violet-200",
    checkoutGrad: "from-violet-600 to-fuchsia-700",
  },
];

const PLATFORM_NUMBERS = [
  { target: 5000, prefix: "+", suffix: "", label: "questões no banco" },
  { target: 5,    prefix: "",  suffix: "", label: "simulados ENEM completos" },
  { target: 20,   prefix: "",  suffix: "+", label: "conquistas desbloqueáveis" },
  { target: 7,    prefix: "",  suffix: "", label: "matérias cobertas" },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getLevelFromXP(xp: number) {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1; else break;
  }
  const lo = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const hi = level < thresholds.length ? thresholds[level] : lo + 1000;
  const progress = hi > lo ? Math.min((xp - lo) / (hi - lo), 1) : 1;
  return { level, progress };
}

function applyMask(name: string, value: string): string {
  if (name === "cpf")
    return value.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  if (name === "cardNumber")
    return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  if (name === "expiry") {
    const d = value.replace(/\D/g, "").slice(0, 6);
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }
  if (name === "postalCode")
    return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  if (name === "holderName") return value.toUpperCase();
  return value;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1500, skip = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (skip || target === 0) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, skip]);
  return skip ? target : count;
}

function useViewportCounter(target: number, duration: number, skip: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number;
    let triggered = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || triggered) return;
      triggered = true;
      if (skip) { setCount(target); return; }
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [target, duration, skip]);
  return { ref, count: skip ? target : count };
}

// ─── Components ────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 animate-pulse min-h-[130px]">
      <div className="w-9 h-9 rounded-xl bg-slate-100" />
      <div className="w-14 h-8 rounded-lg bg-slate-100" />
      <div className="w-20 h-3 rounded-full bg-slate-100" />
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  suffix?: string;
  sublabel?: string;
  colorGrad: string;
  delay: number;
  reducedMotion: boolean;
  progress?: number;
  progressColor?: string;
  accentBorder?: string;
  bgTint?: string;
}

function StatCard({
  icon: Icon, value, label, suffix = "", sublabel,
  colorGrad, delay, reducedMotion, progress, progressColor,
  accentBorder, bgTint,
}: StatCardProps) {
  const count = useCounter(value, 1500, reducedMotion);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`${bgTint ?? "bg-white"} rounded-2xl p-5 flex flex-col gap-2 shadow-sm overflow-hidden ${accentBorder ?? ""}`}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorGrad} flex items-center justify-center shrink-0`}>
        <Icon size={18} className="text-white" aria-hidden />
      </div>
      <div className="mt-0.5">
        <div className="text-[2.25rem] font-black text-slate-900 leading-none tabular-nums">
          {count.toLocaleString("pt-BR")}{suffix}
        </div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 tabular-nums">{sublabel}</div>
        )}
      </div>
      <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
      {progress !== undefined && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ delay: delay + 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className={`h-full rounded-full bg-gradient-to-r ${progressColor ?? colorGrad}`}
          />
        </div>
      )}
    </motion.div>
  );
}

interface RingCardProps {
  value: number;
  delay: number;
  reducedMotion: boolean;
}

function AccuracyRingCard({ value, delay, reducedMotion }: RingCardProps) {
  const count = useCounter(value, 1500, reducedMotion);
  const size = 72;
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-blue-50 rounded-2xl p-5 flex flex-col items-center gap-2 shadow-sm border-l-4 border-blue-400"
    >
      <div className="relative">
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-slate-100" strokeWidth={sw} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            className="stroke-blue-500" strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: reducedMotion ? "none" : "stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-slate-900 tabular-nums">{count}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 text-center leading-tight">de precisão</span>
    </motion.div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-9 w-full" aria-hidden>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-blue-500 transition-all duration-300"
          style={{
            height: `${Math.max(v > 0 ? (v / max) * 100 : 4, 4)}%`,
            opacity: v > 0 ? 0.35 + (v / max) * 0.65 : 0.12,
          }}
        />
      ))}
    </div>
  );
}

function ScaleNumber({
  target, prefix, suffix, label, reducedMotion, colorClass = "text-white", labelColorClass = "text-blue-200/90",
}: { target: number; prefix: string; suffix: string; label: string; reducedMotion: boolean; colorClass?: string; labelColorClass?: string }) {
  const { ref, count } = useViewportCounter(target, 1800, reducedMotion);
  return (
    <div ref={ref} className="flex flex-col items-center text-center gap-1.5 px-2">
      <span className={`text-5xl sm:text-6xl font-black tabular-nums leading-none ${colorClass}`}>
        {prefix}{count.toLocaleString("pt-BR")}{suffix}
      </span>
      <span className={`text-sm font-medium leading-tight ${labelColorClass}`}>{label}</span>
    </div>
  );
}

// ─── Inner page (uses useSearchParams) ─────────────────────────────────────────

function UpgradePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const supabase = createClient();

  // Auth
  const [authLoading, setAuthLoading] = useState(true);
  const [fullName, setFullName] = useState("Estudante");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Stats
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<TrialStats>({
    streak: 0, questions: 0, correct: 0, accuracy: 0,
    xp: 0, level: 1, levelProgress: 0,
    bestSubjectName: null, bestSubjectPct: 0,
    worstSubjectName: null, worstSubjectPct: 0,
    subjectBreakdown: [],
    simulados: 0, tasksCompleted: 0, highScore: 0,
    goalsCompleted: 0, goalsActive: 0, activityLast30: [],
  });

  // Plan & payment
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [activeTab, setActiveTab] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; paymentId: string } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    cpf: "", cardNumber: "", holderName: "", expiry: "", ccv: "", postalCode: "", addressNumber: "",
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();

      setFullName(profile?.full_name || "Estudante");
      setAvatarUrl(profile?.avatar_url || null);
      setUserId(session.user.id);
      setAuthLoading(false);

      const ref = searchParams.get("ref");
      if (ref) {
        try { localStorage.setItem("upgrade_ref", ref); } catch { /* noop */ }
      }
    };
    init();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stats ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const fetchStats = async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split("T")[0];

      const [answersRes, tasksRes, gamesRes, goalsRes, dailyRes, profileRes] = await Promise.all([
        supabase.from("user_answers").select("subject, is_correct").eq("user_id", userId),
        supabase.from("plan_tasks").select("status").eq("user_id", userId),
        supabase.from("game_sessions").select("score").eq("user_id", userId).order("score", { ascending: false }),
        supabase.from("goals").select("status").eq("user_id", userId),
        supabase.from("daily_usage").select("usage_date, questions_count, simulations_count")
          .eq("user_id", userId).gte("usage_date", thirtyDaysAgo).order("usage_date"),
        supabase.from("profiles").select("current_streak, total_points").eq("id", userId).single(),
      ]);

      const answers = answersRes.data || [];
      const totalQ = answers.length;
      const totalC = answers.filter(a => a.is_correct).length;
      const accuracy = totalQ >= 5 ? Math.round((totalC / totalQ) * 100) : 0;

      // Subject breakdown
      const subjectMap: Record<string, { total: number; correct: number }> = {};
      for (const a of answers) {
        if (!a.subject) continue;
        if (!subjectMap[a.subject]) subjectMap[a.subject] = { total: 0, correct: 0 };
        subjectMap[a.subject].total++;
        if (a.is_correct) subjectMap[a.subject].correct++;
      }
      const breakdown = Object.entries(subjectMap)
        .filter(([, v]) => v.total >= 3)
        .map(([subject, { total, correct }]) => ({ subject, total, correct, accuracy: Math.round((correct / total) * 100) }))
        .sort((a, b) => b.accuracy - a.accuracy);

      const bestSubject = breakdown[0] ?? null;
      const worstSubject = breakdown.length > 1 ? breakdown[breakdown.length - 1] : null;

      const xp = profileRes.data?.total_points || 0;
      const { level, progress: levelProgress } = getLevelFromXP(xp);

      const tasks = tasksRes.data || [];
      const simulados = (dailyRes.data || []).reduce((s, d) => s + (d.simulations_count || 0), 0);

      const activityLast30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split("T")[0];
        return (dailyRes.data || []).find(r => r.usage_date === key)?.questions_count || 0;
      });

      setStats({
        streak: profileRes.data?.current_streak || 0,
        questions: totalQ, correct: totalC, accuracy,
        xp, level, levelProgress,
        bestSubjectName: bestSubject?.subject ?? null,
        bestSubjectPct: bestSubject?.accuracy ?? 0,
        worstSubjectName: worstSubject?.subject ?? null,
        worstSubjectPct: worstSubject?.accuracy ?? 0,
        subjectBreakdown: breakdown,
        simulados,
        tasksCompleted: tasks.filter(t => t.status === "completed").length,
        highScore: gamesRes.data?.[0]?.score || 0,
        goalsCompleted: (goalsRes.data || []).filter(g => g.status === "completed").length,
        goalsActive: (goalsRes.data || []).filter(g => g.status === "active").length,
        activityLast30,
      });
      setStatsLoading(false);
    };
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Mobile CTA visibility ────────────────────────────────────────────────
  useEffect(() => {
    const heroEl = heroRef.current;
    const plansEl = plansRef.current;
    if (!heroEl || !plansEl) return;
    let heroVisible = true;
    let plansVisible = false;
    const update = () => setShowMobileCTA(!heroVisible && !plansVisible);
    const heroObs = new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); });
    const plansObs = new IntersectionObserver(([e]) => { plansVisible = e.isIntersecting; update(); }, { threshold: 0.2 });
    heroObs.observe(heroEl);
    plansObs.observe(plansEl);
    return () => { heroObs.disconnect(); plansObs.disconnect(); };
  }, []);

  // ── Plan selection ──────────────────────────────────────────────────────────
  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setPixData(null);
    setPaymentError("");
    setFormData({ cpf: "", cardNumber: "", holderName: "", expiry: "", ccv: "", postalCode: "", addressNumber: "" });
    setTimeout(() => {
      paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  };

  // ── Payment ─────────────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: applyMask(name, value) }));
  };

  const redirectAfterPayment = async () => {
    const sb = createClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = "/auth/login"; return; }
    const { data: profile } = await sb
      .from("profiles").select("handshake_completed").eq("id", session.user.id).single();
    window.location.href = profile?.handshake_completed
      ? "/portal/student/dashboard?plan_activated=1"
      : "/portal/onboarding/handshake";
  };

  const handleGeneratePix = async () => {
    if (formData.cpf.length < 14) { setPaymentError("CPF é obrigatório para a nota fiscal."); return; }
    setPaymentLoading(true); setPaymentError("");
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/subscribe-pix`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ cpf: formData.cpf, plan: selectedPlan }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar Pix.");
      setPixData(data);
      setPaymentLoading(false);
      startPolling(data.paymentId, session.access_token);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Erro ao gerar Pix.");
      setPaymentLoading(false);
    }
  };

  const handleCreditCardPayment = async () => {
    if (formData.cpf.length < 14 || formData.cardNumber.length < 16 || !formData.ccv || !formData.holderName) {
      setPaymentError("Por favor, preencha todos os campos corretamente."); return;
    }
    setPaymentLoading(true); setPaymentError("");
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const [expMonth, expYear] = formData.expiry.split("/");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/subscribe-cc`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            cpf: formData.cpf, plan: selectedPlan,
            creditCard: { holderName: formData.holderName, number: formData.cardNumber.replace(/\s/g, ""), expiryMonth: expMonth, expiryYear: expYear, ccv: formData.ccv },
            creditCardHolderInfo: { name: formData.holderName, postalCode: formData.postalCode.replace("-", ""), addressNumber: formData.addressNumber || "0" },
          }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pagamento recusado.");
      setPaymentSuccess(true);
      setTimeout(() => redirectAfterPayment(), 2500);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Pagamento recusado.");
      setPaymentLoading(false);
    }
  };

  const startPolling = (paymentId: string, token: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/check-payment-status/${paymentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.paid && data.status === "CONFIRMED") {
          clearInterval(pollingRef.current!);
          setPaymentSuccess(true);
          setTimeout(() => redirectAfterPayment(), 2500);
        }
      } catch { /* noop */ }
    }, 3000);
  };

  const copyPix = () => { if (pixData?.payload) navigator.clipboard.writeText(pixData.payload); };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const firstName = fullName.split(" ")[0];
  const initials = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
  const hasActivity = stats.activityLast30.some(v => v > 0);

  // Cards to show (filter zero values)
  const statCards: Array<{ key: string } & StatCardProps> = [
    stats.streak > 0 && {
      key: "streak", icon: Flame, value: stats.streak, label: "dias seguidos", suffix: "",
      colorGrad: "from-orange-400 to-red-500", delay: 0, reducedMotion,
      accentBorder: "border-l-4 border-orange-400", bgTint: "bg-orange-50",
    },
    stats.questions > 0 && {
      key: "questions", icon: BookOpen, value: stats.questions, label: "questões respondidas", suffix: "",
      colorGrad: "from-blue-500 to-indigo-600", delay: 0.06, reducedMotion,
      accentBorder: "border-l-4 border-blue-500", bgTint: "bg-blue-50",
    },
    stats.xp > 0 && {
      key: "xp", icon: Zap, value: stats.xp, label: "XP acumulados", suffix: "",
      sublabel: `Nível ${stats.level}`,
      colorGrad: "from-violet-500 to-purple-700", delay: 0.12, reducedMotion,
      progress: stats.levelProgress, progressColor: "from-violet-400 to-purple-600",
      accentBorder: "border-l-4 border-violet-500", bgTint: "bg-violet-50",
    },
    stats.simulados > 0 && {
      key: "simulados", icon: ClipboardList, value: stats.simulados, label: "simulados feitos", suffix: "",
      colorGrad: "from-sky-500 to-blue-600", delay: 0.18, reducedMotion,
      accentBorder: "border-l-4 border-sky-500", bgTint: "bg-sky-50",
    },
    stats.tasksCompleted > 0 && {
      key: "tasks", icon: CheckCircle2, value: stats.tasksCompleted, label: "tarefas concluídas", suffix: "",
      colorGrad: "from-emerald-500 to-teal-600", delay: 0.24, reducedMotion,
      accentBorder: "border-l-4 border-emerald-500", bgTint: "bg-emerald-50",
    },
    stats.highScore > 0 && {
      key: "speedrun", icon: Award, value: stats.highScore, label: "pontos no SpeedRun", suffix: "",
      colorGrad: "from-yellow-400 to-orange-500", delay: 0.30, reducedMotion,
      accentBorder: "border-l-4 border-yellow-400", bgTint: "bg-yellow-50",
    },
    (stats.goalsCompleted + stats.goalsActive) > 0 && {
      key: "goals", icon: Target,
      value: stats.goalsCompleted + stats.goalsActive, label: "metas criadas", suffix: "",
      sublabel: stats.goalsCompleted > 0 ? `${stats.goalsCompleted} concluída${stats.goalsCompleted > 1 ? "s" : ""}` : undefined,
      colorGrad: "from-pink-500 to-rose-600", delay: 0.36, reducedMotion,
      accentBorder: "border-l-4 border-pink-500", bgTint: "bg-pink-50",
    },
  ].filter(Boolean) as Array<{ key: string } & StatCardProps>;

  // ── Success ─────────────────────────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F4F8] p-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="bg-white rounded-[2rem] p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden"
          role="alert" aria-live="polite"
        >
          <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${selectedPlanData?.checkoutGrad || "from-blue-600 to-indigo-700"}`} />
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Acesso liberado!</h2>
          <p className="text-slate-500 font-medium mb-8">
            Bem-vindo ao plano {selectedPlanData?.name}, {firstName}.<br />
            Estamos preparando seu ambiente.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 bg-slate-50 py-3 rounded-xl animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Carregando sua plataforma...
          </div>
        </motion.div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F0F4F8]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Page ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-[#F0F4F8] pb-20">

      {/* ╔══════════════════════════════╗ */}
      {/* ║  HERO                        ║ */}
      {/* ╚══════════════════════════════╝ */}
      <section ref={heroRef} className="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-[2.5rem] overflow-hidden pt-14 pb-16">
        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-6 right-1/4 w-48 h-48 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-1/2 w-64 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2" aria-hidden />

        <div className="relative z-10 flex flex-col items-center text-center px-5">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mb-6"
          >
            {/* Pulsing rings */}
            {!reducedMotion && [1.6, 2.15, 2.75].map((scale, i) => (
              <motion.div
                key={i}
                aria-hidden
                className="absolute top-1/2 left-1/2 w-28 h-28 rounded-full border border-blue-400/25"
                style={{ x: "-50%", y: "-50%" }}
                animate={{ scale: [scale, scale + 0.07, scale], opacity: [0.5, 0.1, 0.5] }}
                transition={{ duration: 3.5, delay: i * 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            <div
              className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center
                bg-gradient-to-br from-blue-500 to-indigo-600
                ring-4 ring-white/10 ring-offset-4 ring-offset-slate-900
                shadow-[0_0_64px_rgba(59,130,246,0.5)]"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white" aria-hidden>{initials}</span>
              )}
            </div>
            {/* Trial badge */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm
                text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap
                border border-amber-400/40 shadow-md"
            >
              trial encerrado
            </motion.div>
          </motion.div>

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none mt-3"
          >
            {firstName}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-blue-200/80 mt-4 text-[15px] font-medium leading-relaxed max-w-[240px]"
          >
            Você chegou até aqui.<br />Isso já te diferencia.
          </motion.p>
        </div>
      </section>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  ACHIEVEMENTS                ║ */}
      {/* ╚══════════════════════════════╝ */}
      <section className="px-4 pt-10 pb-2 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mb-6 text-center"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">3 dias de trial</p>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Olha o que você construiu.
          </h2>
        </motion.div>

        {/* Stat cards grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {statCards.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {/* Accuracy gets special ring card treatment */}
                {stats.questions >= 5 && (
                  <AccuracyRingCard
                    value={stats.accuracy}
                    delay={0.03}
                    reducedMotion={reducedMotion}
                  />
                )}
                {statCards.map(({ key, ...props }) => (
                  <StatCard key={key} {...props} />
                ))}
              </div>
            )}

            {/* Subject insights */}
            {(stats.bestSubjectName || stats.worstSubjectName) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-3 grid grid-cols-2 gap-3"
              >
                {stats.bestSubjectName && (
                  <div className="bg-amber-50 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 border-l-4 border-amber-400">
                    <div className="flex items-center gap-1.5">
                      <Trophy size={13} className="text-amber-500 shrink-0" aria-hidden />
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Ponto forte</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 leading-tight">{stats.bestSubjectName}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.bestSubjectPct}%` }}
                        transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{stats.bestSubjectPct}% de acerto</span>
                  </div>
                )}
                {stats.worstSubjectName && stats.worstSubjectName !== stats.bestSubjectName && (
                  <div className="bg-sky-50 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5 border-l-4 border-sky-400">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-sky-500 shrink-0" aria-hidden />
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Mais espaço</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 leading-tight">{stats.worstSubjectName}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.worstSubjectPct}%` }}
                        transition={{ delay: 0.65, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{stats.worstSubjectPct}% de acerto</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Activity sparkline */}
            {hasActivity && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="mt-3 bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-300"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Atividade — últimos 30 dias
                </p>
                <Sparkline data={stats.activityLast30} />
              </motion.div>
            )}
          </>
        )}
      </section>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  LOSS ANCHOR                 ║ */}
      {/* ╚══════════════════════════════╝ */}
      <section className="mx-3 mt-10 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[2rem] overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="px-7 py-10 text-center max-w-xs mx-auto"
        >
          <p className="text-blue-200/80 text-base font-medium mb-2">
            Tudo isso fica salvo.
          </p>
          <p className="text-white text-2xl font-black leading-tight tracking-tight">
            Mas parar aqui seria um desperdício.
          </p>
          <div className="w-10 h-0.5 bg-orange-500 rounded-full mx-auto mt-6" aria-hidden />
        </motion.div>
      </section>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  PLATFORM SCALE              ║ */}
      {/* ╚══════════════════════════════╝ */}
      <section className="mx-3 mt-4 bg-white rounded-[2rem] overflow-hidden py-12 px-5 shadow-sm">
        <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
          o que ainda está esperando por você
        </p>
        <p className="text-center text-slate-900 font-black text-lg mb-10 tracking-tight">
          Você só viu 10% do que a plataforma tem.
        </p>
        <div className="grid grid-cols-2 gap-y-10 gap-x-4">
          {(["text-emerald-500", "text-blue-600", "text-violet-600", "text-orange-500"] as const).map((colorClass, idx) => {
            const n = PLATFORM_NUMBERS[idx];
            return (
              <ScaleNumber
                key={n.label}
                target={n.target}
                prefix={n.prefix}
                suffix={n.suffix}
                label={n.label}
                reducedMotion={reducedMotion}
                colorClass={colorClass}
                labelColorClass="text-slate-500"
              />
            );
          })}
        </div>
      </section>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  PLAN SELECTION              ║ */}
      {/* ╚══════════════════════════════╝ */}
      <section ref={plansRef} className="mt-10 px-4 max-w-lg mx-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
          escolha seu plano
        </p>
        <h2 className="text-xl font-black text-slate-900 text-center tracking-tight mb-6">
          A decisão certa já está destacada.
        </h2>

        <div className="flex flex-col gap-3">
          {PLANS.map((plan, i) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <React.Fragment key={plan.id}>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => !plan.disabled && handleSelectPlan(plan.id)}
                  disabled={plan.disabled}
                  aria-pressed={isSelected}
                  className={`w-full text-left rounded-2xl border-2 transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    active:scale-[0.985]
                    ${plan.disabled
                      ? "opacity-50 cursor-not-allowed border-slate-200 bg-white"
                      : isSelected
                        ? plan.highlight
                          ? `bg-gradient-to-br ${plan.gradient} border-transparent shadow-xl shadow-blue-700/20`
                          : "bg-slate-900 border-slate-700 shadow-lg"
                        : plan.highlight
                          ? `bg-blue-50/50 border-blue-300 shadow-2xl shadow-blue-200/70 ring-4 ${plan.ring}`
                          : "bg-white border-slate-200 shadow-sm hover:border-slate-300 cursor-pointer"
                    }`}
                >
                  {/* Plan header row */}
                  <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className={`text-xl font-black tracking-tight tabular-nums ${
                          isSelected ? "text-white" : "text-slate-900"
                        }`}>
                          {plan.priceStr}
                        </span>
                        <span className={`text-xs font-medium ${isSelected ? "text-white/50" : "text-slate-400"}`}>
                          /mês
                        </span>
                        {plan.badge && (
                          <span className={`flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            plan.badge === "Mais Escolhido"
                              ? "bg-orange-500 text-white"
                              : isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                          }`}>
                            {plan.badge === "Mais Escolhido" && (
                              <Star size={9} className="fill-white" aria-hidden />
                            )}
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-bold ${isSelected ? "text-white/90" : "text-slate-700"}`}>
                        {plan.name}
                      </p>
                      {!plan.disabled && (
                        <p className={`text-[11px] mt-0.5 ${isSelected ? "text-white/50" : "text-slate-400"}`}>
                          menos de {plan.perDay} por dia
                        </p>
                      )}
                    </div>

                    {/* Radio */}
                    {!plan.disabled && (
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? "border-white" : plan.highlight ? "border-blue-300" : "border-slate-300"
                      }`}>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 28 }}
                            className="w-2.5 h-2.5 rounded-full bg-white"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features chips */}
                  {!plan.disabled && (
                    <div className={`px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1 border-t ${
                      isSelected ? "border-white/10" : "border-slate-100"
                    }`}>
                      {plan.features.map((feat, j) => (
                        <span key={j} className={`flex items-center gap-1 text-[10px] font-medium ${
                          isSelected ? "text-white/65" : "text-slate-500"
                        }`}>
                          <CheckCircle2 size={9} className={isSelected ? "text-white/50" : "text-emerald-500"} aria-hidden />
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>

                {/* Inline payment expansion — appears below the selected plan */}
                <AnimatePresence>
                  {selectedPlan === plan.id && (
                    <motion.div
                      key="payment"
                      ref={paymentRef}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-[1.75rem] shadow-xl shadow-slate-200/70 overflow-hidden mt-0.5">
                        {/* Checkout header */}
                        <div className={`bg-gradient-to-r ${plan.checkoutGrad} px-5 py-4 flex items-center justify-between`}>
                          <div>
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">plano selecionado</p>
                            <p className="text-white font-black text-base mt-0.5">{plan.name} · {plan.priceStr}</p>
                          </div>
                          <button
                            onClick={() => { setSelectedPlan(null); setPixData(null); setPaymentError(""); }}
                            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Fechar pagamento"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>

                        <div className="p-5">
                          {/* Tab toggle */}
                          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 relative">
                            {(["PIX", "CREDIT_CARD"] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setPixData(null); setPaymentError(""); }}
                                className={`flex-1 relative z-10 py-2.5 text-xs font-bold transition-colors duration-200
                                  flex items-center justify-center gap-1.5
                                  ${activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                              >
                                {activeTab === tab && (
                                  <motion.div
                                    layoutId="upgPayTab"
                                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                  />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                  {tab === "PIX" ? <QrCode size={13} aria-hidden /> : <CreditCard size={13} aria-hidden />}
                                  {tab === "PIX" ? "PIX Instantâneo" : "Cartão de Crédito"}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Error message */}
                          <AnimatePresence>
                            {paymentError && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2"
                                role="alert" aria-live="polite"
                              >
                                <AlertCircle size={14} aria-hidden /> {paymentError}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Payment forms */}
                          <AnimatePresence mode="wait">
                            {activeTab === "PIX" ? (
                              <motion.div key="pix"
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.18 }} className="space-y-4"
                              >
                                {!pixData ? (
                                  <>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex gap-3 items-center">
                                      <div className="bg-white p-2 rounded-full text-emerald-600 shadow-sm shrink-0">
                                        <Sparkles size={13} aria-hidden />
                                      </div>
                                      <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                        Liberação automática em segundos. Sem limite de cartão.
                                      </p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-cpf-pix">
                                        CPF (Obrigatório)
                                      </label>
                                      <input
                                        id="upg-cpf-pix" name="cpf" value={formData.cpf} onChange={handleInputChange}
                                        placeholder="000.000.000-00" inputMode="numeric" autoComplete="off"
                                        className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm text-slate-900
                                          focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                      />
                                    </div>
                                    <button
                                      onClick={handleGeneratePix} disabled={paymentLoading}
                                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl
                                        shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2
                                        transition-all active:scale-[0.98] disabled:opacity-70"
                                    >
                                      {paymentLoading
                                        ? <Loader2 className="animate-spin" aria-label="Gerando" />
                                        : <>Gerar QR Code <ChevronRight size={18} aria-hidden /></>}
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-center space-y-5">
                                    <div className="inline-block p-1 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-[1.5rem] shadow-inner">
                                      <div className="bg-white p-4 rounded-[1.25rem]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`data:image/png;base64,${pixData.encodedImage}`}
                                          alt="QR Code para pagamento via Pix"
                                          className="w-40 h-40 object-contain mix-blend-multiply opacity-90" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <input readOnly value={pixData.payload} aria-label="Código Pix copia e cola"
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-500 font-mono truncate outline-none h-11" />
                                      <button onClick={copyPix}
                                        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-900 text-white px-3 rounded-xl
                                          hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        aria-label="Copiar código Pix">
                                        <Copy size={15} aria-hidden />
                                      </button>
                                    </div>
                                    <div className="flex justify-center items-center gap-2 text-xs font-bold text-blue-600 animate-pulse" aria-live="polite">
                                      <Loader2 size={13} className="animate-spin" aria-hidden /> Aguardando confirmação...
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <motion.div key="card"
                                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.18 }} className="space-y-3.5"
                              >
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-card">Número do Cartão</label>
                                  <div className="relative">
                                    <input id="upg-card" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange}
                                      placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number"
                                      className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" aria-hidden />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-exp">Validade</label>
                                    <input id="upg-exp" name="expiry" value={formData.expiry} onChange={handleInputChange}
                                      placeholder="MM/AAAA" inputMode="numeric" autoComplete="cc-exp"
                                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-ccv">CVV</label>
                                    <input id="upg-ccv" name="ccv" value={formData.ccv} onChange={handleInputChange}
                                      placeholder="123" maxLength={4} inputMode="numeric" autoComplete="cc-csc"
                                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-holder">Nome no Cartão</label>
                                  <input id="upg-holder" name="holderName" value={formData.holderName} onChange={handleInputChange}
                                    placeholder="NOME IMPRESSO" autoComplete="cc-name"
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-bold uppercase focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-cpf">CPF</label>
                                    <input id="upg-cpf" name="cpf" value={formData.cpf} onChange={handleInputChange}
                                      placeholder="000..." inputMode="numeric" autoComplete="off"
                                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1" htmlFor="upg-cep">CEP</label>
                                    <input id="upg-cep" name="postalCode" value={formData.postalCode} onChange={handleInputChange}
                                      placeholder="00000-000" inputMode="numeric" autoComplete="postal-code"
                                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none" />
                                  </div>
                                </div>
                                <button
                                  onClick={handleCreditCardPayment} disabled={paymentLoading}
                                  className="w-full h-14 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-2xl
                                    shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2
                                    transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
                                >
                                  {paymentLoading ? <Loader2 className="animate-spin" aria-label="Processando" /> : "Confirmar Assinatura"}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="mt-5 flex items-center justify-center gap-1.5 opacity-40">
                            <ShieldCheck size={11} className="text-slate-400" aria-hidden />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Ambiente Seguro 256-bit
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  GUARANTEE                   ║ */}
      {/* ╚══════════════════════════════╝ */}
      <div className="mt-12 text-center px-6 space-y-1.5">
        <p className="text-sm font-bold text-slate-600 flex items-center justify-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-500" aria-hidden />
          Não gostou? Devolvemos em até 7 dias.
        </p>
        <p className="text-xs text-slate-400">
          Sem fidelidade · Cancele quando quiser · Suporte via WhatsApp
        </p>
      </div>

      {/* ╔══════════════════════════════╗ */}
      {/* ║  MOBILE CTA (fixed bottom)   ║ */}
      {/* ╚══════════════════════════════╝ */}
      <AnimatePresence>
        {showMobileCTA && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/90 to-transparent sm:hidden pointer-events-none"
          >
            <button
              onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="w-full pointer-events-auto h-14 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Sparkles size={18} aria-hidden />
              Garantir meu acesso
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Export with Suspense (required for useSearchParams) ───────────────────────

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[#F0F4F8]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <UpgradePageInner />
    </Suspense>
  );
}
