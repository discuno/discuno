import { EventTypeSettings } from '@discuno/atoms'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Plus,
  Settings,
  Users,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireAuth } from '~/lib/auth/auth-utils'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getProfile, getUserCalcomTokens } from '~/server/queries'

async function MentorEventTypesContent() {
  const { id } = await requireAuth()

  // Check if user is verified mentor
  const profile = await getProfile(id)
  if (!profile?.isEduVerified) {
    redirect('/email-verification')
  }

  // Check Cal.com integration status
  const calcomTokens = await getUserCalcomTokens(id)
  const hasCalcomIntegration = !!calcomTokens

  // Mock existing event types (in real app, fetch from Cal.com API)
  const existingEventTypes = hasCalcomIntegration
    ? [
        {
          id: 1,
          title: 'College Q&A Session',
          duration: 30,
          price: 25,
          bookings: 12,
          active: true,
          slug: 'college-qa',
        },
        {
          id: 2,
          title: 'Application Review',
          duration: 60,
          price: 50,
          bookings: 5,
          active: true,
          slug: 'application-review',
        },
      ]
    : []

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-4xl font-bold">Event Types</h1>
            <p className="text-muted-foreground mt-2">Create and manage different types of mentoring sessions</p>
          </div>
          <div className="flex items-center gap-3">
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
            {hasCalcomIntegration && (
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Event Type
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Setup Alert */}
      {!hasCalcomIntegration && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Complete your Cal.com integration first to create and manage event types.</span>
            <Button asChild size="sm">
              <Link href="/mentor/onboarding">
                Complete Setup
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasCalcomIntegration ? (
        <div className="space-y-6">
          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Quick Start Templates
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Get started quickly with these popular mentoring session types
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: <MessageSquare className="h-6 w-6" />,
                    title: 'College Q&A Session',
                    duration: '30 minutes',
                    price: '$25',
                    description: 'Answer questions about your college experience, campus life, and academics',
                    popular: true,
                    color: 'blue',
                  },
                  {
                    icon: <FileText className="h-6 w-6" />,
                    title: 'Application Review',
                    duration: '60 minutes',
                    price: '$50',
                    description: 'Review and provide feedback on essays, resumes, or application materials',
                    popular: false,
                    color: 'purple',
                  },
                  {
                    icon: <Video className="h-6 w-6" />,
                    title: 'Major Deep Dive',
                    duration: '45 minutes',
                    price: '$35',
                    description: 'Detailed discussion about your academic program and course experiences',
                    popular: false,
                    color: 'green',
                  },
                ].map((template, index) => (
                  <Card key={index} className="relative border-dashed transition-all hover:border-solid">
                    {template.popular && (
                      <Badge className="absolute -right-2 -top-2 bg-orange-100 text-xs text-orange-800">
                        Most Popular
                      </Badge>
                    )}
                    <CardContent className="p-6 text-center">
                      <div
                        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                          template.color === 'blue'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                            : template.color === 'purple'
                              ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {template.icon}
                      </div>
                      <h3 className="mb-2 font-semibold">{template.title}</h3>
                      <div className="text-muted-foreground mb-3 flex items-center justify-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        {template.duration}
                        <span>•</span>
                        <DollarSign className="h-4 w-4" />
                        {template.price}
                      </div>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{template.description}</p>
                      <Button variant="outline" className="w-full">
                        Use This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Existing Event Types */}
          {existingEventTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Your Event Types
                </CardTitle>
                <p className="text-muted-foreground text-sm">Manage your existing mentoring session types</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {existingEventTypes.map(eventType => (
                    <div key={eventType.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                          <Calendar className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{eventType.title}</h4>
                          <div className="text-muted-foreground flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {eventType.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />${eventType.price}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {eventType.bookings} bookings
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={eventType.active ? 'default' : 'secondary'}>
                          {eventType.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Type Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Custom Event Type
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Build a completely custom mentoring session with your own settings
              </p>
            </CardHeader>
            <CardContent>
              <CalProviderWrapper>
                <Suspense fallback={<EventTypeSettingsSkeleton />}>
                  <EventTypeSettings
                    onSave={eventType => {
                      console.log('Event type created:', eventType)
                      // Handle successful creation
                    }}
                    onError={error => {
                      console.error('Event type creation error:', error)
                      // Handle error
                    }}
                  />
                </Suspense>
              </CalProviderWrapper>
            </CardContent>
          </Card>

          {/* Pricing Strategy Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Strategy Guide</CardTitle>
              <p className="text-muted-foreground text-sm">
                Tips for setting competitive rates for different types of sessions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                  <h5 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">Q&A Sessions</h5>
                  <div className="mb-1 text-2xl font-bold text-blue-600">$20-35</div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    30-45 minute conversations about college life
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
                  <h5 className="mb-2 font-semibold text-green-900 dark:text-green-100">Application Reviews</h5>
                  <div className="mb-1 text-2xl font-bold text-green-600">$40-70</div>
                  <p className="text-sm text-green-700 dark:text-green-300">Essay feedback and application guidance</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
                  <h5 className="mb-2 font-semibold text-purple-900 dark:text-purple-100">Academic Consulting</h5>
                  <div className="mb-1 text-2xl font-bold text-purple-600">$50-80</div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Course selection and major planning</p>
                </div>
                <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-950/30">
                  <h5 className="mb-2 font-semibold text-orange-900 dark:text-orange-100">Specialized Topics</h5>
                  <div className="mb-1 text-2xl font-bold text-orange-600">$60+</div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Pre-med, engineering, or other specialized advice
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-semibold">Cal.com Integration Required</h3>
            <p className="text-muted-foreground mx-auto mb-4 max-w-md">
              Connect your Cal.com account first to create and manage different types of mentoring sessions.
            </p>
            <Button asChild>
              <Link href="/mentor/onboarding">Complete Integration</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EventTypeSettingsSkeleton() {
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

export default function MentorEventTypesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MentorEventTypesContent />
    </Suspense>
  )
}

export const metadata = {
  title: 'Event Types | Mentor Dashboard | Discuno',
  description: 'Create and manage different types of mentoring sessions',
}
