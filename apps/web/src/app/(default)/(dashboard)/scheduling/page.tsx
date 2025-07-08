import { env } from '~/env'
import { getCalcomAccessToken } from './actions'
import { SchedulingContent } from './components/SchedulingContent'
import { SchedulingShell } from './components/SchedulingShell'

export default async function SchedulingPage() {
  // Fetch and refresh Cal.com access token for current user
  const tokenResult = await getCalcomAccessToken()
  if (!tokenResult.success || !tokenResult.accessToken) {
    throw new Error('No valid Cal.com access token available')
  }

  // Fetch event types via axios for current user
  const username = tokenResult.username
  if (!username) {
    throw new Error('No Cal.com username available')
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types?username=${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'cal-api-version': '2024-06-14',
      },
    }
  )

  const payload = await response.json()
  const eventTypes = Array.isArray(payload.data) ? payload.data : []

  return (
    <SchedulingShell>
      <SchedulingContent eventTypes={eventTypes} />
    </SchedulingShell>
  )
}

export const metadata = {
  title: 'Scheduling Center | Discuno',
  description: 'Manage your availability, event types, and booking preferences',
}
