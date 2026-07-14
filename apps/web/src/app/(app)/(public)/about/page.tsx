import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck2,
  GraduationCap,
  LockKeyhole,
  MessageCircleQuestion,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { absoluteUrl, createMetadata, siteConfig } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'About Discuno',
  description:
    'Discuno helps college students get practical, one-to-one guidance from student mentors who can share relevant firsthand context.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About Discuno',
    description:
      'Why Discuno is building a clearer, more trustworthy way for college students to learn from peers who have been there.',
    url: '/about',
  },
})

const principles = [
  {
    icon: ShieldCheck,
    title: 'Say exactly what is verified',
    description:
      'A school email confirms access to an institutional email address at sign-up. It is not a background check, professional credential, or promise of outcomes.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Make the choice understandable',
    description:
      'Mentor profiles, areas of context, session duration, price, and available times should be clear before a student decides to book.',
  },
  {
    icon: LockKeyhole,
    title: 'Use proven infrastructure',
    description:
      'Discuno uses Cal.com for scheduling and Stripe for paid-session checkout and mentor payouts instead of asking users to coordinate those details themselves.',
  },
  {
    icon: GraduationCap,
    title: 'Keep mentorship in scope',
    description:
      'Peer mentorship can add firsthand context to a decision. It complements—not replaces—official academic, financial, legal, or medical advice.',
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
        'Discuno helps college students get practical, one-to-one guidance from student mentors.',
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
    <div className="bg-background text-foreground min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      <section className="border-border/70 border-b px-4 pt-36 pb-20 sm:px-6 sm:pt-40 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-primary mb-6 flex items-center gap-3 text-sm font-semibold tracking-wide uppercase">
            <span className="bg-primary h-px w-8" aria-hidden="true" />
            About Discuno
          </div>
          <h1 className="max-w-4xl text-4xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
            College decisions are easier with context from someone who has been there.
          </h1>
          <p className="text-muted-foreground mt-8 max-w-2xl text-lg leading-8 sm:text-xl">
            Discuno is building a direct way for students to ask specific questions, compare
            perspectives, and book time with student mentors whose experience is relevant to the
            decision in front of them.
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Why we exist
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Guidance should feel personal, not generic.
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-8">
            <p>
              Official resources are essential, but they are not designed to answer every personal
              question. A course catalog can list requirements. A student who took the class can
              explain the tradeoffs they experienced. A career page can list deadlines. A peer can
              share how they prepared for the process.
            </p>
            <p className="text-muted-foreground">
              Discuno closes that context gap. Students can find a mentor, understand what they can
              help with, see the session terms, and choose an available time without a chain of
              introductions or scheduling messages.
            </p>
          </div>
        </div>
      </section>

      <section className="border-border/70 bg-muted/30 border-y px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              The product
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              A shorter path from question to conversation.
            </h2>
          </div>

          <div className="bg-border mt-12 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">01</span>
              <h3 className="mt-8 text-xl font-semibold">Find relevant context</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Browse public profiles by school and field of study, then read what each mentor can
                speak to before reaching out.
              </p>
            </div>
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">02</span>
              <h3 className="mt-8 text-xl font-semibold">Choose with clarity</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Review session options, duration, pricing, and live availability in one place.
              </p>
            </div>
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">03</span>
              <h3 className="mt-8 text-xl font-semibold">Book without back-and-forth</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Pick a time that works. Discuno coordinates scheduling and, for paid sessions,
                checkout and mentor payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Our standard
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Trust starts with being precise.
              </h2>
              <p className="text-muted-foreground mt-5 leading-7">
                We would rather explain a boundary clearly than dress it up as a guarantee.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {principles.map(principle => {
                const Icon = principle.icon

                return (
                  <div key={principle.title} className="border-border rounded-2xl border p-6">
                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{principle.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {principle.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="bg-foreground text-background mx-auto max-w-6xl overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="text-background/60 text-sm font-semibold tracking-wide uppercase">
                Built from student experience
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                A practical product for a problem students feel every semester.
              </h2>
              <p className="text-background/70 mt-5 max-w-2xl leading-7">
                Discuno was started by Brad, a computer science student at the University of
                Michigan, to make useful peer guidance easier to find and simpler to act on. The
                platform is developed in the open, so its implementation can be inspected as it
                evolves.
              </p>
              <Link
                href="https://github.com/discuno/discuno"
                target="_blank"
                rel="noopener noreferrer"
                className="decoration-background/30 hover:decoration-background mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 transition-colors"
              >
                View the open-source project
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="border-background/15 flex items-center border-t p-8 sm:p-12 lg:border-t-0 lg:border-l lg:p-14">
              <CalendarCheck2 className="text-background/50 size-10" aria-hidden="true" />
              <p className="ml-5 text-lg leading-7 font-medium">
                Less searching, fewer introductions, and no scheduling thread just to ask one good
                question.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 border-t px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Start a useful conversation
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Find someone who understands the decision—or share what you have learned.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href="/">
                Find a mentor
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6">
              <Link href="/for-mentors">Become a mentor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
