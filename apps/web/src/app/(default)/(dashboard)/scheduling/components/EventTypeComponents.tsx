'use client'

import { CreateEventType, EventTypeSettings } from '@calcom/atoms'
import { toast } from 'sonner'

interface CreateEventTypeComponentProps {
  onSuccess?: (eventType: any) => void
  onError?: (error: unknown) => void
  showToasts?: boolean
}

/**
 * Component for creating new event types using Cal.com atoms
 */
export const CreateEventTypeComponent = ({
  onSuccess,
  onError,
  showToasts = true,
}: CreateEventTypeComponentProps = {}) => {
  const handleSuccess = (eventType: any) => {
    console.log('EventType created successfully', eventType)
    if (showToasts) {
      toast.success('Event type created successfully!')
    }
    // Call custom onSuccess handler if provided
    onSuccess?.(eventType)
  }

  const handleError = (error: unknown) => {
    console.error('Failed to create event type:', error)
    if (showToasts) {
      toast.error('Failed to create event type. Please try again.')
    }
    // Call custom onError handler if provided
    onError?.(error)
  }

  return (
    <CreateEventType
      onSuccess={handleSuccess}
      onError={handleError}
      customClassNames={{
        atomsWrapper: 'border p-4 rounded-md',
        buttons: { submit: 'bg-red-500', cancel: 'bg-gray-300' },
      }}
    />
  )
}

/**
 * Component for managing existing event types using Cal.com atoms
 * This would typically show a list of event types and allow editing
 */
export const EventTypeSettingsComponent = ({
  eventTypeId,
  setEditId,
}: {
  eventTypeId: number
  setEditId: (id: number | null) => void
}) => {
  return (
    <EventTypeSettings
      id={eventTypeId}
      allowDelete={true}
      onSuccess={eventType => {
        console.log('EventType settings updated successfully', eventType)
        toast.success('Event type updated successfully!')
      }}
      onError={error => {
        console.error('Failed to update event type:', error)
        toast.error('Failed to update event type. Please try again.')
      }}
      onFormStateChange={formState => {
        console.log('Form state changed:', formState)
        // Access form data: formState.isDirty, formState.dirtyFields, formState.values
      }}
      onDeleteSuccess={() => {
        setEditId(null)
      }}
      disableToasts={true}
      tabs={['setup', 'payments']}
    />
  )
}
