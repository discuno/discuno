import type { EventType } from './actions'

export interface BookingData {
  username: string
  name: string
  image: string
  school: string
  major: string
  eventTypes: EventType[]
}
