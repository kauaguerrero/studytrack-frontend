"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useWhatsAppContact } from "@/components/landing/useWhatsAppContact";

export function MetrificacaoFinalCTA() {
  const { url: whatsappUrl, onBeforeNavigate } = useWhatsAppContact();

  return (
    <section
      className="py-14 sm:py-20 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #DBEAFE 60%, #ECFEFF 100%)" }}
    >
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-4">
            Quer isso para a sua turma?
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A2E] tracking-tight mb-6 leading-[1.08]">
            Leve a{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #6366F1 0%, #3B82F6 60%, #06B6D4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              metrificação
            </span>{" "}
            para o seu cursinho
          </h2>

          <p className="text-lg text-[#4A5568] leading-relaxed mb-10 max-w-xl mx-auto">
            Relatório de turma, relatório individual por aluno, tudo automático depois de cada simulado —
            com a identidade visual do seu cursinho.
          </p>

          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onBeforeNavigate}
            whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(37,211,102,0.35)" }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-white font-bold text-base"
            style={{ background: "#25D366" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Falar com nossa equipe no WhatsApp
          </motion.a>

          <p className="mt-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#4A5568] font-medium hover:text-[#6366F1] transition-colors">
              Voltar para a página inicial <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
