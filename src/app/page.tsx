/* eslint-disable react/react-in-jsx-scope */
import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import {
  getMajors,
  getPosts,
  getPostsByFilters,
  getSchools,
} from "~/server/queries";
import { FilterButton } from "./_components/filter-button";
import { PostGrid } from "./components/post-grid";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { school?: string; major?: string; gradYear?: string };
}) {
  const session = await auth();

  if (!session) {
    return (
      <main>
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

  const posts =
    schoolId || majorId || graduationYear
      ? await getPostsByFilters(schoolId, majorId, graduationYear)
      : await getPosts();

  console.log("Filtered posts:", posts);

  return (
    <main>
      <div className="flex items-center justify-center pt-2">
        <FilterButton filterItems={schools} queryName="school" />
        <FilterButton filterItems={majors} queryName="major" />
        <FilterButton filterItems={gradYears} queryName="gradYear" />
      </div>
      <PostGrid posts={posts} />
    </main>
  );
}
