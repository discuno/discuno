import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  CreditCard,
  DollarSign,
  Link2,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '~/components/ui/item'
import { Progress } from '~/components/ui/progress'
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

const quickActions = [
  {
    title: 'Review bookings',
    description: 'See the sessions students have scheduled with you.',
    href: '/settings/bookings',
    icon: CalendarCheck,
  },
  {
    title: 'Update availability',
    description: 'Keep the times students can request accurate.',
    href: '/settings/availability',
    icon: CalendarDays,
  },
  {
    title: 'Manage sessions',
    description: 'Choose which conversations students can book.',
    href: '/settings/event-types',
    icon: BookOpen,
  },
  {
    title: 'Edit public profile',
    description: 'Keep your experience and perspective current.',
    href: '/settings/profile/edit',
    icon: User,
  },
] as const

const StepIcon = ({ iconName }: { iconName: string }) => {
  const Icon = iconMap[iconName as keyof typeof iconMap]
  return <Icon aria-hidden="true" />
}

const SetupStepItem = ({
  step,
  isNext,
  isRequired,
}: {
  step: OnboardingStep
  isNext: boolean
  isRequired: boolean
}) => {
  const statusLabel = step.completed ? 'Complete' : isRequired ? 'Required' : 'Optional'

  return (
    <Item
      role="listitem"
      variant={isNext ? 'outline' : step.completed ? 'muted' : 'default'}
      className={cn(isNext && 'border-primary/35 bg-primary/[0.025]')}
    >
      <ItemMedia
        variant="icon"
        className={cn(
          'bg-muted text-muted-foreground size-10 rounded-md',
          step.completed && 'bg-success/10 text-success',
          isNext && !step.completed && 'bg-primary text-primary-foreground'
        )}
      >
        {step.completed ? <Check aria-hidden="true" /> : <StepIcon iconName={step.iconName} />}
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="w-full flex-wrap">
          <span>{step.title}</span>
          <Badge variant={step.completed ? 'outline' : 'secondary'}>
            {isNext ? 'Next' : statusLabel}
          </Badge>
        </ItemTitle>
        <ItemDescription className="line-clamp-none">{step.description}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

const CompleteDashboard = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
    <section className="paper-panel corner-mark p-6 sm:p-8" aria-labelledby="overview-title">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <Badge className="badge-success-muted mb-4 gap-1.5" variant="outline">
            Ready for bookings
          </Badge>
          <h1 id="overview-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your mentor workspace is ready
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl leading-7">
            Your profile, calendar, availability, and at least one compatible session are in place.
            Students can choose an open time and book you.
          </p>
        </div>
        <Button
          render={<Link href="/settings/bookings" />}
          nativeButton={false}
          size="lg"
          className="w-full lg:w-auto"
        >
          Review bookings
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </section>

    <section aria-labelledby="workspace-actions-title" className="flex flex-col gap-4">
      <div>
        <h2 id="workspace-actions-title" className="text-xl font-semibold tracking-tight">
          Keep things current
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Update the details students rely on before they book.
        </p>
      </div>
      <ItemGroup className="grid gap-3 sm:grid-cols-2">
        {quickActions.map(action => {
          const Icon = action.icon
          return (
            <Item
              key={action.title}
              role="listitem"
              render={<Link href={action.href} />}
              variant="outline"
              className="group"
            >
              <ItemMedia variant="icon" className="bg-muted text-foreground size-10 rounded-md">
                <Icon aria-hidden="true" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{action.title}</ItemTitle>
                <ItemDescription>{action.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ArrowRight aria-hidden="true" className="text-muted-foreground" />
              </ItemActions>
            </Item>
          )
        })}
      </ItemGroup>
    </section>
  </div>
)

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="paper-panel corner-mark p-6 sm:p-8" aria-labelledby="setup-title">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4">
            Bookings paused
          </Badge>
          <h1 id="setup-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Complete your mentor setup
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {remainingSteps} required {remainingSteps === 1 ? 'step remains' : 'steps remain'}{' '}
            before students can book a session with you.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">Booking readiness</span>
            <span className="text-muted-foreground tabular-nums">
              {completedSteps} of {totalSteps}
            </span>
          </div>
          <Progress
            value={progressPercent}
            aria-label="Mentor booking setup progress"
            aria-valuetext={`${completedSteps} of ${totalSteps} required steps complete`}
          />
          {nextRequiredStep && (
            <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Next step
                </p>
                <p className="mt-1 font-medium">{nextRequiredStep.title}</p>
              </div>
              <Button
                render={<Link href={nextRequiredStep.actionUrl} />}
                nativeButton={false}
                className="w-full sm:w-auto"
              >
                {nextRequiredStep.actionLabel}
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="booking-checklist-title" className="flex flex-col gap-4">
        <div>
          <h2 id="booking-checklist-title" className="text-xl font-semibold tracking-tight">
            Booking checklist
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            These essentials determine whether students can schedule you.
          </p>
        </div>
        <ItemGroup className="gap-3">
          {coreSteps.map(step => (
            <SetupStepItem
              key={step.id}
              step={step}
              isNext={step.id === nextRequiredStep?.id}
              isRequired
            />
          ))}
        </ItemGroup>
      </section>

      {paymentSteps.length > 0 && (
        <section aria-labelledby="payment-checklist-title" className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="payment-checklist-title" className="text-xl font-semibold tracking-tight">
                Paid sessions
              </h2>
              {!paymentSteps.some(step => step.requiredForPaid === true) && (
                <Badge variant="outline">Optional</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Payout setup is only required when you choose to charge for a session.
            </p>
          </div>
          <ItemGroup className="gap-3">
            {paymentSteps.map(step => (
              <SetupStepItem
                key={step.id}
                step={step}
                isNext={step.id === nextRequiredStep?.id}
                isRequired={step.requiredForPaid === true}
              />
            ))}
          </ItemGroup>
        </section>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Stuck on a step?{' '}
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
