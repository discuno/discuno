import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconCalendar, IconClock, IconTag } from '@tabler/icons-react'
import { getAllPosts, formatDate } from '~/lib/blog'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Blog - Discuno',
  description:
    'Insights on college success, mentorship, career planning, and student life. Learn from verified student mentors and the Discuno community.',
  openGraph: {
    title: 'Blog - Discuno',
    description:
      'Insights on college success, mentorship, career planning, and student life. Learn from verified student mentors and the Discuno community.',
    url: '/blog',
  },
})

const BlogPage = () => {
  const posts = getAllPosts()

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="text-muted-foreground text-lg">
          Insights on college success, mentorship, career planning, and student life from the
          Discuno community.
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
