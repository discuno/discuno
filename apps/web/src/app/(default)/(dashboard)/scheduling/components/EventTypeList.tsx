import { env } from '~/env'
import { CalProviderWrapper } from '~/lib/providers/CalProviderWrapper'
import { getUserCalcomTokens } from '~/server/queries'
import { EventTypeListClient } from './EventTypeListClient'

export async function EventTypeList() {
  // Fetch current user's Cal.com tokens
  const tokens = await getUserCalcomTokens()
  if (!tokens || !tokens.accessToken) {
    throw new Error('No Cal.com tokens found')
  }

  // Fetch event types from Cal.com API
  const res = await fetch(
    `${env.NEXT_PUBLIC_CALCOM_API_URL}/event-types?username=bradfordmcnew-cmbwriuba002dp31pexvba9vt-smccme-edu`,
    {
      headers: {
        Authorization: `Bearer ${env.X_CAL_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-06-14',
      },
      next: { revalidate: 60 },
    }
  )
  const data = await res.json()
  console.log('data', data)
  // Ensure eventTypes is always an array
  const eventTypes = Array.isArray(data.data) ? data.data : []

  return (
    <CalProviderWrapper useCurrentUserTokens={true}>
      <EventTypeListClient eventTypes={eventTypes} />
    </CalProviderWrapper>
  )
}
