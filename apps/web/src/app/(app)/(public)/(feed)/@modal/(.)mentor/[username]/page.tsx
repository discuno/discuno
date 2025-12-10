'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, GraduationCap, School, User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { fetchProfileByUsernameAction } from '~/app/(app)/(public)/(feed)/(post)/actions'
import { Modal } from '~/app/(app)/(public)/(feed)/@modal/(.)mentor/[username]/modal'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

const MentorModalContent = ({ username }: { username: string }) => {
  // Fetch profile data by username
  const { data: profile, isLoading } = useQuery({
    queryKey: ['mentor-profile', username],
    queryFn: async () => await fetchProfileByUsernameAction(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Show skeleton while loading
  if (isLoading || !profile) {
    return <MentorModalSkeleton />
  }

  // Prepare booking data if profile has Cal.com integration
  const bookingData: BookingData | null = profile.calcomUsername
    ? {
        userId: profile.userId,
        calcomUsername: profile.calcomUsername,
        name: profile.name ?? 'Mentor',
        image: profile.image ?? '',
        bio: profile.bio ?? '',
        school: profile.school ?? '',
        major: profile.major ?? '',
      }
    : null

  const footer = (
    <div className="flex flex-row gap-2">
      {bookingData ? (
        <BookingModal bookingData={bookingData} className="min-w-0 flex-1">
          <Calendar className="mr-2 h-4 w-4" />
          <span className="inline sm:hidden">Book</span>
          <span className="hidden sm:inline">Schedule Meeting</span>
        </BookingModal>
      ) : (
        <Skeleton className="h-10 min-w-0 flex-1" />
      )}
      <Button asChild variant="outline" className="min-w-0 flex-1">
        <Link href={`/mentor/${username}`}>View Full Profile</Link>
      </Button>
    </div>
  )

  return (
    <Modal footer={footer}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Header - Fixed at top */}
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="border-border ring-background h-16 w-16 shrink-0 border-2 shadow-lg ring-2">
              <AvatarImage src={profile.image ?? ''} alt={profile.name ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {profile.name?.charAt(0) ?? 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-foreground text-balance text-xl font-bold leading-tight sm:text-2xl">
                {profile.name ?? 'Mentor'}
              </h1>
              {profile.schoolYear && (
                <Badge variant="secondary" className="mt-2">
                  {profile.schoolYear}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {/* Academic Info */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <School className="text-primary h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium">School</p>
                  <p className="text-foreground truncate text-sm font-semibold">
                    {profile.school}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <GraduationCap className="text-primary h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium">Major</p>
                  <p className="text-foreground truncate text-sm font-semibold">{profile.major}</p>
                </div>
              </div>

              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <Clock className="text-primary h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium">Graduation Year</p>
                  <p className="text-foreground text-sm font-semibold">{profile.graduationYear}</p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  About
                </p>
                <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

const MentorModalSkeleton = () => {
  return (
    <Modal>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-6 py-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </Modal>
  )
}

const MentorModal = ({ params }: { params: Promise<{ username: string }> }) => {
  const unwrappedParams = React.use(params)
  const { username } = unwrappedParams

  return <MentorModalContent username={username} />
}

export default MentorModal
