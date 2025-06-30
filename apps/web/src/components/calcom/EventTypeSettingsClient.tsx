'use client'

import { EventTypeSettings } from '@calcom/atoms'
import { toast } from 'sonner'

interface EventTypeSettingsClientProps {
  id: number
  allowDelete?: boolean
  disableToasts?: boolean
  showSuccessToasts?: boolean
  showErrorToasts?: boolean
}

export const EventTypeSettingsClient = ({
  id,
  allowDelete = false,
  disableToasts = true,
  showSuccessToasts = true,
  showErrorToasts = true,
}: EventTypeSettingsClientProps) => {
  const handleSuccess = (eventType: any) => {
    console.log('EventType settings updated successfully', eventType)
    if (showSuccessToasts) {
      toast.success('Event type updated successfully!')
    }
  }

  const handleError = (error: unknown) => {
    console.error('Failed to update event type:', error)
    if (showErrorToasts) {
      toast.error('Failed to update event type. Please try again.')
    }
  }

  const handleFormStateChange = (formState: any) => {
    console.log('Form state changed:', formState)
    // Access form data: formState.isDirty, formState.dirtyFields, formState.values
  }

  return (
    <EventTypeSettings
      id={id}
      allowDelete={allowDelete}
      onSuccess={handleSuccess}
      onError={handleError}
      onFormStateChange={handleFormStateChange}
      disableToasts={disableToasts}
    />
  )
}
