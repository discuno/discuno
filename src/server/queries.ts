import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function getPosts(limit = 20, offset = 0) {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  //  Retrieve posts with their creators and related profiles in batched way
  const posts = await db.query.posts.findMany({
    with: {
      creator: true,
    },
    limit,
    offset,
  });

  if (posts.length === 0) {
    return [];
  }

  // collect usre IDs from posts to fetch user profiles in single query
  const userIds = posts.map((post) => post.createdById);
  const userProfiles = await db.query.userProfiles.findMany({
    where: (model, { inArray }) => inArray(model.userId, userIds),
  });

  // Map user profile for quick lookup
  const userProfilesMap = userProfiles.reduce(
    (acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    },
    {} as Record<string, (typeof userProfiles)[number]>,
  );
  // Map posts with user profile details
  const postsMapped = posts.map((post) => {
    const userProfile = userProfilesMap[post.createdById];

    return {
      id: post.id,
      name: post.name,
      description: post.description,
      createdById: post.createdById,
      createdAt: post.createdAt,
      userImage: post.creator?.image || null,
      graduationYear: userProfile?.graduationYear || null,
      schoolYear: userProfile?.schoolYear || null,
    };
  });

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
  limit = 20,
  offset = 0,
) => {
  // Authenticate the user
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  // Return all posts if all filters are unset
  if (schoolId === -1 && majorId === -1 && graduationYear === -1) {
    return getPosts(limit, offset);
  }

  const filters: {
    schoolIds?: Set<string>;
    majorIds?: Set<string>;
    graduationYearIds?: Set<string>;
  } = {};

  // Fetch user IDs by school
  if (schoolId !== null) {
    const userSchools = await db.query.userSchools.findMany({
      where: (model, { eq }) => eq(model.schoolId, schoolId),
    });

    if (userSchools.length === 0) return [];

    filters.schoolIds = new Set(
      userSchools.map((userSchool) => userSchool.userId),
    );
  }

  // Fetch user IDs by major
  if (majorId !== null) {
    const userMajors = await db.query.userMajors.findMany({
      where: (model, { eq }) => eq(model.majorId, majorId),
    });

    if (userMajors.length === 0) return [];

    filters.majorIds = new Set(userMajors.map((userMajor) => userMajor.userId));
  }

  // Fetch user IDs by graduation year
  if (graduationYear !== null) {
    const usersByGraduationYear = await db.query.userProfiles.findMany({
      where: (model, { eq }) => eq(model.graduationYear, graduationYear),
    });

    if (usersByGraduationYear.length === 0) return [];

    filters.graduationYearIds = new Set(
      usersByGraduationYear.map((user) => user.userId),
    );
  }

  // Compute the intersection of all filter sets
  let filteredUserIds: Set<string> = new Set(Object.values(filters)[0] || []);

  Object.values(filters).forEach((filterSet) => {
    filteredUserIds = new Set(
      [...filteredUserIds].filter((userId) => filterSet.has(userId)),
    );
  });

  if (filteredUserIds.size === 0) return [];

  // Fetch posts for filtered user IDs
  const posts = await db.query.posts.findMany({
    where: (model, { inArray }) =>
      inArray(model.createdById, filteredUserIds ? [...filteredUserIds] : []),
    with: {
      creator: true,
    },
    limit,
    offset,
  });

  if (posts.length === 0) return [];

  // Fetch all user profiles for post creators in a single query
  const userProfiles = await db.query.userProfiles.findMany({
    where: (model, { inArray }) =>
      inArray(
        model.userId,
        posts.map((post) => post.createdById),
      ),
  });

  const userProfilesMap = userProfiles.reduce(
    (acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    },
    {} as Record<string, (typeof userProfiles)[number]>,
  );

  // Map posts with user profile details
  const postsMapped = posts.map((post) => {
    const userProfile = userProfilesMap[post.createdById];

    return {
      id: post.id,
      name: post.name,
      description: post.description,
      createdById: post.createdById,
      createdAt: post.createdAt,
      userImage: post.creator?.image || null,
      graduationYear: userProfile?.graduationYear || null,
      schoolYear: userProfile?.schoolYear || null,
    };
  });

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
