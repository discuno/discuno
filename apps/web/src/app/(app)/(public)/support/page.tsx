import { type Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  HeadphonesIcon,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Support & Help Center',
  description:
    'Get help with Discuno. Find answers to FAQs about mentorship, payments, safety, and more. Contact our support team for assistance.',
  openGraph: {
    title: 'Discuno Support - Get Help With Mentorship Platform',
    description:
      'Find answers to common questions about finding mentors, booking sessions, payments, and platform safety. Our support team is here to help.',
  },
})

const supportCategories = [
  {
    icon: Users,
    title: 'Getting Started',
    description: 'Learn the basics of using Discuno',
  },
  {
    icon: CreditCard,
    title: 'Billing & Payments',
    description: 'Payment processing and refunds',
  },
  {
    icon: Shield,
    title: 'Safety & Security',
    description: 'Keeping your account secure',
  },
  {
    icon: GraduationCap,
    title: 'For Mentors',
    description: 'Resources for mentors',
  },
]

export default function SupportPage() {
  return (
    <div className="text-foreground min-h-screen">
      {/* Hero Section */}
      <div className="from-primary/5 to-background border-b bg-gradient-to-b">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <LifeBuoy className="text-primary h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              How can we help you?
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg sm:text-xl">
              Find answers to common questions, explore our resources, or get in touch with our
              support team.
            </p>
          </div>

          {/* Quick Links */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {supportCategories.map(category => {
              const Icon = category.icon
              return (
                <Card
                  key={category.title}
                  className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <CardHeader>
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="text-primary h-5 w-5" />
                    </div>
                    <CardTitle className="mt-4 text-lg">{category.title}</CardTitle>
                    <CardDescription className="text-sm">{category.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* FAQ Section */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2 text-lg">
              Quick answers to questions you may have
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {/* Getting Started */}
                <AccordionItem value="what-is-discuno">
                  <AccordionTrigger className="text-left text-base font-medium">
                    What is Discuno and how does it work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Discuno is a peer-to-peer mentorship platform that connects college students
                    with experienced mentors from their schools. Browse mentor profiles, book
                    one-on-one sessions, and get personalized guidance on academics, career
                    planning, internships, and more. All payments are processed securely through
                    Stripe, and sessions are scheduled via integrated calendar management.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="become-mentor">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How do I become a mentor?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    To become a mentor, you must have a valid .edu email address from an accredited
                    institution. Click the &quot;Mentor Sign In&quot; button in the top navigation
                    to get started. You&apos;ll create your profile, set your availability and
                    pricing, and connect your Stripe account to receive payments. Once your profile
                    is complete, you&apos;ll be visible to students seeking mentorship.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="finding-mentor">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How do I find the right mentor for me?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Use our filter system to search by school, major, or graduation year. Browse
                    mentor profiles to view their experience, expertise, pricing, and student
                    reviews. Each mentor&apos;s profile includes their background, areas of
                    expertise, and availability. Take your time to find someone whose experience
                    aligns with your goals.
                  </AccordionContent>
                </AccordionItem>

                {/* Billing & Payments */}
                <AccordionItem value="payment-security">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How are payments processed? Is it secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    All payments are processed through Stripe, an industry-leading payment platform
                    trusted by millions of businesses worldwide. We never store your credit card
                    information on our servers. Payments are held securely and only released to
                    mentors after the session is completed. We use bank-level encryption to protect
                    all financial transactions.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="refund-policy">
                  <AccordionTrigger className="text-left text-base font-medium">
                    What is your refund policy?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    We want you to have a great experience. If your mentor is a no-show or the
                    session is significantly unsatisfactory, you are eligible for a full refund.
                    Contact our support team within 48 hours of the session with details. We review
                    each case individually and work quickly to resolve issues. Mentors who
                    repeatedly fail to show up or provide poor service may be removed from the
                    platform.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mentor-payment">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How and when do mentors get paid?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Mentors receive payment through Stripe Connect to their connected bank account.
                    Payments are automatically transferred after a 7-day dispute period following
                    session completion. This protects both mentors and students by ensuring session
                    quality. You can track your earnings and payout schedule in your mentor
                    dashboard.
                  </AccordionContent>
                </AccordionItem>

                {/* Safety & Trust */}
                <AccordionItem value="safety">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How can I ensure a safe and productive mentorship experience?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Your safety is our top priority. All mentors are verified through their .edu
                    email addresses. We recommend keeping all communication and payments within the
                    platform. Never share personal financial information, and report any suspicious
                    behavior immediately. Sessions are conducted via video call using your preferred
                    platform. If you experience any issues, contact our support team right away.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="verification">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How do you verify mentors?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    All mentors must sign up using a verified .edu email address from their
                    institution. We also verify their Stripe Connect accounts for payment
                    processing. While we verify institutional affiliation, we encourage students to
                    read reviews and check mentor profiles carefully before booking. The review
                    system helps maintain quality and accountability across the platform.
                  </AccordionContent>
                </AccordionItem>

                {/* Technical */}
                <AccordionItem value="missing-school">
                  <AccordionTrigger className="text-left text-base font-medium">
                    My school isn&apos;t listed. What should I do?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    We&apos;re constantly expanding our network of schools. If your institution
                    isn&apos;t listed, please email support@discuno.com with the school&apos;s name,
                    location, and your .edu email domain. We prioritize adding schools based on
                    demand and will notify you once your school is added. Your feedback helps us
                    grow and better serve the student community.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="calendar-integration">
                  <AccordionTrigger className="text-left text-base font-medium">
                    How does calendar scheduling work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    Our platform integrates with Cal.com for seamless calendar management. Mentors
                    set their availability, and students can book sessions based on open time slots.
                    Once booked, both parties receive calendar invitations and email confirmations.
                    You&apos;ll get reminder notifications before your session. If you need to
                    reschedule, contact the other party as soon as possible.
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
            </CardContent>
          </Card>
        </div>

        {/* Contact Section */}
        <div className="text-center">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <HeadphonesIcon className="text-primary h-6 w-6" />
              </div>
              <CardTitle className="mt-4 text-2xl">Still need help?</CardTitle>
              <CardDescription className="text-base">
                Our support team typically responds within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:support@discuno.com"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium shadow-sm transition-colors"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Email Support
                </a>
                <a
                  href="mailto:support@discuno.com?subject=Report%20an%20Issue"
                  className="border-border bg-background hover:bg-accent inline-flex items-center justify-center rounded-lg border px-6 py-3 text-base font-medium shadow-sm transition-colors"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Report an Issue
                </a>
              </div>
              <p className="text-muted-foreground text-sm">
                For urgent safety concerns, please email us immediately at support@discuno.com
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Resources */}
        <div className="mt-16 border-t pt-12">
          <h3 className="mb-6 text-center text-xl font-semibold">Additional Resources</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/terms">
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <BookOpen className="text-primary h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Terms of Service</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    Review our platform guidelines, policies, and user agreements
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/privacy">
              <Card className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                      <Shield className="text-primary h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Privacy Policy</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    Learn how we protect your data and ensure secure transactions
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
