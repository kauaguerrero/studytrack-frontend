"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    text: "Cara, por enquanto nenhuma crítica importante, o site é realmente bem intuitivo e legal de entrar. A única sugestão seria colocar questões de outros vestibulares, mas no mais, gostei bastante 🔥",
    author: "Aluno Opus",
    role: "Pré-vestibular — Goiânia, GO",
    initial: "A",
    color: "#3B82F6",
  },
  {
    text: "Opa Igor, bom dia, sou aluno do curso Edificar e estou interessado em fazer o cadastro no StudyTrack",
    author: "Aluno Edificar",
    role: "Curso Preparatório — Franca, SP",
    initial: "A",
    color: "#F97316",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#0F172A] relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent)" }}
        aria-hidden
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-blue-400 mb-3">
            O que os alunos dizem
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Plataforma feita para quem usa
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map(({ text, author, role, initial, color }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl p-6 border border-white/10 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset" }}
            >
              {/* Quote icon */}
              <Quote
                className="absolute top-4 right-5 w-10 h-10 opacity-[0.06]"
                style={{ color }}
              />

              <p className="text-sm text-white/70 leading-relaxed mb-5 relative z-10">&ldquo;{text}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: `${color}22`, border: `1px solid ${color}33`, color }}
                >
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{author}</p>
                  <p className="text-xs text-white/35">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
