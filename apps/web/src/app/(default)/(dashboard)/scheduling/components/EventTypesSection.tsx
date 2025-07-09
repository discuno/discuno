'use client'

import { useQuery } from '@tanstack/react-query'
import type { EventType } from '~/app/(default)/(dashboard)/scheduling/components/EventTypeListClient'
import { EventTypeListClient } from '~/app/(default)/(dashboard)/scheduling/components/EventTypeListClient'
import { LoadingSpinner } from '~/components/shared/LoadingSpinner'
import { ExternalApiError } from '~/lib/errors'
import { fetchEventTypes } from '../actions'

export function EventTypesSection() {
  const {
    data: eventTypes = [],
    isLoading,
    isError,
  } = useQuery<EventType[], Error>({
    queryKey: ['eventTypes'],
    queryFn: fetchEventTypes,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    throw new ExternalApiError('Failed to load event types')
  }

  return <EventTypeListClient eventTypes={eventTypes} />
}
