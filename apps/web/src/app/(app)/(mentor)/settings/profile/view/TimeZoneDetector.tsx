'use client'

import { useEffect } from 'react'
import { getOrCreateUserTimezoneAction } from '~/app/(app)/(mentor)/settings/profile/actions'

export const TimeZoneDetector = () => {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!detected) return

    const update = async () => {
      try {
        await getOrCreateUserTimezoneAction(detected)
        console.log('Timezone updated:', detected)
      } catch (error) {
        console.error('Failed to update timezone:', error)
      }
    }
    void update()
  }, [])

  return null
}
