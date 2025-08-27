import { CheckCircle, GraduationCap, User } from 'lucide-react'
import Link from 'next/link'
import { ProfileCard } from '~/app/(app)/(mentor)/profile/components/ProfileCard'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { getFullProfile } from '~/server/queries'

const ProfileInfoRow = ({ label, value }: { label: string; value: string | number | null }) => {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-4">
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <span className="text-foreground col-span-2">{value}</span>
    </div>
  )
}

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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Column */}
      <div className="space-y-8 lg:col-span-1">
        <Card className="text-center">
          <CardContent className="p-8">
            <Avatar className="mx-auto mb-4 h-32 w-32">
              <AvatarImage
                src={profile.image ?? undefined}
                alt={profile.name ?? 'Profile Picture'}
              />
              <AvatarFallback className="text-4xl">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">{profile.schoolYear}</Badge>
              <Badge variant="outline">Class of {profile.graduationYear}</Badge>
            </div>
            <Button asChild className="mt-6 w-full">
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
        <ProfileCard title="Mentor Status" icon={CheckCircle}>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="mr-1 h-3 w-3" />
              Verified Mentor
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            This user is a verified college student mentor.
          </p>
        </ProfileCard>
      </div>

      {/* Right Column */}
      <div className="space-y-8 lg:col-span-2">
        {profile.bio && (
          <ProfileCard title="Biography" icon={User}>
            <p className="text-foreground leading-relaxed">{profile.bio}</p>
          </ProfileCard>
        )}

        <ProfileCard title="Academic Information" icon={GraduationCap}>
          <div className="space-y-4">
            <ProfileInfoRow label="School" value={profile.school} />
            <ProfileInfoRow label="Major" value={profile.major} />
            <ProfileInfoRow label="Academic Level" value={profile.schoolYear} />
            <ProfileInfoRow label="Graduation Year" value={profile.graduationYear} />
          </div>
        </ProfileCard>
      </div>
    </div>
  )
}
