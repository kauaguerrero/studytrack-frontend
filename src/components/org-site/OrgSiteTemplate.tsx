import { themeToCssVars, type OrgPublicSiteView } from '@/lib/org-public-site';
import { orgSiteFontClassName } from './fonts';
import { SiteNav } from './sections/SiteNav';
import { HeroSection } from './sections/HeroSection';
import { ResultsSection } from './sections/ResultsSection';
import { MethodSection } from './sections/MethodSection';
import { InsideSection } from './sections/InsideSection';
import { EnrollSection } from './sections/EnrollSection';
import { SiteFooter } from './sections/SiteFooter';
import { OrgSiteJsonLd } from './OrgSiteJsonLd';
import './premium-v1.css';

/**
 * Raiz do template `premium_v1`.
 *
 * Server component: monta a marcação (bom para SEO e LCP) e deixa a
 * interatividade para os filhos marcados com 'use client'. O CSS é importado
 * aqui, então só entra no chunk desta rota.
 *
 * Cada seção é opcional — a org escolhe o que publicar, e o que não vier no
 * `content` simplesmente não é renderizado. O ritmo de fundos (escuro → claro
 * → escuro → claro → painel → escuro) é do CSS e se mantém mesmo com seções
 * faltando, porque cada seção pinta o próprio fundo.
 */
export function OrgSiteTemplate({ site, baseUrl }: { site: OrgPublicSiteView; baseUrl: string }) {
  const { content, org, theme, preview } = site;
  const ctx = { loginUrl: org.login_url, registerUrl: org.register_url };

  const symbolUrl = content.brand?.symbol_url ?? null;
  const logoLight = content.nav?.logo_light_url ?? org.logo_url;
  const logoDark = content.nav?.logo_dark_url ?? org.logo_url;
  const showPoweredBy = content.footer?.show_powered_by ?? true;

  return (
    <div data-org-site="premium_v1" className={orgSiteFontClassName} style={themeToCssVars(theme)}>
      {preview && <PreviewBanner enabled={site.enabled} />}

      {content.nav?.visible !== false && content.nav && (
        <SiteNav nav={content.nav} org={org} logoLight={logoLight} logoDark={logoDark} />
      )}

      <main id="conteudo">
        {content.hero?.visible !== false && content.hero && (
          <HeroSection hero={content.hero} ctx={ctx} symbolUrl={symbolUrl} />
        )}

        {content.results?.visible !== false && content.results && (
          <ResultsSection results={content.results} symbolUrl={symbolUrl} preview={preview} />
        )}

        {content.method?.visible !== false && content.method && (
          <MethodSection method={content.method} symbolUrl={symbolUrl} showPlatformLabel={showPoweredBy} />
        )}

        {content.inside?.visible !== false && content.inside && (
          <InsideSection inside={content.inside} preview={preview} />
        )}

        {content.enroll?.visible !== false && content.enroll && (
          <EnrollSection enroll={content.enroll} ctx={ctx} symbolUrl={symbolUrl} />
        )}
      </main>

      {content.footer?.visible !== false && content.footer && (
        <SiteFooter footer={content.footer} orgName={org.name} logoLight={logoLight} />
      )}

      <OrgSiteJsonLd site={site} baseUrl={baseUrl} />
    </div>
  );
}

/**
 * Faixa discreta de pré-visualização. Fica fixa no rodapé em vez do topo para
 * não cobrir a nav transparente do herói, que é justamente o que o founder
 * quer conferir.
 */
function PreviewBanner({ enabled }: { enabled: boolean }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 999,
        background: 'rgba(7,15,46,.88)',
        border: '1px solid rgba(160,240,250,.3)',
        backdropFilter: 'blur(12px)',
        color: '#fff',
        font: '600 13px/1 var(--sans)',
        boxShadow: '0 20px 40px -18px rgba(0,0,0,.6)',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: '50%', background: enabled ? '#2bc4d8' : '#f6d44a' }}
      />
      Pré-visualização{enabled ? '' : ' · página ainda não publicada'}
    </div>
  );
}
