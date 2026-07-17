import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleAlert,
  CircleDollarSign,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { absoluteUrl, createMetadata } from '~/lib/metadata'
import {
  MENTOR_PAYOUT_DELAY_HOURS,
  PLATFORM_COMMISSION_BASIS_POINTS,
} from '~/lib/stripe/marketplace'
import { MentorAccountRetryButton } from './MentorAccountRetryButton'

const platformFeePercent = PLATFORM_COMMISSION_BASIS_POINTS / 100
const mentorSharePercent = 100 - platformFeePercent

export const metadata: Metadata = createMetadata({
  title: 'Become a Student Mentor',
  description:
    'Help another student think through a college decision you have already lived. Set your schedule and offer free or paid one-to-one conversations.',
  keywords: [
    'become a college mentor',
    'student mentor',
    'peer college guidance',
    'paid student mentoring',
    'online student mentoring',
  ],
  alternates: {
    canonical: '/for-mentors',
  },
  openGraph: {
    title: 'Become a Student Mentor on Discuno',
    description:
      'Help another student make sense of a choice you have already lived. Mentor on your schedule, for free or for a price you set.',
    url: '/for-mentors',
  },
})

const studentQuestions = [
  'How did you know this major was right for you?',
  'What actually helped you land that internship?',
  'What would you do differently in your first year?',
  'Is this course worth the workload?',
  'Should I switch paths or stick it out?',
]

const onboardingSteps = [
  {
    icon: GraduationCap,
    title: 'Show where your perspective comes from',
    description:
      'Use a supported school email, then add the school, field, and experiences behind your perspective.',
  },
  {
    icon: MessageSquareText,
    title: 'Name the questions you can help with',
    description:
      'Be specific about the choices you have navigated and what another student can ask you.',
  },
  {
    icon: CalendarDays,
    title: 'Choose your terms and open the door',
    description:
      'Pick free or paid, open only the times that fit, and publish when your profile feels ready.',
  },
]

const faqItems = [
  {
    question: 'Who can become a mentor?',
    answer:
      'Discuno currently supports college students with a school-issued .edu email at a supported institution. Your profile should accurately describe your own education and experience.',
  },
  {
    question: 'Do I have to charge for sessions?',
    answer:
      'No. You can offer free sessions, paid sessions, or both. Payout setup is only required if you choose to accept paid bookings.',
  },
  {
    question: 'What does Discuno charge?',
    answer: `There is no subscription to create a mentor profile. For a paid session, you receive ${mentorSharePercent}% of the listed price and Discuno retains ${platformFeePercent}%. The Terms of Service govern the complete fee policy.`,
  },
  {
    question: 'When does a paid session become eligible for payout?',
    answer: `A paid session becomes payout-eligible ${MENTOR_PAYOUT_DELAY_HOURS} hours after its scheduled end. Refunds, disputes, account restrictions, or payment processing can delay or prevent a transfer.`,
  },
  {
    question: 'What does the school email check mean?',
    answer:
      'It shows that the mentor demonstrated access to an institutional email address at sign-up and supports the school affiliation shown on the profile. It does not verify identity, background, expertise, or outcomes.',
  },
  {
    question: 'Can I change my schedule or session options later?',
    answer:
      'Yes. You can update your availability, pause or reopen session types, and adjust pricing from mentor settings.',
  },
]

const mentorPageJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absoluteUrl('/for-mentors#page'),
      url: absoluteUrl('/for-mentors'),
      name: 'Become a Student Mentor on Discuno',
      description:
        'Share firsthand college experience through free or paid one-to-one conversations.',
      inLanguage: 'en-US',
      about: {
        '@type': 'Service',
        name: 'Discuno student-to-student guidance',
        serviceType: 'Peer student guidance',
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

      <section className="field-notes border-foreground/20 relative overflow-hidden border-b-2 px-4 pt-28 pb-16 sm:px-6 sm:pt-36 sm:pb-24 lg:px-8">
        <div className="bg-primary pointer-events-none absolute top-24 right-[9%] hidden h-3 w-32 -rotate-2 lg:block" />

        {showSchoolEmailNotice && (
          <div
            role="alert"
            className="paper-panel ink-shadow relative mx-auto mb-10 flex max-w-6xl flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex max-w-3xl items-start gap-3">
              <span className="bg-accent text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border">
                <CircleAlert className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">This account does not have mentor access</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  Mentor tools require a supported school-issued .edu address. Sign in again with
                  your school account, or keep this account to browse and book.
                </p>
              </div>
            </div>
            <MentorAccountRetryButton />
          </div>
        )}

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <Badge variant="outline" className="note-stamp gap-2 px-3 py-1.5">
              <GraduationCap className="size-4" aria-hidden="true" />
              For student mentors
            </Badge>
            <h1 className="display-title mt-7 max-w-3xl">
              You have already lived through a{' '}
              <span className="marker-underline">question another student is asking.</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
              Turn what you learned into a focused one-to-one conversation. Open only the times that
              fit, then give your time away or set a price that feels fair.
            </p>

            <Button
              render={<Link href="/auth?intent=mentor" />}
              nativeButton={false}
              size="lg"
              className="mt-8 h-12 px-6 text-base"
            >
              Start mentoring
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>

            <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm">
              {['Supported school email', 'Your schedule', 'Free or paid'].map(item => (
                <span
                  key={item}
                  className="bg-card border-foreground/20 inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 font-medium"
                >
                  <span className="bg-highlight text-highlight-foreground flex size-5 items-center justify-center rounded-sm">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <Card className="stacked-note paper-panel ink-shadow overflow-hidden">
            <CardHeader className="border-foreground/15 border-b p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg leading-6">
                    Which question have you already lived through?
                  </CardTitle>
                  <CardDescription className="mt-1.5 leading-5">
                    Specific experience is more useful than having every answer.
                  </CardDescription>
                </div>
                <span className="bg-accent text-foreground hidden size-10 shrink-0 items-center justify-center rounded-md border sm:flex">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 p-4 sm:p-5">
              {studentQuestions.map((question, index) => (
                <div key={question} className="question-slip flex items-start gap-3 p-3.5">
                  <span className="bg-accent text-foreground flex size-7 shrink-0 items-center justify-center rounded-sm border text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-6 font-medium">“{question}”</p>
                </div>
              ))}
            </CardContent>
            <div className="field-notes-ink on-ink flex items-center gap-3 border-t px-5 py-4 sm:px-6">
              <BadgeCheck className="size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                If one feels familiar, your perspective can help someone move forward.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="eyebrow">From experience to conversation</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              Three steps. No need to become someone you are not.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
              Students come for relevant firsthand context. Make yours easy to understand, set clear
              boundaries, and publish when you are ready.
            </p>
          </div>

          <ol className="paper-panel ink-shadow divide-foreground/15 mt-10 grid divide-y overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon

              return (
                <li key={step.title} className="p-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="bg-accent text-foreground flex size-11 items-center justify-center rounded-md border">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-primary text-4xl leading-none font-semibold">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="pt-5 text-xl leading-7 font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground pt-4 leading-7">{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="field-notes border-foreground/15 border-y px-4 py-18 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.92fr] lg:gap-20">
          <div>
            <p className="eyebrow">Your time, your terms</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              Give back, get paid, or do both.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
              Some conversations are an easy way to help. Others draw on experience that took years
              to earn. You decide what each session is worth.
            </p>

            <div className="paper-panel ink-shadow divide-foreground/15 mt-8 grid overflow-hidden sm:grid-cols-2 sm:divide-x">
              <div className="p-6">
                <span className="bg-secondary flex size-10 items-center justify-center rounded-md border">
                  <MessageSquareText className="size-5" aria-hidden="true" />
                </span>
                <p className="text-muted-foreground pt-4 text-sm">Free sessions</p>
                <p className="font-display mt-1 text-4xl font-semibold">$0</p>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  Offer a low-pressure conversation without setting up payouts.
                </p>
              </div>

              <div className="bg-accent/35 p-6">
                <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md border">
                  <CircleDollarSign className="size-5" aria-hidden="true" />
                </span>
                <p className="text-muted-foreground pt-4 text-sm">Paid sessions</p>
                <p className="font-display mt-1 text-4xl font-semibold">
                  {mentorSharePercent}% to you
                </p>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  You set the listed price; Discuno retains {platformFeePercent}%.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-5">
              Current fees are subject to the Discuno Terms of Service. Tax and payout eligibility
              may vary.
            </p>
          </div>

          <div className="space-y-4">
            <Card className="paper-panel corner-mark">
              <CardHeader>
                <span className="bg-accent text-foreground flex size-11 items-center justify-center rounded-md border">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="pt-4 text-2xl leading-8">
                  Honest context beats perfect answers.
                </CardTitle>
                <CardDescription className="text-base leading-7">
                  Share what happened, listen before advising, and leave the student with better
                  questions or one next move they can own.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    'Talk about real choices, tradeoffs, surprises, and mistakes.',
                    'Stay specific about what you know and what you do not.',
                    'Open only the times and topics that work for you.',
                  ].map(item => (
                    <li key={item} className="flex gap-3">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="paper-panel flex gap-3 p-5">
              <GraduationCap className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">A school email is a signal, not a promise.</p>
                <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                  It supports institutional affiliation. It does not verify identity, background,
                  expertise, or outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-4 py-18 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-20">
          <div>
            <p className="eyebrow">Mentor FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              The practical details, before you commit.
            </h2>
            <p className="text-muted-foreground mt-4 leading-7">
              Still unsure about your situation?{' '}
              <Link href="/support" className="text-foreground underline underline-offset-4">
                Contact support
              </Link>
              .
            </p>
          </div>

          <Accordion className="bg-card">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger className="p-5 text-base leading-6 hover:no-underline sm:p-6">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-5 pb-5 text-sm leading-7 sm:px-6 sm:pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="px-4 pb-18 sm:px-6 sm:pb-24 lg:px-8">
        <div className="field-notes-ink on-ink border-background/15 ink-shadow mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-xl border p-8 sm:p-12 lg:flex-row lg:items-center lg:p-14">
          <div className="max-w-2xl">
            <p className="note-stamp">Your experience can unlock a next move</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              Be the student you wish you could have asked.
            </h2>
          </div>
          <Button
            render={<Link href="/auth?intent=mentor" />}
            nativeButton={false}
            size="lg"
            className="bg-highlight text-highlight-foreground hover:bg-highlight/90 h-12 shrink-0 px-6 text-base"
          >
            Start mentoring
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  )
}

export default ForMentorsPage
