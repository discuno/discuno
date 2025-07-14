import { Suspense } from 'react'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { Button } from '~/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CalcomProvider } from '~/lib/providers/CalProvider'
import { EventTypeToggleSection } from './EventTypeToggleSection'

const LoadingSkeleton = () => (
  <div className="flex items-center justify-center py-16">
    <LoadingSpinner />
  </div>
)

export const SchedulingContent = () => {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-foreground mb-4 text-3xl font-bold">Scheduling & Availability</h1>
        <p className="text-muted-foreground text-lg">
          Manage your calendars, event types, and booking preferences
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences">Event Preferences</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 text-center">
              <h2 className="text-foreground mb-2 text-xl font-semibold">Event Type Preferences</h2>
              <p className="text-muted-foreground text-sm">
                Choose which event types you want to offer and set your pricing
              </p>
            </div>
            <CalcomProvider>
              <Suspense fallback={<LoadingSkeleton />}>
                <EventTypeToggleSection />
              </Suspense>
            </CalcomProvider>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 text-center">
              <h2 className="text-foreground mb-2 text-xl font-semibold">Set Your Availability</h2>
              <p className="text-muted-foreground text-sm">
                Define when you&apos;re available for bookings. These schedules will be used by your
                event types.
              </p>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Pro tip:</strong> Start here! Set your availability first, then create
                  event types that use these schedules.
                </p>
              </div>
            </div>
            <div className="p-8 text-center">
              <h4 className="mb-4 text-lg font-semibold">Cal.com Integration Required</h4>
              <p className="text-muted-foreground mb-4">
                To manage your availability schedule, please use the Cal.com dashboard.
              </p>
              <Button onClick={() => window.open('https://cal.com/availability', '_blank')}>
                Open Cal.com Availability Settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
