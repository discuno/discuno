'use client'

import { AvailabilitySettings } from '@calcom/atoms'

interface AvailabilitySettingsClientProps {
  onUpdateSuccess?: (availability: any) => void
  onUpdateError?: (error: unknown) => void
  onDeleteSuccess?: () => void
  onDeleteError?: (error: unknown) => void
  enableOverrides?: boolean
  disableToasts?: boolean
}

export const AvailabilitySettingsClient = ({
  onUpdateSuccess,
  onUpdateError,
  onDeleteSuccess,
  onDeleteError,
  enableOverrides = true,
  disableToasts = false,
}: AvailabilitySettingsClientProps) => {
  return (
    <AvailabilitySettings
      onUpdateSuccess={onUpdateSuccess}
      onUpdateError={onUpdateError}
      onDeleteSuccess={onDeleteSuccess}
      onDeleteError={onDeleteError}
      enableOverrides={enableOverrides}
      disableToasts={disableToasts}
    />
  )
}
