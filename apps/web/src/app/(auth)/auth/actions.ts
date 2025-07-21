'use server'

import { z } from 'zod'
import { getWaitlistEntry } from './queries'

const emailSchema = z.string().email('Please enter a valid email address')

export async function joinWaitlist(formData: FormData): Promise<{
  status: 'success' | 'error' | 'already-registered' | 'invalid-email'
}> {
  const email = formData.get('email')

  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return { status: 'invalid-email' }
  }

  const validEmail = result.data.toLowerCase().trim()

  try {
    const { isNewEntry, error } = await getWaitlistEntry(validEmail)

    if (error) {
      return { status: 'error' }
    }

    if (isNewEntry) {
      return { status: 'success' }
    } else {
      return { status: 'already-registered' }
    }
  } catch (error) {
    console.error('Error in joinWaitlist action:', error)
    return { status: 'error' }
  }
}
