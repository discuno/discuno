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
import { Button } from '~/components/ui/button'
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
}

export const PostGrid = ({ schoolId, majorId, graduationYear, initialPage }: PostGridProps) => {
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
      <Empty className="paper-panel rounded-xl">
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
      <Empty className="paper-panel rounded-xl">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No exact matches yet</EmptyTitle>
          <EmptyDescription>
            Try removing one filter. A mentor from a related major or school may still have the
            perspective you need.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/#mentors" />} nativeButton={false} variant="outline">
            Clear all filters
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const layout = allPosts.length === 1 ? 'featured' : allPosts.length === 2 ? 'pair' : 'grid'

  return (
    <>
      <div
        data-mentor-layout={layout}
        className={cn(
          'grid grid-cols-1 gap-5',
          layout === 'featured' && 'max-w-4xl',
          layout === 'pair' && 'max-w-5xl sm:grid-cols-2',
          layout === 'grid' && 'sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {allPosts.map(card => (
          <PostCard key={card.id} card={card} featured={layout === 'featured'} />
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
            {isFetchingNextPage ? <Spinner /> : null}
            {isFetchingNextPage ? 'Loading mentors…' : 'Show more mentors'}
          </Button>
        </div>
      )}
    </>
  )
}
