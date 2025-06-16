// TODO: Add Stripe connection status
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
  AlertCircle,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfile } from '~/server/queries'

async function MentorPaymentsContent() {
  const { id } = await requireAuth()

  // Check if user is verified mentor
  const profile = await getProfile(id)
  if (!profile?.isEduVerified) {
    redirect('/email-verification')
  }

  // Mock Stripe connection status (in real app, check from database)
  const hasStripeConnected = false

  // Mock earnings data (in real app, fetch from Stripe)
  const earningsData = {
    thisMonth: 450,
    lastMonth: 320,
    totalEarnings: 2840,
    pendingPayouts: 125,
    completedSessions: 18,
    upcomingSessions: 5,
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-4xl font-bold">Payments & Earnings</h1>
            <p className="text-muted-foreground mt-2">
              Connect Stripe to receive payments and track your earnings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasStripeConnected ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Stripe Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                <AlertCircle className="mr-1 h-3 w-3" />
                Setup Required
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Setup Alert */}
      {!hasStripeConnected && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Connect your Stripe account to start receiving payments from your mentoring sessions.
            </span>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              Connect Stripe
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasStripeConnected ? (
        <div className="space-y-6">
          {/* Earnings Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">This Month</p>
                    <p className="text-2xl font-bold">${earningsData.thisMonth}</p>
                    <p className="text-sm text-green-600">+40% from last month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Total Earnings</p>
                    <p className="text-2xl font-bold">${earningsData.totalEarnings}</p>
                    <p className="text-sm text-blue-600">All time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Pending Payout</p>
                    <p className="text-2xl font-bold">${earningsData.pendingPayouts}</p>
                    <p className="text-sm text-purple-600">Available in 2 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                    <Users className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Sessions</p>
                    <p className="text-2xl font-bold">{earningsData.completedSessions}</p>
                    <p className="text-sm text-orange-600">
                      {earningsData.upcomingSessions} upcoming
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-16 flex-col">
                  <DollarSign className="mb-1 h-6 w-6" />
                  Request Payout
                </Button>
                <Button variant="outline" className="h-16 flex-col">
                  <Calendar className="mb-1 h-6 w-6" />
                  View Transactions
                </Button>
                <Button variant="outline" className="h-16 flex-col">
                  <CreditCard className="mb-1 h-6 w-6" />
                  Payment Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stripe Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Connect Your Stripe Account
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Securely connect Stripe to receive payments from your mentoring sessions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Benefits */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Why Connect Stripe?</h4>
                  <div className="space-y-3">
                    {[
                      {
                        icon: <Shield className="h-5 w-5" />,
                        title: 'Secure Payments',
                        description: 'Bank-grade security for all transactions',
                      },
                      {
                        icon: <Zap className="h-5 w-5" />,
                        title: 'Fast Payouts',
                        description: 'Get paid within 2 business days',
                      },
                      {
                        icon: <Building className="h-5 w-5" />,
                        title: 'Professional',
                        description: 'Students pay directly through the platform',
                      },
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                          {benefit.icon}
                        </div>
                        <div>
                          <h5 className="font-medium">{benefit.title}</h5>
                          <p className="text-muted-foreground text-sm">{benefit.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setup Process */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Setup Process</h4>
                  <div className="space-y-3">
                    {[
                      "Click 'Connect Stripe' below",
                      'Complete Stripe account verification',
                      'Confirm your bank account details',
                      'Start receiving payments!',
                    ].map((step, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium dark:bg-purple-900">
                          {index + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Connect Stripe Account
                    </Button>
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                      Takes 2-3 minutes • Secure SSL encryption
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Fees */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Fees</CardTitle>
              <p className="text-muted-foreground text-sm">
                Transparent pricing with no hidden fees
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/30">
                  <h5 className="mb-1 font-semibold text-green-900 dark:text-green-100">
                    Platform Fee
                  </h5>
                  <div className="mb-1 text-3xl font-bold text-green-600">15%</div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Per completed session
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950/30">
                  <h5 className="mb-1 font-semibold text-blue-900 dark:text-blue-100">
                    Stripe Fee
                  </h5>
                  <div className="mb-1 text-3xl font-bold text-blue-600">2.9%</div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    + $0.30 per transaction
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-950/30">
                  <h5 className="mb-1 font-semibold text-purple-900 dark:text-purple-100">
                    You Keep
                  </h5>
                  <div className="mb-1 text-3xl font-bold text-purple-600">~82%</div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Of session price</p>
                </div>
              </div>

              <div className="bg-muted/50 mt-6 rounded-lg p-4">
                <h6 className="mb-2 font-medium">Example: $50 Session</h6>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Session price:</span>
                    <span className="float-right">$50.00</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platform fee (15%):</span>
                    <span className="float-right">-$7.50</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stripe fee (2.9% + $0.30):</span>
                    <span className="float-right">-$1.75</span>
                  </div>
                  <div className="border-t pt-2 font-semibold">
                    <span>You receive:</span>
                    <span className="float-right text-green-600">$40.75</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    question: 'When do I get paid?',
                    answer:
                      "Payments are processed 2 business days after a completed session. You'll receive an email notification when funds are transferred.",
                  },
                  {
                    question: "What if a student doesn't show up?",
                    answer:
                      "You'll still be paid for no-shows if you wait the full session duration. Our system automatically handles this.",
                  },
                  {
                    question: 'Can I change my payout method?',
                    answer:
                      'Yes, you can update your bank account information anytime through your Stripe dashboard.',
                  },
                  {
                    question: 'Are there any monthly fees?',
                    answer:
                      'No monthly fees! You only pay the platform and Stripe fees on completed sessions.',
                  },
                ].map((faq, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    <h6 className="mb-1 font-medium">{faq.question}</h6>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function MentorPaymentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MentorPaymentsContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Payments & Earnings | Mentor Dashboard | Discuno',
  description: 'Connect Stripe and manage your mentoring earnings',
}
