"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  BookOpen, BarChart2, ClipboardCheck, Palette,
  LogIn, FileText, Video, Headphones,
} from "lucide-react";

const features = [
  { icon: BookOpen,      title: "+5.000 questões categorizadas",              description: "Banco de questões por disciplina, tópico e nível de dificuldade, alinhado com ENEM e vestibulares." },
  { icon: BarChart2,     title: "Dashboard de métricas por aluno",            description: "Metrificação individual em tempo real: evolução histórica, lacunas identificadas, comparativo de turma." },
  { icon: ClipboardCheck,title: "Simulados com correção automática",          description: "Monte simulados personalizados e obtenha resultados instantâneos por competência e habilidade." },
  { icon: Palette,       title: "Identidade visual exclusiva",                description: "Plataforma com a logo, cores e domínio da sua escola. Seus alunos reconhecem a marca da instituição." },
  { icon: LogIn,         title: "Login dedicado para seus alunos",            description: "Portal exclusivo com gestão de turmas, matrículas e perfis de alunos — sem misturar com outras escolas." },
  { icon: FileText,      title: "Fluxo completo de correção de redações",     description: "Envio, correção por competência da ENEM e feedback estruturado. Histórico de evolução por aluno." },
  { icon: Video,         title: "Hospedagem de videoaulas",                   description: "Publique videoaulas diretamente na plataforma e vincule ao plano de estudos de cada aluno." },
  { icon: Headphones,    title: "Suporte direto com os desenvolvedores",      description: "Canal prioritário com a equipe técnica. Sem tickets, sem fila — resolução ágil para sua instituição." },
];

function TiltCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 30 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { mouseX.set(0); mouseY.set(0); }

  return (
    <motion.div
      style={{ perspective: 800 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ borderColor: "#C7D2FE" }}
        className="group relative rounded-2xl p-5 border border-[#E2E8F0] h-full transition-colors duration-300"
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)" }}
          aria-hidden
        />
        <div className="relative z-10 group/inner">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20 sm:py-28 bg-[#F8F9FA] relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)" }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Funcionalidades
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] tracking-tight mb-4">
            O que sua instituição ganha
          </h2>
          <p className="text-[#4A5568] text-base max-w-xl mx-auto">
            Uma plataforma completa de{" "}
            <span className="text-[#4F46E5] font-semibold">metrificação de desempenho</span>
            {" "}personalizada com a identidade da sua escola.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, description }, i) => (
            <TiltCard key={i} delay={i * 0.06}>
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-colors"
                style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}
                whileHover={{ scale: 1.18 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <Icon className="w-4 h-4 text-[#6366F1]" />
              </motion.div>
              <h3 className="text-sm font-semibold text-[#1A1A2E] mb-2 leading-snug">{title}</h3>
              <p className="text-xs text-[#4A5568] leading-relaxed">{description}</p>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
