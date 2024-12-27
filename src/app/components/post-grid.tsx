"use client";
import { useState, useEffect } from "react";
/* eslint-disable react/react-in-jsx-scope */
import { PostCard } from "~/app/_components/post-card";
import { fetchPostsAction, fetchPostsByFilterAction } from "../actions";
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
    <div className="container mx-auto p-4">
      <h1 className="mb-8 pt-2 text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allPosts.map((card) => (
          <PostCard key={card.id} card={card} index={card.id} />
        ))}
      </div>
      <button
        className="mt-6 rounded-lg bg-blue-600 p-2 text-white"
        onClick={loadMorePosts}
        disabled={loading}
      >
        {loading ? "Loading..." : "Load More"}
      </button>
    </div>
  );
};
