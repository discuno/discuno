/* eslint-disable react/react-in-jsx-scope */
import { getPostsBySchool, getSchools } from "~/server/queries";
import { PostGrid } from "~/app/components/post-grid";
import { SchoolFilterButton } from "~/app/_components/school-filter-button";

interface GridProps {
  params: {
    schoolId: string;
  };
}

export default async function FilteredPostGrid({ params }: GridProps) {
  const { schoolId } = await params;
  const parsedSchoolId = parseInt(schoolId);
  const posts = await getPostsBySchool(parsedSchoolId);
  const schools = await getSchools();

  return (
    <div>
      <SchoolFilterButton schools={schools} />
      <PostGrid posts={posts} />
    </div>
  );
}
