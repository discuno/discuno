'use client'

import { useEffect } from 'react'

/** Remove the opaque result token after the server has resolved it. */
export const ClearBookingResultQuery = () => {
  useEffect(() => {
    if (!window.location.search) return
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  return null
}
