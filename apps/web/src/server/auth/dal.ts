import 'server-only'

import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { createCalcomUser } from '~/lib/calcom'
import { db } from '~/server/db'
import { calcomTokens } from '~/server/db/schema'

/**
 * Data Access Layer for authentication operations
 * Following Next.js 2025 best practices for centralized auth logic
 */

/**
 * Check if user has Cal.com integration already set up
 */
export const hasCalcomIntegration = cache(async (userId: string): Promise<boolean> => {
  try {
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })
    return !!token
  } catch (error) {
    console.error('Error checking Cal.com integration:', error)
    return false
  }
})

/**
 * Create Cal.com managed user for a newly authenticated user
 * This function MUST succeed for authentication to complete
 * Throws an error if Cal.com integration fails
 */
export const createCalcomUserForNewUser = async ({
  userId,
  email,
  name,
  image,
}: {
  userId: string
  email: string
  name: string | null
  image: string | null
}): Promise<{ calcomUserId: number; username: string }> => {
  // Check if user already has Cal.com integration
  const hasIntegration = await hasCalcomIntegration(userId)
  if (hasIntegration) {
    console.log(`User ${userId} already has Cal.com integration, skipping creation`)
    // Get existing Cal.com user info
    const token = await db.query.calcomTokens.findFirst({
      where: eq(calcomTokens.userId, userId),
    })
    if (!token) {
      throw new Error('Cal.com integration check failed: token not found')
    }
    return {
      calcomUserId: token.calcomUserId,
      username: token.calcomUsername,
    }
  }

  // Create Cal.com managed user
  console.log(`Creating Cal.com user for new user: ${email}`)

  try {
    const calcomResult = await createCalcomUser({
      userId, // Pass the userId to avoid authentication check
      email,
      name: name ?? email.split('@')[0] ?? 'Mentor', // Fallback name
      timeZone: 'America/New_York', // Default timezone
      avatarUrl: image ?? undefined,
      bio: 'Mentor on Discuno - helping students navigate college life',
      metadata: {
        source: 'discuno-signup',
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`Cal.com user created successfully for ${email}:`, {
      calcomUserId: calcomResult.calcomUserId,
      username: calcomResult.username,
    })

    return calcomResult
  } catch (error) {
    console.error(`Failed to create Cal.com user for ${email}:`, error)

    // Throw a user-friendly error that will prevent authentication
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    throw new Error(`Cal.com integration required: ${errorMessage}`)
  }
}

/**
 * Enforce Cal.com user creation during authentication
 * This function attempts to create Cal.com integration and logs results
 * Note: When called from events.signIn, this cannot prevent authentication
 */
export const enforceCalcomIntegration = async (userData: {
  userId: string
  email: string
  name: string | null
  image: string | null
}): Promise<{ success: boolean; error?: string }> => {
  try {
    await createCalcomUserForNewUser(userData)
    console.log(`Cal.com integration enforced successfully for ${userData.email}`)
    return { success: true }
  } catch (error) {
    console.error(`Cal.com integration enforcement failed for ${userData.email}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}
