import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import {
  users,
  userProfiles,
  calcomTokens,
  mentorEventTypes,
  mentorStripeAccounts,
} from '~/server/db/schema'
import {
  createTestUser,
  createTestCalcomTokens,
  createTestEventType,
  createTestStripeAccount,
  createTestSchool,
  createTestMajor,
  associateUserWithSchool,
  associateUserWithMajor,
  cleanupTestUser,
} from './test-helpers'

describe('Mentor Onboarding Flow (E2E)', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'New Mentor',
      email: 'newmentor@test.com',
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await cleanupTestUser(testUserId)
  })

  it('should complete full mentor onboarding flow', async () => {
    // Step 1: User signs up (already done in beforeEach)
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, testUserId),
    })

    expect(user).toBeDefined()
    expect(user?.email).toBe('newmentor@test.com')

    // Step 2: Complete profile with bio and image
    await testDb
      .update(users)
      .set({ image: 'https://example.com/profile.jpg' })
      .where(eq(users.id, testUserId))

    await testDb
      .update(userProfiles)
      .set({
        bio: 'Experienced software engineer with 5+ years in tech',
        graduationYear: 2020,
        schoolYear: 'Graduate',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    const profileCompleted = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    expect(profileCompleted?.bio).toBeDefined()
    expect(profileCompleted?.bio).not.toBeNull()

    // Step 3: Add school and major
    const school = await createTestSchool({
      name: 'UC Berkeley',
      domainPrefix: 'berkeley',
      location: 'Berkeley, CA',
    })

    const major = await createTestMajor({
      name: 'Computer Science',
    })

    await associateUserWithSchool(testUserId, school.id)
    await associateUserWithMajor(testUserId, major.id)

    // Step 4: Set up Cal.com integration
    const tokens = await createTestCalcomTokens(testUserId, {
      calcomUserId: 54321,
      calcomUsername: 'newmentor',
    })

    expect(tokens).toBeDefined()

    // Step 5: Create event types
    const eventType1 = await createTestEventType(testUserId, {
      calcomEventTypeId: 1001,
      title: '30 Minute Consultation',
      description: 'Quick career advice session',
      duration: 30,
      customPrice: 0, // Free
      isEnabled: false, // Not enabled yet
    })

    const eventType2 = await createTestEventType(testUserId, {
      calcomEventTypeId: 1002,
      title: '60 Minute Deep Dive',
      description: 'In-depth career planning session',
      duration: 60,
      customPrice: 5000, // $50.00
      isEnabled: false,
    })

    expect(eventType1).toBeDefined()
    expect(eventType2).toBeDefined()

    // Step 6: Set up Stripe for paid sessions
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })

    expect(stripeAccount).toBeDefined()

    // Step 7: Complete Stripe onboarding
    await testDb
      .update(mentorStripeAccounts)
      .set({
        stripeAccountStatus: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        onboardingCompleted: new Date(),
      })
      .where(eq(mentorStripeAccounts.id, stripeAccount.id))

    // Step 8: Enable event types
    await testDb
      .update(mentorEventTypes)
      .set({ isEnabled: true })
      .where(eq(mentorEventTypes.id, eventType1.id))

    await testDb
      .update(mentorEventTypes)
      .set({ isEnabled: true })
      .where(eq(mentorEventTypes.id, eventType2.id))

    // Verify complete onboarding status
    const finalUser = await testDb
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        profileBio: userProfiles.bio,
        hasCalcomTokens: calcomTokens.id,
        stripeStatus: mentorStripeAccounts.stripeAccountStatus,
        chargesEnabled: mentorStripeAccounts.chargesEnabled,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(calcomTokens, eq(users.id, calcomTokens.userId))
      .leftJoin(mentorStripeAccounts, eq(users.id, mentorStripeAccounts.userId))
      .where(eq(users.id, testUserId))
      .limit(1)

    expect(finalUser[0]).toBeDefined()
    expect(finalUser[0]?.userImage).toBeTruthy()
    expect(finalUser[0]?.profileBio).toBeTruthy()
    expect(finalUser[0]?.hasCalcomTokens).toBeTruthy()
    expect(finalUser[0]?.stripeStatus).toBe('active')
    expect(finalUser[0]?.chargesEnabled).toBe(true)

    // Verify enabled event types
    const enabledEventTypes = await testDb.query.mentorEventTypes.findMany({
      where: eq(mentorEventTypes.mentorUserId, testUserId),
    })

    const allEnabled = enabledEventTypes.every(et => et.isEnabled)
    expect(allEnabled).toBe(true)
    expect(enabledEventTypes).toHaveLength(2)
  })

  it('should allow mentor to offer only free sessions without Stripe', async () => {
    // Step 1-3: Basic profile setup
    await testDb
      .update(users)
      .set({ image: 'https://example.com/mentor.jpg' })
      .where(eq(users.id, testUserId))

    await testDb
      .update(userProfiles)
      .set({
        bio: 'Passionate about helping students',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Step 4: Set up Cal.com
    await createTestCalcomTokens(testUserId)

    // Step 5: Create only free event types
    const freeEventType = await createTestEventType(testUserId, {
      title: 'Free Consultation',
      duration: 30,
      customPrice: 0,
      isEnabled: true,
    })

    // Verify mentor can be active without Stripe
    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    const tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, testUserId),
    })

    const stripeAccount = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    expect(profile?.bio).toBeTruthy()
    expect(tokens).toBeDefined()
    expect(stripeAccount).toBeUndefined() // No Stripe needed
    expect(freeEventType.isEnabled).toBe(true)
    expect(freeEventType.customPrice).toBe(0)
  })

  it('should require Stripe for paid event types', async () => {
    // Set up basic profile
    await testDb
      .update(userProfiles)
      .set({
        bio: 'Expert mentor',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, testUserId))

    // Set up Cal.com
    await createTestCalcomTokens(testUserId)

    // Create paid event type
    const paidEventType = await createTestEventType(testUserId, {
      title: 'Paid Session',
      customPrice: 3000, // $30.00
      isEnabled: false, // Can't enable without Stripe
    })

    // Check Stripe status (should be missing)
    let stripeAccount = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    expect(stripeAccount).toBeUndefined()

    // Now set up Stripe
    stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })

    // Now can enable paid event type
    await testDb
      .update(mentorEventTypes)
      .set({ isEnabled: true })
      .where(eq(mentorEventTypes.id, paidEventType.id))

    const updated = await testDb.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.id, paidEventType.id),
    })

    expect(updated?.isEnabled).toBe(true)
    expect(stripeAccount.chargesEnabled).toBe(true)
  })

  it('should track onboarding completion steps', async () => {
    // Track each step completion
    const steps = {
      profileCompleted: false,
      calcomConnected: false,
      eventTypesEnabled: false,
      stripeConnected: false,
    }

    // Step 1: Complete profile
    await testDb
      .update(users)
      .set({ image: 'https://example.com/image.jpg' })
      .where(eq(users.id, testUserId))

    await testDb
      .update(userProfiles)
      .set({ bio: 'Test bio', updatedAt: new Date() })
      .where(eq(userProfiles.userId, testUserId))

    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    steps.profileCompleted = !!(profile?.bio && profile.bio.length > 0)

    // Step 2: Connect Cal.com
    await createTestCalcomTokens(testUserId)

    const tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, testUserId),
    })

    steps.calcomConnected = !!tokens

    // Step 3: Enable event types
    const eventType = await createTestEventType(testUserId, {
      title: 'Test Event',
      isEnabled: true,
    })

    const enabledTypes = await testDb.query.mentorEventTypes.findMany({
      where: eq(mentorEventTypes.mentorUserId, testUserId),
    })

    steps.eventTypesEnabled = enabledTypes.some(et => et.isEnabled)

    // Step 4: Connect Stripe (optional for free sessions)
    await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
    })

    const stripe = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    steps.stripeConnected = !!stripe?.chargesEnabled

    // Verify all steps completed
    expect(steps.profileCompleted).toBe(true)
    expect(steps.calcomConnected).toBe(true)
    expect(steps.eventTypesEnabled).toBe(true)
    expect(steps.stripeConnected).toBe(true)
  })

  it('should handle partial onboarding state', async () => {
    // User created but profile incomplete
    const user = await testDb.query.users.findFirst({
      where: eq(users.id, testUserId),
    })

    const profile = await testDb.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, testUserId),
    })

    const tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, testUserId),
    })

    const stripe = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    const eventTypes = await testDb.query.mentorEventTypes.findMany({
      where: eq(mentorEventTypes.mentorUserId, testUserId),
    })

    // User exists but nothing else is set up
    expect(user).toBeDefined()
    expect(profile?.bio).toBeNull()
    expect(tokens).toBeUndefined()
    expect(stripe).toBeUndefined()
    expect(eventTypes).toHaveLength(0)
  })
})
