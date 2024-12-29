import { getPostById } from "~/server/queries";
import Image from "next/image";
import { Modal } from "~/app/@modal/(.)img/[id]/modal";
import Link from "next/link";

export default async function PostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: postId } = await params;
  const idAsNumber = Number(postId);

  if (Number.isNaN(idAsNumber)) {
    throw new Error("Invalid post ID");
  }

  const post = await getPostById(idAsNumber);

  return (
    <Modal>
      <div className="flex flex-col items-center">
        {/* Image */}
        <div className="relative h-80 w-full overflow-hidden rounded-lg">
          <Image
            src={post.userImage ?? "/images/placeholder.jpg"}
            alt={`Post ${postId}`}
            fill
            className="rounded-lg object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Details */}
        <div className="mt-6 w-full">
          <h2 className="text-2xl font-bold text-gray-900">{post.name}</h2>
          <p className="mt-2 text-gray-700">{post.description}</p>

          <div className="mt-4 flex space-x-4">
            <span className="text-sm text-gray-500">School: {post.school}</span>
            <span className="text-sm text-gray-500">Major: {post.major}</span>
            <span className="text-sm text-gray-500">
              Graduation Year: {post.graduationYear}
            </span>
            <span className="text-sm text-gray-500">
              School Year: {post.schoolYear}
            </span>
          </div>

          {/* Call to Action */}
          <div className="mt-6">
            <Link
              href="/meet"
              className="inline-block rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Schedule a Video Meet
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
