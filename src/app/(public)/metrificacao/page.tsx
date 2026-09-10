"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { MetrificacaoHero } from "@/components/metrificacao/MetrificacaoHero";
import { ImpactCounters } from "@/components/metrificacao/ImpactCounters";
import { ClassReportShowcase } from "@/components/metrificacao/ClassReportShowcase";
import { IndividualReportShowcase } from "@/components/metrificacao/IndividualReportShowcase";
import { VideoCaseSection } from "@/components/metrificacao/VideoCaseSection";
import { MetrificacaoFinalCTA } from "@/components/metrificacao/MetrificacaoFinalCTA";

export default function MetrificacaoPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A2E] overflow-x-hidden">
      {/* ══ NAVBAR (mesmo padrão de src/app/(public)/page.tsx) ══ */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #E2E8F0",
          paddingTop: isScrolled ? "0.5rem" : "0.75rem",
          paddingBottom: isScrolled ? "0.5rem" : "0.75rem",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 font-extrabold text-xl tracking-tight text-[#1A1A2E] hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logost-transparente-sombra.png"
              alt="Logo StudyTrack"
              width={44}
              height={44}
              className="w-10 h-10 object-contain"
              priority
              unoptimized
            />
            Study<span className="text-blue-400">Track</span>
          </Link>

          <a
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-[#4A5568] font-medium hover:text-[#6366F1] transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Já tenho uma conta — </span>Acessar <LogIn className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      </motion.header>

      {/* ══ MAIN ══ */}
      <main>
        <MetrificacaoHero />
        <VideoCaseSection />
        <ImpactCounters />
        <ClassReportShowcase />
        <IndividualReportShowcase />
        <MetrificacaoFinalCTA />
      </main>

      {/* ══ FOOTER (mesmo bloco de src/app/(public)/page.tsx) ══ */}
      <footer className="py-10 border-t border-[#2D2D40]" style={{ background: "#1A1A2E" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-1 font-bold text-xl text-white">
              <Image
                src="/logost-transparente-sombra.png"
                alt="StudyTrack"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
                unoptimized
              />
              Study<span className="text-blue-400">Track</span>
            </Link>

            <p className="text-xs text-white/40 text-center">
              © 2026 StudyTrack. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-6 text-xs text-white/50">
              <Link href="/" className="hover:text-white transition-colors">
                Página inicial
              </Link>
              <a
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-blue-400/80 hover:text-blue-400 transition-colors font-medium"
              >
                Já tenho uma conta — Acessar <LogIn className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
