"use client";
/* eslint-disable react/react-in-jsx-scope */
import { useState, useEffect, useCallback } from "react";
import { PostCard } from "~/app/_components/post-card";
import { fetchPostsAction, fetchPostsByFilterAction } from "../actions";
import type { Card, PostGridProps } from "./types";
import { LoadMoreButton } from "~/app/components/load-more-button";
import { LoadingSpinner } from "~/app/components/loading-spinner";

export const PostGrid = ({
  posts,
  schoolId,
  majorId,
  graduationYear,
}: PostGridProps) => {
  const [allPosts, setAllPosts] = useState<Card[]>(posts);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(posts.length);
  const limit = 12;

  const fetchFilteredPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
    } catch (err) {
      setError("Failed to load posts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, majorId, graduationYear]);

  useEffect(() => {
    fetchFilteredPosts();
  }, [fetchFilteredPosts]);

  const loadMorePosts = async () => {
    setLoading(true);
    setError(null);
    try {
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

      const uniqueMorePosts = morePosts.filter(
        (newPost) =>
          !allPosts.some((existingPost) => existingPost.id === newPost.id),
      );

      setAllPosts((prevPosts) => [...prevPosts, ...uniqueMorePosts]);
      setOffset((prevOffset) => prevOffset + limit);
    } catch (err) {
      setError("Failed to load more posts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-8 pt-2 text-3xl font-bold text-white">Dashboard</h1>
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allPosts.map((card) => (
          <PostCard key={card.id} card={card} index={card.id} />
        ))}
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <LoadMoreButton onClick={loadMorePosts} disabled={loading} />
      )}
    </div>
  );
};
