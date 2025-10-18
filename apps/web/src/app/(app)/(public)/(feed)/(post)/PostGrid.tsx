'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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

  // Static hero headlines - pick one randomly on client mount to avoid hydration mismatch
  const heroHeadlines = useMemo(
    () => [
      'Connect with students at your dream school',
      'Get advice from those who made it',
      'Find mentors who understand your journey',
      'Learn from real college students',
      'Discover your path to college success',
    ],
    []
  )

  const [selectedHeadline, setSelectedHeadline] = useState(heroHeadlines[0])

  // Set random headline on client mount only
  useEffect(() => {
    setSelectedHeadline(heroHeadlines[Math.floor(Math.random() * heroHeadlines.length)])
  }, [heroHeadlines])

  // Colleges for animated carousel
  const colleges = useMemo(
    () => [
      'UCLA',
      'Harvard',
      'Ohio State',
      'Stanford',
      'UF',
      'Columbia',
      'Michigan',
      'Yale',
      'Texas A&M',
      'NYU',
      'UC Berkeley',
      'Penn State',
      'Duke',
      'Wisconsin',
      'Princeton',
      'ASU',
      'Brown',
      'UT Austin',
      'Northwestern',
      'Georgia',
      'USC',
      'Cornell',
      'UIUC',
      'UNC',
      'Purdue',
      'BU',
      'MSU',
      'Cal',
      'UPenn',
      'UVA',
      'MIT',
      'UW',
    ],
    []
  )

  const [collegeIndex, setCollegeIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCollegeIndex(prev => (prev + 1) % colleges.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [colleges.length])

  const heroSection = (
    <div className="mb-12 text-center">
      <h1 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
        {selectedHeadline}
      </h1>
      <div className="text-muted-foreground mx-auto flex items-center justify-center gap-2 text-lg sm:text-xl">
        <span>Students from</span>
        <div className="relative inline-block h-8 w-32 overflow-hidden sm:w-40">
          <div
            className="absolute inset-0 transition-transform duration-500 ease-in-out"
            style={{ transform: `translateY(-${collegeIndex * 2}rem)` }}
          >
            {colleges.map(college => (
              <div
                key={college}
                className="text-primary flex h-8 items-center justify-center font-semibold"
              >
                {college}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="container mx-auto min-h-[calc(100vh-4rem)] px-4 py-8">
        {heroSection}
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
      {heroSection}
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
