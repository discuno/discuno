import { Scale } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { createMetadata } from '~/lib/metadata'

export const metadata: Metadata = createMetadata({
  title: 'Terms of Service',
  description:
    "Read Discuno's terms of service covering user agreements, platform guidelines, mentor policies, payment terms, and user responsibilities.",
  openGraph: {
    title: 'Terms of Service - Discuno',
    description: 'Platform guidelines and user agreements for our mentorship community.',
  },
})

export default function TermsPage() {
  return (
    <div className="text-foreground min-h-screen">
      {/* Hero Section */}
      <div className="from-primary/5 to-background border-b bg-gradient-to-b">
        <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <Scale className="text-primary h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
              Effective Date: January 15, 2025
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Definitions</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>For purposes of these Terms, the following definitions apply:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>&quot;Platform&quot;</strong> means the Discuno website, application, and
                  related services.
                </li>
                <li>
                  <strong>&quot;Mentor&quot;</strong> means a verified user with a .edu email
                  address offering mentorship services through the Platform.
                </li>
                <li>
                  <strong>&quot;Mentee&quot;</strong> means a user booking and receiving mentorship
                  sessions through the Platform.
                </li>
                <li>
                  <strong>&quot;User&quot;</strong> means any individual accessing or using the
                  Platform, including Mentors, Mentees, and visitors.
                </li>
                <li>
                  <strong>&quot;Content&quot;</strong> means text, images, profiles, posts, reviews,
                  and any other materials posted on the Platform.
                </li>
                <li>
                  <strong>&quot;Session&quot;</strong> means a scheduled mentorship meeting between
                  a Mentor and Mentee.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                By accessing or using Discuno (&quot;the Platform&quot;, &quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service
                (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the
                Platform.
              </p>
              <p>
                Discuno is a peer-to-peer mentorship platform that connects students
                (&quot;Mentees&quot;) with experienced mentors (&quot;Mentors&quot;). These Terms
                govern your use of the Platform, whether as a Mentor, Mentee, or visitor.
              </p>
              <div className="border-primary/20 bg-primary/5 mt-4 rounded-lg border p-4">
                <p className="font-semibold">Beta Platform Notice</p>
                <p className="mt-2">
                  The Platform is currently in beta. Features may change, and we may modify,
                  suspend, or discontinue any aspect of the Platform at any time. While we strive to
                  maintain data integrity, you acknowledge that data may be reset or removed as we
                  refine the service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>To use the Platform, you must:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
                <li>
                  For Mentors: Have a valid .edu email address from an accredited educational
                  institution
                </li>
                <li>Provide accurate, complete, and current information during registration</li>
                <li>
                  Maintain the security of your account credentials and be responsible for all
                  activities under your account
                </li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
              <p>
                We reserve the right to refuse service, terminate accounts, or remove content at our
                sole discretion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>3.1 Account Creation:</strong> You may create an account using your
                university email, Google, Microsoft, or other supported authentication methods. You
                are responsible for maintaining the confidentiality of your account credentials.
              </p>
              <p>
                <strong>3.2 Account Verification:</strong> Mentors must verify their identity
                through their .edu email address. We may request additional verification at any
                time.
              </p>
              <p>
                <strong>3.3 Account Security:</strong> You must immediately notify us of any
                unauthorized use of your account. We are not liable for any loss or damage arising
                from your failure to protect your account credentials.
              </p>
              <p>
                <strong>3.4 Account Termination:</strong> You may terminate your account at any time
                through your account settings. We may suspend or terminate your account for
                violation of these Terms, fraudulent activity, or any other reason at our
                discretion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Mentor Services</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>4.1 Mentor Responsibilities:</strong> As a Mentor, you agree to:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Provide accurate information about your expertise and experience</li>
                <li>Conduct sessions professionally and respectfully</li>
                <li>Honor scheduled sessions or provide reasonable notice of cancellation</li>
                <li>Not share contact information for the purpose of circumventing the Platform</li>
                <li>Comply with all applicable laws, including tax obligations</li>
                <li>
                  Not engage in any inappropriate, discriminatory, or harmful behavior toward
                  Mentees
                </li>
              </ul>
              <p>
                <strong>4.2 Mentor Payments:</strong> Mentors set their own rates. Payments are
                processed through Stripe Connect. You must maintain an active Stripe account to
                receive payments. Platform fees are deducted from each session payment as described
                in Section 6.
              </p>
              <p>
                <strong>4.3 Mentor Reviews:</strong> Mentees may leave reviews and ratings. Reviews
                must be honest and accurate. We reserve the right to remove reviews that violate our
                policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Mentee Services</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>5.1 Booking Sessions:</strong> Mentees can browse Mentor profiles and book
                sessions through the Platform. By booking a session, you agree to pay the listed
                price.
              </p>
              <p>
                <strong>5.2 Mentee Responsibilities:</strong> As a Mentee, you agree to:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  Attend scheduled sessions on time or provide reasonable notice of cancellation
                </li>
                <li>Treat Mentors with respect and professionalism</li>
                <li>Use the Platform for legitimate mentorship purposes only</li>
                <li>Not record sessions without explicit consent from the Mentor</li>
              </ul>
              <p>
                <strong>5.3 Session Conduct:</strong> Sessions are conducted through video
                conferencing platforms of the Mentor&apos;s choice. We are not responsible for
                technical issues with third-party platforms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Payments and Fees</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>6.1 Payment Processing:</strong> All payments are processed securely through
                Stripe. By using the Platform, you agree to Stripe&apos;s Terms of Service and
                Privacy Policy.
              </p>
              <p>
                <strong>6.2 Platform Fees:</strong> Discuno charges a platform fee on each
                transaction. The fee structure is as follows:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Platform retains a percentage of each session payment</li>
                <li>Stripe processing fees are deducted separately</li>
                <li>Fee percentages are subject to change with 30 days notice</li>
              </ul>
              <p>
                <strong>6.3 Payout Schedule:</strong> Mentor payments are held for a 7-day dispute
                period after session completion, then automatically transferred to your connected
                Stripe account.
              </p>
              <p>
                <strong>6.4 Taxes:</strong> You are responsible for all applicable taxes. Mentors
                are independent contractors and must report their earnings for tax purposes.
              </p>
              <p>
                <strong>6.5 Currency:</strong> All transactions are processed in USD unless
                otherwise specified.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cancellations and Refunds</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>7.1 Cancellation Policy:</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Cancellations made 24+ hours before the session: Full refund to the Mentee</li>
                <li>
                  Cancellations made less than 24 hours before: No refund unless exceptional
                  circumstances
                </li>
                <li>
                  Mentor no-shows: Full refund to the Mentee, potential account action against
                  Mentor
                </li>
                <li>Mentee no-shows: Payment released to Mentor after 15-minute grace period</li>
              </ul>
              <p>
                <strong>7.2 Refund Process:</strong> Approved refunds are processed within 5-10
                business days to the original payment method.
              </p>
              <p>
                <strong>7.3 Disputes:</strong> If you have an issue with a session, contact us
                within 48 hours at support@discuno.com. We will review the situation and make a
                determination at our sole discretion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Content and Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>8.1 User Content:</strong> You retain ownership of content you post (profile
                information, reviews, posts, etc.). By posting content, you grant us a worldwide,
                non-exclusive, royalty-free license to use, display, and distribute your content on
                the Platform.
              </p>
              <p>
                <strong>8.2 Platform Content:</strong> The Platform, including its design, features,
                text, graphics, logos, and software, is owned by Discuno and protected by copyright,
                trademark, and other intellectual property laws.
              </p>
              <p>
                <strong>8.3 Prohibited Content:</strong> You may not post content that:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Is illegal, harmful, threatening, abusive, or discriminatory</li>
                <li>Infringes intellectual property rights</li>
                <li>Contains malware or malicious code</li>
                <li>Is spam or unsolicited advertising</li>
                <li>Violates others&apos; privacy or impersonates others</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use,
                and protect your personal information. By using the Platform, you consent to our
                data practices as described in the Privacy Policy.
              </p>
              <p>
                We use analytics services (PostHog) to improve our Platform. We do not sell your
                personal information to third parties.
              </p>
              <p>
                <strong>Data Retention:</strong> We retain user data only as long as necessary to
                provide the Platform, comply with legal obligations, resolve disputes, and enforce
                our agreements. When you delete your account, we will delete or anonymize your
                personal information within 30 days, except where we are required to retain it for
                legal, tax, or regulatory purposes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Disclaimers and Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>10.1 Platform Provided &quot;As Is&quot;:</strong> The Platform is provided
                on an &quot;as is&quot; and &quot;as available&quot; basis. We make no warranties,
                express or implied, regarding the Platform&apos;s operation or content.
              </p>
              <p>
                <strong>10.2 No Guarantee of Results:</strong> We do not guarantee any specific
                outcomes from mentorship sessions. Mentors are independent contractors, not our
                employees.
              </p>
              <p>
                <strong>10.3 Third-Party Services:</strong> We are not responsible for third-party
                services (Stripe, Cal.com, video conferencing platforms) or their availability.
              </p>
              <p>
                <strong>10.4 Limitation of Liability:</strong> To the fullest extent permitted by
                law, Discuno shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of profits or revenues, whether
                incurred directly or indirectly.
              </p>
              <p>
                <strong>10.5 Maximum Liability:</strong> Our total liability to you for any claims
                arising from your use of the Platform shall not exceed the amount you paid to us in
                the 12 months preceding the claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                You agree to indemnify, defend, and hold harmless Discuno, its officers, directors,
                employees, and agents from any claims, liabilities, damages, losses, and expenses
                (including legal fees) arising from:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Your violation of these Terms</li>
                <li>Your violation of any law or third-party rights</li>
                <li>Your use of the Platform</li>
                <li>Content you post on the Platform</li>
                <li>Your conduct as a Mentor or Mentee</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>12.1 Informal Resolution:</strong> Before initiating any formal dispute
                resolution proceeding, you agree to contact us at support@discuno.com to attempt to
                resolve the dispute informally. We commit to working with you in good faith to reach
                a resolution within 30 days.
              </p>
              <p>
                <strong>12.2 Binding Arbitration:</strong> If we cannot resolve a dispute
                informally, you and Discuno agree that any dispute, claim, or controversy arising
                out of or relating to these Terms or your use of the Platform shall be resolved by
                binding arbitration administered by the American Arbitration Association (AAA) under
                its Commercial Arbitration Rules.
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  Arbitration will be conducted in Washtenaw County, Michigan, or remotely via video
                  conference at the arbitrator&apos;s discretion.
                </li>
                <li>
                  The arbitrator&apos;s decision will be final and binding, and judgment may be
                  entered in any court of competent jurisdiction.
                </li>
                <li>
                  Each party will bear its own costs and attorneys&apos; fees, unless the arbitrator
                  determines otherwise.
                </li>
                <li>
                  You and Discuno waive the right to a jury trial and to participate in class
                  actions or class arbitrations.
                </li>
              </ul>
              <p>
                <strong>12.3 Exceptions to Arbitration:</strong> Either party may seek injunctive or
                equitable relief in court to protect intellectual property rights or prevent
                unauthorized use of the Platform.
              </p>
              <p>
                <strong>12.4 Governing Law:</strong> These Terms are governed by the laws of the
                State of Michigan, United States, without regard to conflict of law principles.
              </p>
              <p>
                <strong>12.5 Opt-Out:</strong> You may opt out of the arbitration requirement by
                sending written notice to support@discuno.com within 30 days of first accepting
                these Terms. If you opt out, disputes will be resolved in the state or federal
                courts located in Washtenaw County, Michigan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Modifications to Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective
                immediately upon posting to the Platform. Your continued use of the Platform after
                changes constitutes acceptance of the modified Terms.
              </p>
              <p>
                Material changes will be communicated via email or prominent notice on the Platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>14. Termination</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                We may suspend or terminate your access to the Platform at any time, with or without
                cause, with or without notice. Upon termination:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Your right to use the Platform immediately ceases</li>
                <li>
                  Outstanding payments for completed sessions will be processed according to
                  standard timelines
                </li>
                <li>Sections that should survive termination will remain in effect</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>15. General Provisions</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>15.1 Entire Agreement:</strong> These Terms constitute the entire agreement
                between you and Discuno regarding your use of the Platform.
              </p>
              <p>
                <strong>15.2 Severability:</strong> If any provision of these Terms is found to be
                unenforceable, the remaining provisions will remain in full effect.
              </p>
              <p>
                <strong>15.3 Waiver:</strong> Our failure to enforce any provision of these Terms
                does not constitute a waiver of that provision.
              </p>
              <p>
                <strong>15.4 Assignment:</strong> You may not assign these Terms without our prior
                written consent. We may assign these Terms to any affiliate or successor.
              </p>
              <p>
                <strong>15.5 No Agency:</strong> Nothing in these Terms creates a partnership, joint
                venture, employment, or agency relationship between you and Discuno.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>16. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>If you have questions about these Terms, please contact us at:</p>
              <div className="bg-muted/50 mt-4 rounded-lg border p-4">
                <p className="font-semibold">Discuno</p>
                <p>Email: support@discuno.com</p>
                <p>Legal: legal@discuno.com</p>
                <p>Ann Arbor, MI 48104</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
