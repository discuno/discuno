import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Mail,
  Link2,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

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
  Link2,
} as const

const quickActions = [
  {
    title: 'Review bookings',
    description: 'See your upcoming and past mentorship sessions.',
    href: '/settings/bookings',
    icon: CalendarCheck,
  },
  {
    title: 'Update availability',
    description: 'Keep the hours mentees can request up to date.',
    href: '/settings/availability',
    icon: CalendarDays,
  },
  {
    title: 'Manage session types',
    description: 'Choose your session formats and pricing.',
    href: '/settings/event-types',
    icon: BookOpen,
  },
  {
    title: 'Edit public profile',
    description: 'Keep your mentor details current.',
    href: '/settings/profile/edit',
    icon: User,
  },
] as const

const StepIcon = ({ iconName }: { iconName: string }) => {
  const Icon = iconMap[iconName as keyof typeof iconMap]
  return <Icon aria-hidden="true" className="size-5" />
}

interface SetupStepCardProps {
  step: OnboardingStep
  isNext: boolean
  isRequired: boolean
}

const SetupStepCard = ({ step, isNext, isRequired }: SetupStepCardProps) => {
  const statusLabel = step.completed ? 'Complete' : isRequired ? 'Required' : 'Optional'

  return (
    <Card
      className={cn(
        'shadow-none transition-colors',
        step.completed && 'bg-muted/20',
        isNext && 'border-primary/40 bg-primary/[0.03]'
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg',
              step.completed && 'bg-primary/10 text-primary',
              isNext && !step.completed && 'bg-primary text-primary-foreground'
            )}
          >
            {step.completed ? (
              <Check aria-hidden="true" className="size-5" />
            ) : (
              <StepIcon iconName={step.iconName} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold tracking-tight">{step.title}</h3>
              {isNext && <Badge variant="secondary">Next step</Badge>}
              {!isNext && (
                <Badge variant={step.completed ? 'outline' : 'secondary'}>{statusLabel}</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm leading-6">{step.description}</p>

            {!step.completed && (
              <Button asChild size="sm" variant={isNext ? 'default' : 'outline'} className="mt-4">
                <Link href={step.actionUrl}>
                  {step.actionLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CompleteDashboard = () => {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <Card className="overflow-hidden shadow-none">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Booking setup complete
              </Badge>
              <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
                Your mentor workspace is ready
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-base leading-7">
                Your required profile, availability, and session settings are in place. Use this
                workspace to keep them current and manage bookings.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/settings/bookings">
                View bookings
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="manage-mentoring-heading" className="space-y-4">
        <div>
          <h2 id="manage-mentoring-heading" className="text-xl font-semibold tracking-tight">
            Manage your mentoring
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Keep the details mentees rely on accurate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(action => {
            const Icon = action.icon

            return (
              <Link
                key={action.title}
                href={action.href}
                className="focus-visible:ring-ring group rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Card className="group-hover:border-foreground/20 h-full shadow-none transition-colors">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">{action.title}</h3>
                        <ArrowRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {action.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export const OnboardingDashboard = ({ initialStatus }: OnboardingDashboardProps) => {
  const { isComplete, completedSteps, totalSteps, steps } = initialStatus

  if (isComplete) {
    return <CompleteDashboard />
  }

  const requiredSteps = steps.filter(
    step => step.requiredForPaid === undefined || step.requiredForPaid === true
  )
  const coreSteps = steps.filter(step => step.requiredForPaid === undefined)
  const paymentSteps = steps.filter(step => step.requiredForPaid !== undefined)
  const nextRequiredStep = requiredSteps.find(step => !step.completed)
  const remainingSteps = Math.max(totalSteps - completedSteps, 0)
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 100
  const hasRequiredPaymentStep = paymentSteps.some(step => step.requiredForPaid === true)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="max-w-3xl">
        <Badge variant="outline" className="mb-4">
          Mentor setup
        </Badge>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          Complete your booking setup
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-7">
          Finish the required items below so mentees can book the sessions you choose to offer.
        </p>
      </header>

      <Card className="shadow-none">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg">Booking readiness</CardTitle>
            <CardDescription className="mt-1.5">
              {remainingSteps} required {remainingSteps === 1 ? 'item' : 'items'} remaining
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit tabular-nums">
            {completedSteps} of {totalSteps} complete
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress
            value={progressPercent}
            aria-label="Mentor booking setup progress"
            aria-valuetext={`${completedSteps} of ${totalSteps} required items complete`}
          />

          {nextRequiredStep && (
            <div className="bg-muted/50 flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Continue setup
                </p>
                <p className="mt-1 font-medium">{nextRequiredStep.title}</p>
              </div>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href={nextRequiredStep.actionUrl}>
                  {nextRequiredStep.actionLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="required-setup-heading" className="space-y-4">
        <div>
          <h2 id="required-setup-heading" className="text-xl font-semibold tracking-tight">
            Required for bookings
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Complete each item to make your booking options ready.
          </p>
        </div>

        <div className="grid gap-3">
          {coreSteps.map(step => (
            <SetupStepCard
              key={step.id}
              step={step}
              isNext={step.id === nextRequiredStep?.id}
              isRequired
            />
          ))}
        </div>
      </section>

      {paymentSteps.length > 0 && (
        <section aria-labelledby="payment-setup-heading" className="space-y-4">
          <Separator />
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="payment-setup-heading" className="text-xl font-semibold tracking-tight">
                Session payments
              </h2>
              {!hasRequiredPaymentStep && <Badge variant="outline">Optional</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {hasRequiredPaymentStep
                ? 'Complete payout setup for the paid session types you enabled.'
                : 'Set up payouts and pricing only if you want to charge for sessions.'}
            </p>
          </div>

          <div className="grid gap-3">
            {paymentSteps.map(step => (
              <SetupStepCard
                key={step.id}
                step={step}
                isNext={step.id === nextRequiredStep?.id}
                isRequired={step.requiredForPaid === true}
              />
            ))}
          </div>
        </section>
      )}

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Mail aria-hidden="true" className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Need help with setup?</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Contact Discuno support and tell us where you got stuck.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href="mailto:support@discuno.com">Email support</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
