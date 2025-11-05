import type { MetadataRoute } from 'next'
import { siteConfig } from '~/lib/metadata'

/**
 * Generate dynamic robots.txt
 * Next.js will automatically serve this at /robots.txt
 */
const robots = (): MetadataRoute.Robots => {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/settings/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/blog/', '/about'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/blog/', '/about'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/blog/', '/about'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/blog/', '/about'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/blog/', '/about'],
      },
      {
        userAgent: 'CCBot',
        allow: ['/blog/', '/about'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}

// eslint-disable-next-line import/no-default-export
export default robots
