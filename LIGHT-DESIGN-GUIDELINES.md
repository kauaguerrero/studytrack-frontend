# LIGHT DESIGN GUIDELINES

Guia para manter o modo claro com **alta legibilidade**, estética moderna e consistência de marca.

## Objetivo
- Priorizar leitura e escaneabilidade em dashboards.
- Preservar identidade da marca sem reduzir contraste.
- Evitar aparência “lavada”, cinza excessiva ou “glass sujo” no light mode.

## Direção Visual (Nome)
- `Editorial Data Clarity`

## Princípios Não Negociáveis
- Superfícies principais no light devem ser **sólidas** (`bg-white` ou neutro muito claro).
- Texto principal sempre em alto contraste (`text-slate-900` ou equivalente).
- Acento de marca deve entrar por:
  - borda tonal
  - faixa superior fina
  - ícones e estados
- Evitar misturas escuras no light (`color-mix` com preto/azul escuro em fundos de card).
- Efeito glass no light: usar com extrema moderação. Preferir **sem glass**.

## Sistema de Superfície (Light)
- Página/base: `bg-slate-50`
- Card principal: `bg-white`
- Borda default: `border-slate-200`
- Hover card: `hover:shadow-md` (sem escurecer fundo)

## Estratégia de Acento por Card
- Cada card tem `accentColor` (brand primary/secondary/accent).
- Aplicar acento em 3 pontos:
  1. Borda tonal:
     - `borderColor: color-mix(in srgb, accentColor 30-35%, #e2e8f0)`
  2. Faixa superior (2-3px):
     - `linear-gradient(90deg, accentColor, color-mix(in srgb, accentColor 40%, white))`
  3. Ícone:
     - fundo claro tonal: `color-mix(in srgb, accentColor 12-18%, white)`
     - ícone com `color: accentColor`
     - pode usar efeito glass leve no fundo do ícone

## Tipografia e Contraste
- Número/KPI: `text-slate-900`, peso alto (`font-black` ou `font-extrabold`)
- Título curto: `text-slate-600`/`700`, `font-semibold`
- Texto auxiliar: `text-slate-500`
- Nunca usar texto claro (ex: `text-white/70`) sobre fundo claro.

## Estados e Ações (Light)
- Botões primários:
  - fundo claro de marca forte (ou `brand-primary`)
  - texto escuro quando fundo for claro; texto branco quando fundo for forte
- Badges de status:
  - `pending`: `bg-amber-100 text-amber-800 border-amber-300`
  - `success`: `bg-emerald-100 text-emerald-800 border-emerald-300`
- Botões de tabela/lista devem ter contraste AA mínimo.

## Motion
- Hover discreto:
  - `hover:shadow-md`
  - opcional `hover:-translate-y-[1px]`
- Evitar “hover:brightness” agressivo no light.
- Sem micro-animações decorativas em excesso.

## Glass/Blur Policy
- Light mode:
  - padrão: **não usar glass**
  - exceção: overlays pontuais, fundo de icones de cards, nunca como fundo de card de dados
- Dark mode:
  - permitido usar glass leve para profundidade

## Implementação Recomendada (Resumo)
- `TintedCard` (light):
  - `bg-white`
  - borda tonal por accent
  - faixa superior de accent
- `KpiCard` (light):
  - mesmo padrão de superfície sólida
  - ícone com fundo tonal claro
  - tipografia de alto contraste

## Anti-Patterns (Evitar)
- Fundos de card no light com mistura de preto (`#0f172a`) ou dark tint.
- Texto médio/baixo contraste em elementos críticos.
- Glass + blur em todos os cards.
- Vários gradientes competindo entre si.

## Checklist Antes de Entregar
- [ ] Todos os cards principais estão em superfície clara sólida.
- [ ] KPIs são legíveis a 1 metro (número e label claros).
- [ ] Acento de marca aparece sem prejudicar contraste.
- [ ] Status e botões críticos têm contraste forte no light.
- [ ] Não há efeito glass dominante no light.
- [ ] Lint e validação visual mobile/desktop concluídos.

