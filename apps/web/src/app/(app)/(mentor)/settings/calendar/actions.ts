'use server'
import 'server-only'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { inngest } from '~/inngest/client'
import { requireFreshPermission } from '~/lib/auth/auth-utils'
import { buildReauthenticationPath } from '~/lib/auth/config'
import { SessionNotFreshError } from '~/lib/errors'
import {
  CalcomConnectionHasProtectedBookingsError,
  disconnectCalcomConnection,
  markCalcomWebhookCleanupQueued,
} from '~/server/dal/calcom'

export async function disconnectCalcomAccount() {
  let user: Awaited<ReturnType<typeof requireFreshPermission>>['user']
  try {
    const authResult = await requireFreshPermission({ mentor: ['manage'] })
    user = authResult.user
  } catch (error) {
    if (error instanceof SessionNotFreshError) {
      redirect(buildReauthenticationPath('/settings/calendar'))
    }
    throw error
  }
  let cleanupId: number | null
  try {
    ;({ cleanupId } = await disconnectCalcomConnection(user.id))
  } catch (error) {
    if (error instanceof CalcomConnectionHasProtectedBookingsError) {
      redirect('/settings/calendar?calcom=bookings_active')
    }
    throw error
  }

  if (cleanupId) {
    try {
      await inngest.send({
        id: `calcom-webhook-cleanup-${cleanupId}`,
        name: 'discuno/calcom.webhook-cleanup.requested',
        data: { cleanupId },
      })
      await markCalcomWebhookCleanupQueued(cleanupId)
    } catch (error) {
      // The database outbox is the durability boundary. The scheduled recovery
      // function will enqueue this cleanup after a transient queue outage.
      console.error('Cal.com webhook cleanup is waiting for queue recovery', {
        cleanupId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  revalidatePath('/settings/calendar')
  redirect('/settings/calendar?calcom=disconnected')
}
