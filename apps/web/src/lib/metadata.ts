import { type Metadata } from 'next'

export const siteConfig = {
  name: 'Discuno',
  tagline: 'Get insider college advice from verified students.',
  description:
    'Connect with verified student mentors for personalized guidance on courses, internships, and career planning. Book sessions with peers who understand your journey.',
  url: 'https://discuno.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://x.com/discuno',
    linkedin: 'https://linkedin.com/company/discuno',
    instagram: 'https://instagram.com/discunoapp',
    github: 'https://github.com/discuno/discuno',
  },
  keywords: [
    'college mentorship',
    'student mentors',
    'peer mentoring',
    'college success',
    'academic guidance',
    'career planning',
    'course selection',
    'internship prep',
    'university advice',
    'student networking',
    '.edu verification',
    'college students',
  ],
  creator: 'Brad',
  authors: [{ name: 'Brad', url: 'https://discuno.com/about' }],
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  generator: 'Next.js',
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
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
    title: `${siteConfig.name} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@discuno',
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
    canonical: siteConfig.url,
  },
  category: 'education mentorship',
}

export const createMetadata = (override: Metadata): Metadata => {
  return {
    ...defaultMetadata,
    ...override,
    openGraph: {
      ...defaultMetadata.openGraph,
      ...override.openGraph,
    },
    twitter: {
      ...defaultMetadata.twitter,
      ...override.twitter,
    },
  }
}
