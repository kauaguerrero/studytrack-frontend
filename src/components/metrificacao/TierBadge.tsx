import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { tierMeta, type TierLevel } from "./reportTheme";

// Réplica dos "pills" de nível (Crítico/Atenção/Domínio) usados nas tabelas
// de Mapa de Dificuldades / Mapa de Domínio dos relatórios reais. Segue o
// mesmo padrão cva de src/components/ui/badge.tsx, mas com as cores exatas
// do backend em vez das variantes genéricas do design system.
const tierBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
);

export interface TierBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tierBadgeVariants> {
  tier: TierLevel;
}

export function TierBadge({ tier, className, ...props }: TierBadgeProps) {
  const meta = tierMeta[tier];
  return (
    <span
      className={cn(tierBadgeVariants(), className)}
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
      {meta.label}
    </span>
  );
}
