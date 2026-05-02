"use client";

import { motion } from "framer-motion";
import { EyeOff, Zap, LineChart } from "lucide-react";

const blocks = [
  {
    icon: EyeOff,
    color: "#F87171",
    colorBg: "rgba(248,113,113,0.10)",
    colorBorder: "rgba(248,113,113,0.20)",
    number: "01",
    title: "Sem dados, você gerencia no escuro",
    text: "Quando um aluno começa a despencar, você descobre na prova — não antes. Sem métricas individuais, a intervenção pedagógica chega tarde. Cada semana sem dados é uma semana tomando decisões no escuro.",
  },
  {
    icon: Zap,
    color: "#3B82F6",
    colorBg: "rgba(59,130,246,0.10)",
    colorBorder: "rgba(59,130,246,0.20)",
    number: "02",
    title: "Com dados, você age antes que seja tarde",
    text: "O dashboard da StudyTrack mostra em tempo real quem está progredindo, quem está estagnado e quais conteúdos estão gerando mais erros na sua turma. Intervenção cirúrgica, antes da prova.",
  },
  {
    icon: LineChart,
    color: "#34D399",
    colorBg: "rgba(52,211,153,0.10)",
    colorBorder: "rgba(52,211,153,0.20)",
    number: "03",
    title: "Decisões pedagógicas baseadas em evidências",
    text: "Quais professores precisam de mais apoio? Qual conteúdo está caindo mais no simulado regional? Com a StudyTrack, sua equipe pedagógica responde essas perguntas com dados — não com intuição.",
  },
];

export function WhyMetricsSection() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{ background: "#1A1A2E" }}>
      {/* Gradient border top */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-yellow-400 mb-3">
            Por que metrificação importa
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Dados que transformam{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #60A5FA 0%, #818CF8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              gestão em resultados
            </span>
          </h2>
          <p className="text-white/45 text-base max-w-lg mx-auto">
            A diferença entre uma instituição que reage e uma que antecipa está em um único recurso:{" "}
            <strong className="text-white/70">dados de desempenho em tempo real.</strong>
          </p>
        </motion.div>

        {/* Blocks */}
        <div className="grid md:grid-cols-3 gap-6">
          {blocks.map(({ icon: Icon, color, colorBg, colorBorder, number, title, text }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl p-7 border overflow-hidden group"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Radial glow in corner */}
              <div
                className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at top right, ${colorBg} 0%, transparent 70%)` }}
                aria-hidden
              />

              {/* Number */}
              <span className="text-5xl font-black leading-none select-none mb-5 block" style={{ color: `${color}22` }}>
                {number}
              </span>

              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: colorBg, border: `1px solid ${colorBorder}` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>

              <h3 className="text-lg font-bold text-white mb-3 leading-tight">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p
            className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full border"
            style={{
              background: "rgba(234,179,8,0.08)",
              border: "1px solid rgba(234,179,8,0.20)",
              color: "#FDE68A",
            }}
          >
            Cada semana sem dados é uma semana tomando decisões pedagógicas no escuro
          </p>
        </motion.div>
      </div>
    </section>
  );
}
