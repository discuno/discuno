'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { updateSchedule } from '../../actions'
import { DateOverridesManager } from './DateOverridesManager'
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

interface AvailabilityManagerProps {
  initialAvailability: Availability | null
}

export function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
  const queryClient = useQueryClient()
  const [availability, setAvailability] = useState<Availability | null>(null)

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
    } else {
      setAvailability(defaultAvailability)
    }
  }, [initialAvailability])

  const handleSave = () => {
    if (!availability) return
    saveSchedule(availability)
  }

  const handleCancel = () => {
    setAvailability(initialAvailability ?? defaultAvailability)
  }

  const handleOverridesChange = (newOverrides: DateOverride[]) => {
    setAvailability(prev => (prev ? { ...prev, dateOverrides: newOverrides } : null))
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
      <DateOverridesManager
        overrides={availability.dateOverrides}
        onOverridesChange={handleOverridesChange}
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
