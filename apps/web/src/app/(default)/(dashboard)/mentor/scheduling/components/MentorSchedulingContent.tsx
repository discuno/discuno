import { AlertCircle, ArrowRight, Calendar, CheckCircle, Clock, Settings } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AvailabilityShowcase } from '~/app/(default)/(dashboard)/components-showcase/components/AvailabilityShowcase'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getProfile, getUserCalcomTokens } from '~/server/queries'

const AvailabilitySettingsSkeleton = () => {
  return (
    <div className="space-y-6">
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

export const MentorSchedulingContent = async () => {
  // Check if user is verified mentor
  const [profile, calcomTokens] = await Promise.all([getProfile(), getUserCalcomTokens()])
  if (!profile.profile?.isEduVerified) {
    redirect('/email-verification')
  }

  return (
    <>
      {/* Status indicator in header */}
      <div className="mb-6 flex items-center justify-end">
        {calcomTokens ? (
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

      {/* Setup Alert */}
      {!calcomTokens && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Complete your Cal.com integration first to set your availability and create event
              types.
            </span>
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
          {calcomTokens ? (
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
                  Connect your Cal.com account first to manage your availability and allow students
                  to book sessions.
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
                {calcomTokens ? (
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
                            <p className="text-muted-foreground mb-3 text-sm">
                              {template.description}
                            </p>
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
                        <CardContent className="p-8 text-center">
                          <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                          <h5 className="mb-2 font-semibold">Create Custom Event Type</h5>
                          <p className="text-muted-foreground mb-4 text-sm">
                            Build a completely custom session with your own duration, pricing, and
                            settings
                          </p>
                          <Button asChild>
                            <Link href="/mentor/event-types">Create Custom Type</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                    <h3 className="mb-2 text-lg font-semibold">Cal.com Integration Required</h3>
                    <p className="text-muted-foreground mx-auto mb-4 max-w-md">
                      Connect your Cal.com account to create and manage event types for your
                      mentoring sessions.
                    </p>
                    <Button asChild>
                      <Link href="/mentor/onboarding">Complete Integration</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Scheduling Preferences
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Configure your general scheduling and notification settings
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 font-semibold">Time Zone</h4>
                    <p className="text-muted-foreground mb-4 text-sm">
                      All your availability will be shown in this time zone
                    </p>
                    <div className="text-sm">Current: Eastern Time (ET)</div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 font-semibold">Booking Buffer</h4>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Minimum time between bookings to prepare for sessions
                    </p>
                    <div className="text-sm">Current: 15 minutes</div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 font-semibold">Advance Notice</h4>
                    <p className="text-muted-foreground mb-4 text-sm">
                      How far in advance students must book sessions
                    </p>
                    <div className="text-sm">Current: 24 hours</div>
                  </div>

                  <Button variant="outline">Manage Settings in Cal.com</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
