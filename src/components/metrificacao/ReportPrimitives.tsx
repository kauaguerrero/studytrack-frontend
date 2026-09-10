"use client";

import { motion } from "framer-motion";
import { reportColors } from "./reportTheme";

// Blocos visuais reutilizados pelas réplicas dos dois relatórios
// (ClassReportShowcase / IndividualReportShowcase), reproduzindo os
// padrões de studytrack-backend/app/templates/{class,individual}_report/style.css:
// cards brancos com borda fina, barras horizontais de comparação, caixas
// coloridas de destaque (sucesso/alerta/crítico) e a caixa escura de síntese.

// Tabelas do relatório são largas (várias colunas) e no mobile precisam
// rolar na horizontal dentro do próprio card — sem indício nenhum, o
// usuário não percebe que dá pra arrastar. Este wrapper resolve isso com
// uma dica discreta + fade nas bordas, só abaixo do breakpoint sm.
export function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div
        className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)",
        }}
      >
        {children}
      </div>
      <p className="sm:hidden text-[11px] mt-1.5 text-center" style={{ color: reportColors.textSecondary }}>
        ⇠ arraste para o lado para ver tudo ⇢
      </p>
    </div>
  );
}

export function ReportCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: reportColors.cardBg, border: `1px solid ${reportColors.cardBorder}` }}
    >
      {children}
    </div>
  );
}

export function ReportSectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold mb-4" style={{ color: reportColors.ink }}>
      {icon}
      {children}
    </h3>
  );
}

export function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: reportColors.cardBg, border: `1px solid ${reportColors.cardBorder}` }}>
      <div className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: reportColors.textSecondary }}>
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold mt-1" style={{ color: reportColors.ink }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: reportColors.textSecondary }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function HBar({
  label,
  pct,
  valueLabel,
  color = reportColors.primary,
  emphasis = false,
}: {
  label: string;
  pct: number;
  valueLabel?: string;
  color?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5 text-sm">
        <span className={emphasis ? "font-bold" : "font-semibold"} style={{ color: reportColors.ink }}>
          {label}
        </span>
        <span className="font-bold" style={{ color: reportColors.ink }}>
          {valueLabel ?? `${pct.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: reportColors.trackBg }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(pct, 100)}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export function StackedBar({ segments }: { segments: { pct: number; color: string; label: string }[] }) {
  return (
    <div className="h-4 rounded-full overflow-hidden flex" style={{ background: reportColors.trackBg }}>
      {segments.map((s, i) => (
        <motion.div
          key={i}
          style={{ background: s.color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${s.pct}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          aria-label={s.label}
        />
      ))}
    </div>
  );
}

type Tone = "success" | "warning" | "critical" | "info";

const toneStyles: Record<Tone, { bg: string; border: string; text: string }> = {
  success: { bg: reportColors.success.bg, border: reportColors.success.border, text: reportColors.success.text },
  warning: { bg: reportColors.warning.bg, border: reportColors.warning.border, text: reportColors.warning.text },
  critical: { bg: reportColors.critical.bg, border: reportColors.critical.border, text: reportColors.critical.text },
  info: { bg: reportColors.info.bg, border: reportColors.cardBorder, text: reportColors.info.text },
};

export function HighlightBox({ tone, title, text }: { tone: Tone; title: string; text: string }) {
  const s = toneStyles[tone];
  return (
    <div className="rounded-xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: s.text }}>
        {title}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: reportColors.ink }}>
        {text}
      </p>
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm leading-relaxed"
      style={{ background: reportColors.info.bg, color: reportColors.info.text }}
    >
      {children}
    </div>
  );
}

export function SummaryBox({ kicker, text }: { kicker: string; text: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: reportColors.summaryBoxBg }}>
      <div
        className="text-[11px] font-bold uppercase tracking-wide mb-2"
        style={{ color: reportColors.summaryBoxKicker }}
      >
        {kicker}
      </div>
      <p className="text-sm sm:text-base leading-relaxed" style={{ color: reportColors.summaryBoxText }}>
        {text}
      </p>
    </div>
  );
}

// Anotação nossa (não existe no PDF original) usada para destacar, ao lado
// de cada seção replicada, o ganho de gestão pedagógica que ela representa.
export function InsightCallout({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="flex items-start gap-2.5 rounded-xl px-4 py-3 mt-4"
      style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}
    >
      <span className="mt-0.5 shrink-0 text-[#4F46E5]">{icon}</span>
      <p className="text-sm leading-relaxed text-[#3730A3]">{children}</p>
    </motion.div>
  );
}

export function ReportWordmark({ size = "text-lg" }: { size?: string }) {
  return (
    <span className={`font-extrabold ${size}`}>
      <span style={{ color: reportColors.ink }}>Study</span>
      <span style={{ color: reportColors.primary }}>track</span>
    </span>
  );
}
