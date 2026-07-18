import { ArrowRight, CircleAlert } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
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
import { MentorAccountRetryButton } from './MentorAccountRetryButton'

const platformFeePercent = PLATFORM_COMMISSION_BASIS_POINTS / 100
const mentorSharePercent = 100 - platformFeePercent

export const metadata: Metadata = createMetadata({
  title: 'Become a Student Mentor',
  description:
    'Help another student think through a college decision you have already lived. Set your schedule and offer free or paid one-to-one sessions.',
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
      'Help another student think through a choice you have already lived, on a schedule you control.',
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
    title: 'Show your context',
    description: 'Add the school, field, and experiences behind your perspective.',
  },
  {
    title: 'Name the questions',
    description: 'Be specific about the decisions you have navigated and can discuss.',
  },
  {
    title: 'Choose your terms',
    description: 'Offer free or paid sessions and open only the times that fit.',
  },
]

const responsibilities = [
  'Talk about choices, tradeoffs, surprises, and mistakes you experienced firsthand.',
  'Stay clear about what you know, what you do not, and when official guidance belongs in the conversation.',
  'Keep your profile, session options, calendar, and pricing accurate.',
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

export default async function ForMentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ 'school-email-required'?: string }>
}) {
  const params = await searchParams
  const showSchoolEmailNotice = params['school-email-required'] === '1'

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mentorPageJsonLd) }}
      />

      <section className="border-b">
        <div className="page-shell py-10 sm:py-14">
          {showSchoolEmailNotice && (
            <div
              role="alert"
              className="border-warning/40 bg-warning/10 mb-10 flex flex-col gap-5 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex max-w-3xl items-start gap-3">
                <CircleAlert className="text-warning mt-0.5 shrink-0" aria-hidden="true" />
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

          <div className="grid min-h-[68svh] gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="public-enter lg:col-span-7">
              <h1 className="display-hero max-w-4xl">
                Share what you <span className="marker-highlight">wish you knew.</span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
                Share firsthand context with another student, on a schedule you control.
              </p>
              <Link
                href="/auth?intent=mentor"
                className={buttonVariants({ size: 'lg', className: 'mt-8' })}
              >
                Start mentoring
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>

            <div className="public-enter-delayed bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5 lg:aspect-[4/5]">
              <Image
                src="/images/conversation-after-class.jpg"
                alt="Two students talk through a college decision after class"
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 1023px) calc(100vw - 2rem), 40vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="max-w-4xl">
          <h2 className="display-heading">Students bring the question.</h2>
          <p className="text-muted-foreground mt-5 max-w-xl leading-7">
            You bring the parts no catalog, job post, or course description can show.
          </p>
          <div className="border-foreground/20 mt-10 grid border-t sm:grid-cols-2 sm:gap-x-12">
            {studentQuestions.map(question => (
              <p
                key={question}
                className="border-foreground/20 font-display border-b py-5 text-xl leading-7 font-medium sm:text-2xl"
              >
                “{question}”
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y">
        <div className="page-shell py-16 sm:py-24">
          <div className="max-w-3xl">
            <h2 className="display-heading">Make your experience useful.</h2>
            <p className="text-muted-foreground mt-5 leading-7">
              You do not need every answer. You need relevant experience and clear boundaries.
            </p>
          </div>
          <ol className="border-foreground/20 mt-10 grid border-y md:grid-cols-3 md:divide-x">
            {onboardingSteps.map(step => (
              <li
                key={step.title}
                className="border-foreground/20 border-b py-6 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="max-w-4xl">
          <h2 className="display-heading">Free, paid, or both.</h2>
          <p className="text-muted-foreground mt-5 max-w-xl leading-7">
            Set each session&apos;s price and open only the times that fit your schedule.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="border-foreground/20 grid border-y sm:grid-cols-2 sm:divide-x">
              <div className="py-7 sm:pr-8">
                <h3 className="font-semibold">Free sessions</h3>
                <p className="font-display mt-3 text-5xl leading-none font-semibold">$0</p>
                <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-6">
                  Offer a conversation without setting up payouts.
                </p>
              </div>
              <div className="border-foreground/20 border-t py-7 sm:border-t-0 sm:pl-8">
                <h3 className="font-semibold">Paid sessions</h3>
                <p className="font-display mt-3 text-5xl leading-none font-semibold">
                  {mentorSharePercent}%
                </p>
                <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-6">
                  You set the listed price. Discuno retains {platformFeePercent}%.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs leading-5">
              Current fees are subject to the Terms of Service. Tax and payout eligibility may vary.
            </p>
          </div>

          <div className="border-foreground/20 lg:col-span-5 lg:border-l lg:pl-10">
            <h3 className="text-lg font-semibold">What students should expect from you</h3>
            <ul className="border-foreground/20 mt-4 border-t">
              {responsibilities.map(item => (
                <li key={item} className="border-foreground/20 border-b py-4 text-sm leading-6">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-t">
        <div className="page-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <div className="max-w-md">
            <h2 className="display-heading">Before you begin.</h2>
            <p className="text-muted-foreground mt-5 leading-7">
              For account or booking help, visit{' '}
              <Link href="/support" className="text-foreground underline underline-offset-4">
                Support
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
    </div>
  )
}
