import { ArrowRight, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { buttonVariants } from '~/components/ui/button'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Support and Help Center',
  description:
    'Get clear answers about booking, cancellations, refunds, scheduling, school-email confirmation, accounts, and safety on Discuno.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Discuno Support and Help Center',
    description:
      'Practical help for booking sessions, managing payments, scheduling, accounts, and using Discuno safely.',
  },
})

const supportGroups = [
  {
    id: 'booking',
    title: 'Booking a session',
    description: 'Find the right person and know what happens before you confirm.',
    items: [
      {
        question: 'What is Discuno?',
        answer:
          'Discuno helps a student talk through a college decision with another student who has relevant firsthand context. You can compare public profiles, choose a session and time, then book with the required contact details.',
      },
      {
        question: 'How do I find the right mentor?',
        answer:
          'Start with the question you are trying to answer. Discovery can narrow mentors by school, field, and graduation year. It does not analyze your question or claim to calculate the best match. Read each mentor’s own context and session options before choosing.',
      },
      {
        question: 'Do I need an account to browse or book?',
        answer:
          'No. Public profiles and booking are available without an account. You will provide the contact details required for the session during booking.',
      },
      {
        question: 'What happens after paid checkout?',
        answer:
          'Payment received and booking confirmed are separate states. Follow the result shown after checkout. Do not assume a paid checkout is confirmed until Discuno states that the session is booked.',
      },
    ],
  },
  {
    id: 'cancellations',
    title: 'Cancellations and refunds',
    description: 'Understand timing, refund eligibility, and paid-session handling.',
    items: [
      {
        question: 'Can I cancel or reschedule a session?',
        answer:
          'Use the cancellation or rescheduling options in your booking message when available, or contact support with the booking email and session date. Rescheduling depends on the mentor’s current availability.',
      },
      {
        question: 'What is the refund policy?',
        answer:
          'Mentor cancellations and mentor no-shows receive a full refund. Student cancellations made at least 24 hours before the scheduled start also receive a full refund. Later student cancellations and student no-shows are normally non-refundable unless Discuno approves an exception. Contact support within 48 hours of a material delivery or conduct issue. The Terms of Service govern the complete policy.',
      },
      {
        question: 'How are card payments handled?',
        answer:
          'Stripe handles card payment for paid sessions. Discuno does not store full card details on its servers. You pay the displayed session price plus applicable tax, with no additional Discuno buyer service fee.',
      },
      {
        question: 'How and when do mentors get paid?',
        answer:
          'Discuno retains a 15% commission and schedules the remaining 85% for transfer 72 hours after the session ends. Delivered sessions, student no-shows, and late student cancellations that remain non-refundable can qualify. Refunds, disputes, payment processing, account restrictions, or review can delay or prevent a transfer.',
      },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Work with available times, invitations, cancellations, and meeting details.',
    items: [
      {
        question: 'How does calendar scheduling work?',
        answer:
          'Discuno uses Cal.com to show the mentor’s available times. Once a booking is confirmed, the student and mentor receive booking details, including a calendar invitation and the session meeting link.',
      },
      {
        question: 'Why did the time I selected become unavailable?',
        answer:
          'Availability can change while you are choosing a time or completing checkout. If the session cannot be confirmed, follow the result page and choose another available time when it is safe to do so.',
      },
      {
        question: 'My school is not listed. What should I do?',
        answer:
          'Email support with the institution’s name, location, and .edu email domain. We review requests as school coverage expands. Do not include passwords or other sensitive account information.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'School email and accounts',
    description: 'Know what the school-email check means and how mentor access works.',
    items: [
      {
        question: 'What does “School email confirmed” mean?',
        answer:
          'It means the mentor demonstrated access to a supported institutional email address, supporting the stated school affiliation at the time of the check. It is not an identity check, background check, credential validation, endorsement, or guarantee of session quality.',
      },
      {
        question: 'How do I become a mentor?',
        answer:
          'Choose “Start mentoring” and sign in with an eligible school-issued .edu address. Then create your public profile, connect your calendar, set availability, and publish session options. Payout setup is optional for free sessions and required for paid bookings.',
      },
      {
        question: 'Can I use a personal email for mentor access?',
        answer:
          'Mentor tools currently require a supported school-issued .edu address. A personal account can still browse and book without mentor access.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety',
    description: 'Protect your information and report a session concern.',
    items: [
      {
        question: 'How can I have a safe and productive session?',
        answer:
          'Use the meeting link in your booking confirmation, keep payment within Discuno, and never share card details, passwords, or other sensitive financial information. Leave the call if something feels unsafe.',
      },
      {
        question: 'How do I report a concern?',
        answer:
          'Email support@discuno.com with the booking email, session date, and a concise description of what happened. Discuno support is not an emergency service. Contact local emergency services if anyone is in immediate danger.',
      },
    ],
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      <section className="border-b">
        <div className="page-shell py-14 sm:py-20 lg:py-24">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            What do you need help with?
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
            Choose the task below, or email us with the booking details that matter.
          </p>
        </div>
      </section>

      <div className="page-shell py-12 sm:py-16">
        <nav aria-label="Support topics" className="border-foreground/20 border-y py-5 lg:hidden">
          <p className="text-sm font-semibold">Help topics</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
            {supportGroups.map(group => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="hover:text-primary focus-visible:ring-ring rounded-sm text-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                >
                  {group.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-18">
          <aside className="hidden lg:block">
            <nav aria-label="Support topics" className="sticky top-28">
              <p className="font-semibold">Help topics</p>
              <ul className="mt-4 flex flex-col gap-1">
                {supportGroups.map(group => (
                  <li key={group.id}>
                    <a
                      href={`#${group.id}`}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hover:bg-muted block rounded-md px-3 py-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0">
            {supportGroups.map((group, groupIndex) => (
              <section
                key={group.id}
                id={group.id}
                className={groupIndex === 0 ? 'scroll-mt-28' : 'mt-16 scroll-mt-28'}
                aria-labelledby={`${group.id}-heading`}
              >
                <div className="max-w-2xl">
                  <h2 id={`${group.id}-heading`} className="text-2xl font-semibold tracking-tight">
                    {group.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {group.description}
                  </p>
                </div>

                <Accordion className="border-foreground/20 mt-5 border-t">
                  {group.items.map((item, itemIndex) => (
                    <AccordionItem key={item.question} value={`${group.id}-${itemIndex}`}>
                      <AccordionTrigger className="py-5 text-left text-base leading-6 font-medium hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground max-w-3xl pb-5 text-base leading-7">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}

            <section className="border-foreground/20 mt-16 border-y py-8">
              <div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <h2 className="text-2xl font-semibold">Still need help?</h2>
                  <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                    Include the booking email and session date so we can find the right record
                    without extra back-and-forth.
                  </p>
                </div>
                <a href="mailto:support@discuno.com" className={buttonVariants({ size: 'lg' })}>
                  <Mail data-icon="inline-start" />
                  Email support
                </a>
              </div>
            </section>

            <section className="mt-12" aria-labelledby="policies-heading">
              <h2 id="policies-heading" className="text-lg font-semibold">
                Policies and privacy
              </h2>
              <div className="border-foreground/20 mt-5 divide-y border-y">
                <Link
                  href="/terms"
                  className="hover:text-primary focus-visible:ring-ring flex items-center justify-between gap-5 py-5 font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                  Terms of Service
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-primary focus-visible:ring-ring flex items-center justify-between gap-5 py-5 font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                  Privacy Policy
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
