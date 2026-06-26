"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metric {
  numericTarget: number;
  decimals: number;
  suffix: string;
  label: string;
  context: string;
}

interface SimplePoint {
  week: string;
  value: number;
}

interface SubjectStat {
  materia: string;
  pct: number;
}

interface Graduate {
  name: string;
  course: string;
  university: string;
  image: string;
  caption: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const metrics: Metric[] = [
  {
    numericTarget: 2188,
    decimals: 0,
    suffix: "",
    label: "Questões respondidas",
    context: "de Abr a Jun/25",
  },
  {
    numericTarget: 71.4,
    decimals: 1,
    suffix: "%",
    label: "Taxa de acerto média",
    context: "turma em Jun/25",
  },
  {
    numericTarget: 208,
    decimals: 0,
    suffix: "",
    label: "Simulados realizados",
    context: "de Abr a Jun/25",
  },
  {
    numericTarget: 89,
    decimals: 0,
    suffix: "",
    label: "Redações corrigidas",
    context: "com feedback estruturado",
  },
];

const RAW_WEEKS = [
  "Abr/1", "Abr/2", "Abr/3", "Abr/4",
  "Mai/1", "Mai/2", "Mai/3", "Mai/4",
  "Jun/1", "Jun/2", "Jun/3",
];
const RAW_TAXA = [52, 55, 51, 58, 56, 62, 60, 65, 68, 70, 71];
const RAW_SIM  = [14, 20, 17, 24, 22, 30, 27, 35, 38, 41, 44];

const acertosData: SimplePoint[] = RAW_WEEKS.map((week, i) => ({
  week,
  value: RAW_TAXA[i],
}));

const simuladosData: SimplePoint[] = RAW_WEEKS.map((week, i) => ({
  week,
  value: RAW_SIM[i],
}));

const subjectData: SubjectStat[] = [
  { materia: "Biologia",   pct: 78 },
  { materia: "Química",    pct: 65 },
  { materia: "Sociologia", pct: 72 },
  { materia: "Matemática", pct: 58 },
  { materia: "Física",     pct: 43 },
  { materia: "História",   pct: 81 },
  { materia: "Inglês",     pct: 69 },
];

const graduates: Graduate[] = [
  {
    name: "Marcus Vinícius Fernandes",
    course: "Medicina Veterinária",
    university: "Universidade Estadual de Goiás",
    image: "/marketing/aprovado1.png",
    caption: "Aluno Opus · Aprovado no vestibular UEG 2025",
  },
  {
    name: "Marcus Vinícius Rocha",
    course: "Medicina",
    university: "UniMais",
    image: "/marketing/aprovado2.png",
    caption: "Aluno Opus · Aprovado em Medicina · UniMais 2025",
  },
];

// ─── AnimatedCounter ──────────────────────────────────────────────────────────

function AnimatedCounter({
  target,
  decimals,
  suffix,
}: {
  target: number;
  decimals: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const duration = 900;
    let rafId: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(+(eased * target).toFixed(decimals));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target, decimals]);

  const formatted = count.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, delay, ease: "easeOut" },
  } as const;
}

const CHART_MARGIN = { top: 4, right: 4, left: -28, bottom: 0 } as const;

// ─── Main Component ───────────────────────────────────────────────────────────

export function PartnersSection() {
  return (
    <section
      id="parceiros"
      className="pt-20 pb-8 sm:pt-28 sm:pb-4 relative overflow-hidden"
      style={{ background: "#F8F9FA" }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Casos de sucesso
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] tracking-tight mb-4">
            Veja um de nossos parceiros
          </h2>
          <p className="text-[#4A5568] text-base max-w-md mx-auto">
            Instituições que transformaram sua gestão pedagógica com{" "}
            <span className="text-[#4F46E5] font-semibold">
              metrificação de desempenho
            </span>{" "}
            real.
          </p>
        </motion.div>

        <div className="space-y-6">

          {/* ── Ato 1 — Parceiro (sem card, flutua na seção) ────────────────── */}
          <motion.div {...fadeUp(0)}>
            <div className="flex flex-col items-center gap-2 py-6">
              <Image
                src="/marketing/logo%20opus.png"
                alt="Logo Opus"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-contain"
                style={{ background: "#1A1A2E" }}
                unoptimized
              />
              <p className="text-xl font-semibold text-gray-900">Opus</p>
              <p className="text-sm text-gray-500">Goiânia, GO</p>
              <span
                className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide"
                style={{
                  background: "#6366F118",
                  border: "1px solid #6366F130",
                  color: "#6366F1",
                }}
              >
                Pré-vestibular
              </span>
            </div>
          </motion.div>

          {/* ── Ato 2 — Métricas (aprovado, sem alteração) ──────────────────── */}
          <motion.div {...fadeUp(0.1)}>
            <div
              className="border border-gray-200 rounded-2xl bg-white shadow-sm"
              style={{ padding: "28px 32px" }}
            >
              <div className="grid grid-cols-2 gap-6 sm:flex sm:gap-0 sm:items-start">
                {metrics.map(({ numericTarget, decimals, suffix, label, context }, i) => (
                  <div
                    key={label}
                    className={`flex flex-col gap-0.5 sm:flex-1 ${
                      i === 0
                        ? "sm:pr-8"
                        : i === metrics.length - 1
                          ? "sm:pl-8 sm:border-l sm:border-gray-100"
                          : "sm:px-8 sm:border-l sm:border-gray-100"
                    }`}
                  >
                    <p
                      className="text-3xl font-bold leading-none tabular-nums"
                      style={{ color: "#6366F1" }}
                    >
                      <AnimatedCounter
                        target={numericTarget}
                        decimals={decimals}
                        suffix={suffix}
                      />
                    </p>
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-2">
                      {label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{context}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Ato 3 — 3 gráficos compactos + Forte/Fraco ─────────────────── */}
          <motion.div {...fadeUp(0.2)}>

            {/* 3 chart cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Card 1 — Evolução de acertos */}
              <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Evolução de acertos
                </p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={acertosData} margin={CHART_MARGIN}>
                      <defs>
                        <linearGradient id="acertosGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#EAB308" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F9FAFB" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 9, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        domain={[40, 80]}
                        ticks={[40, 60, 80]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={{ fontSize: 9, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md">
                              <p className="text-[10px] text-gray-400">{label}</p>
                              <p className="text-xs font-bold text-gray-900">
                                {Number(payload[0].value).toFixed(1)}%
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#EAB308"
                        strokeWidth={2}
                        fill="url(#acertosGrad)"
                        dot={{ r: 3, fill: "#EAB308", strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: "#EAB308", strokeWidth: 0 }}
                        isAnimationActive
                        animationDuration={1200}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold" style={{ color: "#6366F1" }}>
                    71,4%
                  </span>
                  <span className="text-xs text-gray-400">taxa atual</span>
                </div>
              </div>

              {/* Card 2 — Consistência de volume */}
              <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Consistência de volume
                </p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simuladosData} margin={CHART_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F9FAFB" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 9, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        domain={[0, 50]}
                        ticks={[0, 25, 50]}
                        tick={{ fontSize: 9, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md">
                              <p className="text-[10px] text-gray-400">{label}</p>
                              <p className="text-xs font-bold text-gray-900">
                                {Number(payload[0].value)} simulados
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#3B82F6", strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
                        isAnimationActive
                        animationDuration={1200}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold" style={{ color: "#6366F1" }}>
                    208
                  </span>
                  <span className="text-xs text-gray-400">simulados no período</span>
                </div>
              </div>

              {/* Card 3 — Acertos por Matéria */}
              <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Acertos por Matéria (mês)
                </p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectData}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F9FAFB" />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        type="category"
                        dataKey="materia"
                        tick={{ fontSize: 9, fill: "#6B7280" }}
                        axisLine={false}
                        tickLine={false}
                        width={68}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md">
                              <p className="text-[10px] text-gray-400">{label}</p>
                              <p className="text-xs font-bold text-gray-900">
                                {Number(payload[0].value)}%
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="pct"
                        fill="#EAB308"
                        radius={[0, 4, 4, 0]}
                        barSize={8}
                        isAnimationActive
                        animationDuration={1200}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Forte / Fraco cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Ponto Fraco */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  Ponto Fraco
                </p>
                <p className="text-xl font-bold text-gray-900 mt-2">Física</p>
                <p className="text-sm text-gray-500 mt-1">
                  43,2% de acertos · 31 questões no mês
                </p>
              </div>

              {/* Ponto Forte */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Ponto Forte
                </p>
                <p className="text-xl font-bold text-gray-900 mt-2">História</p>
                <p className="text-sm text-gray-500 mt-1">
                  81,0% de acertos · 28 questões no mês
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Ato 4 — Aprovados ───────────────────────────────────────────── */}
          <motion.div {...fadeUp(0.3)}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Aprovados pelo Opus + StudyTrack
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {graduates.map(({ name, course, university, image, caption }) => (
                <div key={name}>
                  <Image
                    src={image}
                    alt={name}
                    width={500}
                    height={700}
                    style={{ width: "100%", height: "auto" }}
                    className="rounded-2xl"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
