'use client'

import { EventTypeSettings } from '@calcom/atoms'

interface EventTypeSettingsClientProps {
  id: number
  allowDelete?: boolean
  onSuccess?: (eventType: any) => void
  onError?: (error: unknown) => void
  onFormStateChange?: (formState: any) => void
  disableToasts?: boolean
}

export const EventTypeSettingsClient = ({
  id,
  allowDelete = false,
  onSuccess,
  onError,
  onFormStateChange,
  disableToasts = false,
}: EventTypeSettingsClientProps) => {
  return (
    <EventTypeSettings
      id={id}
      allowDelete={allowDelete}
      onSuccess={onSuccess}
      onError={onError}
      onFormStateChange={onFormStateChange}
      disableToasts={disableToasts}
    />
  )
}
