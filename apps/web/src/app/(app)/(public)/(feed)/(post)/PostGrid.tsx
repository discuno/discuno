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
import { Spinner } from '~/components/ui/spinner'

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
      <div className="bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
        <RefreshCw className="text-muted-foreground h-7 w-7" />
        <h3 className="mt-4 text-lg font-semibold">We could not load mentors</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Check your connection and try once more.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (allPosts.length === 0) {
    return (
      <div className="bg-card flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
        <SearchX className="text-muted-foreground h-8 w-8" />
        <h3 className="mt-4 text-lg font-semibold">No exact matches yet</h3>
        <p className="text-muted-foreground mt-1 max-w-md text-sm leading-6">
          Try removing one filter. A mentor from a related major or school may still have the
          perspective you need.
        </p>
        <Button
          render={<Link href="/#mentors" />}
          nativeButton={false}
          variant="outline"
          className="mt-5"
        >
          Clear all filters
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {allPosts.map(card => (
          <PostCard key={card.id} card={card} />
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
