"use client";

import { motion } from "framer-motion";
import { PlayCircle } from "lucide-react";

// Fonte do vídeo isolada num único objeto de config. Já publicado como
// YouTube Short não-listado: https://youtube.com/shorts/sqtccDGVq5E
// `aspect: "9:16"` porque Shorts é vertical — evita barras pretas laterais
// que apareceriam num embed 16:9 padrão. Pra trocar o vídeo no futuro, só
// mude `id` (e `aspect` para "16:9" se um dia for um vídeo horizontal).
type VideoConfig =
  | { type: "local"; src: string; aspect: "16:9" | "9:16" }
  | { type: "youtube"; id: string; aspect: "16:9" | "9:16" };

const VIDEO_CONFIG: VideoConfig = { type: "youtube", id: "sqtccDGVq5E", aspect: "9:16" };
// const VIDEO_CONFIG: VideoConfig = { type: "local", src: "/videos/case-opus.mp4", aspect: "16:9" };

export function VideoCaseSection() {
  return (
    <section className="py-10 sm:py-14 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-[#6366F1] mb-3">
            Case de sucesso — OPUS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A2E] tracking-tight mb-4">
            Veja isso na prática
          </h2>
          <p className="text-lg text-[#4A5568] max-w-2xl mx-auto leading-relaxed mb-8">
            A OPUS Redação conta como a metrificação de desempenho mudou a rotina pedagógica do cursinho.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`relative mx-auto rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(37,99,235,0.15)] ${
            VIDEO_CONFIG.aspect === "9:16" ? "max-w-xs sm:max-w-sm" : ""
          }`}
          style={{ border: "1px solid #E2E8F0" }}
        >
          <div className="relative w-full" style={{ paddingTop: VIDEO_CONFIG.aspect === "9:16" ? "177.78%" : "56.25%" }}>
            {VIDEO_CONFIG.type === "local" ? (
              <video
                className="absolute inset-0 h-full w-full"
                src={VIDEO_CONFIG.src}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${VIDEO_CONFIG.id}`}
                title="Case de sucesso StudyTrack × OPUS"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#94A3B8]">
          <PlayCircle className="w-4 h-4" />
          Vídeo com áudio — ative o som para assistir
        </div>
      </div>
    </section>
  );
}
