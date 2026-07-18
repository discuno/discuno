import { ArrowRightIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { buttonVariants } from '~/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '~/components/ui/empty'
import { formatDate, getAllPosts } from '~/lib/blog'
import { absoluteUrl, createMetadata } from '~/lib/metadata'
import { cn } from '~/lib/utils'

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

const displayTag = (tag: string) => tag.replaceAll('-', ' ')

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
    <div className="mx-auto w-full max-w-[76rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <header className="grid gap-8 pb-12 sm:pb-16 lg:grid-cols-12 lg:items-end">
        <h1 className="display-hero lg:col-span-8">Questions worth asking before you choose.</h1>
        <p className="text-muted-foreground max-w-sm text-base leading-7 lg:col-span-4 lg:pb-1">
          Practical guides for majors, internships, campus life, and the decision in front of you.
        </p>
      </header>

      <section className="section-rule" aria-labelledby="college-guides-heading">
        <h2 id="college-guides-heading" className="sr-only">
          College guides
        </h2>

        {posts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <h3>No guides yet</h3>
              </EmptyTitle>
              <EmptyDescription>New college decision guides will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div>
            {posts.map(post => (
              <article
                key={post.slug}
                className="border-foreground/18 grid gap-6 border-b py-8 md:grid-cols-12 md:gap-8 lg:py-10"
              >
                <dl className="text-muted-foreground flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm md:col-span-3 md:flex-col md:items-start">
                  <div>
                    <dt className="sr-only">Published</dt>
                    <dd>
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Author</dt>
                    <dd>By {post.author}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Reading time</dt>
                    <dd>{post.readingTime}</dd>
                  </div>
                  {post.tags.length > 0 && (
                    <div className="w-full min-w-0 basis-full leading-6 capitalize">
                      <dt className="sr-only">Topics</dt>
                      <dd className="break-words">{post.tags.map(displayTag).join(', ')}</dd>
                    </div>
                  )}
                </dl>

                <div
                  className={cn(
                    'min-w-0 md:col-span-9',
                    post.image && 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10'
                  )}
                >
                  {post.image && (
                    <div
                      className="bg-muted relative order-first aspect-[8/5] overflow-hidden rounded-xl lg:order-last"
                      aria-hidden="true"
                    >
                      <Image
                        src={post.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 256px"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-4xl">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
                      {post.description}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className={buttonVariants({
                        variant: 'link',
                        size: 'sm',
                        className: 'mt-5 -ml-3',
                      })}
                    >
                      Read guide
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default BlogPage
