import { type Metadata } from 'next'

export const siteConfig = {
  name: 'Discuno',
  tagline: "Talk it through with someone who's been there.",
  description:
    'Talk one-to-one with a student who has firsthand context on the course, major, internship, campus, or college decision in front of you.',
  url: 'https://discuno.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://x.com/discuno',
    linkedin: 'https://linkedin.com/company/discuno',
    instagram: 'https://instagram.com/discunoapp',
    github: 'https://github.com/discuno/discuno',
  },
  keywords: [
    'college mentor',
    'student mentor',
    'college mentorship platform',
    'peer mentorship for college students',
    'college course advice',
    'internship mentorship',
    'college career guidance',
  ],
  creator: 'Discuno',
  authors: [{ name: 'Discuno Team', url: 'https://discuno.com/about' }],
}

export const absoluteUrl = (path = '/') => new URL(path, `${siteConfig.url}/`).toString()

export const defaultMetadata: Metadata = {
  // Search and social URLs should always consolidate on the production domain,
  // including when a preview deployment renders the metadata.
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    site: '@discuno',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logos/black-icon-logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/api/feed/rss.xml',
      'application/atom+xml': '/api/feed/atom.xml',
      'application/feed+json': '/api/feed/feed.json',
    },
  },
  category: 'education',
}

export const createMetadata = (override: Metadata): Metadata => {
  const canonical = override.alternates?.canonical
  const canonicalUrl =
    typeof canonical === 'string' || canonical instanceof URL ? canonical : undefined

  return {
    ...defaultMetadata,
    ...override,
    openGraph: {
      ...defaultMetadata.openGraph,
      ...override.openGraph,
      // Preserve the default share image when a page does not provide one.
      images: override.openGraph?.images ?? defaultMetadata.openGraph?.images,
      // A page canonical is also the most reliable default for its OG URL.
      // Do not fall back to the homepage URL for nested pages; an omitted URL is
      // preferable to telling crawlers that every page represents the homepage.
      url: override.openGraph?.url ?? canonicalUrl,
    },
    twitter: {
      ...defaultMetadata.twitter,
      ...override.twitter,
      images: override.twitter?.images ?? defaultMetadata.twitter?.images,
    },
    alternates: {
      ...defaultMetadata.alternates,
      ...override.alternates,
      // Explicitly clear the root canonical when a nested page has not declared
      // its own. This prevents support/legal pages from canonicalizing to `/`.
      canonical: override.alternates?.canonical,
      types: {
        ...defaultMetadata.alternates?.types,
        ...override.alternates?.types,
      },
    },
  }
}
