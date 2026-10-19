'use client';

import { Reveal, SectionTitle, VideoLightbox, useTilt, useVideoLightbox } from '../primitives';
import type { InsideSection as InsideData, VideoItem } from '@/lib/org-public-site';

/**
 * Seção "Por dentro / Histórias reais": vídeo principal, reels e depoimentos.
 *
 * Depoimentos vazios (nenhum com consentimento completo) NÃO viram espaço
 * reservado em produção — o bloco de citações some e a coluna de texto fica só
 * com título e lead, com a mídia ocupando o outro lado. Os placeholders do
 * protótipo aparecem apenas em preview, para o founder ver onde o conteúdo vai.
 */
export function InsideSection({ inside, preview }: { inside: InsideData; preview: boolean }) {
  const lightbox = useVideoLightbox();
  const hasTestimonials = inside.testimonials.length > 0;
  const showQuotes = hasTestimonials || preview;

  const openVideo = (item: VideoItem) => {
    if (item.video_url) {
      lightbox.show(item.video_url, item.title || 'Vídeo');
    } else if (item.external_url) {
      window.open(item.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className="inside" id="por-dentro" aria-labelledby="in-title">
      <div className="wrap inside__grid">
        <div className="inside__copy">
          {inside.eyebrow && (
            <Reveal as="p" index={0} className="eyebrow eyebrow--dark">
              <span className="dot" />
              {inside.eyebrow}
            </Reveal>
          )}
          <Reveal index={1}>
            <SectionTitle id="in-title" title={inside.title} highlight={inside.title_highlight} inline={inside.title_highlight_inline} />
          </Reveal>
          {inside.lead && (
            <Reveal as="p" index={2} className="sec-lead">
              {inside.lead}
            </Reveal>
          )}

          {showQuotes && (
            <div className="quotes">
              {hasTestimonials
                ? inside.testimonials.map((t, i) => (
                    <Reveal
                      as="blockquote"
                      key={`${t.name}-${i}`}
                      index={i}
                      className={`quote${i % 2 === 1 ? ' quote--alt' : ''}`}
                    >
                      <span className="quote__mark" aria-hidden="true">
                        “
                      </span>
                      <p>{t.text}</p>
                      {/* Sem nome não há rodapé: um avatar com "?" e campos
                          vazios diria menos do que o próprio depoimento. */}
                      {(t.name || t.detail) && (
                        <footer>
                          {t.name && (
                            <span className={`avatar${i % 2 === 1 ? ' avatar--teal' : ''}`}>
                              {t.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            {t.name && <b>{t.name}</b>}
                            {t.detail && <span>{t.detail}</span>}
                          </div>
                        </footer>
                      )}
                    </Reveal>
                  ))
                : PLACEHOLDER_QUOTES.map((q, i) => (
                    <Reveal
                      as="blockquote"
                      key={q.letter}
                      index={i}
                      className={`quote${i % 2 === 1 ? ' quote--alt' : ''}`}
                    >
                      <span className="quote__mark" aria-hidden="true">
                        “
                      </span>
                      <p>{q.text}</p>
                      <footer>
                        <span className={`avatar${i % 2 === 1 ? ' avatar--teal' : ''}`}>{q.letter}</span>
                        <div>
                          <b>Nome do aluno</b>
                          <span>{q.detail}</span>
                        </div>
                      </footer>
                    </Reveal>
                  ))}
            </div>
          )}
        </div>

        <div className="inside__media">
          {inside.main_video && <MainVideo video={inside.main_video} onOpen={openVideo} />}

          {inside.reels.length > 0 && (
            <div className="reels">
              {inside.reels.map((reel, i) => (
                <Reveal as="figure" key={reel.cover_url ?? i} index={i} className="reel">
                  {reel.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reel.cover_url} alt={reel.alt || reel.title} loading="lazy" decoding="async" />
                  )}
                  <button
                    type="button"
                    className="reel__play"
                    aria-label={`Assistir: ${reel.title}`}
                    onClick={() => openVideo(reel)}
                  />
                  <figcaption>{reel.title}</figcaption>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox.open && (
        <VideoLightbox videoUrl={lightbox.open.url} title={lightbox.open.title} onClose={lightbox.hide} />
      )}
    </section>
  );
}

function MainVideo({ video, onOpen }: { video: VideoItem; onOpen: (v: VideoItem) => void }) {
  const tilt = useTilt();
  const playable = Boolean(video.video_url || video.external_url);

  return (
    <Reveal as="figure" className="video" {...tilt}>
      {video.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.cover_url} alt={video.alt || video.title} loading="lazy" decoding="async" />
      )}
      <div className="video__shade" aria-hidden="true" />
      {playable && (
        <button
          type="button"
          className="video__play"
          aria-label={`Assistir: ${video.title}`}
          onClick={() => onOpen(video)}
        >
          <span aria-hidden="true" />
        </button>
      )}
      <figcaption className="video__cap">
        <span className="live-dot" aria-hidden="true" />
        <div>
          <b>{video.title}</b>
          <span>{video.subtitle}</span>
        </div>
      </figcaption>
    </Reveal>
  );
}

/** Só em preview — ver a decisão documentada no topo do arquivo. */
const PLACEHOLDER_QUOTES = [
  {
    letter: 'A',
    text: 'Espaço reservado para o depoimento de um aluno real, publicado com a autorização dele (e dos responsáveis, se for menor de idade).',
    detail: 'Aprovação · curso · ano',
  },
  {
    letter: 'B',
    text: 'Depoimento autorizado de um segundo aluno, com nota ou aprovação conquistada.',
    detail: 'Nota da redação · vestibular',
  },
];
