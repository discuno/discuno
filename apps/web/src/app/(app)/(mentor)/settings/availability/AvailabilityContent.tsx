'use client'

import type { getSchedule } from '~/app/(app)/(mentor)/settings/actions'
import { AvailabilityManager } from '~/app/(app)/(mentor)/settings/availability/components/AvailabilityManager'

interface AvailabilityContentProps {
  initialScheduleResult: Awaited<ReturnType<typeof getSchedule>>
}

export function AvailabilityContent({ initialScheduleResult }: AvailabilityContentProps) {
  if (!initialScheduleResult.success) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-destructive">
          Failed to load schedule: {initialScheduleResult.error ?? 'Unknown error'}
        </p>
      </div>
    )
  }

  return <AvailabilityManager initialAvailability={initialScheduleResult.data} />
}
