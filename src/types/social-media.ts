// ============================================================
// Tipos do módulo Social Media IA
// ============================================================

// --- Enums espelhando o CHECK do banco ---

export type SocialMediaFormat =
  | 'feed_square'   // 1080 × 1080 px
  | 'feed_portrait' // 1080 × 1350 px
  | 'story'         // 1080 × 1920 px
  | 'carousel';     // 1080 × 1350 px por slide

export type SocialMediaMode = 'from_scratch' | 'directed';

export type SocialMediaTheme =
  | 'educational'
  | 'motivational'
  | 'meme'
  | 'informational'
  | 'promotional';

export type SocialMediaStatus = 'generated' | 'downloaded' | 'archived';

export type AssetType = 'post_image' | 'thumbnail' | 'admin_material';

// --- Dimensões por formato ---

export const FORMAT_DIMENSIONS: Record<SocialMediaFormat, { width: number; height: number }> = {
  feed_square:   { width: 1080, height: 1080 },
  feed_portrait: { width: 1080, height: 1350 },
  story:         { width: 1080, height: 1920 },
  carousel:      { width: 1080, height: 1350 },
};

// --- Templates visuais disponíveis ---

export type TemplateName =
  // Feed / carrossel — implementados
  | 'bold-statement'
  | 'educational-card'
  | 'motivational-quote'
  | 'checklist'
  | 'announcement'
  | 'student-result'
  | 'faq'
  | 'before-after'
  | 'urgency'
  // Story — implementados
  | 'story-announcement'
  | 'story-link'
  // Carrossel — implementados
  | 'carousel-cover'
  | 'carousel-content'
  | 'carousel-cta'
  // A implementar
  | 'data-highlight'
  | 'meme-format';

// --- Estrutura de um slide (retornada pelo Claude) ---

export type BackgroundStyle = 'solid' | 'gradient' | 'pattern';

// Legado — mantido para retrocompatibilidade com posts antigos.
// Novos posts usam AdminOverlay[] (veja abaixo).
export type ImagePlacement = 'none' | 'left' | 'right' | 'top';

/**
 * Posição de cada overlay de imagem do admin no canvas.
 *
 * corner-tl/tr/bl/br  → logo pequena em canto (height ≈ 56px)
 * logo-row            → todas com este valor formam uma fileira horizontal
 *                       no topo esquerdo (logos de parceiros lado a lado)
 * avatar              → recorte circular acima do headline (~140px diâmetro)
 * panel-left/right    → painel de imagem ocupa 45% do canvas lateral
 */
export type OverlayPlacement =
  | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br'
  | 'logo-row'
  | 'avatar'
  | 'panel-left'
  | 'panel-right';

/** Uma imagem do admin a ser sobreposta no HTML do overlay. */
export interface AdminOverlay {
  index:     number;           // índice em adminMaterials[]
  placement: OverlayPlacement;
  /** Hint de tamanho: sm=44px, md=64px, lg=88px de altura (logos); para avatar: sm=80px, md=120px, lg=160px */
  size?:     'sm' | 'md' | 'lg';
}

/**
 * Par de fontes Google para o overlay de texto do DALL-E background.
 * bold    → Montserrat ExtraBold (posts de impacto, metas, resultados)
 * elegant → Playfair Display + Lato (quotes sofisticadas, motivacional)
 * dynamic → Oswald (urgência, promoções, countdown)
 * modern  → Space Grotesk (educacional, carrosséis técnicos)
 * default → Inter (fallback geral)
 */
export type FontPair = 'default' | 'bold' | 'elegant' | 'dynamic' | 'modern';

export interface SlideElements {
  headline:         string | null;
  subheadline:      string | null;
  body:             string | null;
  cta:              string | null;
  accent_color:     string;          // hex, ex: "#2563eb"
  background_style: BackgroundStyle;
  background_value: string;          // hex ou gradiente CSS
  icon_suggestion:  string | null;   // nome do ícone Lucide
  image_placement:  ImagePlacement;   // legado
  admin_image_index: number | null;  // legado — use admin_overlays para posts novos
  /** Lista de imagens do admin a sobrepor no HTML (logos, avatares, elementos de marca). */
  admin_overlays?:  AdminOverlay[] | null;
  // Campos estendidos para templates específicos
  countdown?: { days: number; hours: number; minutes: number } | null; // T10 Urgency
  // DALL-E 3 background
  dalle_prompt?:    string | null;   // Prompt em inglês gerado pelo Claude para DALL-E 3
  dalle_image_url?: string | null;   // URL permanente da imagem gerada (preenchida pelo backend)
  font_pair?:       FontPair | null; // Par de fontes Google para o overlay
}

export interface PostSlide {
  slide_number: number;
  layout:       TemplateName;
  elements:     SlideElements;
}

// --- Estrutura completa de um post (retornada pelo Claude) ---

export interface GeneratedPost {
  title:        string;
  theme:        SocialMediaTheme;
  caption:      string;
  slides:       PostSlide[];
  /** CSS customizado gerado pelo Claude para personalizar este post específico. */
  custom_css?:  string | null;
}

// --- Resposta do Claude (pode indicar que faltam materiais) ---

export interface ClaudePostResponse {
  needs_materials:   boolean;
  missing_materials: string[];       // lista do que falta (se needs_materials = true)
  post:              GeneratedPost | null;
}

// --- Ideia de post (para o modo "do zero") ---

export interface PostIdea {
  id:          string;               // id local temporário para seleção na UI
  title:       string;
  concept:     string;               // resumo do conceito visual
  theme:       SocialMediaTheme;
}

// --- Registro no banco (social_media_posts) ---

export interface SocialMediaPost {
  id:                string;
  admin_id:          string;
  format:            SocialMediaFormat;
  slide_count:       number | null;
  mode:              SocialMediaMode;
  admin_prompt:      string | null;
  title:             string;
  theme:             SocialMediaTheme;
  template_used:     string;
  caption:           string;
  generated_content: ClaudePostResponse;
  status:            SocialMediaStatus;
  created_at:        string;
  updated_at:        string;
  // join com assets (opcional, dependendo da query)
  assets?:           SocialMediaAsset[];
}

// --- Asset (social_media_assets) ---

export interface SocialMediaAsset {
  id:             string;
  post_id:        string;
  storage_path:   string;
  public_url:     string;
  asset_type:     AssetType;
  file_type:      string;
  width:          number | null;
  height:         number | null;
  file_size_bytes: number | null;
  slide_number:   number | null;
  created_at:     string;
}

// --- Payloads das API routes ---

export interface GenerateIdeasPayload {
  format:      SocialMediaFormat;
  slide_count?: number;
}

export interface GeneratePostPayload {
  format:       SocialMediaFormat;
  slide_count?: number;
  mode:         SocialMediaMode;
  // Para modo 'from_scratch' com ideia selecionada
  idea?:        PostIdea;
  // Para modo 'directed'
  admin_prompt?: string;
  material_urls?: string[];   // URLs públicas do Supabase Storage
}

export interface AdjustPostPayload {
  post_id:      string;
  adjustment:   string;       // instrução de ajuste em texto livre
  current_post: GeneratedPost;
  format?:      SocialMediaFormat; // para dimensionar corretamente novo background DALL-E
}

// --- Estado local do fluxo de criação (não persiste no banco) ---

export type CreationStep =
  | 'select-format'   // Etapa 1: escolha formato + modo
  | 'input'           // Etapa 2A ou 2B: input do admin
  | 'ideas'           // Etapa 2A: seleção de ideia (modo do zero)
  | 'generating'      // Loading de geração
  | 'preview'         // Etapa 3: preview + ajustes
  | 'needs-materials'; // Claude pediu materiais adicionais

export interface CreationState {
  step:          CreationStep;
  format:        SocialMediaFormat | null;
  slide_count:   number;
  mode:          SocialMediaMode | null;
  admin_prompt:  string;
  material_urls: string[];
  ideas:         PostIdea[];
  selected_idea: PostIdea | null;
  generated:     GeneratedPost | null;
  saved_post_id: string | null;       // ID no banco após salvar
  missing_materials: string[];
  loading_message:   string;
}
