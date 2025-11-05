import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowLeft, IconCalendar, IconClock, IconTag } from '@tabler/icons-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkGfm from 'remark-gfm'
import { getAllPostSlugs, getPostBySlug, formatDate } from '~/lib/blog'
import { createMetadata, siteConfig } from '~/lib/metadata'
import { mdxComponents } from '~/components/shared/mdx-components'

import 'highlight.js/styles/github-dark.css'

type Props = {
  params: Promise<{ slug: string }>
}

export const generateStaticParams = async () => {
  const slugs = getAllPostSlugs()
  return slugs.map(slug => ({
    slug,
  }))
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {}
  }

  const publishedTime = new Date(post.date).toISOString()
  const url = `${siteConfig.url}/blog/${slug}`

  return createMetadata({
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime,
      authors: [post.author],
      url,
      images: post.image
        ? [
            {
              url: post.image,
              width: 1200,
              height: 630,
              alt: post.title,
            },
          ]
        : undefined,
      tags: post.tags,
    },
    twitter: {
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : undefined,
    },
    alternates: {
      canonical: url,
    },
  })
}

const BlogPostPage = async ({ params }: Props) => {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post || !post.published) {
    notFound()
  }

  // JSON-LD structured data for blog post
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.image ? `${siteConfig.url}${post.image}` : siteConfig.ogImage,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logos/black-icon-logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/blog/${slug}`,
    },
    keywords: post.tags.join(', '),
  }

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <IconArrowLeft size={16} />
          Back to Blog
        </Link>

        {/* Article Header */}
        <header className="mb-8 space-y-4">
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                >
                  <IconTag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{post.title}</h1>

          {/* Description */}
          <p className="text-muted-foreground text-xl">{post.description}</p>

          {/* Meta information */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 border-y py-4 text-sm">
            <div className="flex items-center gap-1">
              <IconCalendar size={16} />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <div className="flex items-center gap-1">
              <IconClock size={16} />
              <span>{post.readingTime}</span>
            </div>
            <div className="text-foreground font-medium">By {post.author}</div>
          </div>
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-12 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image} alt={post.title} className="w-full object-cover" />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSlug,
                  [
                    rehypeAutolinkHeadings,
                    {
                      behavior: 'wrap',
                      properties: {
                        className: ['anchor-link'],
                      },
                    },
                  ],
                  rehypeHighlight,
                ],
              },
            }}
          />
        </div>

        {/* Article Footer */}
        <footer className="mt-12 border-t pt-8">
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Want to learn more? Connect with verified student mentors on Discuno for personalized
              guidance.
            </p>
            <Link
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Find a Mentor
            </Link>
          </div>
        </footer>
      </article>
    </>
  )
}

export default BlogPostPage
