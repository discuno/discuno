import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import * as schema from '~/server/db/schema'
import {
  associateUserWithMajor,
  associateUserWithSchool,
  createTestMajor,
  createTestSchool,
  createTestUser,
  getUserWithProfile,
  resetCounters,
  softDeleteUser,
} from '../fixtures'
import { assertProfile, assertRecentDate, assertUser } from '../helpers'

describe('User Management Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('User Creation and Profile', () => {
    it('should create a user with a default profile', async () => {
      const user = await createTestUser({
        email: 'newuser@example.com',
        name: 'New User',
      })

      expect(user.id).toBeTruthy()
      assertUser(user, {
        email: 'newuser@example.com',
        name: 'New User',
        emailVerified: true,
      })

      expect(user.profile).toBeTruthy()
      assertProfile(user.profile, {
        isMentor: false,
        rankingScore: 0,
        viewCount: 0,
        schoolYear: 'Junior',
        graduationYear: 2025,
      })

      assertRecentDate(user.createdAt)
      assertRecentDate(user.updatedAt)
    })

    it('should create a user with custom profile data', async () => {
      const user = await createTestUser({
        email: 'custom@example.com',
        name: 'Custom User',
        withProfile: {
          bio: 'This is my bio',
          schoolYear: 'Senior',
          graduationYear: 2024,
          isMentor: true,
        },
      })

      assertProfile(user.profile, {
        bio: 'This is my bio',
        schoolYear: 'Senior',
        graduationYear: 2024,
        isMentor: true,
      })
    })

    it('should create multiple users with unique emails', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()
      const user3 = await createTestUser()

      expect(user1.email).not.toBe(user2.email)
      expect(user2.email).not.toBe(user3.email)
      expect(user1.id).not.toBe(user2.id)
    })
  })

  describe('User Profile Updates', () => {
    it('should update user profile information', async () => {
      const user = await createTestUser()

      await testDb
        .update(schema.userProfile)
        .set({
          bio: 'Updated bio',
          schoolYear: 'Graduate',
          graduationYear: 2026,
        })
        .where(eq(schema.userProfile.userId, user.id))

      const updatedUser = await getUserWithProfile(user.id)
      expect(updatedUser).toBeTruthy()
      if (updatedUser) {
        assertProfile(updatedUser.profile, {
          bio: 'Updated bio',
          schoolYear: 'Graduate',
          graduationYear: 2026,
        })
      }
    })

    it('should update user ranking score', async () => {
      const user = await createTestUser()

      await testDb
        .update(schema.userProfile)
        .set({ rankingScore: 100.5 })
        .where(eq(schema.userProfile.userId, user.id))

      const updatedUser = await getUserWithProfile(user.id)
      expect(updatedUser?.profile.rankingScore).toBeCloseTo(100.5)
    })

    it('should increment view count', async () => {
      const user = await createTestUser()

      // Increment view count
      await testDb
        .update(schema.userProfile)
        .set({ viewCount: user.profile.viewCount + 1 })
        .where(eq(schema.userProfile.userId, user.id))

      const updatedUser = await getUserWithProfile(user.id)
      expect(updatedUser?.profile.viewCount).toBe(1)

      // Increment again
      if (updatedUser) {
        await testDb
          .update(schema.userProfile)
          .set({ viewCount: updatedUser.profile.viewCount + 1 })
          .where(eq(schema.userProfile.userId, user.id))
      }

      const finalUser = await getUserWithProfile(user.id)
      expect(finalUser?.profile.viewCount).toBe(2)
    })
  })

  describe('School and Major Associations', () => {
    it('should associate a user with a school', async () => {
      const user = await createTestUser()
      const school = await createTestSchool({
        name: 'Test University',
        domain: 'test.edu',
      })

      await associateUserWithSchool(user.id, school.id)

      const userSchools = await testDb.query.userSchool.findMany({
        where: eq(schema.userSchool.userId, user.id),
      })

      expect(userSchools).toHaveLength(1)
      expect(userSchools[0]?.schoolId).toBe(school.id)
    })

    it('should associate a user with multiple majors', async () => {
      const user = await createTestUser()
      const major1 = await createTestMajor({ name: 'Computer Science' })
      const major2 = await createTestMajor({ name: 'Mathematics' })

      await associateUserWithMajor(user.id, major1.id)
      await associateUserWithMajor(user.id, major2.id)

      const userMajors = await testDb.query.userMajor.findMany({
        where: eq(schema.userMajor.userId, user.id),
      })

      expect(userMajors).toHaveLength(2)
      const majorIds = userMajors.map(um => um.majorId)
      expect(majorIds).toContain(major1.id)
      expect(majorIds).toContain(major2.id)
    })

    it('should query users with their schools and majors', async () => {
      const user = await createTestUser()
      const school = await createTestSchool()
      const major = await createTestMajor()

      await associateUserWithSchool(user.id, school.id)
      await associateUserWithMajor(user.id, major.id)

      const userWithRelations = await testDb.query.user.findFirst({
        where: eq(schema.user.id, user.id),
        with: {
          profile: true,
          schools: {
            with: {
              school: true,
            },
          },
          majors: {
            with: {
              major: true,
            },
          },
        },
      })

      expect(userWithRelations).toBeTruthy()
      expect(userWithRelations?.schools).toHaveLength(1)
      expect(userWithRelations?.majors).toHaveLength(1)
      expect(userWithRelations?.schools[0]?.school.name).toBe(school.name)
      expect(userWithRelations?.majors[0]?.major.name).toBe(major.name)
    })
  })

  describe('Soft Deletes', () => {
    it('should soft delete a user', async () => {
      const user = await createTestUser()

      await softDeleteUser(user.id)

      const deletedUser = await testDb.query.user.findFirst({
        where: eq(schema.user.id, user.id),
      })

      expect(deletedUser?.deletedAt).toBeTruthy()
      assertRecentDate(deletedUser?.deletedAt ?? null)
    })

    it('should exclude soft-deleted users from queries with WHERE clause', async () => {
      const user1 = await createTestUser()
      const user2 = await createTestUser()

      await softDeleteUser(user1.id)

      const activeUsers = await testDb.query.user.findMany({
        where: eq(schema.user.deletedAt, null),
      })

      const activeUserIds = activeUsers.map(u => u.id)
      expect(activeUserIds).not.toContain(user1.id)
      expect(activeUserIds).toContain(user2.id)
    })

    it('should still be able to query soft-deleted users explicitly', async () => {
      const user = await createTestUser()
      await softDeleteUser(user.id)

      const deletedUser = await testDb.query.user.findFirst({
        where: eq(schema.user.id, user.id),
      })

      expect(deletedUser).toBeTruthy()
      expect(deletedUser?.deletedAt).not.toBeNull()
    })
  })

  describe('User Search and Filtering', () => {
    it('should filter users by mentor status', async () => {
      await createTestUser({ withProfile: { isMentor: false } })
      await createTestUser({ withProfile: { isMentor: true } })
      await createTestUser({ withProfile: { isMentor: true } })

      const mentors = await testDb.query.userProfile.findMany({
        where: eq(schema.userProfile.isMentor, true),
      })

      expect(mentors).toHaveLength(2)
      mentors.forEach(mentor => {
        expect(mentor.isMentor).toBe(true)
      })
    })

    it('should filter users by school year', async () => {
      await createTestUser({ withProfile: { schoolYear: 'Freshman' } })
      await createTestUser({ withProfile: { schoolYear: 'Senior' } })
      await createTestUser({ withProfile: { schoolYear: 'Senior' } })

      const seniors = await testDb.query.userProfile.findMany({
        where: eq(schema.userProfile.schoolYear, 'Senior'),
      })

      expect(seniors).toHaveLength(2)
    })

    it('should sort users by ranking score', async () => {
      const user1 = await createTestUser({ withProfile: { rankingScore: 50 } })
      const user2 = await createTestUser({ withProfile: { rankingScore: 100 } })
      const user3 = await createTestUser({ withProfile: { rankingScore: 25 } })

      const rankedUsers = await testDb.query.userProfile.findMany({
        orderBy: (profiles, { desc }) => [desc(profiles.rankingScore)],
      })

      expect(rankedUsers[0]?.userId).toBe(user2.id)
      expect(rankedUsers[1]?.userId).toBe(user1.id)
      expect(rankedUsers[2]?.userId).toBe(user3.id)
    })
  })

  describe('User Data Integrity', () => {
    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com'
      await createTestUser({ email })

      await expect(
        testDb.insert(schema.user).values({
          email,
          name: 'Another User',
        })
      ).rejects.toThrow()
    })

    it('should cascade delete user profile when user is deleted', async () => {
      const user = await createTestUser()

      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      const profile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(profile).toBeUndefined()
    })

    it('should maintain referential integrity for school associations', async () => {
      const user = await createTestUser()
      const school = await createTestSchool()

      await associateUserWithSchool(user.id, school.id)

      // Delete the school
      await testDb.delete(schema.school).where(eq(schema.school.id, school.id))

      // User-school association should also be deleted (cascade)
      const userSchool = await testDb.query.userSchool.findFirst({
        where: eq(schema.userSchool.userId, user.id),
      })

      expect(userSchool).toBeUndefined()
    })
  })
})
