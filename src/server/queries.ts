import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function getPosts() {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const posts = await db.query.posts.findMany({
    with: {
      creator: true,
    },
  });

  const postsMapped = await Promise.all(
    posts.map(async (post) => {
      const userProfile = await db.query.userProfiles.findFirst({
        where: (model, { eq }) => eq(model.userId, post.createdById),
      });

      return {
        id: post.id,
        name: post.name,
        description: post.description,
        createdById: post.createdById,
        createdAt: post.createdAt,
        userImage: post.creator?.image, // Add the image field
        graduationYear: userProfile?.graduationYear,
        schoolYear: userProfile?.schoolYear,
      };
    }),
  );

  return postsMapped;
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

  const creator = await db.query.users.findFirst({
    where: (model, { eq }) => eq(model.id, post.createdById),
  });

  if (!creator) {
    throw new Error("Creator not found");
  }

  return {
    ...post,
    userImage: creator.image,
  };
}

export const getSchoolForUser = async (userId: string) => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const schoolPair = await db.query.userSchools.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
  });

  if (!schoolPair) {
    return null;
  }

  const school = await db.query.schools.findFirst({
    where: (model, { eq }) => eq(model.id, schoolPair?.schoolId),
  });

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

export const getPostsByMajor = async (majorId: number) => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  // return all posts if posts with school id is -1
  if (majorId === -1) {
    const allPosts = await getPosts();
    return allPosts;
  }

  const userMajor = await db.query.userMajors.findMany({
    where: (model, { eq }) => eq(model.majorId, majorId),
  });

  if (userMajor.length === 0) {
    return [];
  }

  const userIds = userMajor.map((student) => student.userId);

  const posts = await db.query.posts.findMany({
    where: (model, { inArray }) => inArray(model.createdById, userIds),
  });

  return posts;
};

export const getPostsByFilters = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
) => {
  // Authenticate the user
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  // Return all posts if both schoolId and majorId are -1
  if (schoolId === -1 && majorId === -1) {
    const allPosts = await getPosts();
    return allPosts;
  }

  // Get all users with the specified school ID
  const userSchools = await db.query.userSchools.findMany({
    where: (model, { eq }) =>
      schoolId === null ? undefined : eq(model.schoolId, schoolId),
  });

  // Return an empty array if no users with the specified school exist
  if (schoolId !== null && userSchools.length === 0) {
    return [];
  }

  // Get all user IDs with the specified school ID
  const userIdsBySchool = userSchools.map((userSchool) => userSchool.userId);

  // Get all users with the specified major ID
  const userMajors = await db.query.userMajors.findMany({
    where: (model, { eq }) =>
      majorId === null ? undefined : eq(model.majorId, majorId),
  });

  // Return an empty array if no users with the specified major exist
  if (majorId !== null && userMajors.length === 0) {
    return [];
  }

  // Get all user IDs with the specified major
  const userIdsByMajor = userMajors.map((userMajor) => userMajor.userId);

  // Get all users with the specified graduation year
  const usersByGraduationYear = graduationYear
    ? await db.query.userProfiles.findMany({
        where: (model, { eq }) => eq(model.graduationYear, graduationYear),
      })
    : [];

  // Map graduation year user IDs
  const userIdsByGraduationYear = graduationYear
    ? usersByGraduationYear.map((user) => user.userId)
    : null;

  // Get the intersection of user IDs by school and major
  const filteredUserIds = userIdsBySchool.filter((userId) =>
    userIdsByMajor.includes(userId),
  );

  // Further filter by graduation year if it exists
  const finalFilteredUserIds = userIdsByGraduationYear
    ? filteredUserIds.filter((userId) =>
        userIdsByGraduationYear.includes(userId),
      )
    : filteredUserIds;

  // Return an empty array if no users match the filters
  if (finalFilteredUserIds.length === 0) {
    return [];
  }

  // Get all posts with the filtered user IDs
  const posts = await db.query.posts.findMany({
    where: (model, { inArray }) =>
      inArray(model.createdById, finalFilteredUserIds),
    with: {
      creator: true,
    },
  });

  // Map the posts to include the user profile details
  const postsMapped = await Promise.all(
    posts.map(async (post) => {
      const userProfile = await db.query.userProfiles.findFirst({
        where: (model, { eq }) => eq(model.userId, post.createdById),
      });

      return {
        id: post.id,
        name: post.name,
        description: post.description,
        createdById: post.createdById,
        createdAt: post.createdAt,
        userImage: post.creator?.image, // Add the image field
        graduationYear: userProfile?.graduationYear,
        schoolYear: userProfile?.schoolYear,
      };
    }),
  );

  return postsMapped;
};

export const getMajorForUser = async (userId: string) => {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  const majorPair = await db.query.userMajors.findFirst({
    where: (model, { eq }) => eq(model.userId, userId),
  });

  const major = await db.query.majors.findFirst({
    where: (model, { eq }) =>
      majorPair?.majorId !== undefined
        ? eq(model.id, majorPair.majorId)
        : undefined,
  });

  return major;
};

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
