import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import { getMajors, getSchools } from "~/server/queries";
import { FilterButton } from "./_components/filter-button";
import { PostGrid } from "./components/post-grid";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import {
  fetchPostsAction,
  fetchPostsByFilterAction,
} from "./actions/post-actions";

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
    <main className="min-h-screen pt-16 text-foreground">
      {/* Filter Popover */}
      <div className="sticky top-[80px] z-10 flex justify-start px-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-border/70 bg-background/60 shadow-lg backdrop-blur-md transition-colors duration-300"
            >
              <Filter className="ml-2 h-4 w-4" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="ml-2 w-80 border-border/40 bg-background/60 p-4 shadow-lg backdrop-blur-md"
            align="end"
          >
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Filter Mentors</h2>
              <div className="flex flex-col gap-3">
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
          </PopoverContent>
        </Popover>
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
