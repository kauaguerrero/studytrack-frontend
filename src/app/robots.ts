import { MetadataRoute } from 'next'
import { listPublishedSiteSlugs } from '@/lib/org-public-site.server'

/**
 * `/partners/` continua bloqueado inteiro — é o portal autenticado. A exceção
 * são as páginas públicas de org publicadas: cada uma ganha um `Allow` com o
 * caminho exato, que vence o `Disallow` por ser o match mais longo. Sem isto,
 * um site recém-ativado nasceria desindexado.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let publishedPaths: string[] = []
  try {
    const slugs = await listPublishedSiteSlugs()
    publishedPaths = slugs.map((slug) => `/partners/${slug}`)
  } catch {
    // Banco indisponível: melhor servir o robots.txt restritivo de sempre do
    // que falhar a rota inteira.
  }

  return {
    rules: {
      userAgent: '*',
      allow: ['/', ...publishedPaths],
      disallow: [
        '/portal/',
        '/partners/',
        '/audit/',
        '/api/',
        '/auth/',
      ],
    },
    sitemap: 'https://studytrack.com.br/sitemap.xml',
  }
}
