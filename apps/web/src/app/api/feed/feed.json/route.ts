import { Feed } from 'feed'
import { getAllPosts } from '~/lib/blog'
import { siteConfig } from '~/lib/metadata'

/**
 * Generate JSON feed for blog posts
 * Accessible at /api/feed/feed.json
 */
export const GET = () => {
  const feed = new Feed({
    title: `${siteConfig.name} Blog`,
    description: siteConfig.description,
    id: siteConfig.url,
    link: siteConfig.url,
    language: 'en',
    image: `${siteConfig.url}${siteConfig.ogImage}`,
    favicon: `${siteConfig.url}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${siteConfig.name}`,
    updated: new Date(),
    generator: 'Feed for Node.js',
    feedLinks: {
      rss2: `${siteConfig.url}/api/feed/rss.xml`,
      json: `${siteConfig.url}/api/feed/feed.json`,
      atom: `${siteConfig.url}/api/feed/atom.xml`,
    },
    author: {
      name: siteConfig.creator,
      link: siteConfig.url,
    },
  })

  const posts = getAllPosts()

  posts.forEach(post => {
    feed.addItem({
      title: post.title,
      id: `${siteConfig.url}/blog/${post.slug}`,
      link: `${siteConfig.url}/blog/${post.slug}`,
      description: post.description,
      content: post.description,
      author: [
        {
          name: post.author,
        },
      ],
      date: new Date(post.date),
      image: post.image ? `${siteConfig.url}${post.image}` : undefined,
      category: post.tags.map(tag => ({ name: tag })),
    })
  })

  return new Response(feed.json1(), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
