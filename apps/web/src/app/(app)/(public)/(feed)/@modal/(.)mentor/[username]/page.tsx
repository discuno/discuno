'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, GraduationCap, School, User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { fetchProfileByUsernameAction } from '~/app/(app)/(public)/(feed)/(post)/actions'
import { Modal } from '~/app/(app)/(public)/(feed)/@modal/(.)mentor/[username]/modal'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import type { Card } from '~/app/types'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

const MentorModalContent = ({ username }: { username: string }) => {
  const queryClient = useQueryClient()

  // Check if we have cached post data for this username (for instant loading)
  const getCachedPostByUsername = (): Card | undefined => {
    const queries = queryClient.getQueriesData<{
      pages: Array<{ posts: Card[]; nextCursor?: string }>
    }>({ queryKey: ['posts'] })

    for (const [, data] of queries) {
      if (!data?.pages) continue

      for (const page of data.pages) {
        const post = page.posts.find(p => p.username === username)
        if (post) return post
      }
    }
    return undefined
  }

  const cachedPost = getCachedPostByUsername()

  // Fetch profile data - use cached post data if available for instant display
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['mentor-profile', username],
    queryFn: async () => await fetchProfileByUsernameAction(username),
    initialData: cachedPost
      ? {
          userId: cachedPost.createdById,
          userProfileId: 0,
          email: null,
          emailVerified: false,
          bio: cachedPost.description,
          schoolYear: cachedPost.schoolYear as
            | 'Freshman'
            | 'Sophomore'
            | 'Junior'
            | 'Senior'
            | 'Graduate',
          graduationYear: cachedPost.graduationYear ?? new Date().getFullYear(),
          image: cachedPost.userImage ?? null,
          name: cachedPost.name,
          school: cachedPost.school ?? null,
          major: cachedPost.major ?? null,
          calcomUserId: null,
          calcomUsername: cachedPost.calcomUsername, // Now available from posts query!
          accessToken: null,
          refreshToken: null,
        }
      : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Show skeleton only if we have no cached data AND no fetched profile
  if (!cachedPost && (isProfileLoading || !profile)) {
    return <MentorModalSkeleton />
  }

  // Use profile data (which includes initialData from cache)
  const displayData = profile

  if (!displayData) {
    throw new Error('Mentor profile not found')
  }

  // Prepare booking data if calcom is available
  const bookingData: BookingData | null = displayData.calcomUsername
    ? {
        userId: displayData.userId,
        username,
        calcomUsername: displayData.calcomUsername,
        name: displayData.name ?? 'Mentor',
        image: displayData.image ?? '',
        bio: displayData.bio ?? '',
        school: displayData.school ?? '',
        major: displayData.major ?? '',
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
              <AvatarImage src={displayData.image ?? ''} alt={displayData.name ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {displayData.name?.charAt(0) ?? 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl leading-tight font-bold text-balance sm:text-2xl">
                {displayData.name ?? 'Mentor'}
              </h1>

              <Badge variant="secondary" className="mt-2">
                {displayData.schoolYear}
              </Badge>
            </div>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {/* Academic Info */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">University</p>
                  <p className="text-foreground truncate font-semibold">{displayData.school}</p>
                </div>
              </div>

              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Major</p>
                  <p className="text-foreground truncate font-semibold">{displayData.major}</p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {displayData.bio && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-foreground font-semibold">About</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{displayData.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Info - Pinned to bottom above footer */}
        {displayData.graduationYear && (
          <div className="border-border bg-muted/30 shrink-0 border-t px-6 py-4">
            <div className="flex items-center justify-center text-sm">
              <div className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Class of {displayData.graduationYear}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

const MentorModalSkeleton = () => {
  return (
    <Modal footer={<Skeleton className="h-10 w-full" />}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
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
