/* eslint-disable react/react-in-jsx-scope */
import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import { getPosts, getPostsBySchool, getSchools } from "~/server/queries";
import { SchoolFilterButton } from "./_components/school-filter-button";
import { PostGrid } from "./components/post-grid";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { school?: string };
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
  const posts = schoolId ? await getPostsBySchool(schoolId) : await getPosts();
  const schools = await getSchools();

  return (
    <main>
      <SchoolFilterButton schools={schools} />
      <PostGrid posts={posts} />
    </main>
  );
}
