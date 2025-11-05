import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import readingTime from 'reading-time'

export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  image?: string
  published: boolean
  content: string
  readingTime: string
  lastModified: Date
}

export type BlogPostMetadata = Omit<BlogPost, 'content'>

const postsDirectory = path.join(process.cwd(), 'content/blog')

/**
 * Sanitize a slug to only allow URL-safe characters (alphanumeric, dash, underscore)
 * This prevents XSS vulnerabilities when using slugs in URLs
 */
const sanitizeSlug = (raw: string): string => {
  return raw.replace(/[^a-zA-Z0-9-_]/g, '-')
}

/**
 * Get all blog posts sorted by date (newest first)
 * Optimized to read each file only once
 */
export const getAllPosts = (): BlogPostMetadata[] => {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(postsDirectory)) {
      return []
    }

    const fileNames = fs.readdirSync(postsDirectory)
    const allPostsData = fileNames
      .filter(fileName => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
      .map(fileName => {
        try {
          const rawSlug = fileName.replace(/\.mdx?$/, '')
          const slug = sanitizeSlug(rawSlug)
          const fullPath = path.join(postsDirectory, fileName)
          const fileContents = fs.readFileSync(fullPath, 'utf8')
          const { data, content } = matter(fileContents)
          const stats = readingTime(content)
          const fileStats = fs.statSync(fullPath)

          const post: BlogPostMetadata = {
            slug,
            title: data.title ?? 'Untitled',
            description: data.description ?? '',
            date: data.date ?? new Date().toISOString(),
            author: data.author ?? 'Discuno Team',
            tags: data.tags ?? [],
            image: data.image,
            published: data.published ?? false,
            readingTime: stats.text,
            lastModified: fileStats.mtime,
          }
          return post
        } catch (err) {
          // Log and skip malformed/failed files, but don't fail the whole listing
          console.error('Failed to parse blog post file', fileName, err)
          return null
        }
      })
      .filter((post): post is BlogPostMetadata => post !== null)
      .filter(post => post.published)
      .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))

    return allPostsData
  } catch (err) {
    console.error('getAllPosts failed:', err)
    throw new Error(`getAllPosts failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Get a single blog post by slug
 */
export const getPostBySlug = (slug: string): BlogPost | null => {
  try {
    // Sanitize the slug to prevent path traversal attacks
    const sanitizedSlug = sanitizeSlug(slug)

    // Try .mdx first, then .md
    let fullPath = path.join(postsDirectory, `${sanitizedSlug}.mdx`)
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(postsDirectory, `${sanitizedSlug}.md`)
    }

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    const stats = readingTime(content)
    const fileStats = fs.statSync(fullPath)

    return {
      slug: sanitizedSlug,
      title: data.title ?? 'Untitled',
      description: data.description ?? '',
      date: data.date ?? new Date().toISOString(),
      author: data.author ?? 'Discuno Team',
      tags: data.tags ?? [],
      image: data.image,
      published: data.published ?? false,
      content,
      readingTime: stats.text,
      lastModified: fileStats.mtime,
    }
  } catch (err) {
    console.error(`getPostBySlug failed for slug="${slug}":`, err)
    throw err
  }
}

/**
 * Get all blog post slugs
 */
export const getAllPostSlugs = (): string[] => {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter(fileName => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
    .map(fileName => {
      const rawSlug = fileName.replace(/\.mdx?$/, '')
      return sanitizeSlug(rawSlug)
    })
}

/**
 * Get posts by tag
 */
export const getPostsByTag = (tag: string): BlogPostMetadata[] => {
  const allPosts = getAllPosts()
  return allPosts.filter(post => post.tags.includes(tag))
}

/**
 * Get all unique tags from all posts
 */
export const getAllTags = (): string[] => {
  const allPosts = getAllPosts()
  const tags = new Set<string>()

  allPosts.forEach(post => {
    post.tags.forEach(tag => tags.add(tag))
  })

  return Array.from(tags).sort()
}

/**
 * Format a date string to a readable format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
