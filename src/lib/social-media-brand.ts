// ============================================================
// Configuração de marca para o módulo Social Media IA
//
// Cores extraídas de:
//   - src/app/globals.css  (variáveis OKLch → hex aproximado)
//   - PortalSidebar.tsx    (classes Tailwind usadas na UI)
//
// OKLch → hex conversões relevantes:
//   oklch(0.208 0.042 265.755) ≈ #1e2d52  (--primary light, azul-marinho)
//   oklch(0.65  0.2   250)     ≈ #4178d4  (--primary dark,  azul médio)
//   oklch(0.129 0.042 264.695) ≈ #0f1b3a  (--foreground light, quase preto)
//   oklch(0.118 0.02  264.695) ≈ #0d1628  (--background dark)
//   oklch(0.168 0.03  265.755) ≈ #142035  (--card dark)
// ============================================================

export const BRAND = {
  name: "StudyTrack",
  tagline: "Estude com inteligência",

  // ── Cores ──────────────────────────────────────────────────
  colors: {
    // Azul-marinho: cor primária da marca (base light mode)
    primary:   "#1e2d52",
    // Azul brilhante: acento e destaques — blue-600 Tailwind
    accent:    "#2563eb",
    // Azul mais claro para hover/variações — blue-500 Tailwind
    accentLight: "#3b82f6",
    // Fundo geral
    background: "#ffffff",
    // Fundo suave (secondary/muted) — quase branco azulado
    surface:   "#f1f5f9",
    // Texto escuro principal
    textDark:  "#0f1b3a",
    // Texto claro (sobre fundos escuros)
    textLight: "#ffffff",
    // Texto secundário / muted
    textMuted: "#6b7fa0",
    // Azul escuro profundo (backgrounds de posts dark-themed)
    navy:      "#0d1628",
    // Gradientes principais
    gradients: {
      primary: "linear-gradient(135deg, #1e2d52 0%, #2563eb 100%)",
      accent:  "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      dark:    "linear-gradient(135deg, #0d1628 0%, #1e2d52 100%)",
      // Para posts mais vibrantes
      electric: "linear-gradient(135deg, #1e2d52 0%, #2563eb 50%, #06b6d4 100%)",
    },
  },

  // ── Tipografia ─────────────────────────────────────────────
  fonts: {
    // Fonte principal do projeto (carregada via next/font no layout)
    heading: "Geist, system-ui, sans-serif",
    body:    "Geist, system-ui, sans-serif",
    // Fallback robusto para renderização via html-to-image
    stack:   "'Geist', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  },

  // ── Assets ─────────────────────────────────────────────────
  logo: {
    // Caminho relativo à pasta public/ do Next.js
    primary:     "/logost-transparente-sombra.png",
    transparent: "/logost-transparente.png",
    // Tamanho padrão do logo nos posts (px, na escala 1x)
    defaultSize: 48,
  },

  // ── Instagram ──────────────────────────────────────────────
  instagram: {
    handle: "@studytrack",
    hashtags: {
      // Sempre incluir
      brand:       ["#studytrack", "#studytrackbr"],
      // Por tema
      educational: ["#enem", "#vestibular", "#estudos", "#dicasdeestudo", "#aprenda"],
      motivational:["#motivação", "#foconosestudos", "#disciplina", "#vaiprodisciplina"],
      meme:        ["#memesdosestudos", "#estudantesbr", "#vestibularlife"],
      informational:["#educação", "#aprendizado", "#concursos", "#preparatório"],
      promotional: ["#studytrack", "#plataformadestudos", "#enem2025"],
      // Pool geral (misturar 2-3 com os específicos)
      general:     ["#enem2025", "#vestibular2025", "#estudandopara", "#focoemdisciplina"],
    },
  },

  // ── Público-alvo (para o prompt do Claude) ─────────────────
  audience: {
    ageRange:   "16–22 anos",
    generation: "Geração Z",
    context:    "Estudantes brasileiros se preparando para ENEM, vestibulares e concursos públicos",
    language:   "Português brasileiro informal — jovem, direto, motivador. Gírias leves são ok. Sem rebuscamento acadêmico.",
    avoidances: [
      "Tom formal ou corporativo demais",
      "Linguagem acadêmica rebuscada",
      "Posts genéricos que poderiam ser de qualquer escola",
      "Excesso de texto em um único bloco visual",
    ],
  },

  // ── Tom de voz (para o prompt do Claude) ───────────────────
  voice: {
    personality: "Jovem, confiante, acessível e motivador",
    examples: [
      "Não é sorte. É treino.",
      "Cada questão certa é um passo a menos pro seu sonho.",
      "ENEM não espera. Você vai esperar?",
      "Estudar hoje. Comemorar amanhã.",
    ],
    ctaExamples: [
      "Salva esse post pra não esquecer 📌",
      "Manda pra quele amigo que precisa ver isso 👀",
      "Comenta aqui qual técnica você já usa",
      "Segue @studytrack pra mais dicas",
    ],
  },
} as const;

// ── Descrição em texto para o prompt do Claude ─────────────

export function getBrandPromptContext(): string {
  return `
IDENTIDADE DA MARCA — StudyTrack:
- Nome: ${BRAND.name}
- Tagline: "${BRAND.tagline}"
- Perfil no Instagram: ${BRAND.instagram.handle}

PALETA DE CORES:
- Primary (azul-marinho): ${BRAND.colors.primary}
- Accent (azul brilhante): ${BRAND.colors.accent}
- Accent claro: ${BRAND.colors.accentLight}
- Background: ${BRAND.colors.background}
- Surface (fundo suave): ${BRAND.colors.surface}
- Texto escuro: ${BRAND.colors.textDark}
- Texto claro: ${BRAND.colors.textLight}
- Navy (posts dark): ${BRAND.colors.navy}
- Gradiente primário: de ${BRAND.colors.primary} para ${BRAND.colors.accent}

TIPOGRAFIA:
- Família: Geist (sans-serif moderna, limpa)
- Hierarquia: título bold grande → subtítulo médio → corpo menor → CTA destacado

PÚBLICO-ALVO:
- Faixa etária: ${BRAND.audience.ageRange}
- Geração: ${BRAND.audience.generation}
- Contexto: ${BRAND.audience.context}
- Linguagem: ${BRAND.audience.language}

TOM DE VÓZ:
- ${BRAND.voice.personality}
- Exemplos de headline: ${BRAND.voice.examples.join(" | ")}
- Exemplos de CTA: ${BRAND.voice.ctaExamples.join(" | ")}

O QUE EVITAR:
${BRAND.audience.avoidances.map(a => `- ${a}`).join("\n")}
`.trim();
}

// ── Hashtags montadas por tema ──────────────────────────────

export function getHashtagsForTheme(
  theme: "educational" | "motivational" | "meme" | "informational" | "promotional"
): string[] {
  const brand   = [...BRAND.instagram.hashtags.brand];
  const general = BRAND.instagram.hashtags.general.slice(0, 2);
  const themed  = BRAND.instagram.hashtags[theme].slice(0, 8);
  // Máximo 15 hashtags no total (boas práticas do Instagram)
  return [...brand, ...themed, ...general].slice(0, 15);
}
