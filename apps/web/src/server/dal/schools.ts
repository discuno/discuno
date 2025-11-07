import 'server-only'

import { eq } from 'drizzle-orm'
import { selectMajorSchema, selectSchoolSchema } from '~/lib/schemas/db'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema/index'

/**
 * Data Access Layer for schools, majors, and user associations
 * Raw database operations with no caching or auth checks
 */

/**
 * Get all schools
 */
export const getAllSchools = async () => {
  return db.query.school.findMany()
}

/**
 * Get all majors
 */
export const getAllMajors = async () => {
  return db.query.major.findMany()
}

/**
 * Find school by name
 */
export const findSchoolByName = async (schoolName: string): Promise<number | null> => {
  const name = selectSchoolSchema.shape.name.parse(schoolName)
  const [school] = await db
    .select({ id: schema.school.id })
    .from(schema.school)
    .where(eq(schema.school.name, name))
    .limit(1)

  return school?.id ?? null
}

/**
 * Find major by name
 */
export const findMajorByName = async (majorName: string): Promise<number | null> => {
  const name = selectMajorSchema.shape.name.parse(majorName)
  const [major] = await db
    .select({ id: schema.major.id })
    .from(schema.major)
    .where(eq(schema.major.name, name))
    .limit(1)

  return major?.id ?? null
}

/**
 * Get user's schools
 */
export const getUserSchools = async (userId: string) => {
  return db.query.userSchool.findMany({
    where: eq(schema.userSchool.userId, userId),
    with: {
      school: true,
    },
  })
}

/**
 * Get user's majors
 */
export const getUserMajors = async (userId: string) => {
  return db.query.userMajor.findMany({
    where: eq(schema.userMajor.userId, userId),
    with: {
      major: true,
    },
  })
}

/**
 * Replace user's school associations (delete all, then insert new)
 */
export const replaceUserSchools = async (userId: string, schoolIds: number[]): Promise<void> => {
  // Delete existing associations
  await db.delete(schema.userSchool).where(eq(schema.userSchool.userId, userId))

  // Insert new associations
  if (schoolIds.length > 0) {
    await db.insert(schema.userSchool).values(schoolIds.map(schoolId => ({ userId, schoolId })))
  }
}

/**
 * Replace user's major associations (delete all, then insert new)
 */
export const replaceUserMajors = async (userId: string, majorIds: number[]): Promise<void> => {
  // Delete existing associations
  await db.delete(schema.userMajor).where(eq(schema.userMajor.userId, userId))
  // Insert new associations
  if (majorIds.length > 0) {
    await db.insert(schema.userMajor).values(majorIds.map(majorId => ({ userId, majorId })))
  }
}
