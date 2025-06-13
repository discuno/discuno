import 'server-only'
import { db } from '~/server/db'
import { waitlist } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export async function getWaitlistEntry(email: string): Promise<{
  isNewEntry: boolean
  error: string | null
}> {
  try {
    // Check if email already exists
    const existingEntry = await db.query.waitlist.findFirst({
      where: eq(waitlist.email, email),
    })

    if (existingEntry) {
      // Email already exists, not a new entry
      return {
        isNewEntry: false,
        error: null,
      }
    }

    // Insert new waitlist entry
    await db.insert(waitlist).values({
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Successfully added new entry
    return {
      isNewEntry: true,
      error: null,
    }
  } catch (error) {
    console.error('Database error in getWaitlistEntry:', error)
    return {
      isNewEntry: false,
      error: 'Database error occurred',
    }
  }
}
