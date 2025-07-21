'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  createDateOverride,
  updateDateOverride,
} from '~/app/(app)/(mentor)/settings/scheduling/actions'
import { TimeIntervalRow } from '~/app/(app)/(mentor)/settings/scheduling/components/availability/TimeIntervalRow'
import type { DateOverride, TimeInterval } from '~/app/types/availability'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

const DEFAULT_INTERVAL: TimeInterval = { start: '', end: '' }

interface SaveOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  overrideToEdit: DateOverride | null
  existingOverrideDates: string[]
  onSave: (newOverrides: DateOverride[]) => void
}

export function SaveOverrideModal({
  isOpen,
  onClose,
  overrideToEdit,
  existingOverrideDates,
  onSave,
}: SaveOverrideModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!overrideToEdit

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [intervals, setIntervals] = useState<TimeInterval[]>([DEFAULT_INTERVAL])

  // Compute disabled dates: past dates and other existing overrides
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const disabledDates: Date[] = useMemo(() => {
    return existingOverrideDates.map(d => new Date(`${d}T00:00:00`))
  }, [existingOverrideDates])

  useEffect(() => {
    if (!isOpen) return
    if (isEditMode) {
      setSelectedDate(new Date(`${overrideToEdit.date}T00:00:00`))
      setIntervals(overrideToEdit.intervals)
      setSelectedDates([])
    } else {
      setSelectedDate(undefined)
      setIntervals([DEFAULT_INTERVAL])
      setSelectedDates([])
    }
  }, [isOpen, isEditMode, overrideToEdit])

  const updateOverrideMutation = useMutation({
    mutationFn: updateDateOverride,
    onSuccess: (newOverrides: DateOverride[]) => {
      toast.success('Override updated')
      onSave(newOverrides)
      void queryClient.invalidateQueries({ queryKey: ['schedule'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to update override: ${error.message}`)
    },
  })

  const createOverrideMutation = useMutation({
    mutationFn: createDateOverride,
    onSuccess: (newOverrides: DateOverride[]) => {
      toast.success('Overrides created')
      onSave(newOverrides)
      void queryClient.invalidateQueries({ queryKey: ['schedule'] })
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Failed to create overrides: ${error.message}`)
    },
  })

  const handleAddInterval = () => {
    setIntervals(prev => [...prev, DEFAULT_INTERVAL])
  }

  const handleRemoveInterval = (index: number) => {
    setIntervals(prev => prev.filter((_, i) => i !== index))
  }

  const handleIntervalChange = (index: number, updated: TimeInterval) => {
    setIntervals(prev => prev.map((interval, i) => (i === index ? updated : interval)))
  }

  const handleSave = async () => {
    if (isEditMode) {
      if (!selectedDate) return
      const dateStr = selectedDate.toISOString().substring(0, 10)
      const override: DateOverride = {
        date: dateStr,
        intervals,
      }

      updateOverrideMutation.mutate(override)
    } else {
      // create multiple overrides
      if (selectedDates.length === 0) return
      for (const d of selectedDates) {
        const dateStr = d.toISOString().substring(0, 10)
        const override: DateOverride = {
          date: dateStr,
          intervals,
        }

        createOverrideMutation.mutate(override)
      }
    }
  }

  const isPending = updateOverrideMutation.isPending || createOverrideMutation.isPending
  // Determine if form has unsaved changes: in edit mode, intervals differ; in create mode, at least one date selected
  const isDirty = isEditMode
    ? JSON.stringify(intervals) !== JSON.stringify(overrideToEdit.intervals)
    : selectedDates.length > 0
  const canSave = isDirty

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Override' : 'Create Overrides'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Overrides for ${new Date(overrideToEdit.date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'full' })}`
              : 'Select one or more dates and specify your available hours.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {!isEditMode && (
            <Calendar
              mode="multiple"
              required={false}
              selected={selectedDates}
              onSelect={dates => setSelectedDates(dates ?? [])}
              disabled={date => {
                const isPast = date < today
                const isTaken = disabledDates.some(dd => dd.getTime() === date.getTime())
                return isPast || isTaken
              }}
            />
          )}
          <div className="space-y-4">
            <h4 className="font-medium">Available Hours</h4>
            <div className="space-y-2">
              {intervals.length > 0 ? (
                intervals.map((interval, index) => (
                  <TimeIntervalRow
                    key={index}
                    interval={interval}
                    onIntervalChange={newInterval => handleIntervalChange(index, newInterval)}
                    onRemove={() => handleRemoveInterval(index)}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-500">This day will be unavailable.</p>
              )}
            </div>
            <Button variant="link" size="sm" className="px-0" onClick={handleAddInterval}>
              + Add hours
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
