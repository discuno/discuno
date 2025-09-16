'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { PostCard } from '~/app/(app)/(public)/(feed)/(post)/PostCard'
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from '~/app/(app)/(public)/(feed)/(post)/actions'
import type { Card } from '~/app/types'
import { AspectRatio } from '~/components/ui/aspect-ratio'
import { Skeleton } from '~/components/ui/skeleton'

// Define the PostGridProps interface
interface PostGridProps {
  schoolId: number | null
  majorId: number | null
  graduationYear: number | null
}

const PostGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <AspectRatio ratio={16 / 9}>
            <Skeleton className="h-full w-full rounded-lg" />
          </AspectRatio>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

const PostsDisplay = ({ posts }: { posts: Card[] }) => {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map((card, index) => (
        <PostCard key={`${card.id}-${index}`} card={card} index={index} />
      ))}
    </div>
  )
}

// PostGrid component
export const PostGrid = ({ schoolId, majorId, graduationYear }: PostGridProps) => {
  const { ref, inView } = useInView()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['posts', { schoolId, majorId, graduationYear }],
      queryFn: async ({ pageParam }: { pageParam?: string }) => {
        const limit = 12
        if (schoolId || majorId || graduationYear) {
          return fetchPostsByFilterAction(schoolId, majorId, graduationYear, limit, pageParam)
        }
        return fetchPostsAction(limit, pageParam)
      },
      initialPageParam: undefined,
      getNextPageParam: lastPage => lastPage.nextCursor,
    })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Deduplicate posts across pages to prevent duplicates from cursor pagination overlaps
  const allPosts = useMemo(() => {
    if (!data?.pages) return []

    const uniquePostsMap = new Map<number, Card>()
    for (const page of data.pages) {
      for (const post of page.posts) {
        uniquePostsMap.set(post.id, post)
      }
    }
    return Array.from(uniquePostsMap.values())
  }, [data?.pages])

  if (isLoading) {
    return (
      <div className="container mx-auto min-h-[calc(100vh-4rem)] px-4 py-8">
        <h1 className="text-foreground mb-8 text-center text-3xl font-bold">
          Find Your College Mentor
        </h1>
        <PostGridSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto min-h-[calc(100vh-4rem)] px-4 py-8 text-center text-red-500">
        Error loading posts. Please try again later.
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-[calc(100vh-4rem)] px-4 py-8">
      <h1 className="text-foreground mb-8 text-center text-3xl font-bold">
        Find Your College Mentor
      </h1>
      <PostsDisplay posts={allPosts} />
      <div ref={ref} />
      {isFetchingNextPage && (
        <div className="flex justify-center">
          <span className="flex items-center">
            <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </span>
        </div>
      )}
    </div>
  )
}
