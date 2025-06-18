import { AvailabilitySettings } from '@discuno/atoms'
import { AlertCircle, Calendar, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getProfile, getUserCalcomTokens } from '~/server/queries'

export const AvailabilityContent = async () => {
  const [profile, calcomTokens] = await Promise.all([getProfile(), getUserCalcomTokens()])

  const isEduVerified = profile.profile?.isEduVerified

  if (!isEduVerified) {
    redirect('/email-verification')
  }

  const hasCalcomIntegration = !!calcomTokens

  if (!hasCalcomIntegration) {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Complete your Cal.com integration first to manage your availability settings.
            </span>
            <Button asChild size="sm">
              <Link href="/mentor/onboarding">Complete Setup</Link>
            </Button>
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-semibold">Cal.com Integration Required</h3>
            <p className="text-muted-foreground mx-auto mb-4 max-w-md">
              Connect your Cal.com account to manage when students can book sessions with you.
            </p>
            <Button asChild>
              <Link href="/mentor/onboarding">Complete Integration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Cal.com Connected!</span> You can now configure your
          availability settings.
        </AlertDescription>
      </Alert>

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Set Your Availability
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Configure when students can book mentoring sessions with you
          </p>
        </CardHeader>
        <CardContent>
          <CalProviderWrapper>
            <AvailabilitySettings
              onSave={availability => {
                console.log('Availability saved:', availability)
                // Handle successful save
              }}
              onError={error => {
                console.error('Availability save error:', error)
                // Handle error
              }}
            />
          </CalProviderWrapper>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild>
              <Link href="/mentor/scheduling">
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mentor/event-types">
                <Calendar className="mr-2 h-4 w-4" />
                Event Types
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mentor/onboarding">
                <Calendar className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
