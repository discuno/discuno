import { type Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  Mail,
  MessageSquare,
  Shield,
  Users,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Support & Help Center',
  description:
    'Get clear answers about finding a mentor, booking a session, payments, mentor verification, and account safety on Discuno.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Discuno Support & Help Center',
    description:
      'Guidance for finding mentors, booking sessions, managing payments, and using Discuno safely.',
  },
})

const supportTopics = [
  { href: '#getting-started', label: 'Browse & book' },
  { href: '#payments', label: 'Payments & refunds' },
  { href: '#trust', label: 'Trust & safety' },
  { href: '#scheduling', label: 'Scheduling' },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      <section className="bg-card border-b">
        <div className="page-container grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">Discuno support</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Straight answers when you need a hand
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
              Learn how mentor discovery, guest booking, scheduling, and paid sessions work. If
              something still is not clear, contact us directly.
            </p>
          </div>

          <div className="border-border border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <p className="text-sm font-semibold">Need personal help?</p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Include the email used for your booking and, when relevant, the session date. Never
              send payment card details.
            </p>
            <a
              href="mailto:support@discuno.com"
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email support
            </a>
          </div>
        </div>
      </section>

      <div className="page-container py-12 sm:py-16">
        <nav aria-label="Support topics" className="border-border border-b pb-7 lg:hidden">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
            Jump to a topic
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {supportTopics.map(topic => (
              <a
                key={topic.href}
                href={topic.href}
                className="text-foreground hover:text-primary focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {topic.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden lg:block">
            <nav aria-label="Support topics" className="sticky top-28">
              <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.14em] uppercase">
                Help topics
              </p>
              <ul className="space-y-1">
                {supportTopics.map(topic => (
                  <li key={topic.href}>
                    <a
                      href={topic.href}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring block rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {topic.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="border-border mt-8 border-t pt-6">
                <p className="text-sm font-semibold">Still stuck?</p>
                <a
                  href="mailto:support@discuno.com"
                  className="text-primary focus-visible:ring-ring mt-2 inline-flex rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                >
                  support@discuno.com
                </a>
              </div>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-10">
              <p className="eyebrow">Help center</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
                Practical guidance for students, mentors, and anyone booking a session.
              </p>
            </div>

            <section id="getting-started" className="scroll-mt-28">
              <div className="mb-3 flex items-start gap-3">
                <Users className="text-primary mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xl font-semibold">Browse and book</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Find a mentor and understand what happens before you confirm.
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="border-border border-t">
                <AccordionItem value="what-is-discuno">
                  <AccordionTrigger className="text-left text-base font-medium">
                    What is Discuno and how does it work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Discuno connects students with mentors for one-on-one guidance. Browse public
                    mentor profiles, compare session options and availability, then book with your
                    name and email—no account is required. Free sessions are confirmed directly;
                    paid sessions are processed securely through Stripe. Scheduling and meeting
                    details are provided through the booking flow.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="finding-mentor">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How do I find the right mentor for me?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Filter mentors by school, major, or graduation year. Each public profile shows
                    the mentor&apos;s academic background, bio, available session types, current
                    pricing, and bookable times. Compare those details with the goal you want to
                    work on before choosing a session.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="become-mentor">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How do I become a mentor?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Choose &quot;Become a mentor&quot; and verify an eligible .edu email address.
                    You will then create a public profile, connect your calendar, set availability,
                    and publish session options. Connecting Stripe is optional for free sessions and
                    is required before accepting paid bookings.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section id="payments" className="mt-14 scroll-mt-28">
              <div className="mb-3 flex items-start gap-3">
                <CreditCard className="text-primary mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xl font-semibold">Payments and refunds</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    How paid bookings, mentor earnings, and support requests are handled.
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="border-border border-t">
                <AccordionItem value="payment-security">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How are payments processed? Is it secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    All payments are processed through Stripe, an industry-leading payment platform
                    trusted by millions of businesses worldwide. We never store your credit card
                    information on our servers. You pay the displayed session price plus applicable
                    taxes; Discuno does not add a buyer service fee. A mentor&apos;s share is
                    released only after the session and support window.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="refund-policy">
                  <AccordionTrigger className="text-left text-base font-medium">
                    What is your refund policy?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Mentor cancellations and mentor no-shows receive a full refund. Mentee
                    cancellations made at least 24 hours before the session also receive a full
                    refund; later cancellations and mentee no-shows are normally non-refundable
                    unless Discuno approves an exception. For a material delivery or conduct issue,
                    contact support within 48 hours of the session. We review the circumstances and
                    determine any additional refund at our sole discretion under the{' '}
                    <Link
                      href="/terms"
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      Terms of Service
                    </Link>
                    .
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mentor-payment">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How and when do mentors get paid?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Mentors receive payment through Stripe Connect to their connected bank account.
                    Discuno retains a 15% service commission and schedules the remaining 85% for
                    transfer 72 hours after the session ends. Delivered sessions, mentee no-shows,
                    and late mentee cancellations that remain non-refundable can qualify, provided
                    the payment is not refunded, disputed, or under review. Bank arrival then
                    follows the mentor&apos;s Stripe payout schedule and account availability.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section id="trust" className="mt-14 scroll-mt-28">
              <div className="mb-3 flex items-start gap-3">
                <Shield className="text-primary mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xl font-semibold">Trust and safety</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    What school-email verification means and how to protect yourself.
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="border-border border-t">
                <AccordionItem value="verification">
                  <AccordionTrigger className="text-left text-base font-medium">
                    What does mentor verification mean?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    A school-email verification badge means the mentor demonstrated access to an
                    eligible .edu email address, supporting their stated institutional affiliation
                    at the time of verification. It is not an identity check, background check,
                    credential validation, endorsement, or guarantee of session quality. Review the
                    mentor&apos;s profile and session details before booking. For paid sessions,
                    Stripe separately collects the information needed to operate the mentor&apos;s
                    connected payment account.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="safety">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How can I have a safe and productive session?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Use the meeting link in your booking confirmation, keep payment within Discuno,
                    and never share card details, passwords, or other sensitive financial
                    information. Leave a call if something feels unsafe and report suspicious
                    behavior to support@discuno.com. Discuno support is not an emergency service;
                    contact local emergency services if anyone is in immediate danger.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section id="scheduling" className="mt-14 scroll-mt-28">
              <div className="mb-3 flex items-start gap-3">
                <GraduationCap className="text-primary mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xl font-semibold">Schools and scheduling</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Help with school coverage, invitations, cancellations, and rescheduling.
                  </p>
                </div>
              </div>

              <Accordion type="single" collapsible className="border-border border-t">
                <AccordionItem value="missing-school">
                  <AccordionTrigger className="text-left text-base font-medium">
                    My school isn&apos;t listed. What should I do?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Email support@discuno.com with the institution&apos;s name, location, and .edu
                    email domain. We review requests as we expand school coverage. Please do not
                    include passwords or other sensitive account information.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="calendar-integration">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How does calendar scheduling work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Discuno uses Cal.com to show each mentor&apos;s available time slots. You can
                    choose a time and enter your name and email without creating an account. Once a
                    booking is confirmed, the attendee and mentor receive booking details, including
                    a calendar invitation and the session meeting link.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cancel-session">
                  <AccordionTrigger className="text-left text-base font-medium">
                    Can I cancel or reschedule a session?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Life happens, and we understand. Please communicate with your mentor or student
                    as early as possible if you need to cancel or reschedule. Our cancellation
                    policy requires at least 24 hours notice for a full refund. Last-minute
                    cancellations may not be eligible for refunds, as mentors have already reserved
                    that time. Repeated cancellations may affect your account standing.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section className="border-border bg-card mt-16 border p-6 sm:p-8">
              <div className="grid gap-7 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="text-primary h-5 w-5" aria-hidden="true" />
                    <h3 className="text-xl font-semibold">Still need help?</h3>
                  </div>
                  <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6">
                    We review support messages as soon as possible. Include the booking email and
                    session date so we can find the right record without extra back-and-forth.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <a
                    href="mailto:support@discuno.com"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Email support
                  </a>
                  <a
                    href="mailto:support@discuno.com?subject=Report%20an%20Issue"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    Report an issue
                  </a>
                </div>
              </div>
            </section>

            <section className="border-border mt-12 border-t pt-8">
              <h3 className="text-lg font-semibold">Policies and privacy</h3>
              <div className="mt-5 divide-y border-y">
                <Link
                  href="/terms"
                  className="hover:bg-muted focus-visible:ring-ring flex items-start gap-4 px-1 py-5 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-3"
                >
                  <BookOpen className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">Terms of Service</span>
                    <span className="text-muted-foreground mt-1 block text-sm leading-6">
                      Platform rules, booking terms, payment policies, and user responsibilities.
                    </span>
                  </span>
                </Link>
                <Link
                  href="/privacy"
                  className="hover:bg-muted focus-visible:ring-ring flex items-start gap-4 px-1 py-5 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-3"
                >
                  <Shield className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">Privacy Policy</span>
                    <span className="text-muted-foreground mt-1 block text-sm leading-6">
                      How Discuno collects, uses, protects, and shares personal information.
                    </span>
                  </span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
