'use client'

import { AvailabilitySettings } from '@calcom/atoms'
import { toast } from 'sonner'

export const AvailabilitySettingsClient = () => {
  const handleUpdateSuccess = (availability: any) => {
    console.log('Availability updated successfully:', availability)
    toast.success('Availability updated successfully!')
  }

  const handleUpdateError = (error: unknown) => {
    console.error('Failed to update availability:', error)
    toast.error('Failed to update availability. Please try again.')
  }

  const handleDeleteSuccess = () => {
    console.log('Availability deleted successfully')
    toast.success('Availability schedule deleted successfully!')
  }

  const handleDeleteError = (error: unknown) => {
    console.error('Failed to delete availability:', error)
    toast.error('Failed to delete availability. Please try again.')
  }

  return (
    <AvailabilitySettings
      onUpdateSuccess={handleUpdateSuccess}
      onUpdateError={handleUpdateError}
      onDeleteSuccess={handleDeleteSuccess}
      onDeleteError={handleDeleteError}
      // Override calcom atoms bug - error when fetching override
      enableOverrides={false}
      disableToasts={true}
      allowSetToDefault={false}
      allowDelete={false}
      disableEditableHeading={true}
    />
  )
}
