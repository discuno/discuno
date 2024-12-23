/* eslint-disable react/react-in-jsx-scope */
import { getPostById } from "~/server/queries";
import Image from "next/image";
import { Modal } from "~/app/@modal/(.)img/[id]/modal";

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
      <div className="flex justify-center">
        <Image
          src={post.userImage ?? "/images/placeholder.jpg"}
          alt={`Post ${postId}`}
          width={600}
          height={400}
          className="rounded-md object-cover"
        />
      </div>
    </Modal>
  );
}
