import { CheckCircle, GraduationCap, User } from 'lucide-react'
import Link from 'next/link'
import { AvatarIcon } from '~/components/shared/UserAvatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { getFullProfile } from '~/server/queries'

export const ViewProfileContent = async () => {
  const profile = await getFullProfile()
  console.log(profile)

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

      {/* Main content grid */}
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.bio && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Biography</Label>
                <p className="text-foreground">{profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.school && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium">School</Label>
                <p className="text-foreground">{profile.school}</p>
              </div>
            )}

            {profile.major && (
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Major</Label>
                <p className="text-foreground">{profile.major}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Academic Level</Label>
                <p className="text-foreground">{profile.schoolYear}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Graduation Year</Label>
                <p className="text-foreground">{profile.graduationYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentor Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Mentor Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Verified Mentor
              </Badge>
              <span className="text-muted-foreground text-sm">Verified college student mentor</span>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
