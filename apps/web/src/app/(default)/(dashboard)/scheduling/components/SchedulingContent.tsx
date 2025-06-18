import { Calendar, Clock, Settings } from 'lucide-react'
import { Suspense } from 'react'
import { AvailabilitySettingsComponent } from '~/app/(default)/availability/AvailabilitySettings'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'

function AvailabilitySettingsSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="animate-pulse">
        <div className="bg-muted mb-4 h-8 w-1/3 rounded"></div>
        <div className="bg-muted mb-8 h-4 w-2/3 rounded"></div>
        <div className="bg-card rounded-lg border p-6">
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const SchedulingContent = async () => {
  return (
    <Tabs defaultValue="availability" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="availability" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Availability
        </TabsTrigger>
        <TabsTrigger value="events" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Event Types
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="availability" className="mt-6">
        <CalProviderWrapper>
          <Suspense fallback={<AvailabilitySettingsSkeleton />}>
            <AvailabilitySettingsComponent />
          </Suspense>
        </CalProviderWrapper>
      </TabsContent>

      <TabsContent value="events" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Event type management coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              OAuth connections and integration settings coming soon...
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
