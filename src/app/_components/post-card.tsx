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
  graduationYear?: number | null;
  schoolYear?: string | null;
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
        className="cursor-pointer rounded-lg bg-white p-6 text-black shadow-md transition-shadow duration-300 hover:shadow-lg"
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
          <h2 className="mb-2 text-xl font-semibold text-blue-600">
            {card.name || "Card Name"}
          </h2>
          <p className="mb-2 text-sm text-gray-700">
            {card.description || "Default description"}
          </p>
          <div className="mb-2 text-sm">
            <span className="font-semibold text-gray-900">School:</span>{" "}
            {school?.name}
          </div>
          <div className="mb-2 text-sm">
            <span className="font-semibold text-gray-900">Major:</span>{" "}
            {major?.name}
          </div>
          <div className="mb-2 text-sm">
            <span className="font-semibold text-gray-900">School Year:</span>{" "}
            {card.schoolYear ?? "N/A"}
          </div>
          <div className="text-sm">
            <span className="font-semibold text-gray-900">
              Graduation Year:
            </span>{" "}
            {card.graduationYear ?? "N/A"}
          </div>
        </div>
      </div>
    </Link>
  );
};
