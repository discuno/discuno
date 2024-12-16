import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function getPosts() {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const posts = await db.query.posts.findMany();

  return posts;
}

export async function getPostById(id: number) {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const post = await db.query.posts.findFirst({
    where: (model, { eq }) => eq(model.id, id),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // if (post.createdById !== user.userId) {
  //   throw new Error("Unauthorized");
  // }

  return post;
}
