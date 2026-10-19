'use client';

import { useEffect, useRef, useState } from 'react';
import { SiteButton, WhatsAppIcon } from '../primitives';
import { whatsappUrl, type NavSection, type OrgPublicSiteView } from '@/lib/org-public-site';

/**
 * Nav fixa do template.
 *
 * Transparente sobre o herói (logo claro) e sólida com vidro depois de 60px de
 * rolagem (logo navy), exatamente como o protótipo. O menu mobile é novo: o
 * protótipo só desenhava o botão hambúrguer.
 */
export function SiteNav({
  nav,
  org,
  logoLight,
  logoDark,
}: {
  nav: NavSection;
  org: OrgPublicSiteView['org'];
  logoLight: string | null;
  logoDark: string | null;
}) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Menu mobile: ESC fecha, foco preso dentro do painel, scroll travado.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector<HTMLElement>('button, a')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        burgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = menuRef.current?.querySelectorAll<HTMLElement>('button, [href]');
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
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const waHref = nav.show_whatsapp ? whatsappUrl(nav.whatsapp_number) : null;
  const ctaHref = '#matriculas';
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className={`nav${solid ? ' is-solid' : ''}`} id="top">
        <a className="nav__logo" href="#top" aria-label={`${org.name} — início`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoLight && <img src={logoLight} alt={org.name} className="logo-light" width={180} height={52} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoDark && <img src={logoDark} alt="" aria-hidden="true" className="logo-dark" width={180} height={52} />}
        </a>

        {nav.links.length > 0 && (
          <nav className="nav__links" aria-label="Principal">
            {nav.links.map((link) => (
              <a key={link.anchor} href={`#${link.anchor}`}>
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="nav__cta">
          {waHref && (
            <a className="nav__wa" href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <WhatsAppIcon />
            </a>
          )}

          {/* Porta de entrada para quem já é aluno da escola. */}
          <a className="nav__enter" href={org.login_url}>
            {nav.login_label || 'Entrar'}
          </a>

          {nav.cta_label && (
            <SiteButton href={ctaHref} variant="teal" size="sm">
              {nav.cta_label}
            </SiteButton>
          )}

          <button
            type="button"
            className="nav__burger"
            ref={burgerRef}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="org-site-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="menu"
          id="org-site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          ref={menuRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMenu();
          }}
        >
          <div className="menu__top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoLight && <img src={logoLight} alt={org.name} />}
            <button type="button" className="menu__close" onClick={closeMenu} aria-label="Fechar menu">
              ×
            </button>
          </div>

          <nav className="menu__links" aria-label="Principal">
            {nav.links.map((link) => (
              <a key={link.anchor} href={`#${link.anchor}`} onClick={closeMenu}>
                {link.label}
              </a>
            ))}
            <a href={org.login_url}>{nav.login_label || 'Entrar'}</a>
          </nav>

          <div className="menu__foot">
            {waHref && (
              <SiteButton href={waHref} variant="ghost" size="lg" external onClick={closeMenu}>
                Falar no WhatsApp
              </SiteButton>
            )}
            {nav.cta_label && (
              <SiteButton href={ctaHref} variant="teal" size="lg" onClick={closeMenu}>
                {nav.cta_label}
              </SiteButton>
            )}
          </div>
        </div>
      )}
    </>
  );
}
