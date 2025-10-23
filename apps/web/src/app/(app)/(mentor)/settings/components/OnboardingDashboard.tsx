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
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Separator } from '~/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { QuickSetupDialog } from './QuickSetupDialog'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  actionUrl: string
  actionLabel: string
  iconName: string
  missingItems?: string[] // What's missing to complete this step
  estimatedTime?: string // Estimated time to complete
  optional?: boolean // Whether this step is optional
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
            Congratulations! Your mentor profile is live and accepting bookings. Students can now
            find and book sessions with you.
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
              <Link href="/settings/profile/edit">
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">View or update your profile</span>
                </Button>
              </Link>
              <Link href="/settings/event-types">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">Adjust your event types and pricing</span>
                </Button>
              </Link>
              <Link href="/settings/availability">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">Fine-tune your availability</span>
                </Button>
              </Link>
              <Link href="/settings/bookings">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span className="flex-1 text-left">View your upcoming bookings</span>
                </Button>
              </Link>
              <Separator />
              <Link href="/">
                <Button variant="default" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Pro Tips for Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Keep your availability up to date to avoid booking conflicts</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Respond promptly to booking requests to build a good reputation</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Consider starting with free sessions to build reviews and credibility</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          Welcome! Let&apos;s get your mentor profile set up
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          You&apos;re just a few steps away from connecting with students. Most mentors complete
          setup in 10-15 minutes. Your profile won&apos;t be visible to students until all required
          steps are complete.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activation Progress</CardTitle>
              <CardDescription>Complete all steps to activate your profile</CardDescription>
            </div>
            <QuickSetupDialog onSetupComplete={() => {}} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <Badge variant="secondary">
                {completedSteps} of {totalSteps} completed
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card
            key={step.id}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        Step {index + 1}: {step.title}
                      </h3>
                      {step.completed && (
                        <Badge variant="outline" className="text-green-600 dark:text-green-400">
                          Completed
                        </Badge>
                      )}
                      {step.optional && !step.completed && (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                      {step.estimatedTime && !step.completed && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {step.estimatedTime}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Estimated time to complete</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{step.description}</p>
                    
                    {!step.completed && step.missingItems && step.missingItems.length > 0 && (
                      <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-800">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-900 dark:text-amber-100">
                              Missing:
                            </p>
                            <ul className="mt-1 list-disc list-inside text-amber-800 dark:text-amber-200 space-y-0.5">
                              {step.missingItems.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
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
        ))}
      </div>

      <Separator />

      <Collapsible>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <CardTitle className="text-base">Need Help?</CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                Toggle
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="text-muted-foreground space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Getting Started Tips:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Complete steps in any order that works for you</li>
                  <li>You can offer only free sessions - Stripe is optional in that case</li>
                  <li>Your profile won&apos;t be visible to students until all required steps are done</li>
                  <li>You can always edit your settings later</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Common Questions:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Do I need Stripe?</strong> Only if you want to charge for sessions</li>
                  <li><strong>How long does setup take?</strong> Most mentors complete it in 10-15 minutes</li>
                  <li><strong>Can I change my pricing later?</strong> Yes, anytime in Event Types settings</li>
                </ul>
              </div>
              <Separator />
              <p>
                If you have questions about setting up your mentor profile, check out our{' '}
                <Link href="#" className="text-primary underline-offset-4 hover:underline">
                  Getting Started Guide
                </Link>{' '}
                or reach out to{' '}
                <a
                  href="mailto:support@discuno.com"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  support@discuno.com
                </a>
                .
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
