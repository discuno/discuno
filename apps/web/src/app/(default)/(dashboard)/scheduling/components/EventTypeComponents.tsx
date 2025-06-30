'use client'

import { CreateEventType, EventTypeSettings } from '@calcom/atoms'
import { toast } from 'sonner'

/**
 * Component for creating new event types using Cal.com atoms
 */
export const CreateEventTypeComponent = () => {
  return (
    <CreateEventType
      onSuccess={eventType => {
        console.log('EventType created successfully', eventType)
        toast.success('Event type created successfully!')
      }}
      onError={error => {
        console.error('Failed to create event type:', error)
        toast.error('Failed to create event type. Please try again.')
      }}
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
export const EventTypeSettingsComponent = ({ eventTypeId }: { eventTypeId: number }) => {
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
      customClassNames={{ atomsWrapper: '!w-[70vw] !m-auto' }}
    />
  )
}
