import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~/server/db/schema'
import { testDb } from '~/server/db/test-db'
import { clearDatabase } from '~/server/db/test-utils'
import {
  assignUserToMajor,
  assignUserToSchool,
  createCompleteUser,
  createTestMajor,
  createTestSchool,
  createTestUser,
  createTestUserProfile,
} from '../factories'
import { assertUserExists, assertUserHasProfile, getUserWithRelations } from '../helpers'

vi.mock('server-only', () => ({}))

describe('User Authentication and Profile Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  afterEach(async () => {
    await clearDatabase()
  })

  describe('User Creation', () => {
    it('should create a new user with email', async () => {
      const user = await createTestUser({
        email: 'newuser@example.com',
        name: 'New User',
      })

      expect(user.id).toBeDefined()
      expect(user.email).toBe('newuser@example.com')
      expect(user.name).toBe('New User')
      expect(user.emailVerified).toBe(true)

      await assertUserExists(user.id)
    })

    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com'
      await createTestUser({ email })

      // Attempting to create another user with same email should fail
      await expect(createTestUser({ email })).rejects.toThrow()
    })

    it('should allow soft-deleted users (deleted_at is set)', async () => {
      const user = await createTestUser()

      // Soft delete the user
      await testDb
        .update(schema.user)
        .set({ deletedAt: new Date() })
        .where(eq(schema.user.id, user.id))

      const deletedUser = await testDb.query.user.findFirst({
        where: eq(schema.user.id, user.id),
      })

      expect(deletedUser?.deletedAt).toBeDefined()
    })
  })

  describe('User Profile Management', () => {
    it('should create a user profile with required fields', async () => {
      const user = await createTestUser()
      const profile = await createTestUserProfile(user.id, {
        schoolYear: 'Junior',
        graduationYear: 2026,
        bio: 'CS student interested in web development',
      })

      expect(profile.userId).toBe(user.id)
      expect(profile.schoolYear).toBe('Junior')
      expect(profile.graduationYear).toBe(2026)
      expect(profile.bio).toBe('CS student interested in web development')
      expect(profile.rankingScore).toBe(0)

      await assertUserHasProfile(user.id)
    })

    it('should enforce unique userId constraint on profiles', async () => {
      const user = await createTestUser()
      await createTestUserProfile(user.id)

      // Creating another profile for the same user should fail
      await expect(createTestUserProfile(user.id)).rejects.toThrow()
    })

    it('should validate graduation year is not in the past', async () => {
      const user = await createTestUser()
      const currentYear = new Date().getFullYear()

      // Should fail for past years
      await expect(
        createTestUserProfile(user.id, {
          graduationYear: currentYear - 1,
        })
      ).rejects.toThrow()

      // Should succeed for current and future years
      const profile = await createTestUserProfile(user.id, {
        graduationYear: currentYear,
      })
      expect(profile.graduationYear).toBe(currentYear)
    })

    it('should support all school year enum values', async () => {
      const schoolYears: Array<'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'> = [
        'Freshman',
        'Sophomore',
        'Junior',
        'Senior',
        'Graduate',
      ]

      for (const schoolYear of schoolYears) {
        const user = await createTestUser()
        const profile = await createTestUserProfile(user.id, { schoolYear })
        expect(profile.schoolYear).toBe(schoolYear)
      }
    })
  })

  describe('School and Major Associations', () => {
    it('should associate a user with a school', async () => {
      const user = await createTestUser()
      const school = await createTestSchool({
        name: 'Stanford University',
        domainPrefix: 'stanford',
        location: 'Stanford, CA',
      })

      const userSchool = await assignUserToSchool(user.id, school.id)

      expect(userSchool.userId).toBe(user.id)
      expect(userSchool.schoolId).toBe(school.id)
    })

    it('should associate a user with a major', async () => {
      const user = await createTestUser()
      const major = await createTestMajor({ name: 'Computer Science' })

      const userMajor = await assignUserToMajor(user.id, major.id)

      expect(userMajor.userId).toBe(user.id)
      expect(userMajor.majorId).toBe(major.id)
    })

    it('should allow a user to have multiple majors', async () => {
      const user = await createTestUser()
      const major1 = await createTestMajor({ name: 'Computer Science' })
      const major2 = await createTestMajor({ name: 'Mathematics' })

      await assignUserToMajor(user.id, major1.id)
      await assignUserToMajor(user.id, major2.id)

      const userMajors = await testDb.query.userMajor.findMany({
        where: eq(schema.userMajor.userId, user.id),
      })

      expect(userMajors).toHaveLength(2)
    })

    it('should create a complete user with all associations', async () => {
      const { user, profile, school, major } = await createCompleteUser({
        user: { name: 'Complete User', email: 'complete@example.com' },
        profile: { schoolYear: 'Senior', graduationYear: 2025 },
        school: { name: 'MIT', domainPrefix: 'mit' },
        major: { name: 'Electrical Engineering' },
      })

      expect(user.id).toBeDefined()
      expect(profile.userId).toBe(user.id)

      // Verify school association
      const userSchool = await testDb.query.userSchool.findFirst({
        where: eq(schema.userSchool.userId, user.id),
      })
      expect(userSchool?.schoolId).toBe(school.id)

      // Verify major association
      const userMajor = await testDb.query.userMajor.findFirst({
        where: eq(schema.userMajor.userId, user.id),
      })
      expect(userMajor?.majorId).toBe(major.id)
    })
  })

  describe('User Data Retrieval with Relations', () => {
    it('should retrieve user with all relations', async () => {
      const { user } = await createCompleteUser()

      const fullUser = await getUserWithRelations(user.id)

      expect(fullUser).toBeDefined()
      expect(fullUser?.id).toBe(user.id)
      // These may be null/undefined for a regular user
      expect('calcomTokens' in fullUser!).toBe(true)
      expect('stripeAccount' in fullUser!).toBe(true)
      expect('mentorEventTypes' in fullUser!).toBe(true)
    })

    it('should cascade delete user profile when user is deleted', async () => {
      const user = await createTestUser()
      const profile = await createTestUserProfile(user.id)

      // Delete user
      await testDb.delete(schema.user).where(eq(schema.user.id, user.id))

      // Profile should also be deleted due to cascade
      const deletedProfile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.id, profile.id),
      })

      expect(deletedProfile).toBeUndefined()
    })
  })

  describe('User Profile Updates', () => {
    it('should update user profile bio and timezone', async () => {
      const user = await createTestUser()
      const profile = await createTestUserProfile(user.id, {
        bio: 'Initial bio',
        timezone: 'UTC',
      })

      // Update profile
      await testDb
        .update(schema.userProfile)
        .set({
          bio: 'Updated bio with more details',
          timezone: 'America/New_York',
        })
        .where(eq(schema.userProfile.id, profile.id))

      const updatedProfile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(updatedProfile?.bio).toBe('Updated bio with more details')
      expect(updatedProfile?.timezone).toBe('America/New_York')
    })

    it('should update ranking score', async () => {
      const user = await createTestUser()
      const profile = await createTestUserProfile(user.id)

      expect(profile.rankingScore).toBe(0)

      // Simulate ranking score update
      await testDb
        .update(schema.userProfile)
        .set({ rankingScore: 42.5 })
        .where(eq(schema.userProfile.id, profile.id))

      const updatedProfile = await testDb.query.userProfile.findFirst({
        where: eq(schema.userProfile.userId, user.id),
      })

      expect(updatedProfile?.rankingScore).toBe(42.5)
    })
  })
})
