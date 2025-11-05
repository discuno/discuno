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
}

export type BlogPostMetadata = Omit<BlogPost, 'content'>

const postsDirectory = path.join(process.cwd(), 'content/blog')

/**
 * Get all blog posts sorted by date (newest first)
 */
export const getAllPosts = (): BlogPostMetadata[] => {
  // Create directory if it doesn't exist
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx?$/, '')
      const post = getPostBySlug(slug)
      if (!post) return null

      const { content: _content, ...metadata } = post
      return metadata
    })
    .filter((post): post is BlogPostMetadata => post !== null)
    .filter(post => post.published)
    .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))

  return allPostsData
}

/**
 * Get a single blog post by slug
 */
export const getPostBySlug = (slug: string): BlogPost | null => {
  try {
    // Try .mdx first, then .md
    let fullPath = path.join(postsDirectory, `${slug}.mdx`)
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(postsDirectory, `${slug}.md`)
    }

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    const stats = readingTime(content)

    return {
      slug,
      title: data.title ?? 'Untitled',
      description: data.description ?? '',
      date: data.date ?? new Date().toISOString(),
      author: data.author ?? 'Discuno Team',
      tags: data.tags ?? [],
      image: data.image,
      published: data.published ?? false,
      content,
      readingTime: stats.text,
    }
  } catch {
    return null
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
    .map(fileName => fileName.replace(/\.mdx?$/, ''))
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
