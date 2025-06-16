import { redirect } from 'next/navigation'
import { AvailabilitySettingsComponent } from '~/app/(default)/availability/AvailabilitySettings'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireUserId } from '~/lib/auth/auth-utils'
import { getProfile } from '~/server/queries'

const AvailabilityPage = async () => {
  try {
    const id = await requireUserId()
    const userProfile = await getProfile(id)

    // Only verified mentors (.edu email verified) can access this page
    if (!userProfile?.isEduVerified) {
      redirect('/email-verification')
    }

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-foreground mb-2 text-3xl font-bold">Manage Your Availability</h1>
          <p className="text-muted-foreground">
            Set your available time slots for mentoring sessions. Students will only be able to book
            meetings during these times.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Availability Settings</span>
              <span className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
                Mentor Verified
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilitySettingsComponent />
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Error loading availability page:', error)
    redirect('/profile/view')
  }
}

export default AvailabilityPage
