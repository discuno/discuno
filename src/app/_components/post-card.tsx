/* eslint-disable react/react-in-jsx-scope */
import Link from "next/link";
import { getMajorForUser, getSchoolForUser } from "~/server/queries";
import Image from "next/image";

interface Card {
  id: number;
  userImage?: string | null;
  name?: string | null;
  description?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
}

export const PostCard = async ({
  card,
  index,
}: {
  card: Card;
  index: number;
}) => {
  const user = card.createdById;
  const school = await getSchoolForUser(user);
  const major = await getMajorForUser(user);

  return (
    <Link href={`/img/${card.id}`}>
      <div
        key={index}
        className="cursor-pointer rounded-lg bg-white p-6 text-black shadow-md"
      >
        <div className="relative mb-4 aspect-[3/2] w-full overflow-hidden rounded-md">
          <Image
            src={card.userImage || "/images/placeholder.jpg"}
            alt={card.name || "default image"}
            width={600}
            height={400}
            className="rounded-md object-cover"
          />
        </div>
        <div className="flex flex-col items-start">
          <h2 className="mb-2 text-xl font-semibold">
            {card.name || "Card Name"}
          </h2>
          <p className="mb-2 text-sm">
            {card.description || "Default description"}
          </p>
          <p className="mb-1 text-sm text-gray-600">School: {school?.name}</p>
          <p className="text-sm text-gray-600">Major: {major?.name}</p>
        </div>
      </div>
    </Link>
  );
};
