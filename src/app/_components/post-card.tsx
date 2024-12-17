import Image from "next/image";
import Link from "next/link";

interface Card {
  id: number;
  image?: string | null;
  name?: string | null;
  description?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt?: Date | null;
}

export const PostCard = ({ card, index }: { card: Card; index: number }) => {
  return (
    <div
      key={index}
      className="cursor-pointer rounded-lg bg-white p-6 text-black shadow-md"
    >
      <div className="overflow-hidded relative aspect-[3/2] w-full rounded-md">
        <Link href={`/img/${card.id}`}>
          <img
            src={card.image || "/images/placeholder.jpg"}
            alt={card.name || "default image"}
            width={200}
            height={200}
            className="mb-4 rounded-md"
          />
          <h2 className="mb-2 text-xl font-semibold">
            {card.name || "card name"}
          </h2>
          <p className="text-sm">{card.description || "default description"}</p>
        </Link>
      </div>
    </div>
  );
};
