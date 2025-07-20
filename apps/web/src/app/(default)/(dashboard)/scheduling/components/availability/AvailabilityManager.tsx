'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Availability } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { getSchedule, updateSchedule } from '../../actions'
import { DateOverrides } from './DateOverrides'
import { WeeklyScheduler } from './WeeklyScheduler'

const defaultAvailability: Availability = {
  id: '',
  weeklySchedule: {
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  },
  dateOverrides: [],
}

export function AvailabilityManager() {
  const queryClient = useQueryClient()
  const [availability, setAvailability] = useState<Availability | null>(null)

  const {
    data: initialAvailability,
    isLoading,
    error,
  } = useQuery<Availability | null>({
    queryKey: ['schedule'],
    queryFn: getSchedule,
  })

  const { mutate: saveSchedule, isPending } = useMutation({
    mutationFn: async (scheduleData: Availability) => {
      return updateSchedule(scheduleData)
    },
    onSuccess: savedData => {
      queryClient.setQueryData(['schedule'], savedData)
      toast.success('Availability saved successfully!', {
        description: 'Your availability has been saved.',
      })
    },
    onError: e => {
      console.error(e)
      toast.error('Failed to save availability. Please try again.', {
        description: 'Failed to save availability. Please try again.',
      })
    },
  })

  useEffect(() => {
    if (initialAvailability) {
      setAvailability(initialAvailability)
    } else if (!isLoading && !error) {
      setAvailability(defaultAvailability)
    }
  }, [initialAvailability, isLoading, error])

  const handleSave = () => {
    if (!availability) return
    saveSchedule(availability)
  }

  const handleCancel = () => {
    setAvailability(initialAvailability ?? defaultAvailability)
  }

  if (isLoading) {
    return <div>Loading schedule...</div>
  }

  if (error) {
    return <div className="text-red-500">Failed to load schedule. Please try again.</div>
  }

  if (!availability) {
    return <div>Loading form...</div>
  }

  const isDirty =
    JSON.stringify(availability) !== JSON.stringify(initialAvailability ?? defaultAvailability)

  return (
    <div className="space-y-8">
      <WeeklyScheduler
        schedule={availability.weeklySchedule}
        onScheduleChange={newSchedule => {
          setAvailability(prev => (prev ? { ...prev, weeklySchedule: newSchedule } : null))
        }}
      />
      <DateOverrides
        overrides={availability.dateOverrides}
        onOverridesChange={newOverrides => {
          setAvailability(prev => (prev ? { ...prev, dateOverrides: newOverrides } : null))
        }}
      />
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleCancel} disabled={!isDirty || isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isDirty || isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
