'use client'

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  DollarSign,
  Rocket,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Separator } from '~/components/ui/separator'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  actionUrl: string
  actionLabel: string
  iconName: string
  missingFields?: string[]
  requiredForPaid?: boolean
}

interface OnboardingStatus {
  isComplete: boolean
  completedSteps: number
  totalSteps: number
  steps: OnboardingStep[]
}

interface OnboardingDashboardProps {
  initialStatus: OnboardingStatus
}

const iconMap = {
  User,
  CalendarDays,
  CreditCard,
  BookOpen,
  DollarSign,
} as const

const getIcon = (iconName: string) => {
  const Icon = iconMap[iconName as keyof typeof iconMap]
  return <Icon className="text-muted-foreground h-5 w-5" />
}

export const OnboardingDashboard = ({ initialStatus }: OnboardingDashboardProps) => {
  const { isComplete, completedSteps, totalSteps, steps } = initialStatus
  const progressPercent = (completedSteps / totalSteps) * 100

  if (isComplete) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <Rocket className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Your profile is active! 🎉
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your mentor profile is live and accepting bookings. Students can now find and book
            sessions with you.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Here are some things you can do to make the most of your mentor account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Link href="/settings/event-types">
                <Button variant="outline" className="w-full justify-start">
                  <span className="flex-1 text-left">Adjust your event types and pricing</span>
                </Button>
              </Link>
              <Link href="/settings/availability">
                <Button variant="outline" className="w-full justify-start">
                  <span className="flex-1 text-left">Fine-tune your availability</span>
                </Button>
              </Link>
              <Link href="/settings/bookings">
                <Button variant="outline" className="w-full justify-start">
                  <span className="flex-1 text-left">View your upcoming bookings</span>
                </Button>
              </Link>
              <Link href="/">
                <Button variant="default" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Alert className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
        <Rocket className="text-destructive h-4 w-4" />
        <AlertTitle className="text-destructive">Profile Inactive</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Your mentor profile is not accepting bookings. Complete the steps below to activate your
          profile and start accepting sessions.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activation Progress</CardTitle>
            <Badge variant="secondary">
              {completedSteps} of {totalSteps} completed
            </Badge>
          </div>
          <CardDescription>Complete all steps to activate your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => {
          // Check if we need to render a section header for "Required for Paid Sessions"
          // This applies to any step with requiredForPaid !== undefined (steps 4 and 5)
          const isPaidSessionStep = step.requiredForPaid !== undefined
          const showPaidSessionHeader =
            isPaidSessionStep && (index === 0 || steps[index - 1]?.requiredForPaid === undefined)

          return (
            <div key={step.id}>
              {showPaidSessionHeader && (
                <div className="mt-6 mb-4">
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <Badge variant="secondary" className="text-xs">
                      Required for Paid Sessions
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                  <p className="text-muted-foreground mt-2 text-center text-xs">
                    Complete these steps only if you want to charge for sessions
                  </p>
                </div>
              )}
              <Card
                className={
                  step.completed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {step.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="text-muted-foreground h-6 w-6" />
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            Step {index + 1}: {step.title}
                          </h3>
                          {step.completed && (
                            <Badge variant="outline" className="text-green-600 dark:text-green-400">
                              Completed
                            </Badge>
                          )}
                          {isPaidSessionStep && step.requiredForPaid && !step.completed && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">{step.description}</p>
                      </div>

                      {!step.completed && (
                        <Link href={step.actionUrl}>
                          <Button size="sm">{step.actionLabel}</Button>
                        </Link>
                      )}
                    </div>

                    <div className="flex-shrink-0">{getIcon(step.iconName)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            If you have any questions about setting up your mentor profile, check out our{' '}
            <Link href="#" className="text-primary underline-offset-4 hover:underline">
              Getting Started Guide
            </Link>
            .
          </p>
          <p>
            You can also reach out to our support team at{' '}
            <a
              href="mailto:support@discuno.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              support@discuno.com
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
