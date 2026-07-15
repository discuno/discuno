import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconCalendar, IconClock, IconTag } from '@tabler/icons-react'
import { getAllPosts, formatDate } from '~/lib/blog'
import { absoluteUrl, createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Guides for College Decisions',
  description:
    'Questions, checklists, and firsthand prompts for choosing a major, navigating campus, preparing for recruiting, and making your next college decision.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'College decisions, made clearer | Discuno',
    description: 'Practical questions and guides for the college choices no one fully explains.',
    url: '/blog',
  },
})

const BlogPage = () => {
  const posts = getAllPosts()
  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': absoluteUrl('/blog#blog'),
    url: absoluteUrl('/blog'),
    name: 'Discuno College Guides',
    description:
      'Practical questions and guides for college, campus, internships, and early-career decisions.',
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'Discuno',
      url: absoluteUrl('/'),
    },
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      '@id': absoluteUrl(`/blog/${post.slug}#article`),
      url: absoluteUrl(`/blog/${post.slug}`),
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.lastModified.toISOString(),
      author: {
        '@type': post.author === 'Discuno Team' ? 'Organization' : 'Person',
        name: post.author,
      },
    })),
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      {/* Header */}
      <div className="mb-12 space-y-4">
        <p className="eyebrow">College guides</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Questions worth asking before you choose.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg leading-8">
          Practical prompts for the classes, majors, internships, campuses, and next moves that are
          easier to navigate with real context.
        </p>
      </div>

      {/* Blog Posts Grid */}
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No blog posts published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <article
              key={post.slug}
              className="bg-card group flex flex-col overflow-hidden rounded-lg border transition-all hover:shadow-lg"
            >
              <Link href={`/blog/${post.slug}`} className="flex flex-col">
                {/* Featured Image */}
                {post.image && (
                  <div className="bg-muted relative aspect-video w-full overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {post.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                        >
                          <IconTag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="group-hover:text-primary mb-2 text-xl font-semibold tracking-tight">
                    {post.title}
                  </h2>

                  {/* Description */}
                  <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm">
                    {post.description}
                  </p>

                  {/* Meta */}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <IconCalendar size={14} />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconClock size={14} />
                      <span>{post.readingTime}</span>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium">By {post.author}</p>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlogPage
