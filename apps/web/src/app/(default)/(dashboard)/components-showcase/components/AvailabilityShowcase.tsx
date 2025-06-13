'use client'

import { AvailabilitySettings } from '@discuno/atoms'
import { toast } from 'sonner'

export function AvailabilityShowcase() {
  return (
    <AvailabilitySettings
      onSave={schedule => {
        console.log('Schedule saved:', schedule)
        toast.success('Schedule updated successfully!')
      }}
      onError={error => {
        console.error('Schedule error:', error)
        toast.error('Failed to update schedule')
      }}
      className="max-w-4xl"
    />
  )
}
