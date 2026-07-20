import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '~/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '~/components/ui/empty'
import { formatDate, getAllPosts, type BlogPostMetadata } from '~/lib/blog'
import { absoluteUrl, createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Guides for College Decisions',
  description:
    'Questions and practical prompts for choosing a major, navigating campus, preparing for recruiting, and making your next college decision.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Questions for clearer college decisions | Discuno',
    description: 'Practical guides for the college choices no one fully explains.',
    url: '/blog',
  },
})

function PostMeta({ post }: { post: BlogPostMetadata }) {
  return (
    <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
      <div>
        <dt className="sr-only">Author</dt>
        <dd>By {post.author}</dd>
      </div>
    </dl>
  )
}

export default function BlogPage() {
  const posts = getAllPosts()
  const [featuredPost, ...remainingPosts] = posts
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
    <div className="page-shell py-12 sm:py-18 lg:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <header className="grid gap-7 pb-12 sm:pb-16 lg:grid-cols-12 lg:items-end">
        <h1 className="display-hero max-w-4xl lg:col-span-8">
          Ask better questions <span className="marker-highlight">before you choose.</span>
        </h1>
        <p className="text-muted-foreground max-w-sm leading-7 lg:col-span-4 lg:pb-1">
          Practical guides for majors, internships, campus life, and the decision in front of you.
        </p>
      </header>

      <section className="section-rule" aria-labelledby="college-guides-heading">
        <h2 id="college-guides-heading" className="sr-only">
          College guides
        </h2>

        {!featuredPost ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                <h3>No guides yet</h3>
              </EmptyTitle>
              <EmptyDescription>New college decision guides will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <article className="border-foreground/18 grid gap-6 border-b py-9 sm:py-12 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-3">
                <p className="text-primary text-sm font-semibold">Latest guide</p>
                <div className="mt-3">
                  <PostMeta post={featuredPost} />
                </div>
              </div>
              <div className="md:col-span-9">
                <h3 className="font-display max-w-4xl text-4xl leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    className="hover:text-primary transition-colors motion-reduce:transition-none"
                  >
                    {featuredPost.title}
                  </Link>
                </h3>
                <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
                  {featuredPost.description}
                </p>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className={buttonVariants({ variant: 'link', className: 'mt-5 -ml-3' })}
                >
                  Read guide
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </article>

            {remainingPosts.map(post => (
              <article
                key={post.slug}
                className="border-foreground/18 grid gap-5 border-b py-8 md:grid-cols-12 md:gap-10 lg:py-10"
              >
                <div className="md:col-span-3">
                  <PostMeta post={post} />
                </div>
                <div className="md:col-span-9">
                  <h3 className="font-display max-w-3xl text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary transition-colors motion-reduce:transition-none"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
                    {post.description}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className={buttonVariants({
                      variant: 'link',
                      size: 'sm',
                      className: 'mt-4 -ml-3',
                    })}
                  >
                    Read guide
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </div>
              </article>
            ))}
          </>
        )}
      </section>
    </div>
  )
}
