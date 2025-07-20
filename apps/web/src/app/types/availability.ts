export interface TimeInterval {
  start: string // "HH:mm" format (e.g., "09:00")
  end: string // "HH:mm" format (e.g., "17:00")
}

export interface WeeklySchedule {
  [day: string]: TimeInterval[] // day: "sunday", "monday", ...
}

export interface DateOverride {
  date: string // "YYYY-MM-DD" format
  intervals: TimeInterval[]
}

export interface Availability {
  id: string // Corresponds to Cal.com schedule ID
  weeklySchedule: WeeklySchedule
  dateOverrides: DateOverride[]
}
