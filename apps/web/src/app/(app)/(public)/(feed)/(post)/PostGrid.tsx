'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { RefreshCw, SearchX } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { PostCard } from '~/app/(app)/(public)/(feed)/(post)/PostCard'
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from '~/app/(app)/(public)/(feed)/(post)/actions'
import type { Card } from '~/app/types'
import { Button, buttonVariants } from '~/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { Spinner } from '~/components/ui/spinner'
import { cn } from '~/lib/utils'

const MENTOR_PAGE_SIZE = 6

export interface PostsPage {
  posts: Card[]
  nextCursor?: string
  hasMore: boolean
}

interface PostGridProps {
  schoolId: number | null
  majorId: number | null
  graduationYear: number | null
  initialPage: PostsPage
  discoveryReturnHref?: string
}

export const PostGrid = ({
  schoolId,
  majorId,
  graduationYear,
  initialPage,
  discoveryReturnHref,
}: PostGridProps) => {
  const hasFilters = schoolId !== null || majorId !== null || graduationYear !== null
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, refetch } =
    useInfiniteQuery({
      queryKey: ['posts', { schoolId, majorId, graduationYear }],
      queryFn: async ({ pageParam }: { pageParam?: string }) => {
        const limit = MENTOR_PAGE_SIZE
        if (hasFilters) {
          return fetchPostsByFilterAction(schoolId, majorId, graduationYear, limit, pageParam)
        }
        return fetchPostsAction(limit, pageParam)
      },
      initialPageParam: undefined,
      initialData: {
        pages: [initialPage],
        pageParams: [undefined],
      },
      staleTime: 60_000,
      getNextPageParam: lastPage => lastPage.nextCursor,
    })

  const allPosts = useMemo(() => {
    const uniquePosts = new Map<number, Card>()
    for (const page of data.pages) {
      for (const post of page.posts) uniquePosts.set(post.id, post)
    }
    return Array.from(uniquePosts.values())
  }, [data])

  if (isError) {
    return (
      <Empty className="border-y" role="alert">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RefreshCw />
          </EmptyMedia>
          <EmptyTitle>We could not load mentors</EmptyTitle>
          <EmptyDescription>Check your connection and try once more.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (allPosts.length === 0) {
    return (
      <Empty className="border-y" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters ? 'No exact matches yet' : 'Mentor profiles are being prepared'}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? 'Remove one filter. Someone from a related school or field may still have useful firsthand context.'
              : 'Use the guides to sharpen your question while students finish publishing their profiles.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={hasFilters ? '/find#mentors' : '/blog'}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {hasFilters ? 'Clear all filters' : 'Read college guides'}
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {allPosts.length} mentor {allPosts.length === 1 ? 'profile' : 'profiles'} shown.
      </p>
      <div
        role="list"
        aria-label="Student mentors"
        data-mentor-layout="list"
        data-mentor-count={allPosts.length}
        className="divide-border divide-y border-y"
      >
        {allPosts.map(card => (
          <PostCard key={card.id} card={card} discoveryReturnHref={discoveryReturnHref} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Spinner data-icon="inline-start" />}
            {isFetchingNextPage ? 'Loading mentors' : 'Show more mentors'}
          </Button>
        </div>
      )}
    </>
  )
}
