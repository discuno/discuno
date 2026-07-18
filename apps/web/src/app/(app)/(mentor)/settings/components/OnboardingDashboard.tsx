import {
  BookOpen,
  CalendarDays,
  Check,
  CreditCard,
  DollarSign,
  Link2,
  MoveRight,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { Badge } from '~/components/ui/badge'
import { buttonVariants } from '~/components/ui/button'
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

const setupOrder = ['profile', 'calendar', 'availability', 'event-types', 'stripe', 'pricing']

const StepIcon = ({ iconName }: { iconName: string }) => {
  const Icon = iconMap[iconName as keyof typeof iconMap]
  return <Icon className="size-5" aria-hidden="true" />
}

function SetupList({ steps, nextStepId }: { steps: OnboardingStep[]; nextStepId?: string }) {
  return (
    <ul aria-label="Setup requirements">
      {steps.map((step, index) => {
        const isNext = step.id === nextStepId
        const status = step.completed
          ? 'Complete'
          : step.requiredForPaid === false
            ? 'Optional'
            : 'Required'

        return (
          <Fragment key={step.id}>
            {index > 0 ? <Separator /> : null}
            <li
              className={cn(
                'grid gap-4 py-5 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:items-center',
                isNext && 'border-primary border-l-2 pl-4'
              )}
            >
              <span className={step.completed ? 'text-success' : 'text-muted-foreground'}>
                {step.completed ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  <StepIcon iconName={step.iconName} />
                )}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{step.title}</h3>
                  <Badge variant={step.completed ? 'success' : 'outline'}>
                    {isNext ? 'Up next' : status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
                  {step.description}
                </p>
              </div>

              {!step.completed ? (
                <Link
                  href={step.actionUrl}
                  className={cn(
                    buttonVariants({ variant: isNext ? 'default' : 'outline' }),
                    'w-full sm:w-auto'
                  )}
                >
                  {step.actionLabel}
                  <MoveRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          </Fragment>
        )
      })}
    </ul>
  )
}

function CompleteDashboard() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Mentor overview
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl leading-7">
            <span className="text-success font-semibold">Ready for bookings.</span> Keep your
            profile, availability, and session details current from the workspace navigation.
          </p>
        </div>
        <Link href="/settings/bookings" className={buttonVariants({ size: 'lg' })}>
          Review bookings
          <MoveRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      </header>
    </div>
  )
}

export const OnboardingDashboard = ({ initialStatus }: OnboardingDashboardProps) => {
  const { isComplete, completedSteps, totalSteps, steps } = initialStatus

  if (isComplete) return <CompleteDashboard />

  const orderedSteps = [...steps].sort(
    (left, right) => setupOrder.indexOf(left.id) - setupOrder.indexOf(right.id)
  )
  const requiredSteps = orderedSteps.filter(
    step => step.requiredForPaid === undefined || step.requiredForPaid === true
  )
  const coreSteps = orderedSteps.filter(step => step.requiredForPaid === undefined)
  const paymentSteps = orderedSteps.filter(step => step.requiredForPaid !== undefined)
  const nextRequiredStep = requiredSteps.find(step => !step.completed)
  const remainingSteps = Math.max(totalSteps - completedSteps, 0)
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 100

  return (
    <div className="flex w-full max-w-4xl flex-col gap-12">
      <header>
        <Badge variant="warning">Bookings paused</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Finish your mentor setup
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          {remainingSteps} required {remainingSteps === 1 ? 'task remains' : 'tasks remain'} before
          students can book a session with you.
        </p>

        <div className="mt-7 max-w-2xl">
          <div className="mb-3 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">Booking readiness</span>
            <span className="text-muted-foreground tabular-nums">
              {completedSteps} of {totalSteps}
            </span>
          </div>
          <Progress
            value={progressPercent}
            aria-label="Mentor booking setup progress"
            aria-valuetext={`${completedSteps} of ${totalSteps} required tasks complete`}
          />
        </div>
      </header>

      <section aria-labelledby="booking-requirements-title">
        <h2 id="booking-requirements-title" className="text-xl font-semibold tracking-[-0.02em]">
          Required for booking
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete these tasks in order so students can schedule you.
        </p>
        <Separator className="mt-5" />
        <SetupList steps={coreSteps} nextStepId={nextRequiredStep?.id} />
        <Separator />
      </section>

      {paymentSteps.length > 0 ? (
        <section aria-labelledby="payment-requirements-title">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="payment-requirements-title"
              className="text-xl font-semibold tracking-[-0.02em]"
            >
              Paid sessions
            </h2>
            {!paymentSteps.some(step => step.requiredForPaid === true) ? (
              <Badge variant="outline">Optional</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Payout setup is required only when you charge for a session.
          </p>
          <Separator className="mt-5" />
          <SetupList steps={paymentSteps} nextStepId={nextRequiredStep?.id} />
          <Separator />
        </section>
      ) : null}

      <p className="text-muted-foreground text-sm">
        Need help?{' '}
        <a
          className="text-foreground font-medium underline underline-offset-4"
          href="mailto:support@discuno.com"
        >
          Email Discuno support
        </a>
        .
      </p>
    </div>
  )
}
