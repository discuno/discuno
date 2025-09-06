'use client'

'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
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
  const limit = 12

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['posts', { schoolId, majorId, graduationYear }],
      queryFn: async ({ pageParam = undefined }) => {
        if (schoolId || majorId || graduationYear) {
          return fetchPostsByFilterAction(schoolId, majorId, graduationYear, limit, pageParam)
        }
        return fetchPostsAction(limit, pageParam)
      },
      initialPageParam: undefined as number | undefined,
      getNextPageParam: lastPage => lastPage.nextCursor,
    })

  const allPosts = data?.pages.flatMap(page => page.posts) ?? []

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
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary rounded-full px-8 py-3 transition-all duration-300 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            aria-label={isFetchingNextPage ? 'Loading more mentors...' : 'Load more mentors'}
          >
            {isFetchingNextPage ? (
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
            ) : (
              'Load More Mentors'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
