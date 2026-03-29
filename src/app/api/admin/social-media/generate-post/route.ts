import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getBrandPromptContext, getHashtagsForTheme } from '@/lib/social-media-brand';
import { processDalleBackgrounds } from '@/app/api/admin/social-media/_dalle-utils';
import type {
  GeneratePostPayload,
  ClaudePostResponse,
  GeneratedPost,
  SocialMediaTheme,
} from '@/types/social-media';

// DALL-E + download do background pode levar até ~40s num carrossel
export const maxDuration = 120;

const FORMAT_LABEL: Record<string, string> = {
  feed_square:   'Post Feed quadrado (1080×1080px)',
  feed_portrait: 'Post Feed retrato (1080×1350px)',
  story:         'Story (1080×1920px)',
  carousel:      'Carrossel (1080×1350px por slide)',
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const payload = body as GeneratePostPayload;
  const { format, slide_count, mode, idea, admin_prompt, material_urls } = payload;

  if (!format || !mode) {
    return NextResponse.json({ error: 'Campos format e mode são obrigatórios' }, { status: 400 });
  }
  if (mode === 'directed' && !admin_prompt?.trim()) {
    return NextResponse.json({ error: 'Campo admin_prompt é obrigatório no modo directed' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado' }, { status: 500 });
  }

  // Histórico recente para evitar repetição
  const { data: recentPosts } = await auth.supabaseAdmin
    .from('social_media_posts')
    .select('title, theme')
    .eq('admin_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const recentSummary = recentPosts && recentPosts.length > 0
    ? recentPosts.map((p: { title: string; theme: string }) => `- ${p.theme}: "${p.title}"`).join('\n')
    : 'Nenhum post gerado ainda.';

  const formatLabel = FORMAT_LABEL[format] ?? format;
  const slideInfo = format === 'carousel' && slide_count
    ? `. Número de slides: ${slide_count}`
    : '';
  const slideCount = format === 'carousel' ? (slide_count ?? 3) : 1;

  // Monta a instrução de conteúdo baseada no modo
  let contentInstruction: string;
  if (mode === 'from_scratch' && idea) {
    contentInstruction = `
IDEIA SELECIONADA PELO ADMIN:
- Título: "${idea.title}"
- Conceito: "${idea.concept}"
- Tema: ${idea.theme}

Desenvolva essa ideia em um post completo e profissional.
    `.trim();
  } else {
    contentInstruction = `
INSTRUÇÃO DO ADMIN:
"${admin_prompt}"
    `.trim();
  }

  const materialsInstruction = material_urls && material_urls.length > 0
    ? `
MATERIAIS ENVIADOS PELO ADMIN (${material_urls.length} arquivo(s)):
${material_urls.map((url, i) => `- Material ${i + 1}: ${url}`).join('\n')}
Use esses materiais como base visual/informativa do post.
    `.trim()
    : '';

  const client = new Anthropic({ apiKey });

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'url'; url: string } };

  const userContent: ContentBlock[] = [];

  if (material_urls && material_urls.length > 0) {
    for (const url of material_urls) {
      userContent.push({ type: 'image', source: { type: 'url', url } });
    }
  }

  userContent.push({
    type: 'text',
    text: buildUserPrompt({ formatLabel, slideInfo, slideCount, contentInstruction, materialsInstruction, recentSummary, format }),
  });

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    system:     buildSystemPrompt(),
    messages:   [{ role: 'user', content: userContent }],
  });

  const rawText = message.content.find((b) => b.type === 'text')?.text ?? '';

  let claudeResponse: ClaudePostResponse;
  try {
    claudeResponse = parseClaudeJson<ClaudePostResponse>(rawText);
  } catch {
    try {
      const fixMessage = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: userContent },
          { role: 'assistant', content: rawText },
          { role: 'user', content: 'Sua resposta anterior não é JSON válido. Retorne APENAS o JSON corrigido, sem texto fora dele.' },
        ],
      });
      const fixedText = fixMessage.content.find((b) => b.type === 'text')?.text ?? '';
      claudeResponse = parseClaudeJson<ClaudePostResponse>(fixedText);
    } catch {
      return NextResponse.json({ error: 'Resposta inválida do Claude. Tente novamente.' }, { status: 502 });
    }
  }

  if (!claudeResponse.needs_materials && claudeResponse.post) {
    const post = claudeResponse.post as GeneratedPost;

    // Enriquece a legenda com hashtags
    const theme = post.theme as SocialMediaTheme;
    const hashtags = getHashtagsForTheme(theme).join(' ');
    if (!post.caption.includes('#studytrack')) {
      post.caption = `${post.caption}\n\n${hashtags}`;
    }

    // Sanitiza custom_css
    if (post.custom_css) {
      post.custom_css = sanitizeCustomCss(post.custom_css);
    }

    // Gera backgrounds DALL-E 3 para slides com dalle_prompt
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      await processDalleBackgrounds(post, format, auth.user.id, auth.supabaseAdmin, openaiKey);
    }
  }

  return NextResponse.json(claudeResponse);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeCustomCss(css: string): string {
  return css
    .replace(/\bbody\b/gi, '')
    .replace(/\bhtml\b/gi, '')
    .replace(/\*\s*\{/g, '')
    .replace(/position\s*:\s*fixed/gi, 'position: relative')
    .replace(/position\s*:\s*absolute/gi, 'position: relative')
    .replace(/@import\b/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function parseClaudeJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) return JSON.parse(match[1]) as T;
    throw new Error('JSON não encontrado');
  }
}

function buildUserPrompt(opts: {
  formatLabel:          string;
  slideInfo:            string;
  slideCount:           number;
  contentInstruction:   string;
  materialsInstruction: string;
  recentSummary:        string;
  format:               string;
}): string {
  const { formatLabel, slideInfo, slideCount, contentInstruction, materialsInstruction, recentSummary, format } = opts;

  const isCarousel = format === 'carousel';
  const isStory    = format === 'story';

  return `
Crie um post completo para Instagram.

FORMATO: ${formatLabel}${slideInfo}

${contentInstruction}

${materialsInstruction}

HISTÓRICO RECENTE (não repita ângulos ou temas):
${recentSummary}

INSTRUÇÕES DE LAYOUT:
${isCarousel ? `
- Gere exatamente ${slideCount} slides.
- Slide 1: use template "carousel-cover" (título chamativo que instiga swipe).
- Slides 2 a ${slideCount - 1}: use template "carousel-content" (uma ideia por slide, claro e direto).
- Slide ${slideCount}: use template "carousel-cta" (CTA claro: seguir, salvar, comentar).
` : isStory ? `
- Use template adequado para story (story-announcement ou story-link).
- Conteúdo crítico deve estar entre 200px do topo e 300px do bottom (safe zone do Instagram).
` : `
- Escolha o template mais adequado para o conteúdo.
`}

SCHEMA DE RESPOSTA (retorne APENAS este JSON, sem texto fora dele):
{
  "needs_materials": false,
  "missing_materials": [],
  "post": {
    "title": "Título interno (não aparece no post, máx 60 chars)",
    "theme": "educational | motivational | meme | informational | promotional",
    "caption": "Legenda completa para Instagram (com emojis e CTA, sem hashtags)",
    "custom_css": null,
    "slides": [
      {
        "slide_number": 1,
        "layout": "nome-do-template",
        "elements": {
          "headline": "Texto principal (máx 8 palavras) ou null",
          "subheadline": "Texto secundário / tag (máx 5 palavras) ou null",
          "body": "Corpo de texto (máx 20 palavras) ou null",
          "cta": "Call to action (máx 6 palavras) ou null",
          "accent_color": "#2563eb",
          "background_style": "solid | gradient | pattern",
          "background_value": "#hex ou definição CSS do gradiente",
          "icon_suggestion": "nome-do-icone-lucide ou null",
          "image_placement": "none",
          "admin_image_index": null,
          "admin_overlays": [],
          "dalle_prompt": "Prompt em inglês para DALL-E 3. OBRIGATÓRIO em todos os slides. Ver regras no system prompt.",
          "font_pair": "default | bold | elegant | dynamic | modern | null"
        }
      }
    ]
  }
}

Se você precisar de materiais adicionais que não foram fornecidos, retorne:
{
  "needs_materials": true,
  "missing_materials": ["descrição do material 1"],
  "post": null
}
  `.trim();
}

function buildSystemPrompt(): string {
  return `
Você é o social media designer e copywriter da StudyTrack — especialista em criar posts de alto impacto visual para edtechs brasileiras.

${getBrandPromptContext()}

═══════════════════════════════════════════════════════════
PALETA OBRIGATÓRIA — USE ESSES VALORES EXATOS
═══════════════════════════════════════════════════════════

  #0d1628  azul escuro profundo  → fundo escuro, base de gradientes
  #1e2d52  azul médio marinho    → mid-tone, planos intermediários
  #2563eb  azul primário vibrante → badges, botões CTA, acentos, pills
  #ffffff  branco puro           → headline, texto principal sobre escuro

Como aplicar no dalle_prompt (fundo gerado):
  → Descreva a composição usando "deep navy (#0d1628)", "cobalt blue (#1e2d52)",
    "electric blue (#2563eb)" como cores dominantes.
  → O resultado deve harmonizar com o overlay azul da marca — nunca paletas
    que conflitem (sem vermelho, laranja ou verde vibrantes como cor dominante).

Como aplicar no overlay HTML (subheadline, cta, body, handle):
  → subheadline/tag pill: background #2563eb, texto #ffffff
  → headline:  #ffffff
  → body text: rgba(255,255,255,0.88)
  → @studytrack handle: rgba(255,255,255,0.55)
  → botão CTA: background #2563eb, texto #ffffff
  → números de lista, contadores: color #60a5fa (azul claro, harmônico com a paleta)
  → gradiente de overlay já usa rgba(0,0,0,...) — não modifique no custom_css

═══════════════════════════════════════════════════════════
GERAÇÃO DE BACKGROUND DALL-E 3
═══════════════════════════════════════════════════════════

TODOS os slides DEVEM ter um "dalle_prompt" em inglês — sem exceção.

COMPOSIÇÃO OBRIGATÓRIA — Full Bleed, edge-to-edge:
  A imagem deve preencher o canvas inteiro sem bordas, margens ou áreas vazias.
  Full bleed, edge-to-edge composition, no borders, no margins, no empty areas,
  no vignette edges, no white space around the image.

ESTÉTICA OBRIGATÓRIA — Puro campo de cor com profundidade:
  ✅ PREFIRA: gradientes de cor suaves e profundos, light leaks, color washes, atmospheric glow,
     campos cromáticos (color field painting), transições de tom, neblina luminosa,
     efeitos de luz difusa, bokeh cromático, aurora abstrata.
     Sempre em tons de navy, cobalt e electric blue.
  ❌ EVITE: formas geométricas, objetos, estruturas, bordas, grades, padrões repetitivos,
     qualquer coisa com estrutura visual definida. Sem fotografia de objetos/pessoas/lugares.
     Sem estética de "generated by AI" (sem fractais, sem redes neurais visuais).

REGRAS DO DALLE_PROMPT:
1. Inglês. Máximo 220 caracteres.
2. Nunca mencione texto, letras, tipografia, números, palavras. Termine sempre com:
   "No text, no letters, no typography, no numbers."
3. Inclua: "dark gradient fading to near-black at the bottom third" — zona limpa para o texto HTML.
4. Especifique estilo: "color field painting", "atmospheric gradient art", "light leak photography".
5. Use as cores da marca na descrição: "deep navy", "cobalt blue", "electric blue", "dark indigo".
6. Inclua sempre: "full bleed, edge-to-edge, no borders, no margins".

Exemplos corretos:
- "Atmospheric color wash: deep navy to electric blue gradient, soft light leak from upper right, luminous cobalt glow dissolving into near-black. Full bleed, edge-to-edge, no borders. Dark gradient fading to near-black at the bottom third. No text, no letters, no numbers."
- "Color field painting: rich deep navy base with soft cobalt blue atmospheric bloom at center, subtle electric blue haze, dark indigo shadows. Full bleed, no margins. Dark gradient fading to near-black at the bottom third. No text, no letters."
- "Cinematic light leak: warm cobalt and electric blue tones bleeding into deep dark navy, soft chromatic bokeh, atmospheric depth. Full bleed, edge-to-edge. Dark gradient fading to near-black at the bottom third. No text, no letters, no numbers."
- "Aurora abstrata: luminous electric blue glow rising from dark navy ground, soft misty cobalt halos, deep atmospheric gradient. Full bleed, no borders. Dark gradient fading to near-black at the bottom third. No text, no letters, no words."

═══════════════════════════════════════════════════════════
IMAGENS DO ADMIN (quando fornecidas)
═══════════════════════════════════════════════════════════

Imagens enviadas pelo admin são SEMPRE elementos sobrepostos no overlay HTML — logos, fotos de
alunos, ícones de marca. NUNCA são fundos (o DALL-E é sempre o único gerador de fundo).

REGRA CRÍTICA: Se o admin enviou N imagens, TODAS as N imagens DEVEM aparecer em admin_overlays[].
Nenhuma imagem enviada pelo admin pode ser ignorada.

Use o campo "admin_overlays" (array) — uma entrada por imagem:
  { "index": 0, "placement": "corner-tl", "size": "md" }

Placements disponíveis e quando usar:
  - "corner-tl/tr/bl/br" → logo pequena em canto do canvas (size sm/md recomendado)
  - "logo-row"           → agrupa todas as logos enviadas em fileira horizontal no topo esquerdo
                           (use para 2+ logos de parceiros lado a lado)
  - "avatar"             → foto circular acima do headline (foto de aluno, perfil, resultado)
  - "panel-left"         → painel lateral esquerdo 45% (foto de pessoa ou material visual rico)
  - "panel-right"        → painel lateral direito 45% (foto de pessoa ou material visual rico)

Estratégias para múltiplas imagens:
  - 2 logos: ambas com placement "logo-row" → aparecem lado a lado com separador
  - logo + foto aluno: logo em "corner-tr", foto em "avatar" ou "panel-left"
  - 3+ logos: todas com "logo-row"
  - logo + imagem de produto: logo em "corner-tr", produto em "panel-right"

═══════════════════════════════════════════════════════════
SELEÇÃO DE FONT_PAIR
═══════════════════════════════════════════════════════════

Todos os slides DEVEM ter "font_pair" definido:
- "bold"    → impacto, conquistas, metas, resultados. (Montserrat ExtraBold)
- "elegant" → quotes motivacionais sofisticadas. (Playfair Display + Lato)
- "dynamic" → urgência, promoções, countdown. (Oswald)
- "modern"  → educacional, carrosséis técnicos. (Space Grotesk)
- "default" → fallback geral. (Inter)

═══════════════════════════════════════════════════════════

REGRAS ABSOLUTAS:
1. Textos nos posts: máximo 15 palavras por bloco visível.
2. Tom jovem, direto, motivador — nunca formal ou corporativo.
3. Cada slide de carrossel deve ter UMA ideia clara.
4. Nunca repita o mesmo tema dos posts recentes.
5. Responda SEMPRE com JSON válido. NUNCA coloque texto fora do JSON.
`.trim();
}
