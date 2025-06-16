'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { useCalContext } from '../provider/cal-provider'
import type { Availability, Schedule } from '../types'

interface AvailabilitySettingsProps {
  scheduleId?: number
  userId?: number
  onSave?: (schedule: Schedule) => void
  onError?: (error: Error) => void
  className?: string
}

interface TimeSlot {
  start: string
  end: string
}

interface DayAvailability {
  enabled: boolean
  slots: TimeSlot[]
}

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'Sunday', value: 0 },
  { key: 'monday', label: 'Monday', value: 1 },
  { key: 'tuesday', label: 'Tuesday', value: 2 },
  { key: 'wednesday', label: 'Wednesday', value: 3 },
  { key: 'thursday', label: 'Thursday', value: 4 },
  { key: 'friday', label: 'Friday', value: 5 },
  { key: 'saturday', label: 'Saturday', value: 6 },
]

export function AvailabilitySettings({
  scheduleId,
  userId,
  onSave,
  onError,
  className,
}: AvailabilitySettingsProps) {
  const { apiClient } = useCalContext()
  const queryClient = useQueryClient()

  // Add hydration check but be less aggressive about showing loading states
  const [isHydrated, setIsHydrated] = useState(
    typeof window !== 'undefined' && process.env.NODE_ENV === 'test'
  )

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // All hooks must be at the top level
  const [scheduleName, setScheduleName] = useState('')
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [weeklyAvailability, setWeeklyAvailability] = useState<Record<string, DayAvailability>>({
    sunday: { enabled: false, slots: [] },
    monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [] },
  })

  // Fetch existing schedule
  const { data: schedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['schedule', scheduleId],
    queryFn: async () => {
      if (!apiClient || !scheduleId) return null
      return await apiClient.getSchedule(scheduleId)
    },
    enabled: !!(isHydrated && apiClient && scheduleId),
  })

  // Fetch user's schedules if no specific schedule ID
  const { isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['schedules', userId],
    queryFn: async () => {
      if (!apiClient) return []
      return await apiClient.getSchedules()
    },
    enabled: !!(isHydrated && apiClient && !scheduleId),
  })

  // Load schedule data into form
  useEffect(() => {
    if (schedule) {
      setScheduleName(schedule.name)
      setTimeZone(schedule.timeZone)

      // Convert availability to weekly format
      const newWeeklyAvailability = { ...weeklyAvailability }

      // Reset all days first
      DAYS_OF_WEEK.forEach(day => {
        newWeeklyAvailability[day.key] = { enabled: false, slots: [] }
      })

      // Set availability for each day
      schedule.availability.forEach(avail => {
        avail.days.forEach(dayNumber => {
          const day = DAYS_OF_WEEK.find(d => d.value === dayNumber)
          if (day) {
            const startTime =
              typeof avail.startTime === 'string'
                ? avail.startTime
                : new Date(avail.startTime).toTimeString().slice(0, 5)
            const endTime =
              typeof avail.endTime === 'string'
                ? avail.endTime
                : new Date(avail.endTime).toTimeString().slice(0, 5)

            newWeeklyAvailability[day.key] = {
              enabled: true,
              slots: [{ start: startTime, end: endTime }],
            }
          }
        })
      })

      setWeeklyAvailability(newWeeklyAvailability)
    }
  }, [schedule, weeklyAvailability])

  // Save schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (scheduleData: Partial<Schedule>) => {
      if (!apiClient) throw new Error('API client not available')
      if (scheduleId) {
        return await apiClient.updateSchedule(scheduleId, scheduleData)
      } else {
        return await apiClient.createSchedule(scheduleData)
      }
    },
    onSuccess: savedSchedule => {
      onSave?.(savedSchedule)
      void queryClient.invalidateQueries({ queryKey: ['schedules'] })
      void queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] })
    },
    onError: error => {
      onError?.(error instanceof Error ? error : new Error('Failed to save schedule'))
    },
  })

  const handleSave = async () => {
    // Convert weekly availability back to API format
    const availability: Availability[] = []

    DAYS_OF_WEEK.forEach(day => {
      const dayAvail = weeklyAvailability[day.key]
      if (dayAvail && dayAvail.enabled && dayAvail.slots.length > 0) {
        dayAvail.slots.forEach(slot => {
          availability.push({
            days: [day.value],
            startTime: `${slot.start}:00`,
            endTime: `${slot.end}:00`,
          })
        })
      }
    })

    const scheduleData: Partial<Schedule> = {
      name: scheduleName || 'Working Hours',
      timeZone,
      availability,
    }

    if (userId) {
      scheduleData.userId = userId
    }

    await saveScheduleMutation.mutateAsync(scheduleData)
  }

  const toggleDay = (dayKey: string) => {
    setWeeklyAvailability(prev => {
      const currentDay = prev[dayKey]
      if (!currentDay) return prev

      return {
        ...prev,
        [dayKey]: {
          ...currentDay,
          enabled: !currentDay.enabled,
          slots:
            !currentDay.enabled && currentDay.slots.length === 0
              ? [{ start: '09:00', end: '17:00' }]
              : currentDay.slots,
        },
      }
    })
  }

  const updateTimeSlot = (
    dayKey: string,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setWeeklyAvailability(prev => {
      const currentDay = prev[dayKey]
      if (!currentDay) return prev

      return {
        ...prev,
        [dayKey]: {
          ...currentDay,
          slots: currentDay.slots.map((slot, index) =>
            index === slotIndex ? { ...slot, [field]: value } : slot
          ),
        },
      }
    })
  }

  const addTimeSlot = (dayKey: string) => {
    setWeeklyAvailability(prev => {
      const currentDay = prev[dayKey]
      if (!currentDay) return prev

      return {
        ...prev,
        [dayKey]: {
          ...currentDay,
          slots: [...currentDay.slots, { start: '09:00', end: '17:00' }],
        },
      }
    })
  }

  const removeTimeSlot = (dayKey: string, slotIndex: number) => {
    setWeeklyAvailability(prev => {
      const currentDay = prev[dayKey]
      if (!currentDay) return prev

      return {
        ...prev,
        [dayKey]: {
          ...currentDay,
          slots: currentDay.slots.filter((_, index) => index !== slotIndex),
        },
      }
    })
  }

  const isLoading = isLoadingSchedule || isLoadingSchedules || saveScheduleMutation.isPending

  // Only show loading state if we truly don't have an API client after hydration
  // or if we're actively loading data
  if (!isHydrated || apiClient || isLoading) {
    return (
      <div className={`availability-settings ${className ?? ''}`}>
        <div className="loading-state p-6 text-center">
          <div className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">
            {!isHydrated
              ? 'Loading...'
              : !apiClient
                ? 'Initializing Cal.com connection...'
                : isLoading
                  ? 'Loading availability data...'
                  : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`availability-settings ${className ?? ''}`}>
      <div className="settings-header">
        <h2>{scheduleId ? 'Edit Schedule' : 'Create Schedule'}</h2>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="scheduleName">Schedule Name</label>
          <input
            id="scheduleName"
            type="text"
            value={scheduleName}
            onChange={e => {
              setScheduleName(e.target.value)
            }}
            placeholder="Working Hours"
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeZone">Time Zone</label>
          <select
            id="timeZone"
            value={timeZone}
            onChange={e => {
              setTimeZone(e.target.value)
            }}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="UTC">UTC</option>
            {/* Add more time zones as needed */}
          </select>
        </div>

        <div className="weekly-availability">
          <h3>Weekly Hours</h3>
          {DAYS_OF_WEEK.map(day => {
            const dayAvail = weeklyAvailability[day.key]
            return (
              <div key={day.key} className="day-row">
                <div className="day-header">
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      checked={dayAvail?.enabled}
                      onChange={() => {
                        toggleDay(day.key)
                      }}
                    />
                    <span className="day-label">{day.label}</span>
                  </label>
                </div>

                {dayAvail?.enabled && (
                  <div className="time-slots">
                    {dayAvail.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="time-slot">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={e => {
                            updateTimeSlot(day.key, slotIndex, 'start', e.target.value)
                          }}
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={e => {
                            updateTimeSlot(day.key, slotIndex, 'end', e.target.value)
                          }}
                        />
                        {dayAvail.slots.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              removeTimeSlot(day.key, slotIndex)
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addTimeSlot(day.key)
                      }}
                    >
                      Add Time
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="form-actions">
          <Button onClick={handleSave} disabled={isLoading}>
            Save Schedule
          </Button>
        </div>
      </div>
    </div>
  )
}
