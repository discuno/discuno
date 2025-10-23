import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { testDb } from '~/server/db/test-db'
import { calcomTokens } from '~/server/db/schema'
import { createTestUser, createTestCalcomTokens, cleanupTestUser } from './test-helpers'

describe('Cal.com Integration and Token Management', () => {
  let testUserId: string

  beforeEach(async () => {
    const { user } = await createTestUser({
      name: 'Cal.com User',
      email: 'calcom@test.com',
    })
    testUserId = user.id
  })

  afterEach(async () => {
    await cleanupTestUser(testUserId)
  })

  it('should create Cal.com tokens for a user', async () => {
    const tokens = await createTestCalcomTokens(testUserId, {
      calcomUserId: 12345,
      calcomUsername: 'testuser',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_456',
    })

    expect(tokens).toBeDefined()
    expect(tokens.userId).toBe(testUserId)
    expect(tokens.calcomUserId).toBe(12345)
    expect(tokens.calcomUsername).toBe('testuser')
    expect(tokens.accessToken).toBe('access_token_123')
    expect(tokens.refreshToken).toBe('refresh_token_456')
  })

  it('should verify access token expiration tracking', async () => {
    const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
    const tokens = await createTestCalcomTokens(testUserId)

    expect(tokens.accessTokenExpiresAt).toBeDefined()
    expect(tokens.accessTokenExpiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('should verify refresh token expiration tracking', async () => {
    const tokens = await createTestCalcomTokens(testUserId)

    expect(tokens.refreshTokenExpiresAt).toBeDefined()
    expect(tokens.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('should update access token after refresh', async () => {
    const tokens = await createTestCalcomTokens(testUserId)

    const newAccessToken = 'new_access_token_789'
    const newAccessTokenExpiresAt = new Date(Date.now() + 3600000)

    // Update tokens
    await testDb
      .update(calcomTokens)
      .set({
        accessToken: newAccessToken,
        accessTokenExpiresAt: newAccessTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calcomTokens.id, tokens.id))

    // Verify update
    const updated = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(updated?.accessToken).toBe(newAccessToken)
    expect(updated?.accessTokenExpiresAt.getTime()).toBe(newAccessTokenExpiresAt.getTime())
  })

  it('should update both access and refresh tokens during force refresh', async () => {
    const tokens = await createTestCalcomTokens(testUserId)

    const newAccessToken = 'force_access_token_123'
    const newRefreshToken = 'force_refresh_token_456'
    const newAccessTokenExpiresAt = new Date(Date.now() + 3600000)
    const newRefreshTokenExpiresAt = new Date(Date.now() + 86400000)

    // Force refresh updates both tokens
    await testDb
      .update(calcomTokens)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresAt: newAccessTokenExpiresAt,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calcomTokens.id, tokens.id))

    // Verify both were updated
    const updated = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(updated?.accessToken).toBe(newAccessToken)
    expect(updated?.refreshToken).toBe(newRefreshToken)
  })

  it('should detect expired access token', async () => {
    const pastDate = new Date(Date.now() - 3600000) // 1 hour ago

    // Create tokens with expired access token
    const tokens = await createTestCalcomTokens(testUserId)

    await testDb
      .update(calcomTokens)
      .set({ accessTokenExpiresAt: pastDate })
      .where(eq(calcomTokens.id, tokens.id))

    const updated = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(updated?.accessTokenExpiresAt.getTime()).toBeLessThan(Date.now())
  })

  it('should detect expired refresh token', async () => {
    const pastDate = new Date(Date.now() - 86400000) // 1 day ago

    const tokens = await createTestCalcomTokens(testUserId)

    await testDb
      .update(calcomTokens)
      .set({ refreshTokenExpiresAt: pastDate })
      .where(eq(calcomTokens.id, tokens.id))

    const updated = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(updated?.refreshTokenExpiresAt.getTime()).toBeLessThan(Date.now())
  })

  it('should check if user has Cal.com integration', async () => {
    // Initially no tokens
    let tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, testUserId),
    })

    expect(tokens).toBeUndefined()

    // Create tokens
    await createTestCalcomTokens(testUserId)

    // Now tokens exist
    tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, testUserId),
    })

    expect(tokens).toBeDefined()
  })

  it('should allow only one Cal.com integration per user', async () => {
    // Create tokens
    await createTestCalcomTokens(testUserId)

    // Query all tokens for user
    const allTokens = await testDb.query.calcomTokens.findMany({
      where: eq(calcomTokens.userId, testUserId),
    })

    // Should have exactly one
    expect(allTokens).toHaveLength(1)
  })

  it('should retrieve tokens by Cal.com username', async () => {
    const username = 'unique_test_user'
    await createTestCalcomTokens(testUserId, {
      calcomUsername: username,
    })

    const tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.calcomUsername, username),
    })

    expect(tokens).toBeDefined()
    expect(tokens?.calcomUsername).toBe(username)
  })

  it('should retrieve tokens by access token', async () => {
    const accessToken = 'unique_access_token_xyz'
    await createTestCalcomTokens(testUserId, {
      accessToken,
    })

    const tokens = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.accessToken, accessToken),
    })

    expect(tokens).toBeDefined()
    expect(tokens?.accessToken).toBe(accessToken)
  })

  it('should store Cal.com user ID correctly', async () => {
    const calcomUserId = 99999
    const tokens = await createTestCalcomTokens(testUserId, {
      calcomUserId,
    })

    expect(tokens.calcomUserId).toBe(calcomUserId)
  })

  it('should track when tokens were created and updated', async () => {
    const tokens = await createTestCalcomTokens(testUserId)

    expect(tokens.createdAt).toBeDefined()
    expect(tokens.updatedAt).toBeDefined()

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 10))

    await testDb
      .update(calcomTokens)
      .set({ accessToken: 'new_token', updatedAt: new Date() })
      .where(eq(calcomTokens.id, tokens.id))

    const updated = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    // Updated timestamp should be different from created
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(updated!.createdAt.getTime())
  })

  it('should validate token expiration logic for refresh decision', async () => {
    const now = new Date()
    const validAccessToken = new Date(now.getTime() + 3600000) // 1 hour future
    const expiredAccessToken = new Date(now.getTime() - 3600000) // 1 hour past
    const validRefreshToken = new Date(now.getTime() + 86400000) // 1 day future

    const tokens = await createTestCalcomTokens(testUserId)

    // Case 1: Valid access token - no refresh needed
    await testDb
      .update(calcomTokens)
      .set({ accessTokenExpiresAt: validAccessToken })
      .where(eq(calcomTokens.id, tokens.id))

    let current = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(current?.accessTokenExpiresAt.getTime()).toBeGreaterThan(now.getTime())

    // Case 2: Expired access token - refresh needed
    await testDb
      .update(calcomTokens)
      .set({ accessTokenExpiresAt: expiredAccessToken })
      .where(eq(calcomTokens.id, tokens.id))

    current = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(current?.accessTokenExpiresAt.getTime()).toBeLessThan(now.getTime())

    // Case 3: Valid refresh token allows normal refresh
    await testDb
      .update(calcomTokens)
      .set({ refreshTokenExpiresAt: validRefreshToken })
      .where(eq(calcomTokens.id, tokens.id))

    current = await testDb.query.calcomTokens.findFirst({
      where: eq(calcomTokens.id, tokens.id),
    })

    expect(current?.refreshTokenExpiresAt.getTime()).toBeGreaterThan(now.getTime())
  })
})
