'use client';

import { CtaButton, Reveal, useTilt } from '../primitives';
import {
  ctaIsExternal,
  resolveCtaHref,
  whatsappUrl,
  type CtaContext,
  type EnrollSection as EnrollData,
} from '@/lib/org-public-site';

/**
 * Seção "Matrículas": painel em degradê com os CTAs de conversão.
 *
 * Sem escassez artificial — nada de contador, "últimas vagas" ou preço. A
 * conversão leva ao WhatsApp (ou ao registro da org, se o conteúdo escolher),
 * que é o canal que a escola realmente atende.
 */
export function EnrollSection({
  enroll,
  ctx,
  symbolUrl,
}: {
  enroll: EnrollData;
  ctx: CtaContext;
  symbolUrl: string | null;
}) {
  const tilt = useTilt();
  const contact = enroll.contact;
  const contactHref = contact ? whatsappUrl(contact.phone_number) : null;

  return (
    <section className="enroll" id="matriculas" aria-labelledby="en-title">
      <div className="enroll__panel">
        <div className="enroll__bg" aria-hidden="true">
          {symbolUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={symbolUrl} alt="" className="enroll__bird" loading="lazy" decoding="async" />
          )}
          <div className="beam beam--3" />
        </div>

        <div className="enroll__copy">
          {enroll.eyebrow && (
            <Reveal as="p" index={0} className="eyebrow">
              <span className="dot dot--sun" />
              {enroll.eyebrow}
            </Reveal>
          )}

          <Reveal as="h2" index={1} id="en-title" className="enroll__title">
            {enroll.title_lines.map((line, i) => (
              <span key={line + i}>
                {line}
                <br />
              </span>
            ))}
            {enroll.title_highlight && <em>{enroll.title_highlight}</em>}
          </Reveal>

          {enroll.perks.length > 0 && (
            <Reveal as="ul" index={2} className="perks">
              {enroll.perks.map((perk) => (
                <li key={perk}>
                  <span className="tick tick--light" />
                  {perk}
                </li>
              ))}
            </Reveal>
          )}

          <Reveal index={3} className="enroll__actions">
            <CtaButton
              cta={enroll.primary_cta}
              href={resolveCtaHref(enroll.primary_cta, ctx)}
              external={ctaIsExternal(enroll.primary_cta)}
              variant="sun"
              size="lg"
              withArrow
            />
            <CtaButton
              cta={enroll.secondary_cta}
              href={resolveCtaHref(enroll.secondary_cta, ctx)}
              external={ctaIsExternal(enroll.secondary_cta)}
              variant="ghost"
              size="lg"
            />
          </Reveal>
        </div>

        <div className="enroll__card-wrap">
          {enroll.photo_url && (
            <Reveal as="figure" className="enroll__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.photo_url} alt={enroll.photo_alt} loading="lazy" decoding="async" />
            </Reveal>
          )}

          {contact && (
            <Reveal className="glass contact-card" {...tilt}>
              <p className="contact-card__k">{enroll.contact_kicker}</p>
              {contact.phone_display &&
                (contactHref ? (
                  <a href={contactHref} className="contact-card__phone" target="_blank" rel="noopener noreferrer">
                    {contact.phone_display}
                  </a>
                ) : (
                  <p className="contact-card__phone">{contact.phone_display}</p>
                ))}
              {contact.hours && (
                <p className="contact-card__row">
                  <span>Atendimento</span>
                  {contact.hours}
                </p>
              )}
              {contact.address && (
                <p className="contact-card__row">
                  <span>Endereço</span>
                  {contact.address}
                </p>
              )}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
