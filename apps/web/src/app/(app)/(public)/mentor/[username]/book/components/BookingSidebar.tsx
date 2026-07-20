'use client'

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/types'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { cn } from '~/lib/utils'

interface BookingSidebarProps {
  bookingData: BookingData
  selectedEventType: EventType | null
  selectedDate?: Date
  selectedTimeSlot: string | null
  currentStep: 'calendar' | 'booking' | 'confirmation'
  detailsStage: 'details' | 'review'
  timeZone: string
}

type StepStatus = 'current' | 'complete' | 'upcoming'

export const BookingSidebar = ({
  bookingData,
  selectedEventType,
  selectedDate,
  selectedTimeSlot,
  currentStep,
  detailsStage,
  timeZone,
}: BookingSidebarProps) => {
  const hasTime = Boolean(selectedDate && selectedTimeSlot)
  const isComplete = currentStep === 'confirmation'
  const isDetails = currentStep === 'booking' && detailsStage === 'details'
  const isReview = currentStep === 'booking' && detailsStage === 'review'

  const steps: Array<{ label: string; status: StepStatus }> = [
    {
      label: 'Time',
      status: hasTime ? 'complete' : 'current',
    },
    {
      label: 'Question',
      status: isComplete || isReview ? 'complete' : isDetails ? 'current' : 'upcoming',
    },
    {
      label: 'Review',
      status: isComplete ? 'complete' : isReview ? 'current' : 'upcoming',
    },
  ]

  const selectedStart = selectedTimeSlot ? new TZDate(selectedTimeSlot, timeZone) : null
  const formattedPrice = selectedEventType
    ? (selectedEventType.price ?? 0) > 0
      ? formatCurrencyFromCents(selectedEventType.price ?? 0, selectedEventType.currency ?? 'USD')
      : 'Free'
    : null

  return (
    <aside
      aria-labelledby="booking-summary-heading"
      className="bg-card rounded-lg border p-5 lg:sticky lg:top-24"
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          {bookingData.image && <AvatarImage src={bookingData.image} alt={bookingData.name} />}
          <AvatarFallback>{bookingData.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 id="booking-summary-heading" className="truncate font-semibold">
            {bookingData.name}
          </h2>
          {(bookingData.school || bookingData.major) && (
            <p className="text-muted-foreground mt-0.5 text-sm leading-5">
              {[bookingData.major, bookingData.school].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <section className="mt-5 border-t pt-5" aria-labelledby="selected-session-heading">
        <h3 id="selected-session-heading" className="text-sm font-semibold">
          Booking summary
        </h3>
        {selectedEventType ? (
          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Session</dt>
              <dd className="mt-0.5 font-medium break-words">{selectedEventType.title}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted-foreground text-xs">Length</dt>
                <dd className="mt-0.5">{selectedEventType.length} minutes</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Price</dt>
                <dd className="mt-0.5">{formattedPrice}</dd>
              </div>
            </div>
            {selectedStart && (
              <div>
                <dt className="text-muted-foreground text-xs">Time</dt>
                <dd className="mt-0.5">
                  {format(selectedStart, 'EEE, MMM d, yyyy')}
                  <span className="block">{format(selectedStart, 'h:mm a')}</span>
                </dd>
                <dd className="text-muted-foreground mt-0.5 text-xs break-words">{timeZone}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">Choose a session to begin.</p>
        )}
      </section>

      <nav className="mt-5 border-t pt-5" aria-label="Booking progress">
        <ol className="grid grid-cols-3 gap-3 lg:flex lg:flex-col">
          {steps.map(step => (
            <li
              key={step.label}
              aria-current={step.status === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-3 text-sm',
                step.status === 'upcoming' && 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium [&_svg]:size-3.5',
                  step.status === 'complete' && 'border-primary bg-primary text-primary-foreground',
                  step.status === 'current' && 'border-primary text-primary',
                  step.status === 'upcoming' && 'border-border'
                )}
              >
                {step.status === 'complete' ? <Check aria-hidden="true" /> : null}
              </span>
              <span className={cn(step.status === 'current' && 'font-semibold')}>{step.label}</span>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}
