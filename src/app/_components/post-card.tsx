import Link from "next/link";
import Image from "next/image";
import type { Card } from "~/app/types";

export const PostCard = ({ card }: { card: Card; index: number }) => {
  return (
    <Link href={`/img/${card.id}`}>
      <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
        {/* Profile Image Section */}
        <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
          <Image
            src={card.userImage || "/images/placeholder.jpg"}
            alt={card.name || "Student profile"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h2 className="text-xl font-bold text-white">
              {card.name || "Student Name"}
            </h2>
          </div>
        </div>

        {/* Student Info Section */}
        <div className="space-y-3">
          {/* School & Major */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-lg font-semibold text-blue-600">
                {card.school}
              </p>
              <p className="text-sm text-gray-600">{card.major}</p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
              {card.schoolYear}
            </div>
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-sm text-gray-600">
            {card.description || "No description provided"}
          </p>

          {/* Footer Info */}
          <div className="flex items-center justify-between border-t pt-3 text-sm text-gray-500">
            <span>Class of {card.graduationYear}</span>
            <span className="flex items-center">
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {new Date(card.createdAt ?? "").toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
