import Link from "next/link";
import Image from "next/image";
import type { Card } from "~/app/types";

export const PostCard = ({ card }: { card: Card; index: number }) => {
  return (
    <Link href={`/img/${card.id}`}>
      <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/90 p-4 text-card-foreground shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:bg-card/90 dark:shadow-lg dark:shadow-primary/5 dark:backdrop-blur-sm dark:hover:bg-card/95 dark:hover:shadow-primary/10">
        {/* Profile Image Section */}
        <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg">
          <Image
            src={card.userImage || "/images/placeholder.jpg"}
            alt={card.name || "Student profile"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
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
              <p className="text-lg font-semibold text-primary">
                {card.school}
              </p>
              <p className="text-sm text-muted-foreground">{card.major}</p>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              {card.schoolYear}
            </div>
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {card.description || "No description provided"}
          </p>

          {/* Footer Info */}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground">
            <span>Class of {card.graduationYear}</span>
            <span className="flex items-center">
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
