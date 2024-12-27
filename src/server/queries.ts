import "server-only";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function getPosts(limit = 20, offset = 0) {
  const user = await auth();

  if (!user || !user.userId) {
    throw new Error("Unauthorized");
  }

  // Retrieve posts with their creators and related profiles in batched way
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

  // Collect user IDs from posts to fetch user profiles in single query
  const userIds = posts.map((post) => post.createdById);
  const userProfiles = await db.query.userProfiles.findMany({
    where: (model, { inArray }) => inArray(model.userId, userIds),
  });

  // Fetch school and major details for the users
  const userSchools = await db.query.userSchools.findMany({
    where: (model, { inArray }) => inArray(model.userId, userIds),
  });

  const userMajors = await db.query.userMajors.findMany({
    where: (model, { inArray }) => inArray(model.userId, userIds),
  });

  const schools = await db.query.schools.findMany();
  const majors = await db.query.majors.findMany();

  // Map user profiles, schools, and majors for quick lookup
  const userProfilesMap = userProfiles.reduce(
    (acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    },
    {} as Record<string, (typeof userProfiles)[number]>,
  );

  const userSchoolsMap = userSchools.reduce(
    (acc, userSchool) => {
      acc[userSchool.userId] = schools.find(
        (school) => school.id === userSchool.schoolId,
      ) || {
        id: 0,
        name: null,
        image: null,
        updatedAt: null,
        createdAt: new Date(),
        deletedAt: null,
        location: null,
      };
      return acc;
    },
    {} as Record<string, (typeof schools)[number]>,
  );

  const userMajorsMap = userMajors.reduce(
    (acc, userMajor) => {
      acc[userMajor.userId] = majors.find(
        (major) => major.id === userMajor.majorId,
      ) || {
        id: 0,
        name: null,
        updatedAt: null,
        createdAt: new Date(),
        deletedAt: null,
      };
      return acc;
    },
    {} as Record<string, (typeof majors)[number]>,
  );

  // Map posts with user profile, school, and major details
  const postsMapped = posts.map((post) => {
    const userProfile = userProfilesMap[post.createdById];
    const userSchool = userSchoolsMap[post.createdById];
    const userMajor = userMajorsMap[post.createdById];

    return {
      id: post.id,
      name: post.name,
      description: post.description,
      createdById: post.createdById,
      createdAt: post.createdAt,
      userImage: post.creator?.image || null,
      graduationYear: userProfile?.graduationYear || null,
      schoolYear: userProfile?.schoolYear || null,
      school: userSchool?.name || null,
      major: userMajor?.name || null,
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

  // Fetch school and major details for the users
  const userSchools = await db.query.userSchools.findMany({
    where: (model, { inArray }) =>
      inArray(model.userId, Array.from(filteredUserIds)),
  });

  const userMajors = await db.query.userMajors.findMany({
    where: (model, { inArray }) =>
      inArray(model.userId, Array.from(filteredUserIds)),
  });

  const schools = await db.query.schools.findMany();
  const majors = await db.query.majors.findMany();

  // Map user profiles, schools, and majors for quick lookup
  const userProfilesMap = userProfiles.reduce(
    (acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    },
    {} as Record<string, (typeof userProfiles)[number]>,
  );

  const userSchoolsMap = userSchools.reduce(
    (acc, userSchool) => {
      const school = schools.find(
        (school) => school.id === userSchool.schoolId,
      );
      if (school) {
        acc[userSchool.userId] = school;
      }
      return acc;
    },
    {} as Record<string, (typeof schools)[number] | undefined>,
  );

  const userMajorsMap = userMajors.reduce(
    (acc, userMajor) => {
      const major = majors.find((major) => major.id === userMajor.majorId);
      if (major) {
        acc[userMajor.userId] = major;
      }
      return acc;
    },
    {} as Record<string, (typeof majors)[number] | undefined>,
  );

  // Map posts with user profile, school, and major details
  const postsMapped = posts.map((post) => {
    const userProfile = userProfilesMap[post.createdById];
    const userSchool = userSchoolsMap[post.createdById];
    const userMajor = userMajorsMap[post.createdById];

    return {
      id: post.id,
      name: post.name,
      description: post.description,
      createdById: post.createdById,
      createdAt: post.createdAt,
      userImage: post.creator?.image || null,
      graduationYear: userProfile?.graduationYear || null,
      schoolYear: userProfile?.schoolYear || null,
      school: userSchool?.name || null,
      major: userMajor?.name || null,
    };
  });

  return postsMapped;
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
