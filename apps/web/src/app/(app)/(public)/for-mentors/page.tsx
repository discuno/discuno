import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleDollarSign,
  CircleAlert,
  Clock3,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { absoluteUrl, createMetadata } from '~/lib/metadata'
import {
  MENTOR_PAYOUT_DELAY_HOURS,
  PLATFORM_COMMISSION_BASIS_POINTS,
} from '~/lib/stripe/marketplace'
import { MentorAccountRetryButton } from './MentorAccountRetryButton'

const platformFeePercent = PLATFORM_COMMISSION_BASIS_POINTS / 100

export const metadata: Metadata = createMetadata({
  title: 'Become a College Mentor',
  description:
    'Be the student you wish you could have asked. Share firsthand college experience one-to-one, mentor on your schedule, and choose whether your time is free or paid.',
  keywords: [
    'become a college mentor',
    'student mentor jobs',
    'peer mentor platform',
    'paid college mentorship',
    'online student mentoring',
    'earn money mentoring students',
  ],
  alternates: {
    canonical: '/for-mentors',
  },
  openGraph: {
    title: 'Become a College Mentor on Discuno',
    description:
      'Help another student make sense of a choice you have already lived through. Mentor on your schedule, for free or for a price you set.',
    url: '/for-mentors',
  },
})

const mentorBenefits = [
  {
    icon: MessageSquareText,
    title: 'Be the person you needed',
    description:
      'Share the context, tradeoffs, and lessons that would have helped when you faced the same decision.',
  },
  {
    icon: CalendarDays,
    title: 'Help without overcommitting',
    description: 'Open only the times that work around classes, work, and the rest of your life.',
  },
  {
    icon: CircleDollarSign,
    title: 'Give back or get paid',
    description:
      'Offer your time for free, set a price that respects your experience, or do a little of both.',
  },
]

const studentQuestions = [
  'Is this course worth the workload?',
  'How did you land your first internship?',
  'What do you wish you knew before choosing this major?',
  'Should I switch paths or stick it out?',
  'How do I actually get involved on campus?',
  'What made you feel ready for graduate school?',
]

const onboardingSteps = [
  {
    title: 'Show where your perspective comes from',
    description:
      'Use a supported school email and share the school, field, and experiences behind your advice.',
  },
  {
    title: 'Tell students when you are the right person',
    description:
      'Describe the choices you have navigated and the questions you can responsibly help someone think through.',
  },
  {
    title: 'Choose how you want to help',
    description:
      'Offer a focused conversation, decide whether it is free or paid, and open only the times that work for you.',
  },
  {
    title: 'Open the door',
    description:
      'Publish when you are ready, then share your profile or let students discover you through Discuno.',
  },
]

const faqItems = [
  {
    question: 'Who can become a mentor?',
    answer:
      'Discuno currently supports college students with a valid school-issued .edu email at a supported institution. Your profile should accurately describe your own education and experience.',
  },
  {
    question: 'Do I have to charge for sessions?',
    answer:
      'No. You can offer free sessions, paid sessions, or both. Stripe onboarding is only required when you want to accept paid bookings.',
  },
  {
    question: 'What does Discuno charge?',
    answer: `There is no subscription to create a mentor profile. For a paid session, you receive 85% of the listed price and Discuno retains ${platformFeePercent}%. Discuno covers standard Stripe payment-processing costs; the Terms of Service govern the complete fee policy.`,
  },
  {
    question: 'When does a paid session become eligible for payout?',
    answer: `A paid session becomes payout-eligible ${MENTOR_PAYOUT_DELAY_HOURS} hours after its scheduled end. Refunds, active disputes, account restrictions, or Stripe processing can delay or prevent a transfer.`,
  },
  {
    question: 'What does school email verification mean?',
    answer:
      'It means the mentor demonstrated access to an institutional email address at sign-up. It does not represent a background check, a professional credential, or a guarantee of the advice or outcome.',
  },
  {
    question: 'Can I change my schedule or session options later?',
    answer:
      'Yes. You can update weekly availability, add date overrides, enable or disable session types, and adjust session pricing from mentor settings.',
  },
]

const mentorPageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absoluteUrl('/for-mentors#page'),
      url: absoluteUrl('/for-mentors'),
      name: 'Become a College Mentor on Discuno',
      description:
        'Share firsthand college experience through free or paid one-to-one conversations.',
      inLanguage: 'en-US',
      about: {
        '@type': 'Service',
        name: 'Discuno student mentorship marketplace',
        serviceType: 'Peer mentorship marketplace',
        provider: {
          '@type': 'Organization',
          '@id': absoluteUrl('/#organization'),
          name: 'Discuno',
          url: absoluteUrl('/'),
        },
        audience: {
          '@type': 'EducationalAudience',
          educationalRole: 'student',
        },
      },
    },
    {
      '@type': 'FAQPage',
      '@id': absoluteUrl('/for-mentors#faq'),
      mainEntity: faqItems.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
}

const ForMentorsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ 'school-email-required'?: string }>
}) => {
  const params = await searchParams
  const showSchoolEmailNotice = params['school-email-required'] === '1'

  return (
    <div className="bg-background text-foreground min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mentorPageJsonLd) }}
      />

      <section className="border-border/70 border-b px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24 lg:px-8">
        {showSchoolEmailNotice && (
          <div
            role="alert"
            className="border-primary/25 bg-primary/5 mx-auto mb-10 flex max-w-6xl flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex max-w-3xl items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <CircleAlert className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">Mentor access is not active for this account</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  Mentor tools require a verified .edu address from a supported school. If this is
                  your school account, sign in again to refresh access. Otherwise, switch to a
                  school account or keep browsing and booking.
                </p>
              </div>
            </div>
            <MentorAccountRetryButton />
          </div>
        )}

        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20">
          <div>
            <div className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium">
              <GraduationCap className="text-primary size-4" aria-hidden="true" />
              For student mentors
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
              Be the student you wish you could have asked.
            </h1>
            <p className="text-muted-foreground mt-7 max-w-2xl text-lg leading-8 sm:text-xl">
              You have already worked through choices another student is facing now. Turn those
              hard-won lessons into one-to-one conversations—on your schedule, for free or for a
              price you set.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                render={<Link href="/auth?intent=mentor" />}
                nativeButton={false}
                size="lg"
                className="h-12 px-6 text-base"
              >
                Start mentoring
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                render={<Link href="#student-questions" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base"
              >
                See where you can help
              </Button>
            </div>
            <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                Help one student at a time
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                Choose the questions you take
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                Give back or earn on your terms
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0">
            <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-xl shadow-black/5">
              <div className="border-border flex items-center justify-between border-b px-6 py-5">
                <div>
                  <p className="font-semibold">Questions you could help untangle</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    A few examples of focused student decisions
                  </p>
                </div>
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                  Examples
                </span>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                {[
                  'How did you know this major was right for you?',
                  'What actually helped you land that internship?',
                  'What would you do differently in your first year?',
                  'How did you decide what came after graduation?',
                ].map(question => (
                  <div key={question} className="border-border flex gap-4 rounded-2xl border p-4">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                      <MessageSquareText className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm leading-6 font-medium">“{question}”</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/50 border-border border-t px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
                      <BadgeCheck className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">You do not need every answer</p>
                      <p className="text-muted-foreground text-xs">
                        Just honest experience with this one
                      </p>
                    </div>
                  </div>
                  <span className="text-primary text-xs font-semibold">That matters</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 border-b px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-muted-foreground mx-auto grid max-w-6xl gap-5 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3 sm:justify-center">
            <MessageSquareText className="text-foreground size-5" aria-hidden="true" />
            Make one decision feel less lonely
          </div>
          <div className="flex items-center gap-3 sm:justify-center sm:border-x">
            <CalendarDays className="text-foreground size-5" aria-hidden="true" />
            Set boundaries that work for you
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <BadgeCheck className="text-foreground size-5" aria-hidden="true" />
            Share honestly, not perfectly
          </div>
        </div>
      </section>

      <section id="student-questions" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Your experience is useful
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              What feels ordinary to you may be exactly what another student needs.
            </h2>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
              You do not need to know everything. A strong mentor profile is specific about the
              situations you have navigated and the perspective you can responsibly share.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {studentQuestions.map(question => (
              <div
                key={question}
                className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-4 text-sm font-medium"
              >
                <MessageSquareText className="text-primary size-4 shrink-0" aria-hidden="true" />“
                {question}”
              </div>
            ))}
          </div>

          <div className="bg-border mt-16 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3">
            {mentorBenefits.map(benefit => {
              const Icon = benefit.icon

              return (
                <div key={benefit.title} className="bg-card p-7 sm:p-8">
                  <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground mt-3 leading-7">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-border/70 bg-muted/30 scroll-mt-24 border-y px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
            <div>
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                From “I could help with that” to your first conversation.
              </h2>
              <p className="text-muted-foreground mt-5 leading-7">
                Tell students where you have been, choose how you want to help, and open only the
                times that work for you.
              </p>
            </div>

            <ol className="divide-border border-border divide-y border-y">
              {onboardingSteps.map((step, index) => (
                <li key={step.title} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:py-8">
                  <span className="text-primary font-mono text-sm font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-2 leading-7">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-primary text-sm font-semibold tracking-wide uppercase">
                Your time, your terms
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Give your time, earn from it, or do both.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
                Some conversations are your way of giving back. Others draw on experience that took
                years to earn. You decide what each session is worth.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-border rounded-2xl border p-6">
                <div className="bg-muted flex size-11 items-center justify-center rounded-xl">
                  <Clock3 className="size-5" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground mt-6 text-sm font-medium">Free sessions</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">$0</p>
                <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Offer a low-pressure first conversation
                  </li>
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    No payout account needed
                  </li>
                </ul>
              </div>

              <div className="border-primary/40 bg-primary/5 rounded-2xl border p-6">
                <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
                  <CircleDollarSign className="size-5" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground mt-6 text-sm font-medium">Paid sessions</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">You set the price</p>
                <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    You receive 85%; Discuno retains {platformFeePercent}%
                  </li>
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Set a price that respects your time
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground mt-6 text-xs leading-5 lg:text-right">
            Current fees are subject to the Discuno Terms of Service. Mentors are responsible for
            applicable taxes and Stripe account eligibility.
          </p>
        </div>
      </section>

      <section className="border-border/70 bg-foreground text-background border-y px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
          <div>
            <ShieldCheck className="text-background/60 size-10" aria-hidden="true" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              The best mentors do not pretend to know everything.
            </h2>
            <p className="text-background/65 mt-5 leading-7">
              Students come for lived experience. Be candid about what you know, curious about their
              context, and careful about what only they can decide.
            </p>
          </div>
          <div className="divide-background/15 border-background/15 divide-y border-y">
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Share what happened</p>
              <p className="text-background/65 leading-7">
                Talk about the choices, tradeoffs, surprises, and mistakes that shaped your path.
              </p>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Listen before advising</p>
              <p className="text-background/65 leading-7">
                Help someone untangle their situation instead of handing them a script for yours.
              </p>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Leave them with momentum</p>
              <p className="text-background/65 leading-7">
                End with better questions, a useful resource, or one next step they can own.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">Mentor FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Know what to expect before you sign up.
            </h2>
          </div>

          <div className="border-border mt-12 divide-y border-y">
            {faqItems.map((item, index) => (
              <details key={item.question} className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    className="text-muted-foreground text-xl font-normal transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground max-w-3xl pb-6 leading-7">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="border-border bg-card mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl border p-8 sm:p-12 lg:flex-row lg:items-center lg:p-14">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Someone is facing a decision you have already lived through.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-8">
              Be the conversation you wish you had.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              render={<Link href="/auth?intent=mentor" />}
              nativeButton={false}
              size="lg"
              className="h-12 px-6 text-base"
            >
              Start mentoring
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              render={<Link href="/support" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
            >
              Questions? Contact support
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ForMentorsPage
