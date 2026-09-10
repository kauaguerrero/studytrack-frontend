// Paleta extraída de app/templates/{class_report,individual_report}/style.css
// (backend Flask) — mantida idêntica aqui para reproduzir visualmente os
// relatórios pós-simulado reais dentro da página pública de marketing.
// Ver: studytrack-backend/app/templates/class_report/style.css
//      studytrack-backend/app/templates/individual_report/style.css

export const reportColors = {
  primary: "#2563EB",
  ink: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#475569",
  pageBg: "#F7F9FC",
  cardBg: "#FFFFFF",
  cardBorder: "#E5E9F0",
  tableHeaderBg: "#F1F5F9",
  rowDivider: "#EEF1F6",
  trackBg: "#F1F5F9",
  neutralBar: "#94A3B8",

  success: { text: "#16A34A", fill: "#22C55E", bg: "#F0FDF4", border: "#BBF7D0" },
  warning: { text: "#B45309", fill: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  critical: { text: "#DC2626", fill: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  info: { text: "#1D4ED8", bg: "#EFF6FF" },

  summaryBoxBg: "#0F172A",
  summaryBoxText: "#F8FAFC",
  summaryBoxKicker: "#94A3B8",
} as const;

export type TierLevel = "critico" | "atencao" | "dominio";

export const tierMeta: Record<TierLevel, { label: string; color: string; bg: string; border: string }> = {
  critico: { label: "Crítico", color: reportColors.critical.text, bg: reportColors.critical.bg, border: reportColors.critical.border },
  atencao: { label: "Atenção", color: reportColors.warning.text, bg: reportColors.warning.bg, border: reportColors.warning.border },
  dominio: { label: "Domínio", color: reportColors.success.text, bg: reportColors.success.bg, border: reportColors.success.border },
};

// Wordmark exatamente como aparece no cabeçalho do PDF (diferente do
// wordmark azul-400 da landing padrão) — usado só dentro das réplicas.
export const reportWordmarkClasses = {
  study: "text-[#0F172A]",
  track: "text-[#2563EB]",
};
