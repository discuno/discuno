'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateSchedule } from '~/app/(app)/(mentor)/settings/actions'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
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
  initialAvailability: Availability | null | undefined
}

export function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
  const queryClient = useQueryClient()
  const [availability, setAvailability] = useState<Availability | null>(null)

  const { mutate: saveSchedule, isPending } = useMutation({
    mutationFn: async (scheduleData: Availability) => {
      return updateSchedule(scheduleData)
    },
    onSuccess: result => {
      if (result.success && result.data) {
        queryClient.setQueryData(['schedule'], result.data)
        toast.success('Availability saved successfully!', {
          description: 'Your availability has been saved.',
        })
      } else {
        toast.error(`Failed to save availability: ${result.error ?? 'Unknown error'}`)
      }
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
      <div className="grid gap-8 lg:grid-cols-2">
        <WeeklyScheduler
          schedule={availability.weeklySchedule}
          onScheduleChange={newSchedule => {
            setAvailability(prev => (prev ? { ...prev, weeklySchedule: newSchedule } : null))
          }}
        />
        <DateOverridesManager
          availability={availability}
          onOverridesChange={handleOverridesChange}
        />
      </div>
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
