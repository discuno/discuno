import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import { getMajors, getSchools } from "~/server/queries";
import { FilterButton } from "./_components/filter-button";
import { PostGrid } from "./components/post-grid";
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from "./actions/post-actions";
import type { Card } from "~/app/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { school?: string; major?: string; gradYear?: string };
}) {
  const session = await auth();

  if (!session) {
    return (
      <main className="min-h-screen bg-background">
        <LoginPage />
      </main>
    );
  }

  const params = await searchParams;

  const schoolId = params.school ? parseInt(params.school) : null;
  const majorId = params.major ? parseInt(params.major) : null;
  const graduationYear = params.gradYear ? parseInt(params.gradYear) : null;

  const schools = await getSchools();
  const majors = await getMajors();
  const gradYears: {
    value: string;
    label: string;
    id: number;
  }[] = Array.from({ length: 6 }, (_, i) => {
    const year = 2025 + i;
    return {
      id: year,
      value: year.toString(),
      label: year.toString(),
    };
  });

  const initialPosts =
    schoolId || majorId || graduationYear
      ? await fetchPostsByFilterAction(schoolId, majorId, graduationYear)
      : await fetchPostsAction();

  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      {/* Sticky Filter Bar */}
      <div className="sticky top-16 z-10 border-b border-border/40 bg-background/80 p-4 shadow-md backdrop-blur-sm transition-colors duration-300">
        <div className="flex flex-wrap justify-center gap-4">
          <FilterButton
            filterItems={schools}
            queryName="school"
            aria-label="Filter by school"
          />
          <FilterButton
            filterItems={majors}
            queryName="major"
            aria-label="Filter by major"
          />
          <FilterButton
            filterItems={gradYears}
            queryName="gradYear"
            aria-label="Filter by graduation year"
          />
        </div>
      </div>

      {/* Post Grid */}
      <PostGrid
        posts={initialPosts}
        schoolId={schoolId}
        majorId={majorId}
        graduationYear={graduationYear}
      />
    </main>
  );
}
