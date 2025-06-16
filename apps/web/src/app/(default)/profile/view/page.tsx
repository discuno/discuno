import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireAuth } from '~/lib/auth/auth-utils'
import { getProfileWithImage } from '~/server/queries'

const ViewProfilePage = async () => {
  const { id } = await requireAuth()

  try {
    const userProfile = await getProfileWithImage(id)

    if (!userProfile?.isEduVerified) {
      redirect('/email-verification')
    }

    return (
      <>
        <div className="flex items-center gap-4">
          <div className="ring-primary/20 relative h-24 w-24 overflow-hidden rounded-full ring-4">
            <Image
              src={userProfile.user.image ?? '/images/placeholder.jpg'}
              alt="Profile picture"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-primary text-2xl font-bold">Your Mentor Profile</h1>
            <p className="text-md text-muted-foreground">
              View and manage your profile information
            </p>
          </div>
          <div className="w-24" />
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                Contact Information
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{userProfile.eduEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Academic Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium">School Year</p>
                <p className="text-sm font-semibold">{userProfile.schoolYear}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Graduation</p>
                <p className="text-sm font-semibold">{userProfile.graduationYear}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Biography</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{userProfile.bio}</p>
            </CardContent>
          </Card>
        </div>

        <Button asChild className="w-full">
          <Link href="/profile/edit">Edit Profile</Link>
        </Button>
      </>
    )
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    console.error('Error fetching profile:', error)
    return (
      <div className="bg-destructive/10 text-destructive rounded-lg p-4">
        An error occurred while loading your profile. Please try again later.
      </div>
    )
  }
}

export default ViewProfilePage
