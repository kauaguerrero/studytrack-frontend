/**
 * Página Pública da Organização — tipos e helpers puros (server + client).
 *
 * O contrato do `content` é definido e validado no backend
 * (studytrack-backend/app/services/core/org_public_site_schema.py). Aqui
 * espelhamos o mesmo formato em TypeScript, mais:
 *
 *   - `filterContentForPublic()` — mesmo filtro de consentimento (LGPD) do
 *     backend, necessário porque a página é renderizada via SSR lendo o
 *     Supabase direto (ver org-public-site.server.ts), sem passar pelo Flask;
 *   - `resolveSiteTheme()` — mesma derivação de tokens a partir do branding;
 *   - resolução de CTA e de `{years}`.
 *
 * Os dois primeiros têm testes em scripts/test-org-public-site.mjs, pareados
 * com os testes Python em tests/test_org_public_site.py.
 */

// ---------------------------------------------------------------------------
// Tipos do conteúdo
// ---------------------------------------------------------------------------

export type CtaType = 'anchor' | 'whatsapp' | 'register' | 'login' | 'url';

export interface Cta {
  label: string;
  type: CtaType;
  value: string;
  message?: string | null;
}

/** Campos de consentimento — só existem no editor; nunca chegam ao público. */
export interface ConsentFields {
  consent_obtained?: boolean;
  is_minor?: boolean;
  guardian_consent?: boolean;
  published?: boolean;
}

export interface Testimonial extends ConsentFields {
  name: string;
  detail: string;
  text: string;
  photo_url: string | null;
  video_url: string | null;
}

export interface Approval extends ConsentFields {
  name: string;
  detail: string;
  text: string;
  photo_url: string | null;
  video_url: string | null;
  course: string;
  institution: string;
  year: number | null;
}

export interface NavSection {
  visible: boolean;
  links: { label: string; anchor: string }[];
  /**
   * A nav é transparente sobre o herói escuro e sólida depois de rolar, então
   * o template precisa de duas versões do logo. Vazias → cai no `logo_url` da
   * org nas duas situações.
   */
  logo_light_url: string | null;
  logo_dark_url: string | null;
  cta_label: string;
  show_whatsapp: boolean;
  whatsapp_number: string;
  login_label: string;
}

export interface HeroSection {
  visible: boolean;
  eyebrow: string;
  title_lines: string[];
  title_highlight: string;
  title_highlight_inline: boolean;
  lead_html: string;
  founded_year: number | null;
  primary_cta: Cta | null;
  secondary_cta: Cta | null;
  proof: { value: string; label: string }[];
  person: {
    image_url: string | null;
    /** Variantes para srcset — a foto do herói costuma ser o LCP da página. */
    image_sources: { url: string; width: number }[];
    name: string;
    role: string;
    alt: string;
  } | null;
  checklist: { title: string; items: { text: string; done: boolean }[] } | null;
  sheet_label: string;
  sheet_number: string;
}

export interface FeaturedEssay {
  visible: boolean;
  score: number | null;
  max_score: number;
  theme: string;
  excerpt: string;
  comments: string[];
  is_example: boolean;
}

export interface Evolution {
  visible: boolean;
  kicker: string;
  title: string;
  points: number[];
  is_example: boolean;
}

export interface Approvals {
  visible: boolean;
  kicker: string;
  title: string;
  items: Approval[];
  placeholder_when_empty: boolean;
}

export interface ResultsSection {
  visible: boolean;
  eyebrow: string;
  /** Pode conter "\n" para quebrar linha, como no protótipo. */
  title: string;
  title_highlight: string;
  /**
   * true = o destaque continua na MESMA linha do fim do título
   * ("Cada redação conta / uma *evolução.*"); false = linha própria
   * ("Por dentro da / *Ave, Palavra!*").
   */
  title_highlight_inline: boolean;
  lead: string;
  featured_essay: FeaturedEssay | null;
  evolution: Evolution | null;
  approvals: Approvals | null;
  facts: { value: string; text: string }[];
}

export interface Highlight {
  id: string;
  text: string;
  kind: 'teal' | 'sun' | 'red';
}

export interface MarginNote {
  id: string;
  title: string;
  text: string;
  red: boolean;
}

export interface CompetencyScore {
  key: string;
  label: string;
  score: number;
  max_score: number;
}

export interface CorrectionDemo {
  visible: boolean;
  theme: string;
  paragraphs: string[];
  highlights: Highlight[];
  margin_notes: MarginNote[];
  circled: string;
  scores: CompetencyScore[];
  total_score: number | null;
  total_max: number;
  next_tutoring: string;
  is_example: boolean;
  show_platform_label: boolean;
}

export interface MethodSection {
  visible: boolean;
  eyebrow: string;
  /** Pode conter "\n" para quebrar linha, como no protótipo. */
  title: string;
  title_highlight: string;
  /**
   * true = o destaque continua na MESMA linha do fim do título
   * ("Cada redação conta / uma *evolução.*"); false = linha própria
   * ("Por dentro da / *Ave, Palavra!*").
   */
  title_highlight_inline: boolean;
  steps: { n: string; title: string; text: string; accent: boolean }[];
  correction_demo: CorrectionDemo | null;
}

export interface VideoItem {
  cover_url: string | null;
  video_url: string | null;
  external_url: string | null;
  title: string;
  subtitle: string;
  alt: string;
}

export interface InsideSection {
  visible: boolean;
  eyebrow: string;
  /** Pode conter "\n" para quebrar linha, como no protótipo. */
  title: string;
  title_highlight: string;
  /**
   * true = o destaque continua na MESMA linha do fim do título
   * ("Cada redação conta / uma *evolução.*"); false = linha própria
   * ("Por dentro da / *Ave, Palavra!*").
   */
  title_highlight_inline: boolean;
  lead: string;
  main_video: VideoItem | null;
  reels: VideoItem[];
  testimonials: Testimonial[];
}

export interface EnrollSection {
  visible: boolean;
  eyebrow: string;
  title_lines: string[];
  title_highlight: string;
  title_highlight_inline: boolean;
  perks: string[];
  primary_cta: Cta | null;
  secondary_cta: Cta | null;
  photo_url: string | null;
  photo_alt: string;
  contact: {
    phone_display: string;
    phone_number: string;
    hours: string;
    address: string;
  } | null;
  contact_kicker: string;
}

export interface FooterSection {
  visible: boolean;
  about: string;
  phones: string[];
  email: string;
  address_lines: string[];
  hours: string;
  socials: { label: string; url: string }[];
  legal_name: string;
  privacy_url: string | null;
  terms_url: string | null;
  show_powered_by: boolean;
}

/**
 * Símbolo decorativo da marca, reusado em várias seções: a silhueta gigante
 * atrás da pessoa no herói, o ícone da folha de redação, o avatar da pílula, o
 * selo da tutoria e a marca d'água do painel de matrículas. É o SÍMBOLO (sem a
 * assinatura tipográfica), não o `logo_url` da org — é o que funciona ampliado.
 */
export interface BrandSection {
  symbol_url: string | null;
}

export interface SiteContent {
  brand?: BrandSection;
  nav?: NavSection;
  hero?: HeroSection;
  results?: ResultsSection;
  method?: MethodSection;
  inside?: InsideSection;
  enroll?: EnrollSection;
  footer?: FooterSection;
}

export interface SiteSeo {
  title?: string;
  description?: string;
  og_image_url?: string | null;
}

/** Tokens de design finais, injetados como custom properties no wrapper. */
export type SiteTheme = Record<string, string>;

export interface OrgPublicSiteView {
  enabled: boolean;
  preview: boolean;
  template: string;
  content: SiteContent;
  theme: SiteTheme;
  seo: SiteSeo;
  org: {
    name: string;
    slug: string;
    logo_url: string | null;
    login_url: string;
    register_url: string;
  };
}

// ---------------------------------------------------------------------------
// Filtro de consentimento (espelho de filter_content_for_public, no Python)
// ---------------------------------------------------------------------------

const CONSENT_FIELDS = ['consent_obtained', 'is_minor', 'guardian_consent', 'published'] as const;

export function itemIsPublic(item: ConsentFields): boolean {
  return Boolean(
    item.published &&
      item.consent_obtained &&
      (!item.is_minor || item.guardian_consent),
  );
}

function stripConsent<T extends ConsentFields>(item: T): T {
  const out = { ...item };
  for (const field of CONSENT_FIELDS) delete out[field];
  return out;
}

/**
 * Remove seções invisíveis e qualquer pessoa real sem consentimento completo.
 * Em produção (preview = false), uma lista vazia também desliga o placeholder
 * de "espaço reservado" — a seção some em vez de anunciar que está vazia.
 */
export function filterContentForPublic(
  content: SiteContent | null | undefined,
  { preview = false }: { preview?: boolean } = {},
): SiteContent {
  if (!content || typeof content !== 'object') return {};

  const out: SiteContent = {};
  for (const [key, value] of Object.entries(content)) {
    if (value && typeof value === 'object' && (value as { visible?: boolean }).visible === false) continue;
    (out as Record<string, unknown>)[key] = value;
  }

  if (out.inside) {
    out.inside = {
      ...out.inside,
      testimonials: (out.inside.testimonials ?? []).filter(itemIsPublic).map(stripConsent),
    };
  }

  if (out.results?.approvals) {
    const items = (out.results.approvals.items ?? []).filter(itemIsPublic).map(stripConsent);
    out.results = {
      ...out.results,
      approvals: {
        ...out.results.approvals,
        items,
        placeholder_when_empty:
          items.length === 0 && !preview ? false : out.results.approvals.placeholder_when_empty,
      },
    };
  }

  return out;
}

// ---------------------------------------------------------------------------
// Tema (espelho de resolve_theme, no Python)
// ---------------------------------------------------------------------------

export const THEME_TOKENS = [
  'night', 'ink', 'navy', 'navy-2', 'teal', 'teal-2', 'sky',
  'sun', 'red', 'paper', 'mist', 'text', 'muted',
] as const;

export const PREMIUM_V1_BASE_THEME: SiteTheme = {
  night: '#070f2e',
  ink: '#0d1a4a',
  navy: '#1c306e',
  'navy-2': '#24409a',
  teal: '#2bc4d8',
  'teal-2': '#1497b8',
  sky: '#d8f5fa',
  sun: '#f6d44a',
  red: '#e0484f',
  paper: '#fbfaf6',
  mist: '#eef4fb',
  text: '#14204a',
  muted: '#5b6788',
};

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hexToRgb(hex: string): [number, number, number] {
  let v = hex.replace('#', '');
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** factor < 1 escurece, > 1 clareia — em HLS, preservando o matiz. */
function shiftLightness(hex: string, factor: number): string {
  if (!HEX_RE.test(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const nl = Math.max(0, Math.min(1, l * factor));
  if (s === 0) return rgbToHex([nl, nl, nl]);
  const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s;
  const p = 2 * nl - q;
  const hue = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbToHex([hue(h + 1 / 3), hue(h), hue(h - 1 / 3)]);
}

/**
 * Tokens finais do template. A cor primária da org vira os navies e a de
 * destaque vira o turquesa; `--sun`, `--red` e os neutros ficam no padrão do
 * template. `brand_secondary` é ignorado de propósito — em quase toda org do
 * banco ele é branco ou preto (contraste do logo), não uma cor de marca.
 */
export function resolveSiteTheme(
  org: { brand_primary?: string | null; brand_accent?: string | null },
  overrides?: Record<string, string> | null,
): SiteTheme {
  const theme: SiteTheme = { ...PREMIUM_V1_BASE_THEME };

  const primary = (org.brand_primary ?? '').trim();
  const accent = (org.brand_accent ?? '').trim();

  if (HEX_RE.test(primary)) {
    theme.navy = primary;
    theme['navy-2'] = shiftLightness(primary, 1.25);
    theme.ink = shiftLightness(primary, 0.62);
    theme.night = shiftLightness(primary, 0.34);
    theme.text = shiftLightness(primary, 0.72);
  }
  if (HEX_RE.test(accent)) {
    theme.teal = accent;
    theme['teal-2'] = shiftLightness(accent, 0.72);
    theme.sky = shiftLightness(accent, 1.75);
  }

  if (overrides) {
    for (const [rawToken, value] of Object.entries(overrides)) {
      const token = rawToken.replace(/^-+/, '');
      if ((THEME_TOKENS as readonly string[]).includes(token) && HEX_RE.test(value)) {
        theme[token] = value.toLowerCase();
      }
    }
  }

  return theme;
}

/** Tokens → objeto de style com as custom properties do CSS. */
export function themeToCssVars(theme: SiteTheme): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [token, value] of Object.entries(theme)) style[`--${token}`] = value;
  return style as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// CTAs e textos
// ---------------------------------------------------------------------------

export interface CtaContext {
  loginUrl: string;
  registerUrl: string;
}

/** Converte um CTA do conteúdo no href final. Tipo desconhecido → âncora #top. */
export function resolveCtaHref(cta: Cta | null | undefined, ctx: CtaContext): string {
  if (!cta) return '#top';
  switch (cta.type) {
    case 'whatsapp': {
      const digits = (cta.value || '').replace(/\D/g, '');
      if (!digits) return '#top';
      const text = cta.message ? `?text=${encodeURIComponent(cta.message)}` : '';
      return `https://wa.me/${digits}${text}`;
    }
    case 'register':
      return ctx.registerUrl;
    case 'login':
      return ctx.loginUrl;
    case 'url':
      return cta.value || '#top';
    case 'anchor':
    default:
      return cta.value?.startsWith('#') ? cta.value : '#top';
  }
}

/** CTA que sai da página (WhatsApp, site externo) abre em nova aba. */
export function ctaIsExternal(cta: Cta | null | undefined): boolean {
  return cta?.type === 'whatsapp' || cta?.type === 'url';
}

/**
 * Substitui `{years}` pelos anos completos desde `founded_year`. Deixar "16
 * anos" fixo no texto envelheceria o site sozinho.
 */
export function interpolateYears(text: string, foundedYear?: number | null, now = new Date()): string {
  if (!text.includes('{years}')) return text;
  if (!foundedYear) return text.replace(/\{years\}/g, '');
  const years = Math.max(0, now.getFullYear() - foundedYear);
  return text.replace(/\{years\}/g, String(years));
}

/**
 * Expande `{years}` em TODO o conteúdo, não só no lead do herói: o marcador
 * aparece também nos perks de matrículas, e espalhar a chamada por cada seção
 * seria fácil de esquecer na próxima. Roda uma vez, no servidor.
 */
export function interpolateYearsDeep<T>(node: T, foundedYear?: number | null, now = new Date()): T {
  if (typeof node === 'string') return interpolateYears(node, foundedYear, now) as unknown as T;
  if (Array.isArray(node)) return node.map((item) => interpolateYearsDeep(item, foundedYear, now)) as unknown as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = interpolateYearsDeep(v, foundedYear, now);
    return out as T;
  }
  return node;
}

/** `https://wa.me/<digits>` a partir de um número solto do conteúdo. */
export function whatsappUrl(raw: string | null | undefined, message?: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
