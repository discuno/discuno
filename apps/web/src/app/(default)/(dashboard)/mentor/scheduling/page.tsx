import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfile, getUserCalcomTokens } from '~/server/queries'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Calendar, Clock, Settings, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AvailabilityShowcase } from '~/app/(default)/(dashboard)/components-showcase/components/AvailabilityShowcase'

async function MentorSchedulingContent() {
  const { id } = await requireAuth()

  // Check if user is verified mentor
  const profile = await getProfile(id)
  if (!profile?.isEduVerified) {
    redirect('/email-verification')
  }

  // Check Cal.com integration status
  const calcomTokens = await getUserCalcomTokens(id)
  const hasCalcomIntegration = !!calcomTokens

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-4xl font-bold">Scheduling Center</h1>
            <p className="text-muted-foreground mt-2">Set your availability and create mentoring session types</p>
          </div>
          <div className="flex items-center gap-2">
            {hasCalcomIntegration ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Cal.com Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                <AlertCircle className="mr-1 h-3 w-3" />
                Setup Required
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Setup Alert */}
      {!hasCalcomIntegration && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Complete your Cal.com integration first to set your availability and create event types.</span>
            <Button asChild size="sm">
              <Link href="/mentor/onboarding">
                Complete Setup
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

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

        {/* Availability Tab */}
        <TabsContent value="availability" className="mt-6">
          {hasCalcomIntegration ? (
            <CalProviderWrapper>
              <Suspense fallback={<AvailabilitySettingsSkeleton />}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Set Your Availability
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      Configure when students can book mentoring sessions with you
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AvailabilityShowcase />
                  </CardContent>
                </Card>
              </Suspense>
            </CalProviderWrapper>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                <h3 className="mb-2 text-lg font-semibold">Cal.com Integration Required</h3>
                <p className="text-muted-foreground mx-auto mb-4 max-w-md">
                  Connect your Cal.com account first to manage your availability and allow students to book sessions.
                </p>
                <Button asChild>
                  <Link href="/mentor/onboarding">Complete Integration</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Event Types Tab */}
        <TabsContent value="events" className="mt-6">
          <div className="space-y-6">
            {/* Quick Event Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Mentoring Session Types
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Create different types of mentoring sessions with custom pricing and durations
                </p>
              </CardHeader>
              <CardContent>
                {hasCalcomIntegration ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Quick Start Templates */}
                    <div className="space-y-3">
                      <h4 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                        Quick Start Templates
                      </h4>
                      {[
                        {
                          title: 'College Q&A Session',
                          duration: '30 minutes',
                          price: '$25',
                          description: 'Answer questions about your college experience',
                          popular: true,
                        },
                        {
                          title: 'Major Deep Dive',
                          duration: '45 minutes',
                          price: '$35',
                          description: 'Discuss your academic program in detail',
                        },
                        {
                          title: 'Application Review',
                          duration: '60 minutes',
                          price: '$50',
                          description: 'Review essays, resumes, or application materials',
                        },
                      ].map((template, index) => (
                        <Card key={index} className="relative">
                          {template.popular && (
                            <Badge className="absolute -right-2 -top-2 bg-orange-100 text-xs text-orange-800">
                              Popular
                            </Badge>
                          )}
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-start justify-between">
                              <h5 className="font-semibold">{template.title}</h5>
                              <div className="text-right text-sm">
                                <div className="font-semibold text-green-600">{template.price}</div>
                                <div className="text-muted-foreground">{template.duration}</div>
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-3 text-sm">{template.description}</p>
                            <Button size="sm" variant="outline" className="w-full">
                              Create This Event Type
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Custom Event Type */}
                    <div className="space-y-3">
                      <h4 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                        Custom Event Type
                      </h4>
                      <Card className="border-2 border-dashed">
                        <CardContent className="p-6 text-center">
                          <Calendar className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                          <h5 className="mb-2 font-semibold">Create Custom Event</h5>
                          <p className="text-muted-foreground mb-4 text-sm">
                            Build a completely custom mentoring session type with your own pricing, duration, and
                            requirements.
                          </p>
                          <Button>
                            <Calendar className="mr-2 h-4 w-4" />
                            Create Custom Event
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                    <h3 className="mb-2 text-lg font-semibold">Event Types Coming Soon</h3>
                    <p className="text-muted-foreground mx-auto mb-4 max-w-md">
                      Complete your Cal.com integration to create different types of mentoring sessions.
                    </p>
                    <Button asChild>
                      <Link href="/mentor/onboarding">Complete Setup</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Strategy */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing Strategy</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Tips for setting competitive rates for your mentoring sessions
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                    <h5 className="mb-1 font-semibold text-blue-900 dark:text-blue-100">New Mentor</h5>
                    <div className="mb-1 text-2xl font-bold text-blue-600">$20-30</div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Start here to build reviews and experience
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
                    <h5 className="mb-1 font-semibold text-green-900 dark:text-green-100">Experienced</h5>
                    <div className="mb-1 text-2xl font-bold text-green-600">$35-45</div>
                    <p className="text-sm text-green-700 dark:text-green-300">After 10+ sessions with great reviews</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
                    <h5 className="mb-1 font-semibold text-purple-900 dark:text-purple-100">Expert</h5>
                    <div className="mb-1 text-2xl font-bold text-purple-600">$50+</div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Premium schools or specialized expertise
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            {/* Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Integration Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${hasCalcomIntegration ? 'bg-green-500' : 'bg-gray-300'}`}
                      />
                      <div>
                        <h5 className="font-semibold">Cal.com Integration</h5>
                        <p className="text-muted-foreground text-sm">Manage your scheduling and bookings</p>
                      </div>
                    </div>
                    <Badge variant={hasCalcomIntegration ? 'default' : 'outline'}>
                      {hasCalcomIntegration ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-gray-300" />
                      <div>
                        <h5 className="font-semibold">Stripe Payments</h5>
                        <p className="text-muted-foreground text-sm">Receive payments for your sessions</p>
                      </div>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <p className="text-muted-foreground text-sm">Control how and when you receive booking notifications</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">New Booking Notifications</h5>
                      <p className="text-muted-foreground text-sm">Get notified when students book sessions</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Reminder Notifications</h5>
                      <p className="text-muted-foreground text-sm">Reminders for upcoming sessions</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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

export default function MentorSchedulingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MentorSchedulingContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Mentor Scheduling | Discuno',
  description: 'Manage your availability and create mentoring session types',
}
