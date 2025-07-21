import { ArrowLeft, Calendar, Clock, Star, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookingEmbed } from '~/app/(app)/(public)/mentor/[username]/components/BookingEmbed'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { CalcomProvider } from '~/lib/providers/CalProvider'
import { getMentorCalcomTokensByUsername, getProfileByCalcomUsername } from '~/server/queries'

interface BookingContentProps {
  username: string
  eventType?: string
}

export const BookingContent = async ({ username, eventType }: BookingContentProps) => {
  // Get the mentor's profile by Cal.com username
  const mentorProfile = await getProfileByCalcomUsername(username)
  console.log(mentorProfile)

  if (!mentorProfile) {
    notFound()
  }

  // Get the mentor's Cal.com tokens for booking
  const mentorTokens = await getMentorCalcomTokensByUsername(username)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Mentor Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="mx-auto mb-4 h-24 w-24">
                <AvatarImage src={mentorProfile.image ?? ''} alt={mentorProfile.name ?? ''} />
                <AvatarFallback className="text-2xl">
                  {mentorProfile.name?.charAt(0) ?? 'M'}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{mentorProfile.name}</CardTitle>
              <div className="mt-2 flex justify-center gap-2">
                <Badge variant="secondary">{mentorProfile.school}</Badge>
                <Badge variant="outline">{mentorProfile.major}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mentorProfile.bio && (
                <div>
                  <h4 className="text-muted-foreground mb-2 text-sm font-medium">About</h4>
                  <p className="text-sm leading-relaxed">{mentorProfile.bio}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span>{mentorProfile.schoolYear}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>Class of {mentorProfile.graduationYear}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="text-muted-foreground h-4 w-4" />
                  <span>4.9 rating (42 reviews)</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/img/${mentorProfile.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    View Full Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Your Session
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Select a time that works for both of you
              </p>
            </CardHeader>
            <CardContent>
              {mentorTokens ? (
                <CalcomProvider>
                  <BookingEmbed username={mentorTokens.calcomUsername} />
                </CalcomProvider>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    This mentor hasn&apos;t set up their scheduling yet. Please check back later.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Types */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Available Session Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-semibold">College Q&A Session</h4>
                  <p className="text-muted-foreground mb-3 text-sm">
                    30-minute conversation about college life, academics, and campus culture
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-600">$25</span>
                    <Badge variant="secondary">30 min</Badge>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-semibold">Application Review</h4>
                  <p className="text-muted-foreground mb-3 text-sm">
                    60-minute session to review essays, resumes, or application materials
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-600">$50</span>
                    <Badge variant="secondary">60 min</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
