export type Step = 'calendar' | 'booking' | 'payment'

export interface BookingFormData {
  name: string
  email: string
}

export interface EventType {
  id: number
  title: string
  length: number
  description?: string
  price?: number // cents
  currency?: string // 'USD' etc.
}

export interface TimeSlot {
  time: string // 'h:mm a'
  available: boolean
}
