import { Plus, Settings } from 'lucide-react'
import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { CreateEventTypeComponent, EventTypeSettingsComponent } from './EventTypeComponents'

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="animate-pulse">
        <div className="bg-muted mb-4 h-8 w-1/3 rounded"></div>
        <div className="bg-muted mb-8 h-4 w-2/3 rounded"></div>
        <div className="bg-card rounded-lg border p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const SchedulingContent = () => {
  // For demo purposes - in production you'd fetch this from your API or state
  const eventTypeId = 1

  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Event Type
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Event Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="mt-6">
        <CalProviderWrapper useCurrentUserTokens={true}>
          <Suspense fallback={<LoadingSkeleton />}>
            <CreateEventTypeComponent />
          </Suspense>
        </CalProviderWrapper>
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <CalProviderWrapper useCurrentUserTokens={true}>
          <Suspense fallback={<LoadingSkeleton />}>
            <EventTypeSettingsComponent eventTypeId={eventTypeId} />
          </Suspense>
        </CalProviderWrapper>
      </TabsContent>
    </Tabs>
  )
}
