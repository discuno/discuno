import Link from 'next/link'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { getFullProfile } from '~/server/queries'

export const ViewProfileContent = async () => {
  const profile = await getFullProfile()

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find your profile. Please complete your profile setup.
          </p>
          <Button asChild>
            <Link href="/profile/edit">Complete Profile</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <AvatarIcon profilePic={profile.image ?? ''} />
            <div className="flex-1">
              <h2 className="mb-2 text-2xl font-bold">{profile.name}</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.school && <Badge variant="secondary">{profile.school}</Badge>}
                {profile.major && <Badge variant="secondary">{profile.major}</Badge>}
                <Badge variant="outline">Class of {profile.graduationYear}</Badge>
                <Badge variant="outline">{profile.schoolYear}</Badge>
              </div>
              {profile.bio && (
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium">Email</label>
              <p className="text-foreground">{profile.email}</p>
            </div>
            {profile.eduEmail && (
              <div>
                <label className="text-muted-foreground text-sm font-medium">
                  Educational Email
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-foreground">{profile.eduEmail}</p>
                  {profile.isEduVerified && (
                    <Badge variant="default" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium">School</label>
              <p className="text-foreground">{profile.school ?? 'Not specified'}</p>
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium">Major</label>
              <p className="text-foreground">{profile.major ?? 'Not specified'}</p>
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium">Academic Level</label>
              <p className="text-foreground">{profile.schoolYear}</p>
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium">Graduation Year</label>
              <p className="text-foreground">{profile.graduationYear}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild>
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
            {profile.isEduVerified ? (
              <Button asChild variant="outline">
                <Link href="/mentor/onboarding">Mentor Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/email-verification">Verify Email</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
