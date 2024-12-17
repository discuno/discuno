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
      <img src={post.image ?? ""} className="w-96" />
    </Modal>
  );
}
