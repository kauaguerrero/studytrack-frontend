'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BrandMark, DemoTag, Reveal, SectionTitle } from '../primitives';
import type {
  CorrectionDemo as CorrectionData,
  MethodSection as MethodData,
} from '@/lib/org-public-site';

/**
 * Seção "Método": as três etapas e a demonstração de correção.
 *
 * A demonstração é ILUSTRATIVA por construção: os parágrafos, destaques, notas
 * e competências vêm do `content`, nunca de redações reais de alunos. O selo de
 * exemplo acompanha, e a legenda opcional "Correção acompanhada na plataforma
 * StudyTrack" liga a demonstração ao fluxo que a escola usa de verdade.
 */
export function MethodSection({
  method,
  symbolUrl,
  showPlatformLabel,
}: {
  method: MethodData;
  symbolUrl: string | null;
  showPlatformLabel: boolean;
}) {
  const demo = method.correction_demo;
  const stepIcons = [BookIcon, PencilIcon, TrendIcon];

  return (
    <section className="method" id="metodo" aria-labelledby="met-title">
      <div className="method__glow" aria-hidden="true" />
      <div className="wrap">
        <header className="sec-head sec-head--light">
          {method.eyebrow && (
            <Reveal as="p" index={0} className="eyebrow">
              <span className="dot" />
              {method.eyebrow}
            </Reveal>
          )}
          <Reveal index={1}>
            <SectionTitle id="met-title" title={method.title} highlight={method.title_highlight} />
          </Reveal>
        </header>

        {method.steps.length > 0 && (
          <ol className="steps">
            {method.steps.map((step, i) => {
              const Icon = stepIcons[i % stepIcons.length];
              return (
                <Reveal
                  as="li"
                  key={step.n + step.title}
                  index={i}
                  className={`step${step.accent ? ' step--accent' : ''}`}
                >
                  <span className="step__n">{step.n}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className="step__icon" aria-hidden="true">
                    <Icon />
                  </span>
                </Reveal>
              );
            })}
          </ol>
        )}

        {demo?.visible && (
          <CorrectionDemo demo={demo} symbolUrl={symbolUrl} showPlatformLabel={showPlatformLabel} />
        )}
      </div>
    </section>
  );
}

/**
 * Folha corrigida + painel de competências.
 *
 * Destaque ↔ comentário: no protótipo era hover puro em JS; aqui o par é
 * estado React e cada destaque é focável por teclado, com aria-describedby
 * apontando para o comentário da margem.
 */
function CorrectionDemo({
  demo,
  symbolUrl,
  showPlatformLabel,
}: {
  demo: CorrectionData;
  symbolUrl: string | null;
  showPlatformLabel: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  const noteById = new Map(demo.margin_notes.map((n) => [n.id, n]));
  const total = demo.total_score;

  return (
    <Reveal className="correction" id="correcao">
      <div className="correction__paper">
        <div className="cp__top">
          <span className="cp__title">Redação corrigida</span>
          {demo.theme && <span className="cp__tag">Tema: {demo.theme}</span>}
        </div>

        <div className="cp__text">
          {demo.paragraphs.map((paragraph, i) => (
            <p key={i}>
              {renderParagraph(paragraph, demo, active, setActive, noteById)}
            </p>
          ))}
        </div>

        {demo.margin_notes.map((note, i) => (
          <span
            key={note.id}
            id={`ops-note-${note.id}`}
            className={`margin-note n${i + 1}${note.red ? ' red' : ''}${active === note.id ? ' is-active' : ''}`}
            onMouseEnter={() => setActive(note.id)}
            onMouseLeave={() => setActive(null)}
          >
            {note.title && <b>{note.title}</b>}
            {note.title ? ' ' : ''}
            {note.text}
          </span>
        ))}
      </div>

      <aside className="glass-dark scores">
        <div className="scores__head">
          <p>Notas por competência</p>
          {total != null && (
            <span className="scores__total">
              <b>{total}</b>/{demo.total_max}
            </span>
          )}
        </div>

        <ul>
          {demo.scores.map((score) => (
            <CompetencyRow key={score.key} score={score} />
          ))}
        </ul>

        {demo.next_tutoring && (
          <div className="tutor">
            <BrandMark symbolUrl={symbolUrl} size={42} />
            <p>
              <b>Próxima tutoria</b>
              <span>{demo.next_tutoring}</span>
            </p>
          </div>
        )}

        {demo.is_example && (
          <DemoTag variant="light">Demonstração do conceito · exemplo de correção</DemoTag>
        )}
        {showPlatformLabel && demo.show_platform_label && (
          <p className="platform-label">Correção acompanhada na plataforma StudyTrack</p>
        )}
      </aside>
    </Reveal>
  );
}

/** Barra da competência, que cresce ao entrar na viewport. */
function CompetencyRow({ score }: { score: { key: string; label: string; score: number; max_score: number } }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLLIElement | null>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setGrown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const ratio = score.max_score > 0 ? score.score / score.max_score : 0;

  return (
    <li ref={ref}>
      <span>{score.key}</span>
      <em>{score.label}</em>
      <div className="bar">
        <i style={{ '--v': grown || reduced ? ratio : 0 } as React.CSSProperties} />
      </div>
      <b>{score.score}</b>
    </li>
  );
}

/**
 * Monta o parágrafo partindo nos trechos destacados e na palavra circulada.
 * Trabalha sobre o texto exato do conteúdo — um destaque cujo texto não existe
 * no parágrafo simplesmente não é aplicado (nada quebra).
 */
function renderParagraph(
  paragraph: string,
  demo: CorrectionData,
  active: string | null,
  setActive: (id: string | null) => void,
  noteById: Map<string, { id: string }>,
) {
  type Marker = { start: number; end: number; kind: 'hl' | 'circle'; id?: string; className?: string };
  const markers: Marker[] = [];

  for (const h of demo.highlights) {
    const start = paragraph.indexOf(h.text);
    if (start === -1) continue;
    markers.push({ start, end: start + h.text.length, kind: 'hl', id: h.id, className: `hl hl--${h.kind}` });
  }
  if (demo.circled) {
    const start = paragraph.indexOf(demo.circled);
    if (start !== -1) markers.push({ start, end: start + demo.circled.length, kind: 'circle' });
  }

  markers.sort((a, b) => a.start - b.start);

  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const marker of markers) {
    if (marker.start < cursor) continue; // sobreposição: mantém o primeiro
    if (marker.start > cursor) out.push(<Fragment key={`t${cursor}`}>{paragraph.slice(cursor, marker.start)}</Fragment>);
    const text = paragraph.slice(marker.start, marker.end);

    if (marker.kind === 'circle') {
      out.push(
        <span className="circled" key={`c${marker.start}`}>
          {text}
        </span>,
      );
    } else {
      const hasNote = marker.id && noteById.has(marker.id);
      out.push(
        <span
          key={`h${marker.start}`}
          className={`${marker.className}${active === marker.id ? ' is-active' : ''}`}
          tabIndex={0}
          aria-describedby={hasNote ? `ops-note-${marker.id}` : undefined}
          onMouseEnter={() => setActive(marker.id ?? null)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(marker.id ?? null)}
          onBlur={() => setActive(null)}
        >
          {text}
        </span>,
      );
    }
    cursor = marker.end;
  }
  if (cursor < paragraph.length) out.push(<Fragment key="tail">{paragraph.slice(cursor)}</Fragment>);
  return out;
}

/* ---------- ícones das etapas (do protótipo) ---------- */

function BookIcon() {
  return (
    <svg viewBox="0 0 48 48">
      <path d="M8 12c6-2 11-1 16 3 5-4 10-5 16-3v24c-6-2-11-1-16 3-5-4-10-5-16-3V12Z" />
      <path d="M24 15v24" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 48 48">
      <path d="M30 8l10 10-20 20H10V28L30 8Z" />
      <path d="M26 12l10 10" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 48 48">
      <path d="M8 34l10-10 7 7 15-15" />
      <path d="M30 16h10v10" />
    </svg>
  );
}
