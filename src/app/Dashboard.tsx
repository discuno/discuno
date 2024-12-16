import Link from "next/link";
import Image from "next/image";
import { db } from "~/server/db";
import { getPosts } from "~/server/queries";

export const Dashboard = async () => {
  const posts = await getPosts();
  try {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container mx-auto p-4">
          <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((card, index) => (
              <div
                key={index}
                className="rounded-lg bg-white p-6 text-black shadow-md"
              >
                <Link href={`/img/${card.id}`}>
                  <Image
                    src={card.image || "/images/placeholder.jpg"}
                    alt={card.name || "default image"}
                    width={300}
                    height={200}
                    className="mb-4 rounded-md"
                  />
                </Link>
                <h2 className="mb-2 text-xl font-semibold">
                  {card.name || "card name"}
                </h2>
                <p className="text-sm">
                  {card.description || "default description"}
                </p>
                <Link
                  href="#"
                  className="mt-4 block text-blue-500 hover:underline"
                >
                  Learn more
                </Link>
              </div>
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
