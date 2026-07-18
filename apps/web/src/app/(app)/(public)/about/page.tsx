import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { buttonVariants } from '~/components/ui/button'
import { absoluteUrl, createMetadata, siteConfig } from '~/lib/metadata'
import { cn } from '~/lib/utils'

export const metadata: Metadata = createMetadata({
  title: 'About Discuno',
  description:
    'Discuno helps one student turn hard-won experience into a clearer next move for another.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Discuno',
    description:
      'Why the college questions that matter most deserve a real conversation with someone who has been there.',
    url: '/about',
  },
})

const principles = [
  {
    title: 'Show the source of the perspective',
    description:
      'School, field, and lived experience should be clear enough for a student to decide whether the fit is useful.',
  },
  {
    title: 'Share context, not certainty',
    description:
      'A mentor can name tradeoffs and ask better questions without pretending there is one right answer.',
  },
  {
    title: 'Make the next move smaller',
    description: 'A useful conversation ends with something concrete to ask, test, or do next.',
  },
  {
    title: 'Leave the decision with the student',
    description:
      'Peer perspective can clarify a choice. It does not replace official academic, financial, legal, or medical guidance.',
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

const AboutPage = () => {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <section className="page-shell grid min-h-[72svh] items-end gap-12 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:py-28">
        <div className="public-enter">
          <h1 className="display-hero max-w-4xl">
            College should not be figured out{' '}
            <span className="marker-highlight">from scratch.</span>
          </h1>
        </div>
        <p className="public-enter-delayed text-muted-foreground max-w-md text-lg leading-8 sm:text-xl">
          Discuno turns one student&apos;s hard-won experience into another student&apos;s clearer
          next move.
        </p>
      </section>

      <section className="border-border border-y">
        <div className="page-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <h2 className="display-heading max-w-sm">The answer official pages leave out.</h2>
          <div className="max-w-2xl space-y-7 text-lg leading-8">
            <p>
              A course catalog can list the requirements. It cannot tell you which tradeoff another
              student regretted. A career page can list the deadline. It cannot tell you what the
              interview felt like.
            </p>
            <p className="text-muted-foreground">
              Those answers live in student experience. We make it easier to find the right person,
              ask one specific question, and see the choice with more context.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <div>
            <MessageCircleQuestion className="text-primary size-7" aria-hidden="true" />
            <h2 className="display-heading mt-6 max-w-sm">What a useful conversation does.</h2>
          </div>
          <div className="border-foreground/20 border-t">
            {principles.map(principle => (
              <div
                key={principle.title}
                className="border-foreground/20 grid gap-2 border-b py-6 sm:grid-cols-[0.8fr_1.2fr] sm:gap-10"
              >
                <h3 className="text-base font-semibold">{principle.title}</h3>
                <p className="text-muted-foreground text-sm leading-6">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-t">
        <div className="page-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-20">
          <div className="max-w-3xl">
            <h2 className="display-heading">
              The context you need may already live with someone else.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
              Discuno was started by Brad, a computer science student at the University of Michigan,
              to make useful peer guidance easier to find and simpler to act on.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-6')}>
              Find a mentor
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/for-mentors"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12 px-6')}
            >
              Start mentoring
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
