import { Calendar, Clock, Github, Settings, Zap } from 'lucide-react'
import { Suspense } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { AvailabilityShowcase } from './AvailabilityShowcase'
import { BookerShowcase } from './BookerShowcase'

function BookerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="bg-muted mb-4 h-8 w-1/3 rounded"></div>
        <div className="bg-muted mb-8 h-4 w-2/3 rounded"></div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-muted h-12 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AvailabilitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="bg-muted mb-4 h-6 w-1/4 rounded"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-muted h-32 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const ComponentsShowcaseContent = async () => {
  return (
    <>
      {/* Component Showcase */}
      <Tabs defaultValue="booker" className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-4">
          <TabsTrigger value="booker" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booker
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Event Types
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            OAuth
          </TabsTrigger>
        </TabsList>

        {/* Booker Component */}
        <TabsContent value="booker" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booker Component
              </CardTitle>
              <CardDescription>
                Complete booking flow with date/time selection, form handling, and confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalProviderWrapper>
                <Suspense fallback={<BookerSkeleton />}>
                  <BookerShowcase />
                </Suspense>
              </CalProviderWrapper>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="text-primary mx-auto mb-2 h-8 w-8" />
                <h3 className="font-semibold">Smart Scheduling</h3>
                <p className="text-muted-foreground text-sm">Real-time availability checking</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="text-primary mx-auto mb-2 h-8 w-8" />
                <h3 className="font-semibold">Zero Hydration</h3>
                <p className="text-muted-foreground text-sm">No SSR/client mismatches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Settings className="text-primary mx-auto mb-2 h-8 w-8" />
                <h3 className="font-semibold">Fully Customizable</h3>
                <p className="text-muted-foreground text-sm">Theming and branding support</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Availability Settings */}
        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Availability Settings
              </CardTitle>
              <CardDescription>
                Comprehensive availability management with time zones and recurring schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalProviderWrapper>
                <Suspense fallback={<AvailabilitySkeleton />}>
                  <AvailabilityShowcase />
                </Suspense>
              </CalProviderWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Types */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Event Type Management
              </CardTitle>
              <CardDescription>
                Create and manage different types of meetings and appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Settings className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                <h3 className="mb-2 text-lg font-semibold">Event Type Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Create custom event types with locations, forms, and booking rules
                </p>
                <Button variant="outline">Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OAuth Connections */}
        <TabsContent value="oauth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                OAuth Integrations
              </CardTitle>
              <CardDescription>
                Connect with Google Calendar, Outlook, Zoom, and other platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    name: 'Google Calendar',
                    icon: '📅',
                    status: 'Available',
                  },
                  { name: 'Outlook', icon: '📧', status: 'Available' },
                  { name: 'Zoom', icon: '📹', status: 'Available' },
                  { name: 'Slack', icon: '💬', status: 'Coming Soon' },
                ].map(integration => (
                  <Card key={integration.name}>
                    <CardContent className="p-4 text-center">
                      <div className="mb-2 text-2xl">{integration.icon}</div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <Badge
                        variant={integration.status === 'Available' ? 'default' : 'secondary'}
                        className="mt-2"
                      >
                        {integration.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Migration Guide */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Migration from @calcom/atoms</CardTitle>
          <CardDescription>
            Easy drop-in replacement with improved performance and developer experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-semibold text-red-600">Before (@calcom/atoms)</h4>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <div className="text-red-600">{'//'} Hydration mismatches</div>
                <div className="text-red-600">{'//'} SSR/client differences</div>
                <div>
                  import {'{'} Booker {'}'} from &apos;@calcom/atoms&apos;
                </div>
                <div>&lt;Booker username=&quot;john&quot; /&gt;</div>
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-green-600">After (@discuno/atoms)</h4>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <div className="text-green-600">{'//'} Zero hydration issues</div>
                <div className="text-green-600">{'//'} Perfect SSR compatibility</div>
                <div>
                  import {'{'} Booker {'}'} from &apos;@discuno/atoms&apos;
                </div>
                <div>&lt;Booker username=&quot;john&quot; /&gt;</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
