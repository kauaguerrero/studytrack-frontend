import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/portal/', '/api/'],
    },
    sitemap: 'https://studytrack.com.br/sitemap.xml',
  }
}