"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, ExternalLink } from "lucide-react";
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
    <div className="min-h-screen bg-[#0F172A] font-sans text-white overflow-x-hidden">

      {/* ══ NAVBAR ══ */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          background: isScrolled ? "rgba(11,19,38,0.88)" : "transparent",
          backdropFilter: isScrolled ? "blur(16px)" : "none",
          borderBottom: isScrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
          paddingTop: isScrolled ? "0.5rem" : "1rem",
          paddingBottom: isScrolled ? "0.5rem" : "1rem",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-1 font-extrabold text-xl tracking-tight text-white hover:opacity-80 transition-opacity"
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
              <a key={label} href={href} className="text-white/55 hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {/* Partner login */}
            <a
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm text-white/50 font-medium hover:text-white/80 transition-colors"
            >
              Já é parceiro? Acessar <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="w-px h-4 bg-white/15" />
            {/* Demo CTA */}
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onBeforeNavigate}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
              style={{ background: "linear-gradient(135deg, #3B82F6, #4F46E5)" }}
            >
              Quero uma demonstração <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-white/70 hover:text-white transition-colors"
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
              className="md:hidden border-t border-white/8 flex flex-col p-4 gap-1"
              style={{ background: "rgba(11,19,38,0.97)", backdropFilter: "blur(16px)" }}
            >
              {navLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="text-white/70 font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-white/[0.06]"
                >
                  {label}
                </a>
              ))}
              <div className="h-px bg-white/8 my-1" />
              <a
                href="/auth/login"
                className="text-white/55 font-medium min-h-[44px] flex items-center gap-2 px-3 rounded-lg hover:bg-white/[0.06]"
              >
                Já é parceiro? Acessar plataforma <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onBeforeNavigate}
                className="mt-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #3B82F6, #4F46E5)" }}
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

        {/* 2. Social proof bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="py-5 border-y border-white/7"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
            <span className="text-xs font-semibold tracking-widest text-white/25 uppercase">
              Instituições que confiam
            </span>
            <div className="flex items-center gap-10 sm:gap-14">
              {[
                { logo: "/marketing/logo%20opus.png", name: "Opus", sub: "Goiânia, GO", w: 80 },
                { logo: "/marketing/LOGO-EDIFICAR.png", name: "Edificar", sub: "Franca, SP", w: 100 },
              ].map(({ logo, name, sub, w }) => (
                <div key={name} className="flex items-center gap-3 opacity-50 hover:opacity-90 transition-opacity duration-300">
                  <Image
                    src={logo}
                    alt={`Logo ${name}`}
                    width={w}
                    height={32}
                    className="h-8 w-auto object-contain"
                    unoptimized
                  />
                  <div>
                    <p className="text-xs text-white/40">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

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
      <footer className="py-10 border-t border-white/6" style={{ background: "#060E20" }}>
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
            <p className="text-xs text-white/20 text-center">
              © 2025 StudyTrack. Todos os direitos reservados.
            </p>

            {/* Right links */}
            <div className="flex items-center gap-6 text-xs text-white/35">
              <a href="#funcionalidades" className="hover:text-white/65 transition-colors">
                Funcionalidades
              </a>
              <a href="#parceiros" className="hover:text-white/65 transition-colors">
                Parceiros
              </a>
              <a
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-blue-400/70 hover:text-blue-400 transition-colors font-medium"
              >
                Já é parceiro? Acessar plataforma <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
