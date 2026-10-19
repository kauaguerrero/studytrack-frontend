import type { OrgPublicSiteView } from '@/lib/org-public-site';

/**
 * JSON-LD da página pública: EducationalOrganization com endereço, telefones,
 * e-mail e redes sociais, montado a partir do `content`.
 *
 * Só é emitido quando a página está publicada — em preview seria dizer ao
 * Google que a escola existe numa URL que ainda devolve redirect.
 */
export function OrgSiteJsonLd({ site, baseUrl }: { site: OrgPublicSiteView; baseUrl: string }) {
  if (!site.enabled) return null;

  const { content, org } = site;
  const footer = content.footer;
  const enroll = content.enroll;

  const url = `${baseUrl}/partners/${org.slug}`;

  // "R. Torquato Caleiro, 725" + "Vila Nicácio · Franca/SP" → rua, bairro,
  // cidade e UF. Formato livre: o que não casar vira só streetAddress.
  const addressLines = footer?.address_lines ?? [];
  const cityLine = addressLines[1] ?? '';
  const cityMatch = cityLine.match(/([^·]+)·\s*([^/]+)\/\s*([A-Z]{2})/);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    name: footer?.legal_name || org.name,
    alternateName: org.name,
    url,
    ...(org.logo_url ? { logo: org.logo_url } : {}),
    ...(site.seo.description ? { description: site.seo.description } : {}),
    ...(site.seo.og_image_url ? { image: site.seo.og_image_url } : {}),
    ...(footer?.email ? { email: footer.email } : {}),
    ...(footer?.phones?.length ? { telephone: footer.phones[0] } : {}),
    ...(content.hero?.founded_year ? { foundingDate: String(content.hero.founded_year) } : {}),
    ...(footer?.socials?.length ? { sameAs: footer.socials.map((s) => s.url) } : {}),
    ...(footer?.hours ? { openingHours: footer.hours } : {}),
  };

  if (addressLines.length > 0) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: addressLines[0],
      addressCountry: 'BR',
      ...(cityMatch
        ? {
            addressLocality: cityMatch[2].trim(),
            addressRegion: cityMatch[3].trim(),
          }
        : {}),
    };
  } else if (enroll?.contact?.address) {
    data.address = { '@type': 'PostalAddress', streetAddress: enroll.contact.address, addressCountry: 'BR' };
  }

  return (
    <script
      type="application/ld+json"
      // Conteúdo próprio, serializado por JSON.stringify; o escape de "<"
      // impede que um valor feche o <script> cedo.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
