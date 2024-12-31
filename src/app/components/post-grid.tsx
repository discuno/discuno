"use client";
import { useState, useEffect } from "react";
import { PostCard } from "~/app/_components/post-card";
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from "../actions/post-actions";
import type { Card } from "~/app/types";

// Define the PostGridProps interface
interface PostGridProps {
  posts: Card[];
  schoolId: number | null;
  majorId: number | null;
  graduationYear: number | null;
}

// PostGrid component
export const PostGrid = ({
  posts,
  schoolId,
  majorId,
  graduationYear,
}: PostGridProps) => {
  // State to manage all posts
  const [allPosts, setAllPosts] = useState<Card[]>(posts);
  // State to manage loading status
  const [loading, setLoading] = useState<boolean>(false);
  // State to manage the offset for pagination
  const [offset, setOffset] = useState<number>(posts.length);
  // Limit for the number of posts to fetch at a time
  const limit = 12;

  // Effect to fetch posts when filter parameters change
  useEffect(() => {
    const fetchFilteredPosts = async () => {
      setLoading(true);
      const filteredPosts =
        schoolId || majorId || graduationYear
          ? await fetchPostsByFilterAction(
              schoolId,
              majorId,
              graduationYear,
              limit,
              0,
            )
          : await fetchPostsAction(limit, 0);
      setAllPosts(filteredPosts);
      setOffset(filteredPosts.length);
      setLoading(false);
    };

    fetchFilteredPosts();
  }, [schoolId, majorId, graduationYear]);

  // Function to load more posts
  const loadMorePosts = async () => {
    setLoading(true);
    const morePosts =
      schoolId || majorId || graduationYear
        ? await fetchPostsByFilterAction(
            schoolId,
            majorId,
            graduationYear,
            limit,
            offset,
          )
        : await fetchPostsAction(limit, offset);

    // Filter out any duplicate posts
    const uniqueMorePosts = morePosts.filter(
      (newPost) =>
        !allPosts.some((existingPost) => existingPost.id === newPost.id),
    );

    setAllPosts((prevPosts) => [...prevPosts, ...uniqueMorePosts]);
    setOffset((prevOffset) => prevOffset + limit);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold text-foreground">
        Find Your College Mentor
      </h1>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allPosts.map((card) => (
          <PostCard key={card.id} card={card} index={card.id ?? 0} />
        ))}
      </div>
      {allPosts.length > 0 && (
        <div className="mt-12 flex justify-center">
          <button
            className="rounded-full bg-primary px-8 py-3 text-primary-foreground transition-all duration-300 hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
            onClick={loadMorePosts}
            disabled={loading}
            aria-label={
              loading ? "Loading more mentors..." : "Load more mentors"
            }
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
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
              "Load More Mentors"
            )}
          </button>
        </div>
      )}
    </div>
  );
};
