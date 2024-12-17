export default async function PostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photoId = (await params).id;
  return <div>{photoId}</div>;
}
