import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

import { mdxComponents } from '~/components/shared/mdx-components'
import { buttonVariants } from '~/components/ui/button'
import { formatDate, getAllPosts, getPostBySlug } from '~/lib/blog'
import { absoluteUrl, createMetadata, siteConfig } from '~/lib/metadata'

import 'highlight.js/styles/github-dark.css'

type Props = {
  params: Promise<{ slug: string }>
}

export const generateStaticParams = async () => {
  const posts = getAllPosts()
  return posts.map(post => ({
    slug: post.slug,
  }))
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post || !post.published) {
    return {
      title: 'Article not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const publishedTime = new Date(post.date).toISOString()
  const url = `/blog/${slug}`

  return createMetadata({
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
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

const displayTag = (tag: string) => tag.replaceAll('-', ' ')

const BlogPostPage = async ({ params }: Props) => {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post || !post.published) {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${slug}#article`),
    url: absoluteUrl(`/blog/${slug}`),
    headline: post.title,
    description: post.description,
    image: absoluteUrl(post.image ?? siteConfig.ogImage),
    datePublished: post.date,
    dateModified: post.lastModified.toISOString(),
    author: {
      '@type': post.author === 'Discuno Team' ? 'Organization' : 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logos/black-icon-logo.png'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(`/blog/${slug}`),
    },
    keywords: post.tags.join(', '),
    isAccessibleForFree: true,
    inLanguage: 'en-US',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto w-full max-w-[76rem] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: '-ml-3',
            })}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            All college guides
          </Link>

          <header className="mt-8">
            <h1 className="font-display text-5xl leading-[0.96] font-medium tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              {post.title}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-[42rem] text-lg leading-8 sm:text-xl">
              {post.description}
            </p>

            <dl className="section-rule text-muted-foreground mt-8 flex flex-wrap gap-x-5 gap-y-2 pt-5 text-sm">
              <div>
                <dt className="sr-only">Author</dt>
                <dd className="text-foreground font-medium">By {post.author}</dd>
              </div>
              <div>
                <dt className="sr-only">Published</dt>
                <dd>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Reading time</dt>
                <dd>{post.readingTime}</dd>
              </div>
            </dl>

            {post.tags.length > 0 && (
              <ul
                className="text-muted-foreground mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm capitalize"
                aria-label="Topics"
              >
                {post.tags.map(tag => (
                  <li key={tag}>{displayTag(tag)}</li>
                ))}
              </ul>
            )}
          </header>
        </div>

        {post.image && (
          <div className="relative mx-auto mt-10 aspect-video max-w-5xl overflow-hidden rounded-xl sm:mt-12">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              preload
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1024px"
            />
          </div>
        )}

        <div className="reading-measure mx-auto mt-12 sm:mt-16">
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

          <footer className="section-rule mt-16 pt-8">
            <p className="text-muted-foreground max-w-xl text-base leading-7">
              Still sorting out the decision? Talk it through with a student who has firsthand
              context.
            </p>
            <Link
              href="/"
              className={buttonVariants({
                className: 'mt-5',
              })}
            >
              Find someone who&apos;s been there
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </footer>
        </div>
      </article>
    </>
  )
}

export default BlogPostPage
