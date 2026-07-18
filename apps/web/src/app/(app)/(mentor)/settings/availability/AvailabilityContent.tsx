'use client'

import { CalendarX2, CircleAlert } from 'lucide-react'
import Link from 'next/link'
import type { getSchedule } from '~/app/(app)/(mentor)/settings/actions'
import { AvailabilityManager } from '~/app/(app)/(mentor)/settings/availability/components/AvailabilityManager'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { buttonVariants } from '~/components/ui/button'

interface AvailabilityContentProps {
  initialScheduleResult: Awaited<ReturnType<typeof getSchedule>>
}

function AvailabilityPageHeader() {
  return (
    <header className="flex max-w-2xl flex-col gap-1.5">
      <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
        Availability
      </h1>
      <p className="text-muted-foreground text-sm leading-6">
        Set recurring hours and date exceptions for student bookings.
      </p>
    </header>
  )
}

export function AvailabilityContent({ initialScheduleResult }: AvailabilityContentProps) {
  if (!initialScheduleResult.success) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <AvailabilityPageHeader />
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Your availability could not be loaded</AlertTitle>
          <AlertDescription>
            {initialScheduleResult.error ?? 'Refresh the page and try again.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!initialScheduleResult.data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <AvailabilityPageHeader />
        <Alert>
          <CalendarX2 aria-hidden="true" />
          <AlertTitle>Connect a default schedule first</AlertTitle>
          <AlertDescription>
            <p>Your connected calendar needs a default schedule before you can edit hours here.</p>
            <Link
              href="/settings/calendar"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Review calendar connection
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <AvailabilityManager initialAvailability={initialScheduleResult.data} />
}
