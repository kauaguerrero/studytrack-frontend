"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useWhatsAppContact } from "./useWhatsAppContact";
import { useEffect, useRef, useState } from "react";

// ─── Hooks ───────────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

function useCountUp(target: number, duration = 1600, decimals = 0, delay = 500) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timeout = setTimeout(() => {
      const t0 = Date.now();
      const tick = setInterval(() => {
        const p = Math.min((Date.now() - t0) / duration, 1);
        setCount(parseFloat(((1 - Math.pow(1 - p, 3)) * target).toFixed(decimals)));
        if (p >= 1) clearInterval(tick);
      }, 16);
      return () => clearInterval(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, decimals, delay]);
  return count;
}

function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      {to.toLocaleString("pt-BR")}{suffix}
    </motion.span>
  );
}

// ─── Static data ─────────────────────────────────────────────────────────────

const BARS = [
  { label: "Mat",  pct: 72, color: "#3B82F6" },
  { label: "Port", pct: 85, color: "#818CF8" },
  { label: "Bio",  pct: 63, color: "#34D399" },
  { label: "Geo",  pct: 78, color: "#60A5FA" },
  { label: "His",  pct: 58, color: "#F59E0B" },
  { label: "Qui",  pct: 69, color: "#A78BFA" },
  { label: "Fís",  pct: 54, color: "#F87171" },
];

const TABLE_ROWS = [
  { name: "Lucas M.", subject: "Física",     gap: "Cinemática"    },
  { name: "Ana P.",   subject: "Química",    gap: "Orgânica"      },
  { name: "Pedro K.", subject: "Matemática", gap: "Trigonometria" },
];

const SPARK_DATA = [44, 51, 47, 62, 59, 71, 78];

const ALERTS = [
  { dot: "#F87171", msg: "15 alunos abaixo de 5.0 em Física" },
  { dot: "#F59E0B", msg: "Simulado ENEM I — 3 turmas pendentes" },
  { dot: "#34D399", msg: "Turma 3B superou meta semanal" },
];

const TOP_STUDENTS = [
  { name: "Beatriz O.", score: 9.4, pct: 94 },
  { name: "Rafael S.",  score: 9.1, pct: 91 },
  { name: "Mariana L.", score: 8.8, pct: 88 },
  { name: "Carlos E.",  score: 8.5, pct: 85 },
];

const FLOAT_CARDS = [
  { emoji: "📊", text: "+23% desempenho médio",    dur: 3, delay: 0,   pos: "absolute -left-24 top-8 z-20"     },
  { emoji: "✅", text: "98% simulados corrigidos",  dur: 4, delay: 1.3, pos: "absolute -right-24 top-32 z-20"   },
  { emoji: "🎯", text: "Decisão baseada em dados",  dur: 5, delay: 2.6, pos: "absolute -bottom-6 left-1/3 z-20" },
];

// Deterministic particle positions (golden-angle distribution)
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: ((i * 137.508) % 100).toFixed(2),
  y: ((i * 97.3)    % 100).toFixed(2),
  size: 1 + (i % 3) * 0.8,
  opacity: (0.15 + (i % 7) * 0.05).toFixed(2),
  dur: 3 + (i % 6),
  del: ((i * 0.37) % 5).toFixed(2),
  anim: `particle-float-${String.fromCharCode(97 + (i % 4))}`,
  blue: i % 3 === 0,
}));

// ─── HeroBg (100 % code background) ─────────────────────────────────────────

function HeroBg() {
  return (
    <>
      {/* Particle keyframes */}
      <style>{`
        @keyframes particle-float-a{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes particle-float-b{0%,100%{transform:translate(0,0)}33%{transform:translate(5px,-10px)}66%{transform:translate(-4px,5px)}}
        @keyframes particle-float-c{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
        @keyframes particle-float-d{0%,100%{transform:translate(0,0)}25%{transform:translate(-5px,-8px)}75%{transform:translate(5px,7px)}}
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Gradient base */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #0F1F3D 50%, #0F172A 100%)" }}
        />

        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Orb 1 — blue top-right */}
        <div
          className="absolute -top-32 -right-16 w-[560px] h-[560px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        {/* Orb 2 — indigo center-left */}
        <div
          className="absolute top-1/3 -left-24 w-[440px] h-[440px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        {/* Orb 3 — dark blue bottom-center */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[320px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(30,58,138,0.20) 0%, transparent 65%)",
            filter: "blur(70px)",
          }}
        />

        {/* Particles */}
        {PARTICLES.map(({ id, x, y, size, opacity, dur, del, anim, blue }) => (
          <div
            key={id}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              background: blue ? "#3B82F6" : "#ffffff",
              opacity: Number(opacity),
              animation: `${anim} ${dur}s ${del}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(9,14,28,0.65) 100%)" }}
        />
      </div>
    </>
  );
}

// ─── Dashboard inner content (reused in desktop + mobile) ────────────────────

function DashboardContent() {
  const students = useCountUp(847,   1600, 0, 500);
  const avg      = useCountUp(7.8,   1400, 1, 700);
  const exams    = useCountUp(124,   1200, 0, 600);
  const answers  = useCountUp(12847, 1800, 0, 400);
  const acerto   = useCountUp(68,    1300, 0, 650);
  const engaj    = useCountUp(91,    1100, 0, 750);

  const stats = [
    { label: "Alunos Ativos",  value: students.toLocaleString("pt-BR"),                               trend: "+12%",  color: "#34D399" },
    { label: "Média Geral",    value: avg.toLocaleString("pt-BR", { minimumFractionDigits: 1 }),       trend: "+0.8",  color: "#34D399" },
    { label: "Simulados",      value: exams.toLocaleString("pt-BR"),                                   trend: "+5",    color: "#34D399" },
    { label: "Questões Resp.", value: answers.toLocaleString("pt-BR"),                                 trend: "+847",  color: "#60A5FA" },
    { label: "Taxa de Acerto", value: `${acerto}%`,                                                    trend: "+4pp",  color: "#A78BFA" },
    { label: "Engajamento",    value: `${engaj}%`,                                                     trend: "+3%",   color: "#F59E0B" },
  ];

  // Sparkline path (viewBox 0 0 100 30)
  const maxSpark = Math.max(...SPARK_DATA);
  const sparkPoints = SPARK_DATA.map((v, i) => ({
    x: (i / (SPARK_DATA.length - 1)) * 100,
    y: 28 - (v / maxSpark) * 26,
  }));
  const sparkLine = sparkPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const sparkArea = `${sparkLine} L 100 30 L 0 30 Z`;

  return (
    <div className="p-2.5 space-y-1.5" style={{ background: "rgba(10,16,36,0.98)" }}>

      {/* ── Row 1: 6 KPI cards ── */}
      <div className="grid grid-cols-6 gap-1">
        {stats.map(({ label, value, trend, color }, i) => (
          <motion.div
            key={label}
            className="rounded-lg p-1.5 border border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.04)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.07, duration: 0.4 }}
          >
            <p className="text-[6.5px] text-white/35 mb-0.5 leading-none truncate">{label}</p>
            <p className="text-[11px] font-bold text-white tabular-nums leading-tight">{value}</p>
            <motion.p
              className="text-[6.5px] font-semibold mt-0.5"
              style={{ color }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
            >
              ↑ {trend}
            </motion.p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Bar chart + Lacunas table ── */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.025)" }}>
          <p className="text-[6.5px] text-white/30 mb-1.5 font-semibold uppercase tracking-widest">
            Acertos por Disciplina
          </p>
          <div className="flex items-end gap-0.5" style={{ height: 46 }}>
            {BARS.map(({ label, pct, color }, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-0.5 h-full">
                <div className="w-full flex-1 relative">
                  <motion.div
                    className="absolute bottom-0 w-full rounded-t-sm"
                    style={{ background: color, opacity: 0.85 }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.7 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-[5.5px] text-white/25">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.025)" }}>
          <p className="text-[6.5px] text-white/30 mb-1 font-semibold uppercase tracking-widest">
            Principais Lacunas
          </p>
          <div className="space-y-1">
            {TABLE_ROWS.map(({ name, subject, gap }, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between text-[7px] border-b border-white/[0.05] pb-1 last:border-0 last:pb-0"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.13, duration: 0.35 }}
              >
                <span className="text-white/70 font-semibold">{name}</span>
                <span className="text-white/30">{subject}</span>
                <span className="text-red-400/75 font-medium">{gap}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Sparkline + Top alunos ── */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.025)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <p className="text-[6.5px] text-white/30 font-semibold uppercase tracking-widest">Evolução Semanal</p>
            <motion.span
              className="text-[8px] font-bold"
              style={{ color: "#34D399" }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ↑ 78%
            </motion.span>
          </div>
          <svg viewBox="0 0 100 30" width="100%" height="30" style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="st-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path d={sparkArea} fill="url(#st-spark-fill)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.5 }} />
            <motion.path d={sparkLine} fill="none" stroke="#60A5FA" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 1.3, duration: 1.2, ease: "easeOut" }} />
            {sparkPoints.map((p, i) => (
              <motion.circle key={i} cx={p.x} cy={p.y} r="1.8" fill="#60A5FA"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.6 + i * 0.08, duration: 0.25 }} />
            ))}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            {["S1","S2","S3","S4","S5","S6","S7"].map(s => (
              <span key={s} style={{ fontSize: 5.5, color: "rgba(255,255,255,0.20)" }}>{s}</span>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.025)" }}>
          <p className="text-[6.5px] text-white/30 mb-1 font-semibold uppercase tracking-widest">Top Alunos</p>
          <div className="space-y-1">
            {TOP_STUDENTS.map(({ name, score, pct }, i) => (
              <motion.div key={i} className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + i * 0.1, duration: 0.35 }}>
                <span className="text-[7px] text-white/55 w-12 truncate">{name}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <motion.div
                    style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#3B82F6,#818CF8)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 1.3 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-[7px] font-bold text-white/80 tabular-nums">{score.toFixed(1)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Alertas pedagógicos (full width) ── */}
      <div className="rounded-lg p-2 border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.025)" }}>
        <p className="text-[6.5px] text-white/30 mb-1 font-semibold uppercase tracking-widest">Alertas Pedagógicos</p>
        <div style={{ display: "flex", gap: 8 }}>
          {ALERTS.map(({ dot, msg }, i) => (
            <motion.div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 4, flex: 1 }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.1, duration: 0.3 }}>
              <motion.span
                style={{ marginTop: 1, width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              />
              <span style={{ fontSize: 6.5, color: "rgba(255,255,255,0.50)", lineHeight: 1.35 }}>{msg}</span>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── SVG MacBook 3D mockup (desktop only) ────────────────────────────────────

// Laptop geometry constants (SVG user units, viewBox 0 0 640 480)
const NB = {
  // Lid
  LX: 28, LY: 2, LW: 584, LH: 370, LR: 12,
  // Screen / foreignObject
  SX: 50, SY: 22, SW: 540, SH: 330,
  // Hinge
  HX: 22, HY: 372, HW: 596, HH: 8,
  // Base y-start (= HY + HH)
  BY: 380,
  // Base bottom y
  BB: 472,
  // Keyboard first row y
  KY: 388,
  // Touchpad
  TPX: 215, TPY: 445, TPW: 210, TPH: 22,
} as const;

// Keyboard: 4 rows, decreasing key count per row
const KB_ROWS: number[] = [14, 14, 13, 11];

function MacbookMockup3D() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Base tilt + mouse delta → combined rotation
  const rawDX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 160, damping: 30 });
  const rawDY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-4, 4]), { stiffness: 160, damping: 30 });
  const rotateY = useTransform(rawDX, v => -10 + v);
  const rotateX = useTransform(rawDY, v =>   6 + v);

  // Slower parallax for floating cards
  const floatX = useSpring(useTransform(mouseX, [-0.5, 0.5], [7, -7]), { stiffness: 80, damping: 30 });
  const floatY = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 80, damping: 30 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width  - 0.5);
    mouseY.set((e.clientY - r.top)  / r.height - 0.5);
  }
  function onLeave() { mouseX.set(0); mouseY.set(0); }

  return (
    <motion.div
      className="relative select-none w-full"
      style={{ perspective: 1200 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, x: 52 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-12 rounded-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(59,130,246,0.22) 0%, transparent 68%)" }}
        aria-hidden
      />

      {/* Floating mini cards — outer: parallax, inner: float */}
      {FLOAT_CARDS.map(({ emoji, text, dur, delay, pos }) => (
        <motion.div key={text} className={`${pos} pointer-events-none`} style={{ x: floatX, y: floatY }}>
          <motion.div
            className="rounded-xl px-3 py-2 text-[11px] font-semibold text-white border border-white/12 flex items-center gap-1.5 whitespace-nowrap"
            style={{
              background: "rgba(11,19,38,0.88)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
          >
            <span>{emoji}</span>
            <span>{text}</span>
          </motion.div>
        </motion.div>
      ))}

      {/* 3-D tilt + float */}
      <motion.div
        style={{ rotateX, rotateY }}
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        {/* Projected shadow */}
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ width: "80%", height: 24, background: "rgba(0,0,0,0.5)", filter: "blur(20px)", borderRadius: "50%" }}
          aria-hidden
        />

        {/* ── SVG Laptop ── */}
        <svg
          viewBox="0 0 640 480"
          width="100%"
          style={{ display: "block", overflow: "visible" }}
          aria-label="Dashboard StudyTrack no notebook"
        >
          <defs>
            {/* Lid gradient */}
            <linearGradient id="nb-lid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2A2A2C" />
              <stop offset="100%" stopColor="#1C1C1E" />
            </linearGradient>

            {/* Lid reflection — white fade top→bottom */}
            <linearGradient id="nb-reflect" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="white" stopOpacity="0.04" />
              <stop offset="100%" stopColor="white" stopOpacity="0"    />
            </linearGradient>

            {/* Hinge — dark-to-light-to-dark horizontal */}
            <linearGradient id="nb-hinge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#111113" />
              <stop offset="20%"  stopColor="#4C4C4E" />
              <stop offset="80%"  stopColor="#4C4C4E" />
              <stop offset="100%" stopColor="#111113" />
            </linearGradient>

            {/* Base gradient (userSpaceOnUse so it follows the trapezoid coords) */}
            <linearGradient
              id="nb-base"
              x1="320" y1={NB.BY} x2="320" y2={NB.BB}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#2C2C2E" />
              <stop offset="100%" stopColor="#141416" />
            </linearGradient>

            {/* Screen subtle blue glow (top→bottom inside screen) */}
            <linearGradient id="nb-scr-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.01" />
            </linearGradient>

            {/* Clip path for screen content */}
            <clipPath id="nb-scr-clip">
              <rect x={NB.SX} y={NB.SY} width={NB.SW} height={NB.SH} rx="4" />
            </clipPath>
          </defs>

          {/* ── LID ── */}
          <rect
            x={NB.LX} y={NB.LY} width={NB.LW} height={NB.LH} rx={NB.LR}
            fill="url(#nb-lid)"
            stroke="#3C3C3E" strokeWidth="1"
          />

          {/* Notch (pill shape in top bezel) + webcam dot */}
          <rect x="306" y="7" width="28" height="12" rx="6"
            fill="#1A1A1C" stroke="#2C2C2E" strokeWidth="0.6" />
          <circle cx="320" cy="13" r="3"
            fill="#111113" stroke="#242426" strokeWidth="0.5" />
          <circle cx="319" cy="12" r="1"
            fill="rgba(255,255,255,0.12)" />

          {/* Screen background */}
          <rect
            x={NB.SX} y={NB.SY} width={NB.SW} height={NB.SH} rx="4"
            fill="#050A18"
          />

          {/* Dashboard content via foreignObject, clipped to screen rect */}
          <g clipPath="url(#nb-scr-clip)">
            <foreignObject x={NB.SX} y={NB.SY} width={NB.SW} height={NB.SH}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  background: "transparent",
                  fontFamily: "inherit",
                }}
              >
                {/* Browser chrome bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(8,14,30,0.99)",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(248,113,113,0.72)", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(251,191,36,0.72)", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(52,211,153,0.72)", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.20)", fontFamily: "monospace", letterSpacing: 0 }}>
                    app.studytrack.com.br
                  </span>
                  <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", display: "inline-block", flexShrink: 0 }} />
                </div>

                {/* Animated dashboard */}
                <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                  <DashboardContent />
                </div>
              </div>
            </foreignObject>
          </g>

          {/* Screen border glow overlay */}
          <rect
            x={NB.SX} y={NB.SY} width={NB.SW} height={NB.SH} rx="4"
            fill="url(#nb-scr-glow)"
            stroke="rgba(59,130,246,0.10)" strokeWidth="1"
            style={{ pointerEvents: "none" }}
          />

          {/* Lid reflection (top ~50% of lid) */}
          <rect
            x={NB.LX} y={NB.LY} width={NB.LW} height={NB.LH * 0.48} rx={NB.LR}
            fill="url(#nb-reflect)"
            style={{ pointerEvents: "none" }}
          />

        </svg>
      </motion.div>
    </motion.div>
  );
}

// ─── Mobile flat dashboard card ───────────────────────────────────────────────

function MobileDashboardCard() {
  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
    >
      <div
        className="rounded-2xl overflow-hidden border border-white/10"
        style={{
          boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(59,130,246,0.12) inset",
        }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-2 border-b border-white/8"
          style={{ background: "rgba(8,14,30,0.99)" }}
        >
          <span className="w-2 h-2 rounded-full bg-red-400/70" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
          <span className="w-2 h-2 rounded-full bg-green-400/70" />
          <span className="flex-1 text-center text-[9px] text-white/20 font-mono">
            app.studytrack.com.br
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <DashboardContent />
      </div>
    </motion.div>
  );
}

// ─── HeroSection ─────────────────────────────────────────────────────────────

export function HeroSection() {
  const { url: whatsappUrl, onBeforeNavigate } = useWhatsAppContact();

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 sm:pt-24 pb-16 overflow-hidden">
      <HeroBg />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Left: copy ── */}
          <div className="flex flex-col gap-5 sm:gap-6">
            {/* Badge */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(59,130,246,0.10)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#93C5FD",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Plataforma B2B para Instituições de Ensino
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.08] tracking-tight"
            >
              Sua instituição toma decisões{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #60A5FA 0%, #818CF8 60%, #A5B4FC 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                com dados ou com intuição?
              </span>
            </motion.h1>

            {/* Keyword badge */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
              <span
                className="inline-block text-sm font-bold tracking-wide px-4 py-2 rounded-lg"
                style={{
                  background: "rgba(234,179,8,0.10)",
                  border: "1px solid rgba(234,179,8,0.25)",
                  color: "#FDE68A",
                }}
              >
                METRIFICAÇÃO DE DESEMPENHO
              </span>
            </motion.div>

            {/* Sub */}
            <motion.p
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-base sm:text-lg text-white/60 leading-relaxed max-w-xl"
            >
              Metrificação de desempenho e coleta de dados para tomada de decisões pedagógicas.
              Simulados automatizados, banco de questões exclusivo e identidade visual da sua escola —
              tudo em uma plataforma 100% white-label.
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-3 pt-1"
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onBeforeNavigate}
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-xl text-white font-bold text-base transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #4F46E5)",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Quero uma demonstração
              </a>
              <a
                href="#parceiros"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl text-white/75 font-semibold text-base border border-white/12 hover:bg-white/[0.06] hover:text-white transition-all duration-200"
              >
                Ver parceiros <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1"
            >
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                  <AnimatedCounter to={5000} suffix="+" />
                </span>
                <span className="text-xs text-white/40">questões catalogadas</span>
              </div>
              <div className="w-px h-7 bg-white/10 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold text-white">100%</span>
                <span className="text-xs text-white/40">white-label</span>
              </div>
              <div className="w-px h-7 bg-white/10 hidden sm:block" />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold text-white">Real-time</span>
                <span className="text-xs text-white/40">dados de desempenho</span>
              </div>
            </motion.div>

            {/* Mobile mockup — shown on small screens only */}
            <motion.div
              custom={6}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="lg:hidden mt-2"
            >
              <MobileDashboardCard />
            </motion.div>
          </div>

          {/* ── Right: MacBook 3D (desktop only) ── */}
          <div className="hidden lg:flex items-center justify-center">
            <MacbookMockup3D />
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      >
        <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-white/25" />
        </div>
      </motion.div>
    </section>
  );
}
