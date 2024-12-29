import PostPage from "~/app/components/full-post-page";

export default async function PostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const postId = (await params).id;
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-y-hidden">
      <PostPage id={postId} />
    </div>
  );
}
