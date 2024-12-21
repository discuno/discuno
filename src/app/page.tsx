/* eslint-disable react/react-in-jsx-scope */
import { auth } from "~/server/auth";
import { LoginPage } from "~/app/components/Login";
import { getPosts, getSchools } from "~/server/queries";
import { SchoolFilterButton } from "./_components/school-filter-button";
import { PostGrid } from "./components/post-grid";

export default async function HomePage() {
  const session = await auth();
  const schools = await getSchools();
  const posts = await getPosts();

  if (!session) {
    return (
      <main>
        <LoginPage />
      </main>
    );
  }

  return (
    <main>
      <SchoolFilterButton schools={schools} />
      <PostGrid posts={posts} />
    </main>
  );
}
