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
        <div className="page-shell grid min-h-[72svh] gap-10 py-12 sm:py-18 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-20">
          <div className="public-enter lg:col-span-7">
            <h1 className="display-hero max-w-4xl">
              College decisions <span className="marker-highlight">need context.</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
              Firsthand student context belongs beside the official information behind a college
              choice.
            </p>
          </div>

          <div className="public-enter-delayed bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5 lg:aspect-[4/5]">
            <Image
              src="/images/conversation-after-class.jpg"
              alt="Two students compare perspectives after class"
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 40vw"
            />
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="max-w-5xl">
          <h2 className="display-heading max-w-4xl">Some answers only live in experience.</h2>
          <div className="border-foreground/20 mt-10 grid border-y md:grid-cols-2 md:divide-x">
            <div className="py-7 md:pr-10">
              <h3 className="text-sm font-semibold">What a catalog can tell you</h3>
              <p className="text-muted-foreground mt-3 text-lg leading-8">
                Requirements, credits, prerequisites, and the official shape of a major.
              </p>
            </div>
            <div className="border-foreground/20 border-t py-7 md:border-t-0 md:pl-10">
              <h3 className="text-sm font-semibold">What another student can add</h3>
              <p className="text-muted-foreground mt-3 text-lg leading-8">
                The tradeoff that surprised them and how the choice felt from inside the same
                school.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y">
        <div className="page-shell py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2 className="display-heading">What a useful conversation does.</h2>
            <p className="text-muted-foreground mt-5 leading-7">
              It adds perspective without taking the decision away from the student.
            </p>
          </div>

          <div className="border-foreground/20 mt-10 grid border-y md:grid-cols-3 md:divide-x">
            {principles.map(principle => (
              <div
                key={principle.title}
                className="border-foreground/20 border-b py-6 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <h3 className="font-semibold">{principle.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="grid lg:grid-cols-12">
          <div className="border-foreground/20 max-w-3xl border-t pt-8 text-lg leading-8 lg:col-span-8 lg:col-start-5">
            <h2 className="display-heading">Perspective has a boundary.</h2>
            <p className="mt-7">
              A mentor shares what they saw, tried, and learned. They do not verify your options or
              decide what is right for you.
            </p>
            <p className="text-muted-foreground mt-6">
              Peer perspective complements official academic, financial, legal, and medical
              guidance. Those decisions still belong with the right professional and with you.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="page-shell grid gap-8 py-14 sm:py-18 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <div className="max-w-3xl">
            <h2 className="display-heading">
              The right context may already live with someone else.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
              Discuno keeps the student&apos;s real question in view while they find relevant
              firsthand perspective and choose what to do next.
            </p>
          </div>
          <Link href="/find" className={buttonVariants({ size: 'lg' })}>
            Find someone who&apos;s been there
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </section>
    </div>
  )
}
