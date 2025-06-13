'use client'

import { AvailabilitySettings } from '@discuno/atoms'
import { toast } from 'sonner'

export const AvailabilitySettingsComponent = () => {
  return (
    <div className="availability-settings-container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-foreground text-3xl font-bold">Manage Your Availability</h1>
        <p className="text-muted-foreground mt-2">Set your working hours and availability preferences</p>
      </div>

      <AvailabilitySettings
        onSave={schedule => {
          console.log('Schedule saved:', schedule)
          toast.success('Availability updated successfully!')
        }}
        onError={error => {
          console.error('Failed to update availability:', error)
          toast.error('Failed to update availability. Please try again.')
        }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      />
    </div>
  )
}
