import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '~/components/ui/button'
import { absoluteUrl, createMetadata, siteConfig } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'About Discuno',
  description:
    'Discuno helps students bring firsthand context into the college decisions official information cannot fully explain.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Discuno',
    description:
      'Why a hard college question can become clearer after one useful conversation with someone who has been there.',
    url: '/about',
  },
})

const principles = [
  {
    title: 'Make the source clear',
    description:
      'School, field, and firsthand experience should help a student judge whether the perspective is useful.',
  },
  {
    title: 'Share context, not certainty',
    description:
      'A mentor can name tradeoffs without pretending there is one right answer for someone else.',
  },
  {
    title: 'End with a smaller next move',
    description: 'A useful conversation leads to something concrete to ask, test, or do next.',
  },
]

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': absoluteUrl('/about#page'),
      url: absoluteUrl('/about'),
      name: 'About Discuno',
      description:
        'Discuno connects students for one-to-one conversations about real college decisions.',
      mainEntity: {
        '@id': absoluteUrl('/#organization'),
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: siteConfig.name,
      url: absoluteUrl('/'),
      logo: absoluteUrl('/logos/black-icon-logo.png'),
      description: siteConfig.description,
    },
  ],
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <section className="border-b">
        <div className="page-shell grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-20">
          <div className="public-enter lg:col-span-7">
            <h1 className="display-hero max-w-4xl">
              The facts are only <span className="marker-highlight">part of the choice.</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
              Discuno puts firsthand student experience beside the facts behind a college choice.
            </p>
          </div>

          <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5">
            <Image
              src="/images/hero-conversation.png"
              alt="Two students talk through a decision at a table"
              fill
              preload
              className="object-cover object-center"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 40vw"
            />
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Facts tell you what. Experience shows you what it felt like.
            </h2>
            <div className="border-foreground/20 mt-8 grid border-y md:grid-cols-2 md:divide-x">
              <div className="py-7 md:pr-10">
                <h3 className="text-sm font-semibold">Official information</h3>
                <p className="text-muted-foreground mt-3 leading-7">
                  Requirements, credits, prerequisites, and the official shape of a major.
                </p>
              </div>
              <div className="border-foreground/20 border-t py-7 md:border-t-0 md:pl-10">
                <h3 className="text-sm font-semibold">Firsthand experience</h3>
                <p className="text-muted-foreground mt-3 leading-7">
                  The tradeoffs, surprises, and questions that only appeared after making the
                  choice.
                </p>
              </div>
            </div>
          </div>

          <div className="border-foreground/20 lg:col-span-5 lg:border-l lg:pl-10">
            <p className="text-sm font-semibold">A useful conversation</p>
            <div className="border-foreground/20 mt-3 border-t">
              {principles.map(principle => (
                <div key={principle.title} className="border-foreground/20 border-b py-5">
                  <h3 className="font-semibold">{principle.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="page-shell grid gap-10 py-14 sm:py-18 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="max-w-3xl lg:col-span-8">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Perspective has a boundary
            </h2>
            <p className="mt-5 leading-7">
              A mentor shares what they saw, tried, and learned. They do not verify your options or
              decide what is right for you.
            </p>
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              Peer perspective complements official academic, financial, legal, and medical
              guidance. Those decisions still belong with the right professional and with you.
            </p>
          </div>
          <Link
            href="/find"
            className={`${buttonVariants({ size: 'lg' })} lg:col-span-4 lg:justify-self-end`}
          >
            Find a mentor
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </div>
  )
}
