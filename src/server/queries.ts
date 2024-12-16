import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function getPosts() {
  const user = auth();

  if (!user.userId) {
    throw new Error("Unauthorized");
  }

  const posts = await db.query.posts.findMany();

  return posts;
}
