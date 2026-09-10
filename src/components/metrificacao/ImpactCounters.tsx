"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { FileSearch, Users, ShieldAlert, Clock } from "lucide-react";

// Contador animado ao entrar na viewport — mesmo padrão de useCountUp já
// usado em src/components/landing/HeroSection.tsx, reaproveitado aqui.
function useCountUp(target: number, active: boolean, duration = 1400) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const t0 = Date.now();
    const tick = setInterval(() => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(tick);
    }, 16);
    return () => clearInterval(tick);
  }, [active, target, duration]);

  return count;
}

const STATS = [
  { icon: FileSearch, value: 50, suffix: "", label: "questões analisadas detalhadamente por prova" },
  { icon: Users, value: 24, suffix: "", label: "alunos com relatório individual gerado sozinho" },
  { icon: ShieldAlert, value: 4, suffix: "", label: "alunos em risco identificados antes da próxima prova" },
  { icon: Clock, value: 0, suffix: "min", label: "de trabalho manual do professor para gerar tudo isso" },
];

function CounterCard({ icon: Icon, value, suffix, label, active }: (typeof STATS)[number] & { active: boolean }) {
  const count = useCountUp(value, active);
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: "#F7F9FC", border: "1px solid #E5E9F0" }}>
      <Icon className="w-6 h-6 mx-auto mb-3 text-[#2563EB]" />
      <div className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
        {count}
        {suffix}
      </div>
      <p className="text-sm text-[#64748B] mt-2 leading-snug">{label}</p>
    </div>
  );
}

export function ImpactCounters() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div ref={ref} className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#6366F1] mb-6"
        >
          Um simulado. Um clique. Isso tudo pronto.
        </motion.p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <CounterCard key={s.label} {...s} active={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}
