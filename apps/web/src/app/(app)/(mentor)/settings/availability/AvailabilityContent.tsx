'use client'

import { CalendarX2, CircleAlert } from 'lucide-react'
import Link from 'next/link'
import type { getSchedule } from '~/app/(app)/(mentor)/settings/actions'
import { AvailabilityManager } from '~/app/(app)/(mentor)/settings/availability/components/AvailabilityManager'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'

interface AvailabilityContentProps {
  initialScheduleResult: Awaited<ReturnType<typeof getSchedule>>
}

export function AvailabilityContent({ initialScheduleResult }: AvailabilityContentProps) {
  if (!initialScheduleResult.success) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Your availability could not be loaded</AlertTitle>
        <AlertDescription>
          {initialScheduleResult.error ?? 'Refresh the page and try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!initialScheduleResult.data) {
    return (
      <Alert>
        <CalendarX2 />
        <AlertTitle>No availability schedule was found</AlertTitle>
        <AlertDescription>
          <p>
            Review your calendar connection and make sure the connected account has a default
            schedule before editing hours here.
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/settings/calendar" />}
          >
            Review calendar connection
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <AvailabilityManager initialAvailability={initialScheduleResult.data} />
}
