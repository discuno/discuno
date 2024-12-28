import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import {
  posts,
  users,
  userProfiles,
  userSchools,
  schools,
  userMajors,
  majors,
} from "~/server/db/schema"; // Adjust this import path to where your schema is defined
import { eq, and, desc } from "drizzle-orm";

export async function getPosts(limit = 20, offset = 0) {
  const user = await auth();
  if (!user?.userId) throw new Error("Unauthorized");

  // Optimize select fields to only get what's needed
  const result = await db
    .select({
      post: {
        id: posts.id,
        name: posts.name,
        description: posts.description,
        createdById: posts.createdById,
        createdAt: posts.createdAt,
      },
      creator: {
        image: users.image,
      },
      profile: {
        graduationYear: userProfiles.graduationYear,
        schoolYear: userProfiles.schoolYear,
      },
      school: {
        name: schools.name,
      },
      major: {
        name: majors.name,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdById, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(userSchools, eq(users.id, userSchools.userId))
    .leftJoin(schools, eq(userSchools.schoolId, schools.id))
    .leftJoin(userMajors, eq(users.id, userMajors.userId))
    .leftJoin(majors, eq(userMajors.majorId, majors.id))
    .orderBy(desc(posts.createdAt)) // Add explicit ordering
    .limit(limit)
    .offset(offset);

  return result.map(({ post, creator, profile, school, major }) => ({
    id: post.id,
    name: post.name,
    description: post.description,
    createdById: post.createdById,
    createdAt: post.createdAt,
    userImage: creator?.image || null,
    graduationYear: profile?.graduationYear || null,
    schoolYear: profile?.schoolYear || null,
    school: school?.name || null,
    major: major?.name || null,
  }));
}

export async function getPostById(id: number) {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  try {
    const post = await db
      .select({
        post: {
          id: posts.id,
          name: posts.name,
          description: posts.description,
          createdById: posts.createdById,
          createdAt: posts.createdAt,
        },
        creator: {
          image: users.image,
        },
        profile: {
          graduationYear: userProfiles.graduationYear,
          schoolYear: userProfiles.schoolYear,
        },
        school: {
          name: schools.name,
        },
        major: {
          name: majors.name,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.createdById, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userSchools, eq(users.id, userSchools.userId))
      .leftJoin(schools, eq(userSchools.schoolId, schools.id))
      .leftJoin(userMajors, eq(users.id, userMajors.userId))
      .leftJoin(majors, eq(userMajors.majorId, majors.id))
      .where(eq(posts.id, id))
      .limit(1)
      .execute();

    if (post.length === 0) {
      throw new Error("Post not found");
    }

    const postData = post[0];

    return {
      id: postData?.post.id,
      name: postData?.post.name,
      description: postData?.post.description,
      createdById: postData?.post.createdById,
      createdAt: postData?.post.createdAt,
      userImage: postData?.creator?.image || null,
      graduationYear: postData?.profile?.graduationYear || null,
      schoolYear: postData?.profile?.schoolYear || null,
      school: postData?.school?.name || null,
      major: postData?.major?.name || null,
    };
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    throw new Error("Failed to fetch post");
  }
}

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

export const getMajors = async () => {
  const majors = await db.query.majors.findMany();
  const res: { value: string; label: string; id: number }[] = majors.map(
    (major) => ({
      label: major.name ?? "Unknown",
      value: major.name?.toLowerCase() ?? "unknown",
      id: major.id,
    }),
  );

  return res;
};

export async function getPostsByFilters(
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  offset = 0,
) {
  const user = await auth();
  if (!user?.userId) throw new Error("Unauthorized");

  // Return all posts if no filters
  if ([schoolId, majorId, graduationYear].every((f) => f === -1)) {
    return getPosts(limit, offset);
  }

  const conditions = [];

  if (schoolId !== null && schoolId !== -1) {
    conditions.push(eq(schools.id, schoolId));
  }
  if (majorId !== null && majorId !== -1) {
    conditions.push(eq(majors.id, majorId));
  }
  if (graduationYear !== null && graduationYear !== -1) {
    conditions.push(eq(userProfiles.graduationYear, graduationYear));
  }

  const query = db
    .select({
      post: {
        id: posts.id,
        name: posts.name,
        description: posts.description,
        createdById: posts.createdById,
        createdAt: posts.createdAt,
      },
      creator: {
        image: users.image,
      },
      profile: {
        graduationYear: userProfiles.graduationYear,
        schoolYear: userProfiles.schoolYear,
      },
      school: {
        name: schools.name,
      },
      major: {
        name: majors.name,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdById, users.id))
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .leftJoin(userSchools, eq(users.id, userSchools.userId))
    .leftJoin(schools, eq(userSchools.schoolId, schools.id))
    .leftJoin(userMajors, eq(users.id, userMajors.userId))
    .leftJoin(majors, eq(userMajors.majorId, majors.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset);

  const result = await query;

  return result.map(({ post, creator, profile, school, major }) => ({
    id: post.id,
    name: post.name,
    description: post.description,
    createdById: post.createdById,
    createdAt: post.createdAt,
    userImage: creator?.image || null,
    graduationYear: profile?.graduationYear || null,
    schoolYear: profile?.schoolYear || null,
    school: school?.name || null,
    major: major?.name || null,
  }));
}

export const getProfilePic = async () => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const userImage = await db.query.users.findFirst({
    where: (model, { eq }) => eq(model.id, user.userId),
  });

  return userImage?.image;
};
