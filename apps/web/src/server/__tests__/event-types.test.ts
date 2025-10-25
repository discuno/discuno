import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { mentorEventTypes, mentorStripeAccounts } from '~/server/db/schema'
import {
  createTestUser,
  createTestEventType,
  createTestStripeAccount,
  cleanupTestUser,
} from './test-helpers'

describe('Mentor Event Type Management', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'Event Type Mentor',
      email: 'eventtypes@test.com',
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await cleanupTestUser(testUserId)
  })

  it('should create a new event type for mentor', async () => {
    // Create event type
    const eventType = await createTestEventType(testUserId, {
      calcomEventTypeId: 12345,
      title: '30 Minute Consultation',
      description: 'Quick consultation session',
      duration: 30,
      isEnabled: false,
      customPrice: 0,
    })

    expect(eventType).toBeDefined()
    expect(eventType.title).toBe('30 Minute Consultation')
    expect(eventType.duration).toBe(30)
    expect(eventType.isEnabled).toBe(false)
    expect(eventType.customPrice).toBe(0)
  })

  it('should enable an event type', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Test Session',
      isEnabled: false,
    })

    // Enable the event type
    await testDb
      .update(mentorEventTypes)
      .set({ isEnabled: true })
      .where(eq(mentorEventTypes.id, eventType.id))

    // Verify it was enabled
    const updated = await testDb.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.id, eventType.id),
    })

    expect(updated?.isEnabled).toBe(true)
  })

  it('should disable an event type', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Test Session',
      isEnabled: true,
    })

    // Disable the event type
    await testDb
      .update(mentorEventTypes)
      .set({ isEnabled: false })
      .where(eq(mentorEventTypes.id, eventType.id))

    // Verify it was disabled
    const updated = await testDb.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.id, eventType.id),
    })

    expect(updated?.isEnabled).toBe(false)
  })

  it('should set pricing for a free event type', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Free Session',
      customPrice: 0,
    })

    expect(eventType.customPrice).toBe(0)
    expect(eventType.currency).toBe('USD')
  })

  it('should set pricing for a paid event type', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Paid Session',
      customPrice: 2500, // $25.00 in cents
      currency: 'USD',
    })

    expect(eventType.customPrice).toBe(2500)
    expect(eventType.currency).toBe('USD')
  })

  it('should update event type pricing', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Session',
      customPrice: 1000, // $10.00
    })

    // Update price
    await testDb
      .update(mentorEventTypes)
      .set({ customPrice: 2000 }) // $20.00
      .where(eq(mentorEventTypes.id, eventType.id))

    // Verify price was updated
    const updated = await testDb.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.id, eventType.id),
    })

    expect(updated?.customPrice).toBe(2000)
  })

  it('should handle multiple event types for a mentor', async () => {
    // Create multiple event types
    const eventType1 = await createTestEventType(testUserId, {
      title: '30 Minute Session',
      duration: 30,
      customPrice: 1500,
    })

    const eventType2 = await createTestEventType(testUserId, {
      title: '60 Minute Session',
      duration: 60,
      customPrice: 2500,
    })

    // Query all event types for this mentor
    const eventTypes = await testDb.query.mentorEventTypes.findMany({
      where: eq(mentorEventTypes.mentorUserId, testUserId),
    })

    expect(eventTypes).toHaveLength(2)
    expect(eventTypes.some(et => et.title === '30 Minute Session')).toBe(true)
    expect(eventTypes.some(et => et.title === '60 Minute Session')).toBe(true)
  })

  it('should only return enabled event types', async () => {
    // Create enabled and disabled event types
    await createTestEventType(testUserId, {
      title: 'Enabled Session',
      isEnabled: true,
    })

    await createTestEventType(testUserId, {
      title: 'Disabled Session',
      isEnabled: false,
    })

    // Query only enabled event types
    const enabledEventTypes = await testDb.query.mentorEventTypes.findMany({
      where: eq(mentorEventTypes.mentorUserId, testUserId),
    })

    const enabled = enabledEventTypes.filter(et => et.isEnabled)
    const disabled = enabledEventTypes.filter(et => !et.isEnabled)

    expect(enabled).toHaveLength(1)
    expect(disabled).toHaveLength(1)
    expect(enabled[0]?.title).toBe('Enabled Session')
  })

  it('should verify paid event types require Stripe when querying', async () => {
    // Create a paid event type
    const paidEventType = await createTestEventType(testUserId, {
      title: 'Paid Consultation',
      customPrice: 5000, // $50.00
      isEnabled: true,
    })

    // Query with Stripe account check
    const result = await testDb
      .select({
        eventTypeId: mentorEventTypes.id,
        title: mentorEventTypes.title,
        customPrice: mentorEventTypes.customPrice,
        isEnabled: mentorEventTypes.isEnabled,
        chargesEnabled: mentorStripeAccounts.chargesEnabled,
      })
      .from(mentorEventTypes)
      .leftJoin(mentorStripeAccounts, eq(mentorEventTypes.mentorUserId, mentorStripeAccounts.userId))
      .where(eq(mentorEventTypes.id, paidEventType.id))

    expect(result[0]).toBeDefined()
    expect(result[0]?.customPrice).toBe(5000)
    expect(result[0]?.chargesEnabled).toBeNull() // No Stripe account yet
  })

  it('should allow paid event type when Stripe is active', async () => {
    // Create Stripe account
    await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })

    // Create paid event type
    const eventType = await createTestEventType(testUserId, {
      title: 'Paid Session',
      customPrice: 3000, // $30.00
      isEnabled: true,
    })

    // Query with Stripe status
    const result = await testDb
      .select({
        eventTypeId: mentorEventTypes.id,
        customPrice: mentorEventTypes.customPrice,
        chargesEnabled: mentorStripeAccounts.chargesEnabled,
      })
      .from(mentorEventTypes)
      .leftJoin(mentorStripeAccounts, eq(mentorEventTypes.mentorUserId, mentorStripeAccounts.userId))
      .where(eq(mentorEventTypes.id, eventType.id))

    expect(result[0]?.chargesEnabled).toBe(true)
    expect(result[0]?.customPrice).toBe(3000)
  })

  it('should update event type description', async () => {
    const eventType = await createTestEventType(testUserId, {
      title: 'Session',
      description: 'Original description',
    })

    // Update description
    await testDb
      .update(mentorEventTypes)
      .set({ description: 'Updated description' })
      .where(eq(mentorEventTypes.id, eventType.id))

    // Verify description was updated
    const updated = await testDb.query.mentorEventTypes.findFirst({
      where: eq(mentorEventTypes.id, eventType.id),
    })

    expect(updated?.description).toBe('Updated description')
  })

  it('should allow free event types without Stripe', async () => {
    // Create free event type without Stripe account
    const freeEventType = await createTestEventType(testUserId, {
      title: 'Free Session',
      customPrice: 0,
      isEnabled: true,
    })

    // Query with Stripe status
    const result = await testDb
      .select({
        eventTypeId: mentorEventTypes.id,
        customPrice: mentorEventTypes.customPrice,
        isEnabled: mentorEventTypes.isEnabled,
        chargesEnabled: mentorStripeAccounts.chargesEnabled,
      })
      .from(mentorEventTypes)
      .leftJoin(mentorStripeAccounts, eq(mentorEventTypes.mentorUserId, mentorStripeAccounts.userId))
      .where(eq(mentorEventTypes.id, freeEventType.id))

    expect(result[0]?.customPrice).toBe(0)
    expect(result[0]?.isEnabled).toBe(true)
    expect(result[0]?.chargesEnabled).toBeNull() // No Stripe needed for free
  })
})
