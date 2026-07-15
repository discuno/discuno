'use client'

import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { Calendar, Check, Clock } from 'lucide-react'
import Image from 'next/image'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingModal'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { cn } from '~/lib/utils'

interface BookingSidebarProps {
  bookingData: BookingData
  selectedEventType: EventType | null
  selectedDate?: Date
  selectedTimeSlot: string | null
  currentStep: 'calendar' | 'booking' | 'confirmation'
  timeZone: string
}

export const BookingSidebar = ({
  bookingData,
  selectedEventType,
  selectedDate,
  selectedTimeSlot,
  currentStep,
  timeZone,
}: BookingSidebarProps) => {
  const steps = [
    {
      id: 'calendar',
      label: 'Date & time',
      isActive: currentStep === 'calendar',
      isCompleted:
        currentStep !== 'calendar' && !!selectedEventType && !!selectedDate && !!selectedTimeSlot,
    },
    {
      id: 'userDetails',
      label: (selectedEventType?.price ?? 0) > 0 ? 'Details & checkout' : 'Your details',
      isActive: currentStep === 'booking',
      isCompleted: currentStep === 'confirmation',
    },
  ]

  const dateDisplay =
    selectedDate && selectedTimeSlot
      ? format(new TZDate(selectedTimeSlot, timeZone), 'EEEE, MMMM d, yyyy')
      : null

  const timeDisplay =
    selectedDate && selectedTimeSlot
      ? format(new TZDate(selectedTimeSlot, timeZone), 'h:mm a')
      : null

  return (
    <div className="bg-muted/30 flex h-full w-full flex-col p-6 lg:w-[380px] lg:border-r lg:p-8">
      {/* Mentor Profile */}
      <div className="mb-8 flex items-start gap-4">
        {bookingData.image ? (
          <Image
            src={bookingData.image}
            alt={bookingData.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-md dark:border-zinc-800"
          />
        ) : (
          <Avatar className="h-16 w-16 border-2 border-white shadow-md dark:border-zinc-800">
            <AvatarFallback>{bookingData.name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold">{bookingData.name}</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-background/80 text-xs backdrop-blur-sm">
              {bookingData.school}
            </Badge>
            {bookingData.major && (
              <span className="text-muted-foreground text-xs">{bookingData.major}</span>
            )}
          </div>
        </div>
      </div>

      {/* Selected Session Details */}
      {selectedEventType && (
        <div className="bg-background/50 mb-8 rounded-xl border p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-primary font-semibold">{selectedEventType.title}</h3>
            {selectedEventType.price && selectedEventType.price > 0 ? (
              <Badge variant="default">
                {formatCurrencyFromCents(
                  selectedEventType.price,
                  selectedEventType.currency ?? 'USD'
                )}
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{selectedEventType.length} minutes</span>
            </div>
            {dateDisplay && timeDisplay && (
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="text-primary h-4 w-4" />
                  <span>{dateDisplay}</span>
                </div>
                <div className="text-muted-foreground ml-6">
                  {timeDisplay} ({timeZone})
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mt-auto space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-3 transition-colors duration-200',
              step.isActive
                ? 'text-primary'
                : step.isCompleted
                  ? 'text-primary/70'
                  : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-all',
                step.isActive
                  ? 'border-primary bg-primary text-primary-foreground ring-primary/10 ring-4'
                  : step.isCompleted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-background'
              )}
            >
              {step.isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={cn('text-sm font-medium', step.isActive && 'font-bold')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
