'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TimeIntervalRow } from '~/app/(app)/(mentor)/settings/availability/components/TimeIntervalRow'
import type { Availability, DateOverride, TimeInterval } from '~/app/types/availability'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
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
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '~/components/ui/field'
import {
  fromDateKey,
  getIntervalValidation,
  getNextAvailableInterval,
  toDateKey,
} from './availability-utils'
import { cn } from '~/lib/utils'

const DEFAULT_INTERVAL: TimeInterval = { start: '09:00', end: '17:00' }

interface SaveOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  overrideToEdit: DateOverride | null
  currentAvailability: Availability
  onSave: (newOverrides: DateOverride[]) => void
}

export function SaveOverrideModal({
  isOpen,
  onClose,
  overrideToEdit,
  currentAvailability,
  onSave,
}: SaveOverrideModalProps) {
  const isEditMode = Boolean(overrideToEdit)
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [intervals, setIntervals] = useState<TimeInterval[]>(() =>
    overrideToEdit ? overrideToEdit.intervals : [DEFAULT_INTERVAL]
  )

  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const disabledDates = useMemo(
    () =>
      currentAvailability.dateOverrides
        .filter(override => override.date !== overrideToEdit?.date)
        .flatMap(override => {
          const date = fromDateKey(override.date)
          return date ? [date] : []
        }),
    [currentAvailability, overrideToEdit?.date]
  )

  const intervalValidation = getIntervalValidation(intervals, { allowEmpty: false })
  const nextInterval = getNextAvailableInterval(intervals)
  const isDirty = isEditMode
    ? JSON.stringify(intervals) !== JSON.stringify(overrideToEdit?.intervals ?? [])
    : selectedDates.length > 0 || JSON.stringify(intervals) !== JSON.stringify([DEFAULT_INTERVAL])
  const canSave = isDirty && !intervalValidation && (isEditMode || selectedDates.length > 0)

  const requestClose = () => {
    if (isDirty) {
      setIsDiscardDialogOpen(true)
      return
    }
    onClose()
  }

  const handleSave = () => {
    if (!canSave) return

    const nextOverrides = [...currentAvailability.dateOverrides]

    if (overrideToEdit) {
      const updatedOverride: DateOverride = {
        date: overrideToEdit.date,
        intervals: intervals.map(interval => ({ ...interval })),
      }
      onSave(
        nextOverrides
          .map(override => (override.date === overrideToEdit.date ? updatedOverride : override))
          .sort((left, right) => left.date.localeCompare(right.date))
      )
    } else {
      const additions = selectedDates.map<DateOverride>(date => ({
        date: toDateKey(date),
        intervals: intervals.map(interval => ({ ...interval })),
      }))
      onSave(
        [...nextOverrides, ...additions].sort((left, right) => left.date.localeCompare(right.date))
      )
    }

    onClose()
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={open => {
          if (!open) requestClose()
        }}
      >
        <DialogContent className="max-h-[min(90dvh,48rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit date exception' : 'Add date exceptions'}</DialogTitle>
            <DialogDescription>
              {overrideToEdit
                ? `Change the hours students can book on ${fromDateKey(overrideToEdit.date)?.toLocaleDateString(undefined, { dateStyle: 'full' }) ?? overrideToEdit.date}.`
                : 'Choose one or more dates, then set the hours students can book.'}{' '}
              Dates and hours follow the timezone set in your connected calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="scroll-fade min-h-0 overflow-y-auto pr-1">
            <div className="grid items-start gap-8 py-2 md:grid-cols-2">
              {!isEditMode && (
                <FieldSet>
                  <FieldLegend variant="label">Choose dates</FieldLegend>
                  <FieldDescription>
                    Dates that already have an exception are unavailable here.
                  </FieldDescription>
                  <div className="flex justify-center rounded-xl border p-2">
                    <Calendar
                      aria-label="Dates for availability exceptions"
                      mode="multiple"
                      required={false}
                      selected={selectedDates}
                      onSelect={dates => setSelectedDates(dates ?? [])}
                      disabled={date =>
                        date < today ||
                        disabledDates.some(disabled => disabled.getTime() === date.getTime())
                      }
                    />
                  </div>
                  <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
                    {selectedDates.length === 0
                      ? 'No dates selected.'
                      : `${selectedDates.length} date${selectedDates.length === 1 ? '' : 's'} selected.`}
                  </p>
                </FieldSet>
              )}

              <FieldSet className={cn(isEditMode && 'md:col-span-2')}>
                <FieldLegend variant="label">Available hours</FieldLegend>
                <FieldDescription>
                  These hours replace your usual weekly hours on the selected date.
                </FieldDescription>
                <FieldGroup className="gap-3">
                  {intervals.map((interval, index) => (
                    <TimeIntervalRow
                      key={index}
                      interval={interval}
                      label={`date exception time window ${index + 1}`}
                      invalid={intervalValidation?.kind === 'overlap'}
                      onIntervalChange={updated =>
                        setIntervals(current =>
                          current.map((candidate, candidateIndex) =>
                            candidateIndex === index ? updated : candidate
                          )
                        )
                      }
                      onRemove={
                        intervals.length > 1
                          ? () =>
                              setIntervals(current =>
                                current.filter((_, candidateIndex) => candidateIndex !== index)
                              )
                          : undefined
                      }
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (nextInterval) setIntervals(current => [...current, nextInterval])
                    }}
                    disabled={!nextInterval}
                  >
                    <Plus data-icon="inline-start" />
                    {nextInterval ? 'Add another window' : 'No room for another hour'}
                  </Button>
                  {intervalValidation &&
                    (intervalValidation.kind === 'empty' ||
                      intervalValidation.kind === 'overlap') && (
                      <FieldError aria-live="polite">{intervalValidation.message}</FieldError>
                    )}
                </FieldGroup>
              </FieldSet>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave}>
              {isEditMode
                ? 'Update draft'
                : selectedDates.length === 0
                  ? 'Choose dates'
                  : `Add ${selectedDates.length} date${selectedDates.length === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this date exception draft?</AlertDialogTitle>
            <AlertDialogDescription>
              The dates and hours you changed in this dialog will be lost. Your saved availability
              will not change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() => {
                setIsDiscardDialogOpen(false)
                onClose()
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
