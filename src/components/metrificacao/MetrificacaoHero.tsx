"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

// Efeito de destaque na palavra "metrificação" inspirado no componente
// "Hero Highlight" do 21st.dev (glow animado atrás do texto), implementado
// aqui com framer-motion puro — sem instalar nenhuma dependência nova.
function HighlightedWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block px-1">
      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-1 h-[0.5em] rounded-full -z-10"
        style={{ background: "linear-gradient(135deg, #6366F1 0%, #3B82F6 60%, #06B6D4 100%)", opacity: 0.28 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      <span
        style={{
          background: "linear-gradient(135deg, #6366F1 0%, #3B82F6 60%, #06B6D4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {children}
      </span>
    </span>
  );
}

export function MetrificacaoHero() {
  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden bg-white pt-20 pb-8">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(60% 50% at 50% 0%, #EEF2FF 0%, #FFFFFF 70%)" }}
        aria-hidden
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <Image
            src="/logost-transparente-sombra.png"
            alt="Logo StudyTrack"
            width={64}
            height={64}
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
            priority
            unoptimized
          />
          <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-[#1A1A2E]">
            Study<span className="text-blue-400">Track</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A1A2E] tracking-tight leading-[1.08] mb-6"
        >
          O poder real da <HighlightedWord>metrificação</HighlightedWord> de desempenho
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg sm:text-xl text-[#4A5568] leading-relaxed max-w-2xl mx-auto"
        >
          Depois de cada simulado, a StudyTrack gera automaticamente o relatório completo da turma e de
          cada aluno — sem planilha, sem trabalho manual. Role a página e veja exatamente o que sua gestão
          pedagógica passa a enxergar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ opacity: { delay: 0.7, duration: 0.5 }, y: { delay: 1.0, duration: 1.6, repeat: Infinity } }}
          className="mt-8 flex flex-col items-center gap-1 text-[#94A3B8]"
        >
          <span className="text-xs font-medium">Continue rolando</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
    </section>
  );
}
