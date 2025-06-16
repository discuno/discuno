'use client'
import { Suspense, useEffect, useState } from 'react'
import { PostCard } from '~/app/(default)/(dashboard)/(post)/PostCard'
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from '~/app/(default)/(dashboard)/(post)/actions'
import type { Card } from '~/app/types'
import { Skeleton } from '~/components/ui/skeleton'

// Define the PostGridProps interface
interface PostGridProps {
  posts: Card[]
  schoolId: number | null
  majorId: number | null
  graduationYear: number | null
}

const PostGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

const FilteredPosts = ({ posts, loading }: { posts: Card[]; loading: boolean }) => {
  if (loading) return <PostGridSkeleton />

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {posts.map(card => (
        <PostCard key={card.id} card={card} index={card.id ?? 0} />
      ))}
    </div>
  )
}

// PostGrid component
export const PostGrid = ({ posts, schoolId, majorId, graduationYear }: PostGridProps) => {
  // State to manage all posts
  const [allPosts, setAllPosts] = useState<Card[]>(posts)
  // State to manage loading status
  const [loading, setLoading] = useState<boolean>(false)
  // State to manage the offset for pagination
  const [offset, setOffset] = useState<number>(posts.length)
  // Limit for the number of posts to fetch at a time
  const limit = 12

  useEffect(() => {
    // Effect to fetch posts when filter parameters change
    const fetchFilteredPosts = async () => {
      try {
        setLoading(true)
        const filteredPosts =
          schoolId || majorId || graduationYear
            ? await fetchPostsByFilterAction(schoolId, majorId, graduationYear, limit, 0)
            : await fetchPostsAction(limit, 0)
        setAllPosts(filteredPosts)
        setOffset(filteredPosts.length)
      } catch (error) {
        console.error('Error fetching filtered posts:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchFilteredPosts()
  }, [schoolId, majorId, graduationYear])

  // Function to load more posts
  const loadMorePosts = async () => {
    setLoading(true)
    const morePosts =
      schoolId || majorId || graduationYear
        ? await fetchPostsByFilterAction(schoolId, majorId, graduationYear, limit, offset)
        : await fetchPostsAction(limit, offset)

    // Filter out any duplicates
    const uniqueMorePosts = morePosts.filter(
      newPost => !allPosts.some(existingPost => existingPost.id === newPost.id)
    )

    setAllPosts(prevPosts => [...prevPosts, ...uniqueMorePosts])
    setOffset(prevOffset => prevOffset + limit)
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-foreground mb-8 text-center text-3xl font-bold">
        Find Your College Mentor
      </h1>
      <Suspense fallback={<PostGridSkeleton />}>
        <FilteredPosts posts={allPosts} loading={loading} />
      </Suspense>
      {allPosts.length > 0 && (
        <div className="mt-12 flex justify-center">
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary rounded-full px-8 py-3 transition-all duration-300 focus:ring-2 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
            onClick={loadMorePosts}
            disabled={loading}
            aria-label={loading ? 'Loading more mentors...' : 'Load more mentors'}
          >
            {loading ? (
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
