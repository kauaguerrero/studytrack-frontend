import { whatsappUrl, type FooterSection as FooterData } from '@/lib/org-public-site';

/**
 * Rodapé do template. Server component — não tem interação nenhuma.
 *
 * Os links de privacidade e termos são configuráveis: a StudyTrack tem
 * /termos-de-uso, mas a página é da ESCOLA, então o conteúdo decide para onde
 * apontar. Sem URL configurada, o link não é renderizado (melhor do que um
 * href="#" que não leva a lugar nenhum).
 */
export function SiteFooter({
  footer,
  orgName,
  logoLight,
}: {
  footer: FooterData;
  orgName: string;
  logoLight: string | null;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="foot">
      <div className="wrap foot__grid">
        <div className="foot__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoLight && <img src={logoLight} alt={orgName} loading="lazy" />}
          {footer.about && <p>{footer.about}</p>}
        </div>

        {(footer.phones.length > 0 || footer.email) && (
          <div className="foot__col">
            <p className="foot__h">Contato</p>
            {footer.phones.map((phone) => {
              const wa = whatsappUrl(phone);
              const digits = phone.replace(/\D/g, '');
              return wa ? (
                <a key={phone} href={wa} target="_blank" rel="noopener noreferrer">
                  {phone}
                </a>
              ) : (
                <a key={phone} href={`tel:+55${digits}`}>
                  {phone}
                </a>
              );
            })}
            {footer.email && <a href={`mailto:${footer.email}`}>{footer.email}</a>}
          </div>
        )}

        {(footer.address_lines.length > 0 || footer.hours) && (
          <div className="foot__col">
            <p className="foot__h">Visite</p>
            {footer.address_lines.length > 0 && (
              <p>
                {footer.address_lines.map((line, i, all) => (
                  <span key={line}>
                    {line}
                    {i < all.length - 1 && <br />}
                  </span>
                ))}
              </p>
            )}
            {footer.hours && <p>{footer.hours}</p>}
          </div>
        )}

        {footer.socials.length > 0 && (
          <div className="foot__col">
            <p className="foot__h">Siga</p>
            {footer.socials.map((social) => (
              <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer">
                {social.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="wrap foot__legal">
        <span>
          © {year} {footer.legal_name || orgName} · Todos os direitos reservados
          {footer.show_powered_by && (
            <>
              {' · '}
              <a href="https://studytrack.com.br" target="_blank" rel="noopener noreferrer">
                Powered by StudyTrack
              </a>
            </>
          )}
        </span>
        {(footer.privacy_url || footer.terms_url) && (
          <span>
            {footer.privacy_url && <a href={footer.privacy_url}>Política de privacidade</a>}
            {footer.privacy_url && footer.terms_url ? ' · ' : ''}
            {footer.terms_url && <a href={footer.terms_url}>Termos de uso</a>}
          </span>
        )}
      </div>
    </footer>
  );
}
