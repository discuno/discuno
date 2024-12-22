/* eslint-disable react/react-in-jsx-scope */
import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import {
  getMajors,
  getPosts,
  getPostsBySchoolAndMajor,
  getSchools,
} from "~/server/queries";
import { FilterButton } from "./_components/filter-button";
import { PostGrid } from "./components/post-grid";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { school?: string; major?: string };
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

  const schools = await getSchools();
  const majors = await getMajors();

  const posts =
    schoolId || majorId
      ? await getPostsBySchoolAndMajor(schoolId, majorId)
      : await getPosts();

  return (
    <main>
      <div className="flex items-center justify-center pt-2">
        <FilterButton filterItems={schools} queryName="school" />
        <FilterButton filterItems={majors} queryName="major" />
      </div>
      <PostGrid posts={posts} />
    </main>
  );
}
