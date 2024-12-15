import Image from "next/image";
import Link from "next/link";
import { db } from "~/server/db";

const cardData = [
  {
    title: "Card 1",
    description: "This is a description of card 1.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 2",
    description: "This is a description of card 2.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 3",
    description: "This is a description of card 3.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 4",
    description: "This is a description of card 4.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 5",
    description: "This is a description of card 5.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 6",
    description: "This is a description of card 6.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 7",
    description: "This is a description of card 7.",
    imageUrl: "/images/placeholder.jpg",
  },
  {
    title: "Card 8",
    description: "This is a description of card 8.",
    imageUrl: "/images/placeholder.jpg",
  },
];

export default async function HomePage() {
  const posts = await db.query.posts.findMany();
  console.log(posts);

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
}
