import { getPostById } from "~/server/queries";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function PostPage({ id }: { id: string }) {
  const postId = Number(id);

  if (Number.isNaN(postId)) {
    return notFound();
  }

  try {
    const post = await getPostById(postId);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-lg bg-white shadow-lg">
            {/* Image Section */}
            <div className="relative h-[400px] w-full">
              <Image
                src={post.image ?? "/images/placeholder.jpg"}
                alt={post.name ?? "Post image"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
              />
            </div>

            {/* Content Section */}
            <div className="p-6">
              <h1 className="mb-4 text-3xl font-bold text-gray-900">
                {post.name ?? "Untitled Post"}
              </h1>

              <div className="mb-6 flex items-center text-sm text-gray-500">
                <time dateTime={post.createdAt.toISOString()}>
                  {post.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700">{post.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching post:", error);
    return notFound();
  }
}
