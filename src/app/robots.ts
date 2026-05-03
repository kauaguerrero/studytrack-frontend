import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/portal/',
        '/partners/',
        '/jogos/',
        '/audit/',
        '/simple',
        '/test',
        '/api/',
        '/auth/',
      ],
    },
    sitemap: 'https://studytrack.com.br/sitemap.xml',
  }
}