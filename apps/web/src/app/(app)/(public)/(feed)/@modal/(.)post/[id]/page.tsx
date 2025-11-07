'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, GraduationCap, School, User } from 'lucide-react'
import React from 'react'
import {
  fetchPostByIdAction,
  fetchProfileByUserIdAction,
} from '~/app/(app)/(public)/(feed)/(post)/actions'
import { Modal } from '~/app/(app)/(public)/(feed)/@modal/(.)post/[id]/modal'
import { ViewFullProfileButton } from '~/app/(app)/(public)/(feed)/@modal/(.)post/[id]/ViewFullProfileButton'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingInterface'
import { BookingModal } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import type { Card } from '~/app/types'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'

const PostModalContent = ({ postId }: { postId: number }) => {
  const queryClient = useQueryClient()

  // Fetch post data - check infinite query cache first for instant loading
  const { data: post, isLoading: isPostLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => await fetchPostByIdAction(postId),
    initialData: () => {
      // Search through all posts infinite queries to find this post
      const queries = queryClient.getQueriesData<{
        pages: Array<{ posts: Card[]; nextCursor?: string }>
      }>({ queryKey: ['posts'] })

      for (const [, data] of queries) {
        if (!data?.pages) continue

        for (const page of data.pages) {
          const post = page.posts.find(p => p.id === postId)
          if (post) return post
        }
      }
      return undefined
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch profile data separately for booking functionality
  const { data: profile } = useQuery({
    queryKey: ['profile', post?.createdById],
    queryFn: async () => {
      if (!post?.createdById) return null
      return await fetchProfileByUserIdAction(post.createdById)
    },
    enabled: !!post?.createdById,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Show skeleton while loading
  if (isPostLoading || !post) {
    return <PostModalSkeleton />
  }

  // Prepare booking data if profile is available
  const bookingData: BookingData | null =
    profile && post.createdById
      ? {
          userId: post.createdById,
          calcomUsername: profile.calcomUsername ?? 'fake-username',
          name: post.name ?? 'Mentor',
          image: post.userImage ?? '',
          bio: post.description ?? '',
          school: post.school ?? '',
          major: post.major ?? '',
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
      <ViewFullProfileButton postId={post.id} className="min-w-0 flex-1" />
    </div>
  )

  return (
    <Modal footer={footer}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Header - Fixed at top */}
        <div className="shrink-0 px-6 pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="border-border ring-background h-16 w-16 shrink-0 border-2 shadow-lg ring-2">
              <AvatarImage src={post.userImage ?? ''} alt={post.name ?? ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {post.name?.charAt(0) ?? 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl leading-tight font-bold text-balance sm:text-2xl">
                {post.name ?? 'Student Name'}
              </h1>
              {post.schoolYear && (
                <Badge variant="secondary" className="mt-2">
                  {post.schoolYear}
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
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <School className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">University</p>
                  <p className="text-foreground truncate font-semibold">{post.school}</p>
                </div>
              </div>

              <div className="bg-muted/50 hover:bg-muted/70 flex items-center gap-3 rounded-lg p-4 transition-colors">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Major</p>
                  <p className="text-foreground truncate font-semibold">{post.major}</p>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {post.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-foreground font-semibold">About</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{post.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Info - Pinned to bottom above footer */}
        <div className="border-border bg-muted/30 shrink-0 border-t px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Class of {post.graduationYear}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                Joined{' '}
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const PostModalSkeleton = () => {
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

const PostModal = ({ params }: { params: Promise<{ id: string }> }) => {
  const unwrappedParams = React.use(params)
  const postId = Number(unwrappedParams.id)

  if (Number.isNaN(postId)) {
    throw new Error('Invalid post ID')
  }

  return <PostModalContent postId={postId} />
}

export default PostModal
