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

  return post;
}

export const getSchoolForUser = async (userId: string) => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const school = await db.query.userSchools.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
  });

  if (!school) {
    return null;
  }

  return school;
};

export const getPostsBySchool = async (schoolId: number) => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  // return all posts if posts with school id is -1
  if (schoolId === -1) {
    const allPosts = await getPosts();
    return allPosts;
  }

  const userSchool = await db.query.userSchools.findMany({
    where: (model, { eq }) => eq(model.schoolId, schoolId),
  });

  if (userSchool.length === 0) {
    return [];
  }

  const userIds = userSchool.map((student) => student.userId);

  const posts = await db.query.posts.findMany({
    where: (model, { inArray }) => inArray(model.createdById, userIds),
  });

  return posts;
};

export const getSchools = async () => {
  const schools = await db.query.schools.findMany();
  const res: { value: string; label: string; id: number }[] = schools.map(
    (school) => ({
      label: school.name ?? "Unknown",
      value: school.name?.toLowerCase() ?? "unknown",
      id: school.id,
    }),
  );

  return res;
};
