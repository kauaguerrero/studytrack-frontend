"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LogIn } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhyMetricsSection } from "@/components/landing/WhyMetricsSection";
import { PartnersSection } from "@/components/landing/PartnersSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { useWhatsAppContact } from "@/components/landing/useWhatsAppContact";

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Parceiros", href: "#parceiros" },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { url: demoUrl, onBeforeNavigate } = useWhatsAppContact();

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A2E] overflow-x-hidden">

      {/* ══ NAVBAR ══ */}
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

          {/* Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href} className="text-[#4A5568] hover:text-[#6366F1] transition-colors">
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {/* Partner login */}
            <a
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm text-[#4A5568] font-medium hover:text-[#6366F1] transition-colors"
            >
              Já tenho uma conta — Acessar <LogIn className="w-3.5 h-3.5" />
            </a>
            <div className="w-px h-4 bg-[#E2E8F0]" />
            {/* Demo CTA */}
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onBeforeNavigate}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]"
              style={{ background: "linear-gradient(135deg, #6366F1, #3B82F6)" }}
            >
              Quero uma demonstração <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[#4A5568] hover:text-[#1A1A2E] transition-colors"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[#E2E8F0] flex flex-col p-4 gap-1"
              style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)" }}
            >
              {navLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[#4A5568] font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-[#F8F9FA]"
                >
                  {label}
                </a>
              ))}
              <div className="h-px bg-[#E2E8F0] my-1" />
              <a
                href="/auth/login"
                className="text-[#4A5568] font-medium min-h-[44px] flex items-center gap-2 px-3 rounded-lg hover:bg-[#F8F9FA]"
              >
                Já tenho uma conta — Acessar <LogIn className="w-3.5 h-3.5" />
              </a>
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onBeforeNavigate}
                className="mt-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #6366F1, #3B82F6)" }}
              >
                Quero uma demonstração <ArrowRight className="w-4 h-4" />
              </a>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ══ MAIN ══ */}
      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 3. Features */}
        <FeaturesSection />

        {/* 4. How it works */}
        <HowItWorksSection />

        {/* 5. Why metrics (new) */}
        <WhyMetricsSection />

        {/* 6. Partners */}
        <PartnersSection />

        {/* 7. Testimonials */}
        <TestimonialsSection />

        {/* 8. Final CTA */}
        <FinalCTASection />
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="py-10 border-t border-[#2D2D40]" style={{ background: "#1A1A2E" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Logo */}
            <div className="flex items-center gap-1 font-bold text-xl text-white">
              <Image
                src="/logost-transparente-sombra.png"
                alt="StudyTrack"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
                unoptimized
              />
              Study<span className="text-blue-400">Track</span>
            </div>

            {/* Center */}
            <p className="text-xs text-white/40 text-center">
              © 2025 StudyTrack. Todos os direitos reservados.
            </p>

            {/* Right links */}
            <div className="flex items-center gap-6 text-xs text-white/50">
              <a href="#funcionalidades" className="hover:text-white transition-colors">
                Funcionalidades
              </a>
              <a href="#parceiros" className="hover:text-white transition-colors">
                Parceiros
              </a>
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
