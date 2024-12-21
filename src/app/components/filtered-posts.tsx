/* eslint-disable react/react-in-jsx-scope */
import { getPosts, getPostsBySchool, getSchools } from "~/server/queries";
import { PostGrid } from "~/app/components/post-grid";
import { SchoolFilterButton } from "~/app/_components/school-filter-button";

export default async function FilteredPostGrid({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  console.log("Component Rendered");
  const schoolId = searchParams.school ? parseInt(searchParams.school) : null;
  console.log(schoolId);
  const posts = schoolId ? await getPostsBySchool(schoolId) : await getPosts();
  const schools = await getSchools();

  return (
    <div>
      <SchoolFilterButton schools={schools} />
      <PostGrid posts={posts} />
    </div>
  );
}
