import { getSchedule } from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { AvailabilityManager } from './availability/AvailabilityManager'
import { EventTypeToggleSection } from './EventTypeToggleSection'

export async function SchedulingContent() {
  const scheduleResult = await getSchedule()

  if (!scheduleResult.success) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-destructive">
          Failed to load schedule: {scheduleResult.error ?? 'Unknown error'}
        </p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="availability" className="space-y-4">
      <TabsList>
        <TabsTrigger value="availability">Availability</TabsTrigger>
        <TabsTrigger value="event-types">Event Types</TabsTrigger>
      </TabsList>

      <TabsContent value="availability">
        <AvailabilityManager initialAvailability={scheduleResult.data} />
      </TabsContent>

      <TabsContent value="event-types">
        <EventTypeToggleSection />
      </TabsContent>
    </Tabs>
  )
}
