import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'

export interface BookingState {
  mentorUsername: string
  selectedEventType: EventType
  selectedTimeSlot: string
  selectedDate: string // ISO string
  formData?: BookingFormData
  resumeStep: 'auth' | 'booking'
  savedAt: number
}

/**
 * Booking state manager for preserving booking context across OAuth redirects.
 * Uses sessionStorage to persist state during the authentication flow.
 */
export const bookingStateManager = {
  /**
   * Save booking state before OAuth redirect
   * @returns stateId to include in OAuth callback URL
   */
  save(state: Omit<BookingState, 'savedAt'>): string {
    const stateId = crypto.randomUUID()
    const stateWithTimestamp: BookingState = {
      ...state,
      savedAt: Date.now(),
    }
    sessionStorage.setItem(`booking-state-${stateId}`, JSON.stringify(stateWithTimestamp))
    console.log('[BookingState] Saved booking state:', stateId)
    return stateId
  },

  /**
   * Restore booking state after OAuth callback
   * @param stateId The state ID from the OAuth callback URL
   * @returns Restored booking state or null if not found
   */
  restore(stateId: string): BookingState | null {
    const key = `booking-state-${stateId}`
    const data = sessionStorage.getItem(key)
    if (!data) {
      console.log('[BookingState] No state found for:', stateId)
      return null
    }

    try {
      const state = JSON.parse(data) as BookingState
      console.log('[BookingState] Restored booking state:', stateId)
      return state
    } catch (error) {
      console.error('[BookingState] Failed to parse state:', error)
      return null
    }
  },

  /**
   * Clear booking state after successful booking or cancellation
   * @param stateId The state ID to clear
   */
  clear(stateId: string): void {
    sessionStorage.removeItem(`booking-state-${stateId}`)
    console.log('[BookingState] Cleared booking state:', stateId)
  },

  /**
   * Get the first pending booking state (used on page load)
   * @returns Object with stateId and state, or null if no pending states
   */
  getPending(): { stateId: string; state: BookingState } | null {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('booking-state-')) {
        const stateId = key.replace('booking-state-', '')
        const state = this.restore(stateId)
        if (state) {
          return { stateId, state }
        }
      }
    }
    return null
  },

  /**
   * Clean up stale booking states (older than 30 minutes)
   * Called on component mount to prevent sessionStorage accumulation
   */
  cleanupStale(): void {
    const STALE_THRESHOLD = 30 * 60 * 1000 // 30 minutes
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('booking-state-')) {
        try {
          const data = sessionStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data) as BookingState
            if (now - parsed.savedAt > STALE_THRESHOLD) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // Invalid data - mark for removal
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      console.log('[BookingState] Cleaned up stale state:', key)
    })
  },
}
