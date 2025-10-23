import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { users, userProfiles, userSchools, userMajors } from '~/server/db/schema'
import {
  createTestUser,
  createTestSchool,
  createTestMajor,
  cleanupTestUser,
} from './test-helpers'

describe('Mentor Profile Management', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'John Mentor',
      email: 'mentor@test.com',
      bio: 'Test mentor bio',
      schoolYear: 'Graduate',
      graduationYear: 2024,
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await cleanupTestUser(testUserId)
  })

  it('should create a complete mentor profile', async () => {
    // Verify user was created
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, testUserId),
    })

    expect(user).toBeDefined()
    expect(user?.name).toBe('John Mentor')
    expect(user?.email).toBe('mentor@test.com')

    // Verify profile was created
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile).toBeDefined()
    expect(profile?.bio).toBe('Test mentor bio')
    expect(profile?.schoolYear).toBe('Graduate')
    expect(profile?.graduationYear).toBe(2024)
    expect(profile?.rankingScore).toBe(0)
  })

  it('should update mentor profile information', async () => {
    // Update user profile
    await testDb
      .update(userProfiles)
      .set({
        bio: 'Updated mentor bio',
        graduationYear: 2025,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Verify update
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.bio).toBe('Updated mentor bio')
    expect(profile?.graduationYear).toBe(2025)
  })

  it('should associate mentor with school', async () => {
    // Create a test school
    const school = await createTestSchool({
      name: 'Stanford University',
      domainPrefix: 'stanford',
      location: 'Stanford, CA',
    })

    if (!school) {
      throw new Error('Failed to create school')
    }

    // Associate user with school
    await testDb.insert(userSchools).values({
      userId: testUserId,
      schoolId: school.id,
    })

    // Verify association
    const userSchool = await testDb.query.userSchools.findFirst({
      where: eq(userSchools.userId, testUserId),
    })

    expect(userSchool).toBeDefined()
    expect(userSchool?.schoolId).toBe(school.id)

    // Clean up school
    await testDb.delete(userSchools).where(eq(userSchools.userId, testUserId))
  })

  it('should associate mentor with major', async () => {
    // Create a test major
    const major = await createTestMajor({
      name: 'Computer Science',
    })

    if (!major) {
      throw new Error('Failed to create major')
    }

    // Associate user with major
    await testDb.insert(userMajors).values({
      userId: testUserId,
      majorId: major.id,
    })

    // Verify association
    const userMajor = await testDb.query.userMajors.findFirst({
      where: eq(userMajors.userId, testUserId),
    })

    expect(userMajor).toBeDefined()
    expect(userMajor?.majorId).toBe(major.id)

    // Clean up major
    await testDb.delete(userMajors).where(eq(userMajors.userId, testUserId))
  })

  it('should handle profile with image URL', async () => {
    const imageUrl = 'https://example.com/profile.jpg'

    // Update user with image
    await testDb.update(users).set({ image: imageUrl }).where(eq(users.id, testUserId))

    // Verify image was saved
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, testUserId),
    })

    expect(user?.image).toBe(imageUrl)
  })

  it('should update timezone in profile', async () => {
    // Update timezone
    await testDb
      .update(userProfiles)
      .set({
        timezone: 'America/Los_Angeles',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Verify timezone update
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.timezone).toBe('America/Los_Angeles')
  })

  it('should maintain ranking score when profile is updated', async () => {
    // Set initial ranking score
    await testDb
      .update(userProfiles)
      .set({
        rankingScore: 50.5,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Update other fields
    await testDb
      .update(userProfiles)
      .set({
        bio: 'New bio',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Verify ranking score was preserved
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profile?.rankingScore).toBe(50.5)
    expect(profile?.bio).toBe('New bio')
  })

  it('should create a complete mentor profile with all associations', async () => {
    // Create school and major
    const school = await createTestSchool({
      name: 'MIT',
      domainPrefix: 'mit',
      location: 'Cambridge, MA',
    })

    const major = await createTestMajor({
      name: 'Electrical Engineering',
    })

    // Ensure school and major were created
    if (!school || !major) {
      throw new Error('Failed to create school or major')
    }

    // Associate with user
    await testDb.insert(userSchools).values({
      userId: testUserId,
      schoolId: school.id,
    })

    await testDb.insert(userMajors).values({
      userId: testUserId,
      majorId: major.id,
    })

    // Verify full profile with joins
    const result = await testDb
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        profileBio: userProfiles.bio,
        schoolName: userSchools.schoolId,
        majorName: userMajors.majorId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userSchools, eq(users.id, userSchools.userId))
      .leftJoin(userMajors, eq(users.id, userMajors.userId))
      .where(eq(users.id, testUserId))
      .limit(1)

    expect(result[0]).toBeDefined()
    expect(result[0]?.userName).toBe('John Mentor')
    expect(result[0]?.profileBio).toBe('Test mentor bio')
    expect(result[0]?.schoolName).toBe(school.id)
    expect(result[0]?.majorName).toBe(major.id)

    // Clean up
    await testDb.delete(userSchools).where(eq(userSchools.userId, testUserId))
    await testDb.delete(userMajors).where(eq(userMajors.userId, testUserId))
  })
})
