'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Cta } from '@/lib/org-public-site';

/* ===========================================================================
 * Primitivas do template `premium_v1`.
 *
 * As classes vêm de premium-v1.css (porte do protótipo) — estes componentes
 * só montam a marcação e devolvem o comportamento que, no protótipo, vivia em
 * main.js. Nada de estilo inline que dispute com o CSS.
 * ======================================================================== */

// ---------------------------------------------------------------------------
// Reveal — entrada ao rolar, com stagger de 90ms entre irmãos
// ---------------------------------------------------------------------------

/**
 * Elemento que entra com fade + translateY ao rolar.
 *
 * Renderiza SEMPRE um elemento comum e visível — a opacidade zero vem do CSS e
 * só vale sob `.js-reveal`, classe posta antes da primeira pintura pelo script
 * de RevealBootstrap (ver abaixo) e apenas quando há JS e o usuário não pediu
 * redução de movimento.
 *
 * Esta é a razão de não usar `whileInView` do framer-motion aqui: ele escreve
 * `opacity:0` inline já no HTML do servidor, e qualquer coisa que impeça a
 * animação de rodar (reduced-motion, erro de JS, crawler sem JS) deixaria a
 * página inteira invisível. Com CSS gated, o pior caso é "sem animação".
 * O `index` dá o stagger de 90ms entre irmãos, como no protótipo.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as: As = 'div',
  style,
  ...rest
}: {
  /** Opcional porque alguns usos passam o conteúdo por dangerouslySetInnerHTML. */
  children?: ReactNode;
  /** Posição entre os irmãos reveláveis — define o atraso (90ms cada). */
  index?: number;
  className?: string;
  as?: 'div' | 'p' | 'h1' | 'h2' | 'ul' | 'ol' | 'li' | 'figure' | 'article' | 'header' | 'blockquote' | 'aside';
  style?: CSSProperties;
} & Record<string, unknown>) {
  return (
    <As
      className={className ? `${className} reveal` : 'reveal'}
      style={index ? { ...style, transitionDelay: `${index * 90}ms` } : style}
      {...rest}
    >
      {children}
    </As>
  );
}

/**
 * Liga o mecanismo de revelação: marca o wrapper com `.js-reveal` antes da
 * primeira pintura (script inline, sem flash) e observa os `.reveal`.
 *
 * O script inline roda ANTES do React hidratar; o observer entra depois. Entre
 * um e outro o conteúdo fica invisível por alguns ms — aceitável, e é o mesmo
 * comportamento do protótipo. Se o React nunca hidratar, o `setTimeout` de
 * segurança do próprio script revela tudo.
 */
export const REVEAL_BOOTSTRAP_SCRIPT = `(function(){try{
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var r=document.querySelector('[data-org-site]');
if(!r)return;r.classList.add('js-reveal');
/* rede de segurança: se o React nunca hidratar, revela tudo em vez de deixar
   a página em branco */
setTimeout(function(){if(!r.dataset.revealReady)r.classList.remove('js-reveal');},4000);
}catch(e){}})();`;

/**
 * Observa os `.reveal` do wrapper e marca `is-in` quando entram na viewport.
 * Vive num componente próprio porque OrgSiteTemplate é server component.
 */
export function RevealController() {
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = anchorRef.current?.closest<HTMLElement>('[data-org-site]');
    if (!root) return;
    root.dataset.revealReady = '1';
    if (!root.classList.contains('js-reveal')) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15 },
    );
    for (const t of root.querySelectorAll<HTMLElement>('.reveal')) io.observe(t);
    return () => io.disconnect();
  }, []);

  return <span ref={anchorRef} hidden aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Parallax do palco do herói (mouse + scroll), como no main.js do protótipo
// ---------------------------------------------------------------------------

/**
 * Aplica `translate` nos filhos com [data-depth], via rAF, a partir da posição
 * do ponteiro e do scroll. Só com ponteiro fino (mouse) — em touch o parallax
 * por hover não existe e o custo não se justifica.
 */
export function useStageParallax(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = ref.current;
    if (!root) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-depth]'));
    if (layers.length === 0) return;

    const fine = window.matchMedia('(pointer:fine)').matches;
    let mx = 0;
    let my = 0;
    let sy = 0;
    let raf: number | null = null;

    const paint = () => {
      raf = null;
      for (const layer of layers) {
        const d = parseFloat(layer.dataset.depth ?? '0');
        layer.style.translate = `${mx * d * 18}px ${my * d * 14 - sy * d * 0.08}px`;
      }
    };
    const schedule = () => {
      raf ??= requestAnimationFrame(paint);
    };

    const onPointerMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      schedule();
    };
    const onScroll = () => {
      sy = window.scrollY;
      schedule();
    };

    if (fine) window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (fine) window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      for (const layer of layers) layer.style.translate = '';
    };
  }, [enabled]);

  return ref;
}

// ---------------------------------------------------------------------------
// Tilt 3D nos cards (desktop)
// ---------------------------------------------------------------------------

/**
 * Inclinação 3D no hover (desktop). Devolve props para espalhar no elemento —
 * um hook em vez de um componente-wrapper porque os cards do protótipo são
 * filhos diretos de um grid: um <div> a mais quebraria o layout.
 *
 * `innerSelector` existe porque, na folha de redação, quem inclina é o papel
 * (.essay3d__paper), não o <figure> que recebe o ponteiro.
 */
export function useTilt(innerSelector?: string) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);

  const target = useCallback(() => {
    const el = ref.current;
    if (!el) return null;
    return (innerSelector ? el.querySelector<HTMLElement>(innerSelector) : el) ?? el;
  }, [innerSelector]);

  return {
    ref,
    onPointerMove: (e: React.PointerEvent) => {
      if (reduced || e.pointerType !== 'mouse') return;
      const el = ref.current;
      const inner = target();
      if (!el || !inner) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
    },
    onPointerLeave: () => {
      const inner = target();
      if (inner) inner.style.transform = '';
    },
  };
}

// ---------------------------------------------------------------------------
// Peças visuais
// ---------------------------------------------------------------------------

export function Eyebrow({
  children,
  dark = false,
  sun = false,
  className = '',
}: {
  children: ReactNode;
  /** `dark` = sobre fundo claro (o nome vem da classe do protótipo). */
  dark?: boolean;
  sun?: boolean;
  className?: string;
}) {
  return (
    <p className={`eyebrow${dark ? ' eyebrow--dark' : ''} ${className}`.trim()}>
      <span className={`dot${sun ? ' dot--sun' : ''}`} />
      {children}
    </p>
  );
}

/**
 * Selo "Exemplo ilustrativo". Nunca deve ser omitido de um dado com
 * `is_example: true` — é o que separa demonstração de resultado real.
 */
export function DemoTag({
  children,
  variant,
  as: As = 'p',
}: {
  children: ReactNode;
  variant?: 'inline' | 'light' | 'caption';
  as?: 'p' | 'figcaption';
}) {
  const extra =
    variant === 'inline' ? ' demo-tag--inline' : variant === 'light' ? ' demo-tag--light' : '';
  return <As className={`demo-tag${extra}`}>{children}</As>;
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3Z" />
    </svg>
  );
}

/**
 * Símbolo da marca em tamanho pequeno (avatar da pílula, ícone da folha, selo
 * da tutoria). Sem `symbolUrl` cai num traço neutro em SVG, para a composição
 * não ficar com um buraco em orgs que não enviaram o símbolo.
 */
export function BrandMark({ symbolUrl, size = 30 }: { symbolUrl: string | null; size?: number }) {
  if (symbolUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={symbolUrl} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" />;
  }
  return (
    <svg viewBox="0 0 48 32" width={size} height={(size * 2) / 3} aria-hidden="true">
      <path
        d="M2 10c8 0 16 4 22 12 6-8 14-12 22-12-6 6-12 10-16 18-2-4-4-7-6-9-2 2-4 5-6 9C14 20 8 16 2 10Z"
        fill="var(--teal-2)"
      />
    </svg>
  );
}

export function Tick({ light = false }: { light?: boolean }) {
  return <span className={`tick${light ? ' tick--light' : ''}`} />;
}

type ButtonVariant = 'teal' | 'sun' | 'ghost';

/**
 * Botão do template. Sempre um <a> — todo CTA da página leva a algum lugar
 * (âncora, WhatsApp, login/registro da org).
 */
export function SiteButton({
  href,
  children,
  variant = 'teal',
  size,
  external = false,
  withArrow = false,
  withPlay = false,
  className = '',
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'lg' | 'sm';
  external?: boolean;
  withArrow?: boolean;
  withPlay?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const sizeClass = size ? ` btn--${size}` : '';
  return (
    <a
      className={`btn btn--${variant}${sizeClass} ${className}`.trim()}
      href={href}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {withPlay && <span className="play-mini" />}
      {children}
      {withArrow && <ArrowIcon />}
    </a>
  );
}

/** Conveniência: botão a partir de um CTA já resolvido pelo chamador. */
export function CtaButton({
  cta,
  href,
  variant,
  size,
  external,
  withArrow,
  withPlay,
}: {
  cta: Cta | null | undefined;
  href: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'sm';
  external?: boolean;
  withArrow?: boolean;
  withPlay?: boolean;
}) {
  if (!cta?.label) return null;
  return (
    <SiteButton
      href={href}
      variant={variant}
      size={size}
      external={external}
      withArrow={withArrow}
      withPlay={withPlay}
    >
      {cta.label}
    </SiteButton>
  );
}

/**
 * Linhas de título com o trecho final em itálico colorido.
 *
 * `inline = false` põe o destaque numa linha própria ("Toda aprovação / começa
 * pela / *palavra certa.*"); `inline = true` fecha a última linha com ele
 * ("...pode / ser *a sua.*"). Os dois casos existem no protótipo.
 */
export function TitleLines({
  lines,
  highlight,
  inline = false,
}: {
  lines: string[];
  highlight?: string;
  inline?: boolean;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={line + i}>
          {line}
          {(i < lines.length - 1 || (highlight && !inline)) && <br />}
          {i === lines.length - 1 && highlight && inline ? ' ' : null}
        </Fragment>
      ))}
      {highlight ? <em>{highlight}</em> : null}
    </>
  );
}

/**
 * Título de seção com o trecho em itálico colorido. O protótipo usa <br> entre
 * a linha base e o destaque.
 */
export function SectionTitle({
  id,
  title,
  highlight,
  inline = false,
  className = 'sec-title',
}: {
  id?: string;
  /** "\n" vira quebra de linha. */
  title: string;
  highlight?: string;
  /** Destaque na mesma linha do fim do título, em vez de numa linha própria. */
  inline?: boolean;
  className?: string;
}) {
  const lines = title.split('\n');
  return (
    <h2 id={id} className={className}>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line}
          {/* sem <br> depois da última linha quando o destaque é inline */}
          {(i < lines.length - 1 || (highlight && !inline)) && <br />}
          {i === lines.length - 1 && highlight && inline ? ' ' : null}
        </Fragment>
      ))}
      {highlight ? <em>{highlight}</em> : null}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Lightbox de vídeo
// ---------------------------------------------------------------------------

/**
 * Modal de vídeo com foco preso e fechamento por ESC / clique fora.
 * Não existe no protótipo (lá o play é decorativo) — entrou porque o conteúdo
 * pode trazer `video_url`.
 */
export function VideoLightbox({
  videoUrl,
  title,
  onClose,
}: {
  videoUrl: string;
  title: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], video, iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const isEmbed = /youtube|youtu\.be|vimeo|instagram/i.test(videoUrl);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lightbox__inner" ref={panelRef}>
        <button type="button" className="lightbox__close" onClick={onClose} ref={closeRef} aria-label="Fechar vídeo">
          ×
        </button>
        {isEmbed ? (
          <iframe src={videoUrl} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <video src={videoUrl} controls autoPlay playsInline />
        )}
      </div>
    </div>
  );
}

/** Estado compartilhado do lightbox entre a seção "Por dentro" e os reels. */
export function useVideoLightbox() {
  const [open, setOpen] = useState<{ url: string; title: string } | null>(null);
  return {
    open,
    show: (url: string, title: string) => setOpen({ url, title }),
    hide: () => setOpen(null),
  };
}
