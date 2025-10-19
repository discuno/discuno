import { Shield } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

export const metadata: Metadata = {
  title: 'Privacy Policy - Discuno',
  description: 'Privacy Policy for Discuno mentorship platform',
}

export default function PrivacyPage() {
  return (
    <div className="text-foreground min-h-screen">
      {/* Hero Section */}
      <div className="from-primary/5 to-background border-b bg-gradient-to-b">
        <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <Shield className="text-primary h-8 w-8" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
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
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Welcome to Discuno (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). We are
                committed to protecting your personal information and your right to privacy. This
                Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our peer-to-peer mentorship platform.
              </p>
              <p>
                By using Discuno, you agree to the collection and use of information in accordance
                with this Privacy Policy. If you do not agree with our policies and practices,
                please do not use our platform.
              </p>
              <p className="border-primary/20 bg-primary/5 rounded-lg border p-3">
                Please also review our{' '}
                <a href="/terms" className="text-primary font-semibold underline">
                  Terms of Service
                </a>
                , which govern your use of Discuno.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>1.1 Information You Provide to Us</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Account Information:</strong> Name, email address (.edu for mentors),
                  profile photo, university affiliation, graduation year, major
                </li>
                <li>
                  <strong>Profile Information:</strong> Bio, areas of expertise, experience,
                  availability, pricing (for mentors)
                </li>
                <li>
                  <strong>Payment Information:</strong> Stripe account details (stored by Stripe,
                  not by us), billing address, transaction history
                </li>
                <li>
                  <strong>Communications:</strong> Messages sent through our platform, support
                  inquiries, feedback, reviews
                </li>
                <li>
                  <strong>User Content:</strong> Posts, comments, reviews, and other content you
                  create on the platform
                </li>
              </ul>

              <p className="mt-4">
                <strong>1.2 Information Collected Automatically</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Device Information:</strong> IP address, browser type and version,
                  operating system, device identifiers
                </li>
                <li>
                  <strong>Usage Data:</strong> Pages visited, time spent on pages, click patterns,
                  session duration, referring URLs
                </li>
                <li>
                  <strong>Analytics Data:</strong> Collected through PostHog to understand user
                  behavior and improve our services
                </li>
                <li>
                  <strong>Cookies and Similar Technologies:</strong> Session cookies, authentication
                  tokens, preference settings
                </li>
              </ul>

              <p className="mt-4">
                <strong>1.3 Information from Third Parties</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>OAuth Providers:</strong> Basic profile information from Google,
                  Microsoft, or other authentication providers you use to sign in
                </li>
                <li>
                  <strong>Stripe:</strong> Payment processing information, verification status,
                  payout details
                </li>
                <li>
                  <strong>Cal.com:</strong> Calendar availability, booking information, scheduling
                  data
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We use your information for the following purposes:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Provide Services:</strong> Create and manage your account, facilitate
                  bookings, process payments, enable mentorship sessions
                </li>
                <li>
                  <strong>Communication:</strong> Send booking confirmations, payment receipts,
                  platform updates, support responses
                </li>
                <li>
                  <strong>Platform Improvement:</strong> Analyze usage patterns, conduct research,
                  develop new features, improve user experience
                </li>
                <li>
                  <strong>Safety and Security:</strong> Verify identities, prevent fraud, enforce
                  our Terms of Service, protect user safety
                </li>
                <li>
                  <strong>Legal Compliance:</strong> Comply with legal obligations, respond to legal
                  requests, enforce our agreements
                </li>
                <li>
                  <strong>Marketing:</strong> Send promotional materials about new features or
                  services (you can opt out at any time)
                </li>
                <li>
                  <strong>Personalization:</strong> Customize your experience, recommend relevant
                  mentors, display relevant content
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. How We Share Your Information</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We may share your information in the following circumstances:</p>

              <p>
                <strong>3.1 Public Information</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  Mentor profiles (name, photo, bio, university, major, expertise, reviews) are
                  publicly visible
                </li>
                <li>Posts and comments you make on the platform are visible to other users</li>
              </ul>

              <p className="mt-4">
                <strong>3.2 Between Users</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  Booking information is shared between mentors and mentees for scheduled sessions
                </li>
                <li>Calendar links and meeting details are exchanged to facilitate sessions</li>
              </ul>

              <p className="mt-4">
                <strong>3.3 Service Providers</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Stripe:</strong> Payment processing, identity verification, payout
                  processing
                </li>
                <li>
                  <strong>Cal.com:</strong> Calendar management, booking coordination, scheduling
                </li>
                <li>
                  <strong>PostHog:</strong> Analytics and product insights (anonymized when
                  possible)
                </li>
                <li>
                  <strong>Railway:</strong> Database hosting and infrastructure
                </li>
                <li>
                  <strong>Vercel:</strong> Application hosting and deployment
                </li>
                <li>
                  <strong>Upstash:</strong> Redis caching and rate limiting
                </li>
              </ul>

              <p className="mt-4">
                <strong>3.4 Legal Requirements</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>When required by law, regulation, or legal process</li>
                <li>To protect our rights, property, or safety, or that of our users</li>
                <li>In connection with fraud prevention or security investigations</li>
                <li>To enforce our Terms of Service or other agreements</li>
              </ul>

              <p className="mt-4">
                <strong>3.5 Business Transfers</strong>
              </p>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be
                transferred to the acquiring entity.
              </p>

              <p className="mt-4">
                <strong>3.6 With Your Consent</strong>
              </p>
              <p>We may share your information for any other purpose with your explicit consent.</p>

              <p className="mt-4 font-semibold">
                We do not sell your personal information to third parties.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We retain your information for as long as necessary to:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Provide our services and maintain your account</li>
                <li>Comply with legal, tax, or accounting requirements</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Maintain business records and analytics</li>
              </ul>
              <p className="mt-4">
                <strong>Account Deletion:</strong> When you delete your account, your personal
                information and public profile will be deleted or anonymized within 30 days. Content
                that others have interacted with (such as reviews, posts, or public comments) may
                remain visible in anonymized form to preserve the integrity of community
                interactions.
              </p>
              <p>
                Transaction records and payment history may be retained for up to 7 years to comply
                with tax and financial regulations. Deleted content may persist in backups for up to
                90 days before permanent removal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>Depending on your location, you may have the following rights:</p>

              <p>
                <strong>5.1 Access and Portability</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Request a copy of your personal information</li>
                <li>Download your data in a portable format</li>
              </ul>

              <p className="mt-4">
                <strong>5.2 Correction</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Update or correct inaccurate information through your account settings</li>
                <li>Request that we correct information we hold about you</li>
              </ul>

              <p className="mt-4">
                <strong>5.3 Deletion</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Delete your account and associated data</li>
                <li>Request deletion of specific information (subject to legal obligations)</li>
              </ul>

              <p className="mt-4">
                <strong>5.4 Opt-Out</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Unsubscribe from marketing emails via the link in any email</li>
                <li>Disable cookies through your browser settings</li>
                <li>Opt out of certain analytics tracking</li>
              </ul>

              <p className="mt-4">
                <strong>5.5 Object and Restrict</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Object to certain processing of your information</li>
                <li>Request restriction of processing in certain circumstances</li>
              </ul>

              <p className="mt-4">
                To exercise these rights, contact us at support@discuno.com. We will respond within
                30 days of receiving your request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Security</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Encryption:</strong> HTTPS/TLS encryption for data in transit, database
                  encryption at rest
                </li>
                <li>
                  <strong>Authentication:</strong> Secure OAuth 2.0 flows, session management,
                  password hashing
                </li>
                <li>
                  <strong>Payment Security:</strong> PCI-compliant payment processing through Stripe
                  (we do not store credit card numbers)
                </li>
                <li>
                  <strong>Access Controls:</strong> Limited employee access to personal data,
                  role-based permissions
                </li>
                <li>
                  <strong>Monitoring:</strong> Security logging, intrusion detection, regular
                  security audits
                </li>
                <li>
                  <strong>Infrastructure:</strong> Secure cloud hosting with reputable providers
                  (Vercel, Railway)
                </li>
              </ul>
              <p className="mt-4">
                Despite our efforts, no security system is impenetrable. We cannot guarantee the
                absolute security of your information. If you believe your account has been
                compromised, contact us immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>We use cookies and similar technologies to:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Essential Cookies:</strong> Authentication, security, session management
                </li>
                <li>
                  <strong>Functional Cookies:</strong> Remember your preferences and settings
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Understand how you use our platform (PostHog)
                </li>
                <li>
                  <strong>Performance Cookies:</strong> Monitor platform performance and errors
                </li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Note that disabling certain
                cookies may limit platform functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. AI and Machine Learning</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                We may use artificial intelligence, machine learning tools, and algorithms to
                improve our platform and services. These technologies help us:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Improve search functionality and mentor recommendations</li>
                <li>Enhance platform performance and user experience</li>
                <li>Detect fraud and ensure platform security</li>
                <li>Analyze usage patterns to develop new features</li>
                <li>Moderate content and maintain community standards</li>
              </ul>
              <p className="mt-4">
                These tools operate primarily on aggregated, anonymized data. When personal data is
                processed, it is done in accordance with this Privacy Policy and applicable data
                protection laws. We do not use your personal information to train third-party AI
                models without your explicit consent.
              </p>
              <p>
                If we integrate third-party AI services (such as OpenAI or similar providers) in the
                future, we will update this policy and implement appropriate safeguards to protect
                your privacy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Third-Party Links and Services</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Our platform may contain links to third-party websites or integrate with third-party
                services (Stripe, Cal.com, video conferencing platforms). We are not responsible for
                the privacy practices of these third parties.
              </p>
              <p>
                We encourage you to review the privacy policies of any third-party services you use.
                Your interactions with these services are governed by their respective privacy
                policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Children&apos;s Privacy</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Our platform is not intended for individuals under the age of 18. We do not
                knowingly collect personal information from children. If we discover that we have
                collected information from a child, we will delete it immediately.
              </p>
              <p>
                If you are a parent or guardian and believe your child has provided us with personal
                information, please contact us at support@discuno.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Your information may be transferred to and processed in countries other than your
                country of residence. These countries may have different data protection laws.
              </p>
              <p>
                Our servers are located in the United States. We use service providers that may
                process data globally. By using our platform, you consent to the transfer of your
                information to the United States and other countries.
              </p>
              <p>
                We take appropriate safeguards to ensure your information is treated securely and in
                accordance with this Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. California Privacy Rights (CCPA)</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                If you are a California resident, you have additional rights under the California
                Consumer Privacy Act (CCPA):
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Right to Know:</strong> Request information about the personal information
                  we collect, use, and share
                </li>
                <li>
                  <strong>Right to Delete:</strong> Request deletion of your personal information
                </li>
                <li>
                  <strong>Right to Opt-Out:</strong> Opt out of the sale of personal information (we
                  do not sell personal information)
                </li>
                <li>
                  <strong>Right to Non-Discrimination:</strong> Not receive discriminatory treatment
                  for exercising your rights
                </li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at support@discuno.com. We will verify your
                identity before processing your request.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. European Privacy Rights (GDPR)</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                If you are in the European Economic Area (EEA), you have rights under the General
                Data Protection Regulation (GDPR):
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
                <li>Right to lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="mt-4">
                Our legal basis for processing your information includes: performance of a contract,
                compliance with legal obligations, legitimate interests, and your consent.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>14. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our
                practices, technology, legal requirements, or other factors.
              </p>
              <p>
                We will notify you of material changes by email or prominent notice on our platform.
                The &quot;Last Updated&quot; date at the top of this policy indicates when it was
                last revised.
              </p>
              <p>
                Your continued use of the platform after changes become effective constitutes
                acceptance of the updated Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>15. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our
                data practices, please contact us:
              </p>
              <div className="bg-muted/50 mt-4 rounded-lg border p-4">
                <p className="font-semibold">Discuno</p>
                <p>Email: support@discuno.com</p>
                <p>Privacy Inquiries: privacy@discuno.com</p>
                <p>Ann Arbor, MI 48104</p>
              </div>
              <p className="mt-4">
                We take privacy concerns seriously and will respond to your inquiry within 30 days.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Summary of Key Points</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <ul className="ml-6 list-disc space-y-2">
                <li>We collect information you provide and usage data to operate our platform</li>
                <li>
                  We use your information to facilitate mentorship, process payments, and improve
                  our services
                </li>
                <li>
                  We share information with service providers (Stripe, Cal.com, PostHog) and as
                  required by law
                </li>
                <li>We do not sell your personal information</li>
                <li>You have rights to access, correct, and delete your information</li>
                <li>We implement industry-standard security measures</li>
                <li>We use cookies for essential functionality and analytics</li>
                <li>Contact us at support@discuno.com with privacy questions</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
