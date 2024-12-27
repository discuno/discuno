"use server";

import {
  getMajorForUser,
  getPosts,
  getPostsByFilters,
  getSchoolForUser,
} from "~/server/queries";

/*
 * Infinite scroll server actions
 */
export const fetchPostsAction = async (limit = 20, offset = 0) => {
  const posts = await getPosts(limit, offset);
  return posts;
};

export const fetchPostsByFilterAction = async (
  schoolId: number | null,
  majorId: number | null,
  graduationYear: number | null,
  limit = 20,
  offset = 0,
) => {
  const posts = await getPostsByFilters(
    schoolId,
    majorId,
    graduationYear,
    limit,
    offset,
  );
  return posts;
};

// post card actions
export const fetchSchoolForUser = async (user: string) => {
  const school = await getSchoolForUser(user);
  return school;
};

export const fetchMajorForUser = async (user: string) => {
  const major = await getMajorForUser(user);
  return major;
};
