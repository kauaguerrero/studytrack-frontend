'use client';

import { BrandMark, CtaButton, Reveal, TitleLines, usePauseWhenOffscreen, useReducedMotion, useStageParallax } from '../primitives';
import {
  resolveCtaHref,
  ctaIsExternal,
  type CtaContext,
  type HeroSection as HeroData,
} from '@/lib/org-public-site';

/**
 * Herói: a seção mais pesada do template.
 *
 * Camadas do palco, de trás para frente: halo → ave gigante → anel → folha de
 * redação 3D → foto recortada da pessoa → card de vidro (checklist) → pílula
 * com nome → caneta. Os `data-depth` alimentam o parallax (ver
 * useStageParallax), e as classes float-* fazem a flutuação em loop.
 *
 * A folha, a caneta e os cards são decoração — ficam fora da árvore de
 * acessibilidade; só a foto da pessoa tem alt descritivo.
 */
export function HeroSection({
  hero,
  ctx,
  symbolUrl,
  sheetLinesWidths = [92, 86, 95, 70, 90, 82, 93, 60, 88, 91],
}: {
  hero: HeroData;
  ctx: CtaContext;
  symbolUrl: string | null;
  sheetLinesWidths?: number[];
}) {
  const reduced = useReducedMotion();
  const stageRef = useStageParallax(!reduced);
  const heroRef = usePauseWhenOffscreen();

  const lead = hero.lead_html;
  const person = hero.person;
  const checklist = hero.checklist;

  return (
    <section className="hero" aria-labelledby="hero-title" ref={heroRef}>
      <div className="hero__sky" aria-hidden="true">
        <div className="beam beam--1" />
        <div className="beam beam--2" />
        {/* "chão" de linhas de redação em perspectiva */}
        <div className="hero__floor">
          <div className="floor-lines" />
        </div>
        <div className="grain" />
      </div>

      <div className="hero__inner">
        <div className="hero__copy">
          {hero.eyebrow && (
            <Reveal as="p" index={0} className="eyebrow">
              <span className="dot" />
              {hero.eyebrow}
            </Reveal>
          )}

          <Reveal as="h1" index={1} id="hero-title" className="hero__title">
            <TitleLines
              lines={hero.title_lines}
              highlight={hero.title_highlight}
              inline={hero.title_highlight_inline}
            />
          </Reveal>

          {lead && (
            <Reveal
              as="p"
              index={2}
              className="hero__lead"
              // Sanitizado na escrita pelo backend (bleach, lista branca
              // strong/em/br) — ver org_public_site_schema.py.
              dangerouslySetInnerHTML={{ __html: lead }}
            />
          )}

          <Reveal index={3} className="hero__actions">
            <CtaButton
              cta={hero.primary_cta}
              href={resolveCtaHref(hero.primary_cta, ctx)}
              external={ctaIsExternal(hero.primary_cta)}
              variant="teal"
              size="lg"
              withArrow
            />
            <CtaButton
              cta={hero.secondary_cta}
              href={resolveCtaHref(hero.secondary_cta, ctx)}
              external={ctaIsExternal(hero.secondary_cta)}
              variant="ghost"
              size="lg"
              withPlay
            />
          </Reveal>

          {hero.proof.length > 0 && (
            <Reveal as="ul" index={4} className="hero__proof">
              {hero.proof.map((item) => (
                <li key={item.value + item.label}>
                  <b>{item.value}</b>
                  <span>
                    {item.label.split('\n').map((part, i, all) => (
                      <span key={part + i}>
                        {part}
                        {i < all.length - 1 && <br />}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </Reveal>
          )}
        </div>

        <div className="hero__stage" ref={stageRef}>
          <div className="stage__halo" data-depth="-0.4" aria-hidden="true" />
          {symbolUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="stage__bird" src={symbolUrl} alt="" data-depth="-0.7" aria-hidden="true" />
          )}
          <div className="stage__ring" data-depth="-0.25" aria-hidden="true" />

          <div className="sheet sheet--back float-a" data-depth="-0.9" aria-hidden="true">
            <div className="sheet__head">
              <span>{hero.sheet_label}</span>
              <span className="sheet__n">{hero.sheet_number}</span>
            </div>
            <div className="sheet__lines">
              {sheetLinesWidths.map((w, i) => (
                <i key={i} style={{ width: `${w}%` }} />
              ))}
            </div>
            <span className="sheet__mark mark-1" />
            <span className="sheet__mark mark-2" />
          </div>

          {person?.image_url && (
            // A foto do herói é o LCP: fetchPriority alto e sem lazy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="stage__person"
              src={person.image_url}
              srcSet={
                person.image_sources?.length
                  ? person.image_sources.map((s) => `${s.url} ${s.width}w`).join(', ')
                  : undefined
              }
              sizes="(max-width: 600px) 90vw, (max-width: 1100px) 70vw, 46vw"
              alt={person.alt || `${person.name}${person.role ? `, ${person.role}` : ''}`}
              fetchPriority="high"
              decoding="async"
            />
          )}

          {checklist && checklist.items.length > 0 && (
            <div className="glass check-card float-b" data-depth="0.6" aria-hidden="true">
              <p className="check-card__t">{checklist.title}</p>
              <ul>
                {checklist.items.map((item) => (
                  <li key={item.text} className={item.done ? undefined : 'pending'}>
                    <span className="tick" />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {person?.name && (
            <div className="glass name-card float-c" data-depth="0.45" aria-hidden="true">
              <span className="name-card__avatar">
                <BrandMark symbolUrl={symbolUrl} size={30} />
              </span>
              <div>
                <b>{person.name}</b>
                <span>{person.role}</span>
              </div>
            </div>
          )}

          <PenSvg />
        </div>
      </div>

      <a className="hero__scroll" href="#resultados" aria-label="Rolar para a próxima seção">
        <span />
      </a>
    </section>
  );
}

/** Caneta-tinteiro do protótipo, copiada vetor a vetor. */
function PenSvg() {
  return (
    <svg className="pen float-d" data-depth="1.1" viewBox="0 0 420 60" aria-hidden="true">
      <defs>
        <linearGradient id="ops-penBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a4a9e" />
          <stop offset=".45" stopColor="#14286b" />
          <stop offset="1" stopColor="#091640" />
        </linearGradient>
        <linearGradient id="ops-penCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ee8f5" />
          <stop offset=".5" stopColor="#22b8d0" />
          <stop offset="1" stopColor="#0d7f9c" />
        </linearGradient>
        <linearGradient id="ops-penNib" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f5e6b8" />
          <stop offset="1" stopColor="#c79a3a" />
        </linearGradient>
      </defs>
      <path d="M18 30 L64 17 L64 43 Z" fill="url(#ops-penNib)" />
      <path d="M30 30 L58 26" stroke="#7a5a1c" strokeWidth="1.4" />
      <rect x="62" y="15" width="40" height="30" rx="6" fill="#0b1a4a" />
      <rect x="100" y="12" width="190" height="36" rx="16" fill="url(#ops-penBody)" />
      <rect x="288" y="10" width="118" height="40" rx="19" fill="url(#ops-penCap)" />
      <rect x="300" y="6" width="80" height="6" rx="3" fill="#e8fbff" opacity=".9" />
      <rect x="110" y="17" width="170" height="5" rx="2.5" fill="#fff" opacity=".22" />
      <rect x="296" y="16" width="100" height="5" rx="2.5" fill="#fff" opacity=".45" />
    </svg>
  );
}
