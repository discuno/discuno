import type { Metadata } from 'next'
import { connection } from 'next/server'
import { getSchedule } from '~/app/(app)/(mentor)/settings/actions'
import { AvailabilityContent } from '~/app/(app)/(mentor)/settings/availability/AvailabilityContent'

export default async function AvailabilityPage() {
  await connection()
  const scheduleResult = await getSchedule()

  return <AvailabilityContent initialScheduleResult={scheduleResult} />
}

export const metadata: Metadata = {
  title: 'Availability Settings | Discuno',
  description: 'Manage your availability, event types, and booking preferences',
}
