import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  CircleDollarSign,
  GraduationCap,
  MessageSquareText,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { buttonVariants } from '~/components/ui/button'
import { absoluteUrl, createMetadata } from '~/lib/metadata'
import {
  MENTOR_PAYOUT_DELAY_HOURS,
  PLATFORM_COMMISSION_BASIS_POINTS,
} from '~/lib/stripe/marketplace'
import { cn } from '~/lib/utils'
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
]

const onboardingSteps = [
  {
    icon: GraduationCap,
    title: 'Show your context',
    description: 'Add the school, field, and experiences behind your perspective.',
  },
  {
    icon: MessageSquareText,
    title: 'Name the questions',
    description: 'Be specific about the decisions you have navigated and can discuss.',
  },
  {
    icon: CalendarDays,
    title: 'Choose your terms',
    description: 'Offer free or paid sessions and open only the times that fit.',
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
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mentorPageJsonLd) }}
      />

      <section className="page-shell py-12 sm:py-20 lg:py-24">
        {showSchoolEmailNotice && (
          <div
            role="alert"
            className="border-warning/40 bg-warning/10 mb-12 flex flex-col gap-5 border-y py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex max-w-3xl items-start gap-3">
              <CircleAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
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

        <div className="grid min-h-[68svh] items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-24">
          <div className="public-enter">
            <h1 className="display-hero max-w-3xl">
              Share what you <span className="marker-highlight">wish you&apos;d known.</span>
            </h1>
            <p className="text-muted-foreground mt-7 max-w-xl text-lg leading-8 sm:text-xl">
              Help another student think through a decision you have already lived.
            </p>
            <Link
              href="/auth?intent=mentor"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-12 px-6 text-base')}
            >
              Start mentoring
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="public-enter-delayed border-foreground/25 border-t lg:mt-16">
            {studentQuestions.map(question => (
              <p
                key={question}
                className="border-foreground/25 font-display border-b py-5 text-xl leading-7 sm:text-2xl"
              >
                “{question}”
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-border border-y">
        <div className="page-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <div>
            <h2 className="display-heading max-w-sm">From experience to a useful conversation.</h2>
            <p className="text-muted-foreground mt-5 max-w-sm leading-7">
              You do not need every answer. You need relevant experience and clear boundaries.
            </p>
          </div>
          <ol className="border-foreground/20 border-t">
            {onboardingSteps.map(step => {
              const Icon = step.icon

              return (
                <li
                  key={step.title}
                  className="border-foreground/20 grid gap-4 border-b py-6 sm:grid-cols-[0.75fr_1.25fr] sm:items-start sm:gap-7"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="text-primary size-5" aria-hidden="true" />
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <div>
            <h2 className="display-heading max-w-sm">Give back, get paid, or do both.</h2>
            <p className="text-muted-foreground mt-5 max-w-sm leading-7">
              You decide what each session is worth and when it fits your schedule.
            </p>
          </div>

          <div>
            <div className="border-foreground/20 sm:divide-foreground/20 grid border-y sm:grid-cols-2 sm:divide-x">
              <div className="py-7 sm:pr-8">
                <MessageSquareText className="text-primary size-5" aria-hidden="true" />
                <h3 className="mt-5 text-sm font-semibold">Free sessions</h3>
                <p className="font-display mt-2 text-5xl font-semibold">$0</p>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  Offer a low-pressure conversation without setting up payouts.
                </p>
              </div>
              <div className="border-foreground/20 border-t py-7 sm:border-t-0 sm:pl-8">
                <CircleDollarSign className="text-primary size-5" aria-hidden="true" />
                <h3 className="mt-5 text-sm font-semibold">Paid sessions</h3>
                <p className="font-display mt-2 text-5xl font-semibold">{mentorSharePercent}%</p>
                <p className="text-muted-foreground mt-4 text-sm leading-6">
                  You set the listed price. Discuno retains {platformFeePercent}%.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-5">
              Current fees are subject to the Discuno Terms of Service. Tax and payout eligibility
              may vary.
            </p>

            <div className="border-foreground/20 mt-10 grid gap-4 border-t pt-6 sm:grid-cols-3 sm:gap-8">
              {[
                'Talk about real choices, tradeoffs, surprises, and mistakes.',
                'Stay specific about what you know and what you do not.',
                'Open only the times and topics that work for you.',
              ].map(item => (
                <div key={item} className="flex gap-3 text-sm leading-6">
                  <Check className="text-primary mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-border scroll-mt-24 border-t">
        <div className="page-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <div>
            <h2 className="display-heading">Practical details.</h2>
            <p className="text-muted-foreground mt-4 leading-7">
              Need help?{' '}
              <Link href="/support" className="text-foreground underline underline-offset-4">
                Contact support
              </Link>
              .
            </p>
          </div>
          <Accordion className="border-foreground/20 border-t">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger className="py-5 text-base leading-6 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground max-w-2xl pb-5 text-sm leading-7">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="border-border border-t">
        <div className="page-shell flex flex-col gap-8 py-16 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display-heading max-w-2xl">
            Turn your hindsight into someone&apos;s next move.
          </h2>
          <Link
            href="/auth?intent=mentor"
            className={cn(buttonVariants({ size: 'lg' }), 'h-12 shrink-0 px-6 text-base')}
          >
            Start mentoring
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default ForMentorsPage
