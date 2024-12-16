import Link from "next/link";
import Image from "next/image";
import { db } from "~/server/db";

export const Dashboard = async () => {
  try {
    const posts = await db.query.posts.findMany();

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container mx-auto p-4">
          <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {posts.map((card, index) => (
              <div
                key={index}
                className="rounded-lg bg-white p-6 text-black shadow-md"
              >
                <Image
                  src="/images/placeholder.jpg"
                  alt={card.name || "default image"}
                  width={300}
                  height={200}
                  className="mb-4 rounded-md"
                />
                <h2 className="mb-2 text-xl font-semibold">
                  {card.name || "card name"}
                </h2>
                <p className="text-sm">description</p>
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
      </main>
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    // Return a fallback UI
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1>Loading posts...</h1>
      </main>
    );
  }
};
