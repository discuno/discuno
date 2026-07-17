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
    icon: ShieldCheck,
    title: 'Real experience, clearly described',
    description:
      'You should be able to see where a mentor’s perspective comes from and decide whether it fits your question.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Advice without pretending',
    description:
      'A mentor can share what happened to them, ask better questions, and name tradeoffs without claiming to know your one right answer.',
  },
  {
    icon: LockKeyhole,
    title: 'A conversation shaped around you',
    description:
      'The useful part is not a generic playbook. It is applying someone else’s experience to the situation you are actually in.',
  },
  {
    icon: GraduationCap,
    title: 'A next step you still own',
    description:
      'Peer perspective can make a choice easier to understand. The decision—and the official guidance it may require—stays with you.',
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
            No one should have to figure out college entirely from scratch.
          </h1>
          <p className="text-muted-foreground mt-8 max-w-2xl text-lg leading-8 sm:text-xl">
            Discuno exists so one student&apos;s hard-won experience can become another
            student&apos;s clearer next move.
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
              The useful answer is often missing from the official one.
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-8">
            <p>
              A course catalog can list the requirements. It cannot tell you which tradeoff another
              student regretted. A career page can list the deadline. It cannot tell you what the
              interview felt like or what someone wishes they had done three months earlier.
            </p>
            <p className="text-muted-foreground">
              Those answers already live in student experience. Discuno makes it easier to find the
              right person, ask one specific question, and turn someone else&apos;s hindsight into a
              decision you can see more clearly.
            </p>
          </div>
        </div>
      </section>

      <section className="border-border/70 bg-muted/30 border-y px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              A useful conversation
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              What the right conversation can change.
            </h2>
          </div>

          <div className="bg-border mt-12 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">01</span>
              <h3 className="mt-8 text-xl font-semibold">Make the invisible visible</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Hear the workload, tradeoffs, false starts, and unwritten expectations that do not
                fit neatly on an official page.
              </p>
            </div>
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">02</span>
              <h3 className="mt-8 text-xl font-semibold">Turn options into better questions</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Stop circling the same pros-and-cons list and find out what you still need to know
                before you choose.
              </p>
            </div>
            <div className="bg-card p-7 sm:p-8">
              <span className="text-primary text-sm font-semibold">03</span>
              <h3 className="mt-8 text-xl font-semibold">Make the next step feel smaller</h3>
              <p className="text-muted-foreground mt-3 leading-7">
                Leave with one action, one conversation to have, or one assumption worth testing
                next.
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
                Our promise
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Useful, honest, and still your decision.
              </h2>
              <p className="text-muted-foreground mt-5 leading-7">
                The goal is not to hand you certainty. It is to give you context you did not have
                before.
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
                The answer may exist. Finding the right person should not depend on luck.
              </h2>
              <p className="text-background/70 mt-5 max-w-2xl leading-7">
                Discuno was started by Brad, a computer science student at the University of
                Michigan, to make useful peer guidance easier to find and simpler to act on. The
                idea is simple: students already carry lessons that could save someone else time,
                uncertainty, and a few avoidable dead ends.
              </p>
            </div>
            <div className="border-background/15 flex items-center border-t p-8 sm:p-12 lg:border-t-0 lg:border-l lg:p-14">
              <CalendarCheck2 className="text-background/50 size-10" aria-hidden="true" />
              <p className="ml-5 text-lg leading-7 font-medium">
                The context you need may already live in someone else&apos;s experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 border-t px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              What are you trying to figure out?
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Find someone who has been there—or be that person for someone else.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button render={<Link href="/" />} nativeButton={false} size="lg" className="h-12 px-6">
              Find someone to talk to
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              render={<Link href="/for-mentors" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="h-12 px-6"
            >
              Share your experience
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
