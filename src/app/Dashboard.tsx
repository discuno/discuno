import { db } from "~/server/db";
import { getPosts } from "~/server/queries";
import { PostCard } from "~/app/_components/post-card";

export const Dashboard = async () => {
  const posts = await getPosts();
  try {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container mx-auto p-4">
          <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((card, index) => (
              <PostCard key={card.id} card={card} index={index} />
            ))}
          </div>
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
