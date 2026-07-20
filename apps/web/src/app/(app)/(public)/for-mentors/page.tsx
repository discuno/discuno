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
  'Speak from choices and tradeoffs you experienced firsthand.',
  'Be clear about the limits of your perspective.',
  'Keep your profile, sessions, calendar, and pricing accurate.',
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
        <div className="page-shell py-10 sm:py-16">
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

          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="public-enter lg:col-span-7">
              <h1 className="display-hero max-w-4xl">
                Help with the choice <span className="marker-highlight">you already made.</span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
                Offer one-to-one conversations on your schedule, free or at a price you set.
              </p>
              <Link
                href="/auth?intent=mentor"
                className={buttonVariants({ size: 'lg', className: 'mt-8' })}
              >
                Start mentoring
                <ArrowRight data-icon="inline-end" />
              </Link>
            </div>

            <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-5">
              <Image
                src="/images/conversation-after-class.jpg"
                alt="Two students talk through a college decision after class"
                fill
                preload
                className="object-cover object-center"
                sizes="(max-width: 1023px) calc(100vw - 2rem), 40vw"
              />
            </div>
          </div>

          <div className="border-foreground/20 mt-14 border-t pt-5">
            <p className="text-muted-foreground text-sm font-medium">Questions students bring</p>
            <div className="mt-2 grid lg:grid-cols-3 lg:divide-x">
              {studentQuestions.map(question => (
                <p
                  key={question}
                  className="border-foreground/20 border-b py-5 text-lg leading-7 font-medium last:border-b-0 lg:border-b-0 lg:px-6 lg:first:pl-0 lg:last:pr-0"
                >
                  “{question}”
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-16 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How you start</h2>
            <ol className="border-foreground/20 mt-7 border-t">
              {onboardingSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="border-foreground/20 grid gap-3 border-b py-5 sm:grid-cols-[2rem_10rem_1fr] sm:items-baseline"
                >
                  <span className="text-primary text-sm font-semibold">0{index + 1}</span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-6">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-foreground/20 lg:col-span-5 lg:border-l lg:pl-10">
            <h2 className="text-2xl font-semibold tracking-tight">Free, paid, or both</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Set each session&apos;s price and open only the times that fit.
            </p>
            <div className="border-foreground/20 mt-7 grid border-y sm:grid-cols-2 sm:divide-x lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
              <div className="py-7 sm:pr-8">
                <h3 className="font-semibold">Free sessions</h3>
                <p className="mt-2 text-4xl leading-none font-semibold tracking-tight">$0</p>
                <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-6">
                  Offer a conversation without setting up payouts.
                </p>
              </div>
              <div className="border-foreground/20 border-t py-7 sm:border-t-0 sm:pl-8 lg:border-t lg:pl-0">
                <h3 className="font-semibold">Paid sessions</h3>
                <p className="mt-2 text-4xl leading-none font-semibold tracking-tight">
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
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-t">
        <div className="page-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Before you begin</h2>
            <p className="text-muted-foreground mt-4 leading-7">
              Students should know what your perspective can and cannot do.
            </p>
            <ul className="border-foreground/20 mt-6 border-t">
              {responsibilities.map(item => (
                <li key={item} className="border-foreground/20 border-b py-4 text-sm leading-6">
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-5 text-sm leading-6">
              Need account or booking help? Visit{' '}
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
