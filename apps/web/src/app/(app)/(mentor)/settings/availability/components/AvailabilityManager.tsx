'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, RotateCcw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { updateSchedule } from '~/app/(app)/(mentor)/settings/actions'
import type { Availability, DateOverride } from '~/app/types/availability'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { availabilityEquals, getAvailabilityValidationMessage } from './availability-utils'
import { DateOverridesManager } from './DateOverridesManager'
import { WeeklyScheduler } from './WeeklyScheduler'

interface AvailabilityManagerProps {
  initialAvailability: Availability
}

export function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
  const queryClient = useQueryClient()
  const [savedAvailability, setSavedAvailability] = useState<Availability>(initialAvailability)
  const [availability, setAvailability] = useState<Availability>(savedAvailability)

  const { mutate: saveSchedule, isPending } = useMutation({
    mutationFn: async (scheduleData: Availability) => {
      return updateSchedule(scheduleData)
    },
    onSuccess: (result, submittedAvailability) => {
      if (result.success && result.data) {
        const persistedAvailability = result.data
        queryClient.setQueryData(['schedule'], persistedAvailability)
        setSavedAvailability(persistedAvailability)
        setAvailability(currentAvailability =>
          availabilityEquals(currentAvailability, submittedAvailability)
            ? persistedAvailability
            : currentAvailability
        )
        toast.success('Availability saved', {
          description: 'The saved hours are now available to students who book with you.',
        })
      } else {
        toast.error('Availability was not saved', {
          description: result.error ?? 'Review your hours and try again.',
        })
      }
    },
    onError: () => {
      toast.error('Availability was not saved', {
        description: 'Check your connection and try again.',
      })
    },
  })

  const handleSave = () => {
    if (getAvailabilityValidationMessage(availability)) return
    saveSchedule(availability)
  }

  const handleCancel = () => {
    setAvailability(savedAvailability)
  }

  const handleOverridesChange = (newOverrides: DateOverride[]) => {
    setAvailability(prev => ({ ...prev, dateOverrides: newOverrides }))
  }

  const isDirty = !availabilityEquals(availability, savedAvailability)
  const validationMessage = getAvailabilityValidationMessage(availability)

  useEffect(() => {
    if (!isDirty) return

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const warnBeforeClientNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return
      if (!(event.target instanceof Element)) return

      const link = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return

      const destination = new URL(link.href, window.location.href)
      if (destination.href === window.location.href) return
      if (window.confirm('Discard your unsaved availability changes?')) return

      event.preventDefault()
      event.stopPropagation()
    }

    window.addEventListener('beforeunload', warnBeforeLeaving)
    document.addEventListener('click', warnBeforeClientNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving)
      document.removeEventListener('click', warnBeforeClientNavigation, true)
    }
  }, [isDirty])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
            Availability
          </h1>
          <p className="text-muted-foreground text-sm leading-6">
            Set recurring hours and date exceptions. Changes appear after you save.
          </p>
        </div>
        <Badge variant={isDirty ? 'warning' : 'secondary'}>
          {isDirty ? 'Unsaved changes' : 'Up to date'}
        </Badge>
      </div>

      {validationMessage && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>One or more time ranges need attention</AlertTitle>
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-10">
        <WeeklyScheduler
          schedule={availability.weeklySchedule}
          onScheduleChange={newSchedule => {
            setAvailability(prev => ({ ...prev, weeklySchedule: newSchedule }))
          }}
        />
        <DateOverridesManager
          availability={availability}
          onOverridesChange={handleOverridesChange}
        />
      </div>

      <div
        className="bg-background sticky bottom-4 z-20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        role="region"
        aria-label="Save availability changes"
        aria-busy={isPending}
      >
        <p
          id="availability-save-status"
          className="text-muted-foreground px-1 text-sm"
          role="status"
          aria-live="polite"
        >
          {isPending
            ? 'Saving availability…'
            : isDirty
              ? 'Save to publish these hours.'
              : 'Your published availability is up to date.'}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!isDirty || isPending}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw data-icon="inline-start" />
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isPending || Boolean(validationMessage)}
            className="flex-1 sm:flex-none"
            aria-describedby="availability-save-status"
          >
            {isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {isPending ? 'Saving…' : 'Save availability'}
          </Button>
        </div>
      </div>
    </div>
  )
}
