import { ArrowRight, Calendar, CheckCircle, Clock, DollarSign, Mail, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfile, getUserCalcomTokens } from '~/server/queries'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
  href?: string
  action?: string
}

async function MentorOnboardingContent() {
  const { id } = await requireAuth()

  // Check if user is verified mentor
  const profile = await getProfile(id)
  if (!profile?.isEduVerified) {
    redirect('/email-verification')
  }

  // Check Cal.com integration status
  const calcomTokens = await getUserCalcomTokens(id)
  const hasCalcomIntegration = !!calcomTokens

  // Calculate completion steps
  const steps: OnboardingStep[] = [
    {
      id: 'email-verification',
      title: 'Verify College Email',
      description: 'Confirm your .edu email address to become a verified mentor',
      icon: <Mail className="h-5 w-5" />,
      completed: profile.isEduVerified,
    },
    {
      id: 'scheduling-setup',
      title: 'Set Your Availability',
      description: 'Configure when students can book mentoring sessions with you',
      icon: <Clock className="h-5 w-5" />,
      completed: hasCalcomIntegration,
      href: '/mentor/scheduling',
      action: 'Set Availability',
    },
    {
      id: 'event-types',
      title: 'Create Event Types',
      description: 'Define different types of mentoring sessions you offer',
      icon: <Calendar className="h-5 w-5" />,
      completed: false, // TODO: Check if user has created event types
      href: '/mentor/event-types',
      action: 'Create Events',
    },
    {
      id: 'payment-setup',
      title: 'Setup Payments',
      description: 'Connect Stripe to receive payments for your mentoring sessions',
      icon: <DollarSign className="h-5 w-5" />,
      completed: false, // TODO: Check if Stripe is connected
      href: '/mentor/payments',
      action: 'Connect Stripe',
    },
    {
      id: 'go-live',
      title: 'Go Live!',
      description: 'Your profile will appear on the platform for students to book',
      icon: <Users className="h-5 w-5" />,
      completed: false, // TODO: Check if profile is live
      href: '/mentor/profile',
      action: 'Publish Profile',
    },
  ]

  const completedSteps = steps.filter(step => step.completed).length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-foreground text-4xl font-bold">Welcome to Mentor Onboarding! 🎉</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Let&apos;s get you set up to start earning money by sharing your college experience
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Setup Progress</CardTitle>
            <Badge variant={completedSteps === steps.length ? 'default' : 'secondary'}>
              {completedSteps}/{steps.length} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSteps === 0
                  ? 'Just getting started'
                  : completedSteps === steps.length
                    ? 'All done!'
                    : `${steps.length - completedSteps} steps remaining`}
              </span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      <div className="space-y-4">
        {steps.map((step, _index) => (
          <Card
            key={step.id}
            className={`transition-all duration-200 ${
              step.completed
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                : 'hover:shadow-md'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {/* Step Icon/Status */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    step.completed
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? <CheckCircle className="h-6 w-6" /> : step.icon}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3
                      className={`text-lg font-semibold ${
                        step.completed ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                      }`}
                    >
                      {step.title}
                    </h3>
                    {step.completed && (
                      <Badge
                        variant="outline"
                        className="border-green-300 bg-green-100 text-xs text-green-700"
                      >
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <div className="text-green-600 dark:text-green-400">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  ) : step.href ? (
                    <Button asChild>
                      <Link href={step.href} className="flex items-center gap-2">
                        {step.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="outline">
                      Coming Soon
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      {completedSteps === steps.length ? (
        <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-foreground mb-2 text-2xl font-bold">
              Congratulations! You&apos;re All Set!
            </h2>
            <p className="text-muted-foreground mx-auto mb-6 max-w-2xl">
              Your mentor profile is now live and students can start booking sessions with you.
              You&apos;ll start earning money for every session you complete.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/mentor/dashboard">View Mentor Dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/(dashboard)">See Your Profile Live</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="mb-2 text-lg font-semibold">Ready to Start Earning?</h3>
            <p className="text-muted-foreground mb-4">
              Complete the remaining steps to activate your mentor profile and start receiving
              bookings.
            </p>
            <Button asChild>
              <Link href={steps.find(s => !s.completed)?.href ?? '#'}>Continue Setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function MentorOnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MentorOnboardingContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Mentor Onboarding | Discuno',
  description:
    'Complete your mentor setup and start earning money by sharing your college experience',
}
