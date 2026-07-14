import type { MetadataRoute } from 'next'
import { getAllPosts } from '~/lib/blog'
import { absoluteUrl } from '~/lib/metadata'
import { getPostsWithCursor } from '~/server/dal/posts'

const MAX_MENTOR_URLS = 45_000

const getPublicMentorPages = async (): Promise<MetadataRoute.Sitemap> => {
  try {
    // The feed uses the same eligibility conditions as mentor discovery, so the
    // sitemap never advertises an incomplete or currently unbookable profile.
    const rows = await getPostsWithCursor({ limit: MAX_MENTOR_URLS })
    const usernames = new Set<string>()

    for (const row of rows) {
      if (row.creator.username) usernames.add(row.creator.username)
    }

    return Array.from(usernames, username => ({
      url: absoluteUrl(`/mentor/${encodeURIComponent(username)}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch (error) {
    // A transient database outage should not prevent the static acquisition and
    // editorial pages from retaining a valid sitemap.
    console.error('Unable to include mentor profiles in sitemap', error)
    return []
  }
}

/**
 * Generate dynamic sitemap including blog posts
 * Next.js will automatically serve this at /sitemap.xml
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/for-mentors'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/blog'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/about'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/support'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/privacy'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/terms'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const posts = getAllPosts()
  const blogPages: MetadataRoute.Sitemap = posts.map(post => ({
    url: absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`),
    lastModified: post.lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const mentorPages = await getPublicMentorPages()

  return [...staticPages, ...blogPages, ...mentorPages]
}

export default sitemap
