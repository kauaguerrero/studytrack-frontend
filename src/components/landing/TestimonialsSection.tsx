"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    text: "Opa Igor, bom dia, sou aluno do curso Opus e estou interessado em fazer o cadastro no StudyTrack",
    author: "Aluno Opus",
    role: "Pré-vestibular — Goiânia, GO",
    initial: "A",
    color: "#3B82F6",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 bg-[#F8F9FA] relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)" }}
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
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            O que os alunos dizem
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] tracking-tight">
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
              className="relative rounded-2xl p-6 border border-[#E2E8F0] overflow-hidden bg-white"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)" }}
            >
              {/* Quote icon */}
              <Quote
                className="absolute top-4 right-5 w-10 h-10 opacity-[0.06]"
                style={{ color }}
              />

              <p className="text-sm text-[#4A5568] leading-relaxed mb-5 relative z-10">&ldquo;{text}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                >
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{author}</p>
                  <p className="text-xs text-[#9CA3AF]">{role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
