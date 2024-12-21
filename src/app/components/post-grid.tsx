/* eslint-disable react/react-in-jsx-scope */
import { PostCard } from "~/app/_components/post-card";

interface Card {
  id: number;
  image?: string | null;
  name?: string | null;
  description?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt?: Date | null;
}

export const PostGrid = ({ posts }: { posts: Card[] }) => {
  try {
    return (
      <div className="p- container mx-auto">
        <h1 className="mb-8 pt-2 text-3xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((card, index) => (
            <PostCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    // Return a fallback UI
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1>Loading posts...</h1>
      </div>
    );
  }
};
