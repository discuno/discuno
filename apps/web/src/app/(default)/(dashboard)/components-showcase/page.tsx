import { Calendar, Clock, Github, Settings, Sparkles, Zap } from 'lucide-react'
import { Suspense } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { requireAuth } from '~/lib/auth/auth-utils'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { AvailabilityShowcase } from './components/AvailabilityShowcase'
import { BookerShowcase } from './components/BookerShowcase'

async function ComponentsShowcaseContent() {
  await requireAuth()

  return (
    <div className="from-background via-background to-accent/5 min-h-screen bg-gradient-to-br">
      <div className="container mx-auto max-w-7xl p-6">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-8 w-8" />
            <h1 className="from-primary to-accent bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
              @discuno/atoms
            </h1>
          </div>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
            A modern, hydration-safe replacement for @calcom/atoms. Built with Next.js 15,
            TypeScript, and zero hydration issues.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="mr-1 h-3 w-3" />
              Zero Hydration Issues
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              TypeScript First
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              React Query
            </Badge>
          </div>
        </div>

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
              Easy migration path with improved performance and developer experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-destructive mb-3 font-semibold">Before (@calcom/atoms)</h3>
                <pre className="bg-muted overflow-x-auto rounded p-4 text-sm">
                  {`import { CalProvider, Booker } from "@calcom/atoms"
import "@calcom/atoms/globals.min.css"

<CalProvider
  accessToken={token}
  clientId={clientId}
  options={{ apiUrl: "..." }}
>
  <Booker
    username="user"
    eventSlug="30min"
    onCreateBookingSuccess={...}
  />
</CalProvider>`}
                </pre>
              </div>
              <div>
                <h3 className="text-primary mb-3 font-semibold">After (@discuno/atoms)</h3>
                <pre className="bg-muted overflow-x-auto rounded p-4 text-sm">
                  {`import { CalProvider, Booker } from "@discuno/atoms"
import "@discuno/atoms/globals.css"

<CalProvider
  config={{
    apiUrl: "...",
    accessToken: token,
    webAppUrl: "https://cal.com"
  }}
>
  <Booker
    username="user"
    eventTypeSlug="30min"
    onBookingComplete={...}
  />
</CalProvider>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BookerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-muted h-8 w-1/3 rounded"></div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="bg-muted h-10 rounded"></div>
        ))}
      </div>
    </div>
  )
}

function AvailabilitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="bg-muted h-16 rounded"></div>
      ))}
    </div>
  )
}

export default function ComponentsShowcasePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComponentsShowcaseContent />
    </Suspense>
  )
}

export const metadata = {
  title: '@discuno/atoms Components Showcase | Discuno',
  description: 'Explore the complete @discuno/atoms component library for Cal.com integration',
}
