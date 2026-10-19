import { MetadataRoute } from 'next'
import { listPublishedSiteSlugs } from '@/lib/org-public-site.server'

const BASE = 'https://studytrack.com.br'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let orgSites: MetadataRoute.Sitemap = []
  try {
    // Páginas públicas de org publicadas. Prioridade alta: são páginas
    // institucionais completas, não rotas internas do produto.
    const slugs = await listPublishedSiteSlugs()
    orgSites = slugs.map((slug) => ({
      url: `${BASE}/partners/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
  } catch {
    // Banco fora: devolve o sitemap base em vez de quebrar a rota.
  }

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...orgSites,
    {
      url: `${BASE}/termos-de-uso`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
