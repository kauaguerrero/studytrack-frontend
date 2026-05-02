"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useWhatsAppContact } from "./useWhatsAppContact";

export function FinalCTASection() {
  const { url: whatsappUrl, onBeforeNavigate } = useWhatsAppContact();

  return (
    <section
      className="py-20 sm:py-32 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #DBEAFE 60%, #ECFEFF 100%)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)" }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-4">
            Pronto para começar?
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A2E] tracking-tight mb-6 leading-[1.08]">
            Sua instituição também{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #6366F1 0%, #3B82F6 60%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              pode ter isso
            </span>
          </h2>

          <p className="text-lg text-[#4A5568] leading-relaxed mb-3 max-w-xl mx-auto">
            Leve{" "}
            <span className="text-[#4F46E5] font-semibold">metrificação de desempenho</span>,
            identidade visual exclusiva e simulados automáticos para seus alunos.
          </p>
          <p className="text-base text-[#6B7280] mb-10 max-w-md mx-auto">
            Fale com nossa equipe e veja como funciona na prática.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onBeforeNavigate}
              whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(37,211,102,0.35)" }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-bold text-base w-full sm:w-auto"
              style={{ background: "#25D366" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar com nossa equipe no WhatsApp
            </motion.a>

            <motion.a
              href="https://wa.me/5562994735412?text=Olá%2C%20quero%20agendar%20uma%20demonstração%20do%20StudyTrack%20para%20minha%20instituição"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.01 }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-[#4A5568] font-semibold text-base border border-[#C7D2FE] transition-colors duration-200 w-full sm:w-auto hover:border-[#6366F1] hover:text-[#6366F1]"
            >
              Agendar uma demonstração <ArrowRight className="w-4 h-4" />
            </motion.a>
          </div>

          <p className="mt-8 text-xs text-[#9CA3AF]">
            Resposta em até 24 horas · Sem burocracia · Onboarding assistido pela equipe
          </p>
        </motion.div>
      </div>
    </section>
  );
}
