import type { MetadataRoute } from 'next'
import { siteConfig } from '~/lib/metadata'

/**
 * Keep discovery pages crawlable while excluding account, checkout, and API
 * surfaces that are not useful search results.
 */
const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/feed/'],
      disallow: [
        '/api/',
        '/auth',
        '/oauth',
        '/settings',
        '/dashboard',
        '/booking',
        '/mentor/*/book',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}

export default robots
