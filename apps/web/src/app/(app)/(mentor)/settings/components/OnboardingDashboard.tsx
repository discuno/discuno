import { ArrowRight, BookOpen, CalendarDays, CreditCard, Link2, User } from 'lucide-react'
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
  ItemSeparator,
  ItemTitle,
} from '~/components/ui/item'
import { TodaySessions } from './TodaySessions'

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

const setupOrder = ['calendar', 'profile', 'availability', 'event-types', 'stripe']

const setupPresentation = {
  calendar: {
    title: 'Calendar',
    description: 'Connect the calendar Discuno uses for accurate booking times.',
    actionLabel: 'Connect calendar',
    icon: Link2,
  },
  profile: {
    title: 'Public profile',
    description: 'Add the details students need before choosing a conversation.',
    actionLabel: 'Edit profile',
    icon: User,
  },
  availability: {
    title: 'Availability',
    description: 'Open at least one recurring time window for students.',
    actionLabel: 'Set availability',
    icon: CalendarDays,
  },
  'event-types': {
    title: 'Session types',
    description: 'Choose at least one session students can book.',
    actionLabel: 'Review session types',
    icon: BookOpen,
  },
  stripe: {
    title: 'Payouts',
    description: 'Finish payout setup before offering a paid session.',
    actionLabel: 'Set up payouts',
    icon: CreditCard,
  },
} as const

const workspaceTasks = [
  {
    title: 'Availability',
    description: 'Update your recurring hours and specific dates.',
    href: '/settings/availability',
    icon: CalendarDays,
  },
  {
    title: 'Session types',
    description: 'Control what students can book and what each session costs.',
    href: '/settings/event-types',
    icon: BookOpen,
  },
  {
    title: 'Public profile',
    description: 'Keep your firsthand context and academic details current.',
    href: '/settings/profile/edit',
    icon: User,
  },
] as const

function SetupList({ steps }: { steps: OnboardingStep[] }) {
  return (
    <ItemGroup className="gap-0">
      {steps.map((step, index) => {
        const presentation = setupPresentation[step.id as keyof typeof setupPresentation]
        const Icon = presentation.icon
        const description =
          step.id === 'profile' && step.missingFields?.length
            ? `Add ${step.missingFields.map(field => field.toLowerCase()).join(', ')}.`
            : presentation.description

        return (
          <div key={step.id}>
            {index > 0 ? <ItemSeparator className="my-0" /> : null}
            <Item className="items-start rounded-none border-0 px-0 py-5 sm:flex-nowrap">
              <ItemMedia variant="icon">
                <Icon aria-hidden="true" />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle role="heading" aria-level={3} className="text-base">
                  {presentation.title}
                </ItemTitle>
                <ItemDescription className="line-clamp-none leading-6">
                  {description}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="basis-full sm:basis-auto sm:self-center">
                <Button
                  render={<Link href={step.actionUrl} />}
                  nativeButton={false}
                  variant={index === 0 ? 'default' : 'outline'}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {presentation.actionLabel}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              </ItemActions>
            </Item>
          </div>
        )
      })}
    </ItemGroup>
  )
}

function ReadyWorkspace() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <header className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">Today</h1>
        <p className="text-muted-foreground text-sm leading-6">
          Your booking setup is ready. Choose the task you need to handle next.
        </p>
      </header>

      <TodaySessions />

      <section aria-labelledby="workspace-tasks-heading">
        <h2 id="workspace-tasks-heading" className="text-lg font-semibold">
          Keep your page current
        </h2>
        <ItemGroup className="border-border mt-4 gap-0 border-y">
          {workspaceTasks.map((task, index) => {
            const Icon = task.icon

            return (
              <div key={task.href}>
                {index > 0 ? <ItemSeparator className="my-0" /> : null}
                <Item
                  render={<Link href={task.href} />}
                  className="rounded-none border-0 px-0 py-5"
                >
                  <ItemMedia variant="icon">
                    <Icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-base">{task.title}</ItemTitle>
                    <ItemDescription className="line-clamp-none leading-6">
                      {task.description}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ArrowRight aria-hidden="true" />
                  </ItemActions>
                </Item>
              </div>
            )
          })}
        </ItemGroup>
      </section>
    </div>
  )
}

export const OnboardingDashboard = ({ initialStatus }: OnboardingDashboardProps) => {
  if (initialStatus.isComplete) return <ReadyWorkspace />

  const remainingSteps = initialStatus.steps
    .filter(step => step.requiredForPaid !== false && !step.completed)
    .sort((left, right) => setupOrder.indexOf(left.id) - setupOrder.indexOf(right.id))

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <header className="flex max-w-2xl flex-col items-start gap-3">
        <Badge variant="warning">Setup incomplete</Badge>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
            Today
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            Review the remaining setup before sharing your mentor page with students.
          </p>
        </div>
      </header>

      <section className="border-border border-y py-6" aria-labelledby="booking-readiness-heading">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 id="booking-readiness-heading" className="text-lg font-semibold">
            Finish your setup
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            {remainingSteps.length} {remainingSteps.length === 1 ? 'task remains' : 'tasks remain'}.
          </p>
        </div>
        <div className="mt-4">
          <SetupList steps={remainingSteps} />
        </div>
      </section>

      <TodaySessions />

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
