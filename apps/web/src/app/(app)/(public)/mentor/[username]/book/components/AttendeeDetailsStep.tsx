import { TZDate } from '@date-fns/tz'
import type { UseMutationResult } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Spinner } from '~/components/ui/spinner'
import { formatCurrencyFromCents } from '~/lib/format-currency'
import { validateEmail } from '~/lib/utils/validation'

interface AttendeeDetailsStepProps {
  selectedEventType: EventType | null
  selectedTimeSlot: string | null
  timeZone: string
  formData: BookingFormData
  setFormData: (formData: BookingFormData) => void
  setCurrentStep: (step: 'calendar' | 'booking') => void
  createBookingMutation: UseMutationResult<void, Error, void>
  detailsLocked: boolean
}

export const AttendeeDetailsStep = ({
  selectedEventType,
  selectedTimeSlot,
  timeZone,
  formData,
  setFormData,
  setCurrentStep,
  createBookingMutation,
  detailsLocked,
}: AttendeeDetailsStepProps) => {
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    topic: false,
  })
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const hasValidName = formData.name.trim().length >= 2
  const hasValidEmail = validateEmail(formData.email)
  const normalizedPhone = formData.phone.replace(/[\s\-().]/g, '')
  const hasValidPhone = /^\+[1-9]\d{7,14}$/.test(normalizedPhone)
  const hasValidTopic = formData.topic.trim().length >= 3 && formData.topic.trim().length <= 200
  const showNameError = (touched.name || attemptedSubmit) && !hasValidName
  const showEmailError = (touched.email || attemptedSubmit) && !hasValidEmail
  const showPhoneError = (touched.phone || attemptedSubmit) && !hasValidPhone
  const showTopicError = (touched.topic || attemptedSubmit) && !hasValidTopic

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (
      !hasValidName ||
      !hasValidEmail ||
      !hasValidPhone ||
      !hasValidTopic ||
      createBookingMutation.isPending
    )
      return
    createBookingMutation.mutate()
  }

  const formattedPrice =
    selectedEventType && (selectedEventType.price ?? 0) > 0
      ? formatCurrencyFromCents(selectedEventType.price ?? 0, selectedEventType.currency ?? 'USD')
      : 'Free'

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-5 -ml-3"
          onClick={() => setCurrentStep('calendar')}
        >
          <ArrowLeft className="h-4 w-4" />
          Change time
        </Button>

        <div className="mb-7">
          <p className="text-primary mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            Final step
          </p>
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">Your details</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            No account required. We’ll email your confirmation and meeting details.
          </p>
        </div>

        {selectedEventType && selectedTimeSlot && (
          <div className="bg-muted/40 mb-7 rounded-xl border px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-foreground text-sm font-medium">{selectedEventType.title}</p>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new TZDate(selectedTimeSlot, timeZone), 'EEE, MMM d')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new TZDate(selectedTimeSlot, timeZone), 'h:mm a')} ·{' '}
                    {selectedEventType.length} min
                  </span>
                </div>
              </div>
              <span className="text-foreground text-sm font-semibold">{formattedPrice}</span>
            </div>
            {(selectedEventType.price ?? 0) > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                You pay the listed price plus applicable taxes. Discuno adds no service fee.
              </p>
            )}
          </div>
        )}

        <div className="space-y-5">
          {detailsLocked && (
            <p className="bg-muted/40 text-muted-foreground rounded-lg border px-3 py-2 text-xs leading-5">
              These details are fixed for this payment attempt. To edit them, choose Change time and
              select a time again.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="booking-topic">What would you like to talk through?</Label>
            <Input
              id="booking-topic"
              name="topic"
              type="text"
              value={formData.topic}
              onChange={event => setFormData({ ...formData, topic: event.target.value })}
              onBlur={() => setTouched(current => ({ ...current, topic: true }))}
              placeholder="For example: choosing between two majors"
              maxLength={200}
              aria-invalid={showTopicError}
              aria-describedby={showTopicError ? 'booking-topic-error' : 'booking-topic-help'}
              className="h-11"
              disabled={detailsLocked}
              required
            />
            {showTopicError ? (
              <p id="booking-topic-error" className="text-destructive text-xs" role="alert">
                Share a short question or decision for the conversation.
              </p>
            ) : (
              <p id="booking-topic-help" className="text-muted-foreground text-xs">
                A sentence is enough. It helps your mentor arrive ready for the decision at hand.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-name">Full name</Label>
            <Input
              id="booking-name"
              name="name"
              type="text"
              autoComplete="name"
              value={formData.name}
              onChange={event => setFormData({ ...formData, name: event.target.value })}
              onBlur={() => setTouched(current => ({ ...current, name: true }))}
              placeholder="Your full name"
              aria-invalid={showNameError}
              aria-describedby={showNameError ? 'booking-name-error' : undefined}
              className="h-11"
              disabled={detailsLocked}
              required
            />
            {showNameError && (
              <p id="booking-name-error" className="text-destructive text-xs" role="alert">
                Enter your full name.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-email">Email address</Label>
            <Input
              id="booking-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={formData.email}
              onChange={event => setFormData({ ...formData, email: event.target.value })}
              onBlur={() => setTouched(current => ({ ...current, email: true }))}
              placeholder="you@example.com"
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? 'booking-email-error' : 'booking-email-help'}
              className="h-11"
              disabled={detailsLocked}
              required
            />
            {showEmailError ? (
              <p id="booking-email-error" className="text-destructive text-xs" role="alert">
                Enter a valid email address.
              </p>
            ) : (
              <p id="booking-email-help" className="text-muted-foreground text-xs">
                Your receipt and calendar invitation will be sent here.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-phone">Mobile number</Label>
            <Input
              id="booking-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={event => setFormData({ ...formData, phone: event.target.value })}
              onBlur={() => setTouched(current => ({ ...current, phone: true }))}
              placeholder="+1 555 123 4567"
              aria-invalid={showPhoneError}
              aria-describedby={showPhoneError ? 'booking-phone-error' : 'booking-phone-help'}
              className="h-11"
              disabled={detailsLocked}
              required
            />
            {showPhoneError ? (
              <p id="booking-phone-error" className="text-destructive text-xs" role="alert">
                Include your country code, for example +1 555 123 4567.
              </p>
            ) : (
              <p id="booking-phone-help" className="text-muted-foreground text-xs">
                Used only for session coordination and any reminders the mentor has enabled.
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-7 w-full"
          disabled={createBookingMutation.isPending}
        >
          {createBookingMutation.isPending ? (
            <>
              <Spinner />
              {(selectedEventType?.price ?? 0) > 0
                ? 'Opening secure checkout…'
                : 'Confirming your session…'}
            </>
          ) : (
            <>
              {(selectedEventType?.price ?? 0) > 0
                ? 'Continue to secure checkout'
                : 'Confirm session'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-center text-xs">
          <LockKeyhole className="h-3.5 w-3.5" />
          Secure booking. Your details are used to coordinate this session.
        </p>
      </form>
    </div>
  )
}
