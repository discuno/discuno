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
  CreditCard,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
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
    'Create a student mentor profile, set your availability, offer free or paid one-to-one sessions, and let Discuno handle scheduling and payouts.',
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
      'Share practical college experience through one-to-one sessions. You choose your topics, availability, and whether sessions are free or paid.',
    url: '/for-mentors',
  },
})

const mentorBenefits = [
  {
    icon: SlidersHorizontal,
    title: 'Define your offer',
    description:
      'Choose the questions you can answer, create session types, set the duration, and decide whether each session is free or paid.',
  },
  {
    icon: CalendarDays,
    title: 'Protect your time',
    description:
      'Set weekly availability and date-specific overrides. Students can only choose from the times you make available.',
  },
  {
    icon: CircleDollarSign,
    title: 'Get paid without chasing invoices',
    description:
      'For paid sessions, Stripe Connect handles checkout and payouts while Discuno keeps the booking and payment state together.',
  },
]

const useCases = [
  'Choosing courses or a major',
  'Preparing for internship recruiting',
  'Understanding campus life',
  'Building an early-career plan',
  'Navigating student organizations',
  'Preparing for graduate school',
]

const onboardingSteps = [
  {
    title: 'Verify your school email',
    description:
      'Sign up with a supported .edu address so students can understand your institutional affiliation.',
  },
  {
    title: 'Build a useful profile',
    description:
      'Add your school, field of study, photo, and a specific description of the experience you can share.',
  },
  {
    title: 'Create sessions and availability',
    description:
      'Choose session durations, free or paid pricing, and the exact times students can book.',
  },
  {
    title: 'Publish and start accepting bookings',
    description:
      'Your profile can appear in mentor discovery and has a direct link you can share with students and communities.',
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
        'Create a student mentor profile and offer free or paid one-to-one college mentorship sessions.',
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
                <p className="font-semibold">That account does not have mentor access</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  You are signed in as a mentee. Mentor tools require a supported .edu address;
                  continue with a school account, or keep this account to browse and book.
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
              Turn what you have learned into someone else&apos;s head start.
            </h1>
            <p className="text-muted-foreground mt-7 max-w-2xl text-lg leading-8 sm:text-xl">
              Create a focused mentor profile, offer one-to-one sessions, and choose exactly when
              and how you help. Discuno handles discovery, scheduling, and paid-session payouts.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/auth?intent=mentor">
                  Create your mentor profile
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
            <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                Free or paid sessions
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                No profile subscription
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-primary size-4" aria-hidden="true" />
                You control availability
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0">
            <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-xl shadow-black/5">
              <div className="border-border flex items-center justify-between border-b px-6 py-5">
                <div>
                  <p className="font-semibold">Mentor profile setup</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">Publish only when ready</p>
                </div>
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                  Preview
                </span>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                {[
                  ['Profile and expertise', 'Tell students what you can help with'],
                  ['Session options', 'Choose duration and free or paid pricing'],
                  ['Availability', 'Open only the times that work for you'],
                  ['Payouts', 'Connect Stripe only for paid sessions'],
                ].map(([title, description], index) => (
                  <div key={title} className="border-border flex gap-4 rounded-2xl border p-4">
                    <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-5">{description}</p>
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
                      <p className="text-sm font-semibold">School affiliation</p>
                      <p className="text-muted-foreground text-xs">Checked with a .edu email</p>
                    </div>
                  </div>
                  <span className="text-primary text-xs font-semibold">Required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 border-b px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-muted-foreground mx-auto grid max-w-6xl gap-5 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3 sm:justify-center">
            <BadgeCheck className="text-foreground size-5" aria-hidden="true" />
            School email affiliation check
          </div>
          <div className="flex items-center gap-3 sm:justify-center sm:border-x">
            <CalendarDays className="text-foreground size-5" aria-hidden="true" />
            Scheduling powered by Cal.com
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <CreditCard className="text-foreground size-5" aria-hidden="true" />
            Paid-session payouts through Stripe
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Your experience is useful
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              The advice you wish you had can make someone&apos;s next decision clearer.
            </h2>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
              You do not need to know everything. A strong mentor profile is specific about the
              situations you have navigated and the perspective you can responsibly share.
            </p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map(useCase => (
              <div
                key={useCase}
                className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-4 text-sm font-medium"
              >
                <MessageSquareText className="text-primary size-4 shrink-0" aria-hidden="true" />
                {useCase}
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
                From sign-up to bookable, one clear step at a time.
              </h2>
              <p className="text-muted-foreground mt-5 leading-7">
                Your dashboard shows what is complete and what still needs attention before your
                profile starts accepting bookings.
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
                Straightforward economics
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Start free. Charge only when it makes sense for you.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
                Some mentors want to give back. Others want to build a flexible source of income.
                Discuno supports both without a profile subscription.
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
                    No Stripe payout setup required
                  </li>
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Use the same scheduling controls
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
                    Eligible after delivery and the 72-hour support window
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
              Trust is a product feature, not a marketing claim.
            </h2>
            <p className="text-background/65 mt-5 leading-7">
              Discuno makes the platform&apos;s role visible and leaves the important choices with
              mentors and students.
            </p>
          </div>
          <div className="divide-background/15 border-background/15 divide-y border-y">
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Affiliation</p>
              <p className="text-background/65 leading-7">
                A .edu email check establishes institutional email access—not identity, expertise,
                or guaranteed results.
              </p>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Scheduling</p>
              <p className="text-background/65 leading-7">
                You define recurring availability and exceptions; students only see bookable times.
              </p>
            </div>
            <div className="grid gap-2 py-6 sm:grid-cols-[10rem_1fr]">
              <p className="font-semibold">Payments</p>
              <p className="text-background/65 leading-7">
                Paid-session checkout and connected-account onboarding run through Stripe. Discuno
                tracks the booking and payout state without collecting card details itself.
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
              Share the context only experience can teach.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-8">
              Create your profile, choose your session terms, and publish when you are ready.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/auth?intent=mentor">
                Start as a mentor
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <Link href="/support">Questions? Contact support</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ForMentorsPage
