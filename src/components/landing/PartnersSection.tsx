"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, CheckCircle2 } from "lucide-react";

const benefits = [
  "Dashboard de métricas por aluno em tempo real",
  "Simulados com correção automática e análise por competência",
  "Identidade visual exclusiva da instituição",
  "Fluxo completo de correção de redações",
  "Hospedagem de videoaulas integrada ao plano de estudos",
];

const partners = [
  {
    slug: "opus",
    name: "Opus",
    logo: "/marketing/logo%20opus.png",
    logoWidth: 120,
    logoHeight: 48,
    location: "Goiânia, GO",
    type: "Pré-vestibular",
    description:
      "O Opus é referência em preparação para vestibulares em Goiás. Com a StudyTrack, a equipe pedagógica passou a acompanhar o desempenho de cada aluno individualmente, identificando lacunas antes das provas e ajustando o planejamento de aulas com base em dados reais.",
    colorPrimary: "#3B82F6",
  },
  {
    slug: "edificar",
    name: "Edificar",
    logo: "/marketing/LOGO-EDIFICAR.png",
    logoWidth: 140,
    logoHeight: 56,
    location: "Franca, SP",
    type: "Curso Preparatório",
    description:
      "O Edificar adotou a StudyTrack com identidade visual própria, entregando para seus alunos uma plataforma que parece 100% da escola. Simulados semanais, banco de questões personalizado e correção de redações transformaram a preparação para o ENEM em um processo estruturado e mensurável.",
    colorPrimary: "#F97316",
  },
];

export function PartnersSection() {
  return (
    <section id="parceiros" className="py-20 sm:py-28 relative overflow-hidden" style={{ background: "#0B1326" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-blue-400 mb-3">
            Casos de sucesso
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Veja alguns de nossos parceiros
          </h2>
          <p className="text-white/50 text-base max-w-md mx-auto">
            Instituições que transformaram sua gestão pedagógica com{" "}
            <span className="text-yellow-300/80 font-semibold">metrificação de desempenho</span> real.
          </p>
        </motion.div>

        {/* Logo bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex items-center justify-center gap-12 sm:gap-20 mb-14 py-5 rounded-2xl border border-white/8"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          {partners.map(({ slug, name, logo, logoWidth, logoHeight }) => (
            <div key={slug} className="opacity-60 hover:opacity-100 transition-opacity duration-300">
              <Image
                src={logo}
                alt={`Logo ${name}`}
                width={logoWidth}
                height={logoHeight}
                className="h-10 w-auto object-contain"
                unoptimized
              />
            </div>
          ))}
        </motion.div>

        {/* Partner cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {partners.map(({ slug, name, logo, logoWidth, logoHeight, location, type, description, colorPrimary }, i) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="relative rounded-2xl p-7 border border-white/10 transition-colors duration-300 hover:border-blue-500/30"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div
                    className="rounded-xl p-2.5 flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <Image
                      src={logo}
                      alt={`Logo ${name}`}
                      width={logoWidth}
                      height={logoHeight}
                      className="h-8 w-auto object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <MapPin className="w-3 h-3" /> {location}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{ background: `${colorPrimary}18`, border: `1px solid ${colorPrimary}30`, color: colorPrimary }}
                      >
                        {type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-white/55 text-sm leading-relaxed mb-5">{description}</p>

              {/* Divider */}
              <div className="h-px bg-white/6 mb-5" />

              {/* Benefits */}
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">O que a plataforma oferece</p>
              <ul className="space-y-2">
                {benefits.slice(0, 3).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs text-white/55">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Shared benefits row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl p-6 border border-white/8"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-5">
            Benefícios disponíveis para todos os parceiros
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span className="text-xs text-white/50 leading-tight">{b}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
