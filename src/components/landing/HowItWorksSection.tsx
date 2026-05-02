"use client";

import { motion } from "framer-motion";
import { MessageCircle, Settings, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Contato e briefing",
    description:
      "Conhecemos sua instituição: perfil de alunos, estrutura pedagógica, objetivos e identidade visual. Uma conversa real com nossa equipe — sem formulários genéricos.",
    color: "#3B82F6",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configuração da plataforma",
    description:
      "Personalizamos a plataforma com sua marca, cores e logo. Cadastramos turmas, matérias e conteúdos. Você revisa e aprova antes do lançamento.",
    color: "#818CF8",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Lançamento e suporte contínuo",
    description:
      "Seus alunos acessam com a identidade da sua escola. Suporte direto com os desenvolvedores — sem tickets, sem fila, sem terceiros.",
    color: "#34D399",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-16 sm:py-24 bg-white relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Onboarding institucional
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] tracking-tight mb-4">
            Como funciona
          </h2>
          <p className="text-[#4A5568] text-sm sm:text-base max-w-md mx-auto">
            Do primeiro contato ao lançamento para seus alunos em poucos dias.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-0 md:gap-8 lg:gap-16">

          {/* Horizontal connector — desktop only */}
          <motion.div
            className="absolute top-8 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px hidden md:block pointer-events-none"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            style={{
              background: "linear-gradient(90deg, #6366F1, #06B6D4)",
              transformOrigin: "left",
            }}
            aria-hidden
          />

          {/* Vertical connector — mobile only */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-8 bottom-8 w-px md:hidden pointer-events-none"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            style={{
              background: "linear-gradient(180deg, #6366F1, #3B82F6, #06B6D4)",
              transformOrigin: "top",
            }}
            aria-hidden
          />

          {steps.map(({ number, icon: Icon, title, description, color }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center gap-4 py-8 md:py-0"
            >
              {/* Icon circle */}
              <div className="relative z-10">
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    boxShadow: `0 0 24px ${color}20`,
                  }}
                  whileHover={{ boxShadow: `0 0 36px ${color}35` }}
                >
                  <Icon className="w-7 h-7" style={{ color }} />
                </motion.div>
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, #6366F1, #3B82F6)" }}
                >
                  {i + 1}
                </span>
              </div>

              <div className="max-w-xs md:max-w-none">
                <p className="text-xs font-bold tracking-widest mb-2" style={{ color: `${color}80` }}>
                  {number}
                </p>
                <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">{title}</h3>
                <p className="text-sm text-[#4A5568] leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
