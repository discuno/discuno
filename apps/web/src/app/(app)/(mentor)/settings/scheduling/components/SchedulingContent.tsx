'use client'

import { useState } from 'react'
import type { getSchedule } from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn } from '~/lib/utils'
import { AvailabilityManager } from './availability/AvailabilityManager'
import { EventTypeToggleSection } from './EventTypeToggleSection'

interface SchedulingContentProps {
  initialScheduleResult: Awaited<ReturnType<typeof getSchedule>>
}

export function SchedulingContent({ initialScheduleResult }: SchedulingContentProps) {
  const [activeTab, setActiveTab] = useState('availability')

  if (!initialScheduleResult.success) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-destructive">
          Failed to load schedule: {initialScheduleResult.error ?? 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="availability">Availability</TabsTrigger>
        <TabsTrigger value="event-types">Event Types</TabsTrigger>
      </TabsList>

      <div className="relative">
        {/* Keep both components mounted, just hide/show them */}
        <div className={cn('outline-none', activeTab !== 'availability' && 'hidden')}>
          <AvailabilityManager initialAvailability={initialScheduleResult.data} />
        </div>

        <div className={cn('outline-none', activeTab !== 'event-types' && 'hidden')}>
          <EventTypeToggleSection />
        </div>
      </div>
    </Tabs>
  )
}
