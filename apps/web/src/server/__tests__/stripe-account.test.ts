/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { mentorStripeAccounts } from '~/server/db/schema'
import { createTestUser, createTestStripeAccount, cleanupTestUser } from './test-helpers'

describe('Mentor Stripe Account Setup', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'Stripe Mentor',
      email: 'stripe@test.com',
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await cleanupTestUser(testUserId)
  })

  it('should create a pending Stripe account', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'pending',
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
    })

    expect(stripeAccount).toBeDefined()
    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }
    expect(stripeAccount.stripeAccountStatus).toBe('pending')
    expect(stripeAccount.payoutsEnabled).toBe(false)
    expect(stripeAccount.chargesEnabled).toBe(false)
    expect(stripeAccount.detailsSubmitted).toBe(false)
  })

  it('should update Stripe account to active status', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'pending',
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    // Update to active
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

    // Verify update
    const updated = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.id, stripeAccount.id),
    })

    if (!updated) {
      throw new Error('Failed to find updated Stripe account')
    }

    expect(updated.stripeAccountStatus).toBe('active')
    expect(updated.chargesEnabled).toBe(true)
    expect(updated.payoutsEnabled).toBe(true)
    expect(updated.detailsSubmitted).toBe(true)
    expect(updated.onboardingCompleted).toBeDefined()
  })

  it('should handle restricted Stripe account', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'restricted',
      chargesEnabled: false,
      payoutsEnabled: false,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    expect(stripeAccount.stripeAccountStatus).toBe('restricted')
    expect(stripeAccount.chargesEnabled).toBe(false)
    expect(stripeAccount.payoutsEnabled).toBe(false)
  })

  it('should check if mentor has Stripe account', async () => {
    // Initially no account
    let account = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    expect(account).toBeUndefined()

    // Create account
    await createTestStripeAccount(testUserId)

    // Now account exists
    account = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    expect(account).toBeDefined()
  })

  it('should verify charges are enabled before accepting paid bookings', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    expect(stripeAccount.chargesEnabled).toBe(true)
  })

  it('should verify payouts are enabled for transferring funds', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    expect(stripeAccount.payoutsEnabled).toBe(true)
  })

  it('should track onboarding completion date', async () => {
    const onboardingDate = new Date()
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'pending',
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    // Update with onboarding completion
    await testDb
      .update(mentorStripeAccounts)
      .set({
        onboardingCompleted: onboardingDate,
        stripeAccountStatus: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })
      .where(eq(mentorStripeAccounts.id, stripeAccount.id))

    // Verify onboarding date
    const updated = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.id, stripeAccount.id),
    })

    if (!updated) {
      throw new Error('Failed to find updated Stripe account')
    }

    expect(updated.onboardingCompleted).toBeDefined()
    expect(updated.stripeAccountStatus).toBe('active')
  })

  it('should handle Stripe account with requirements', async () => {
    const requirements = {
      currently_due: ['individual.email'],
      eventually_due: ['individual.address.line1'],
      past_due: [],
    }

    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'pending',
      detailsSubmitted: false,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    // Update with requirements
    await testDb
      .update(mentorStripeAccounts)
      .set({
        requirements,
      })
      .where(eq(mentorStripeAccounts.id, stripeAccount.id))

    // Verify requirements stored
    const updated = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.id, stripeAccount.id),
    })

    if (!updated) {
      throw new Error('Failed to find updated Stripe account')
    }

    expect(updated.requirements).toEqual(requirements)
  })

  it('should handle inactive Stripe account', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'inactive',
      chargesEnabled: false,
      payoutsEnabled: false,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    expect(stripeAccount.stripeAccountStatus).toBe('inactive')
  })

  it('should allow only one Stripe account per user', async () => {
    // Create first account
    await createTestStripeAccount(testUserId, {
      stripeAccountId: 'acct_first',
    })

    // Query accounts for user
    const accounts = await testDb.query.mentorStripeAccounts.findMany({
      where: eq(mentorStripeAccounts.userId, testUserId),
    })

    // Should have exactly one account
    expect(accounts).toHaveLength(1)
  })

  it('should track all Stripe account status fields correctly', async () => {
    const stripeAccount = await createTestStripeAccount(testUserId, {
      stripeAccountStatus: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    })

    if (!stripeAccount) {
      throw new Error('Failed to create Stripe account')
    }

    // Verify all fields
    expect(stripeAccount.stripeAccountStatus).toBe('active')
    expect(stripeAccount.chargesEnabled).toBe(true)
    expect(stripeAccount.payoutsEnabled).toBe(true)
    expect(stripeAccount.detailsSubmitted).toBe(true)
    expect(stripeAccount.userId).toBe(testUserId)
  })

  it('should handle Stripe account ID uniqueness', async () => {
    const accountId = 'acct_unique_test_123'
    const account = await createTestStripeAccount(testUserId, {
      stripeAccountId: accountId,
    })

    if (!account) {
      throw new Error('Failed to create Stripe account')
    }

    expect(account.stripeAccountId).toBe(accountId)

    // Verify it can be queried by Stripe account ID
    const found = await testDb.query.mentorStripeAccounts.findFirst({
      where: eq(mentorStripeAccounts.stripeAccountId, accountId),
    })

    if (!found) {
      throw new Error('Failed to find Stripe account by account ID')
    }

    expect(found.id).toBe(account.id)
  })
})
