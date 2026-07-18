import { TZDate } from '@date-fns/tz'
import type { UseMutationResult } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
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
  onReviewChange: (isReviewing: boolean) => void
  createBookingMutation: UseMutationResult<void, Error, void>
  detailsLocked: boolean
}

const ATTENDEE_NAME_MAX_LENGTH = 100
const ATTENDEE_EMAIL_MAX_LENGTH = 255

export const AttendeeDetailsStep = ({
  selectedEventType,
  selectedTimeSlot,
  timeZone,
  formData,
  setFormData,
  setCurrentStep,
  onReviewChange,
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
  const [isReviewing, setIsReviewing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const previousReviewState = useRef(isReviewing)

  const trimmedName = formData.name.trim()
  const trimmedEmail = formData.email.trim()
  const hasValidName = trimmedName.length >= 2 && trimmedName.length <= ATTENDEE_NAME_MAX_LENGTH
  const hasValidEmail =
    trimmedEmail.length <= ATTENDEE_EMAIL_MAX_LENGTH && validateEmail(trimmedEmail)
  const normalizedPhone = formData.phone.replace(/[\s\-().]/g, '')
  const hasValidPhone = /^\+[1-9]\d{7,14}$/.test(normalizedPhone)
  const hasValidTopic = formData.topic.trim().length >= 3 && formData.topic.trim().length <= 200
  const showNameError = (touched.name || attemptedSubmit) && !hasValidName
  const showEmailError = (touched.email || attemptedSubmit) && !hasValidEmail
  const showPhoneError = (touched.phone || attemptedSubmit) && !hasValidPhone
  const showTopicError = (touched.topic || attemptedSubmit) && !hasValidTopic

  useEffect(() => {
    if (previousReviewState.current === isReviewing) return
    previousReviewState.current = isReviewing
    const frame = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'start' })
      formRef.current
        ?.querySelector<HTMLElement>('[data-booking-step-heading]')
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [isReviewing])

  const setReviewing = (nextValue: boolean) => {
    setIsReviewing(nextValue)
    onReviewChange(nextValue)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (
      !hasValidName ||
      !hasValidEmail ||
      !hasValidPhone ||
      !hasValidTopic ||
      createBookingMutation.isPending
    ) {
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    if (!isReviewing) {
      setReviewing(true)
      return
    }

    createBookingMutation.mutate()
  }

  const formattedPrice =
    selectedEventType && (selectedEventType.price ?? 0) > 0
      ? formatCurrencyFromCents(selectedEventType.price ?? 0, selectedEventType.currency ?? 'USD')
      : 'Free'
  const selectedStart = selectedTimeSlot ? new TZDate(selectedTimeSlot, timeZone) : null
  const isPaid = (selectedEventType?.price ?? 0) > 0

  return (
    <div className="min-h-full px-5 py-5 sm:px-7 sm:py-6">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-2xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-5 -ml-3"
          onClick={() => {
            onReviewChange(false)
            setCurrentStep('calendar')
          }}
        >
          <ArrowLeft data-icon="inline-start" />
          Change time
        </Button>

        {!isReviewing ? (
          <>
            <header className="mb-7">
              <p className="text-muted-foreground text-xs font-medium">Step 3 of 4</p>
              <h2
                data-booking-step-heading
                tabIndex={-1}
                className="mt-1 text-xl font-semibold tracking-tight outline-none sm:text-2xl"
              >
                Your details
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                We will send the confirmation and meeting details to your email.
              </p>
            </header>

            <FieldGroup className="gap-6">
              <Field data-invalid={showTopicError} data-disabled={detailsLocked}>
                <FieldLabel htmlFor="booking-topic">
                  What would you like to talk through?
                </FieldLabel>
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
                  disabled={detailsLocked}
                  required
                />
                {showTopicError ? (
                  <FieldError id="booking-topic-error">
                    Share a short question or decision for the conversation.
                  </FieldError>
                ) : (
                  <FieldDescription id="booking-topic-help">A sentence is enough.</FieldDescription>
                )}
              </Field>

              <Field data-invalid={showNameError} data-disabled={detailsLocked}>
                <FieldLabel htmlFor="booking-name">Full name</FieldLabel>
                <Input
                  id="booking-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={event => setFormData({ ...formData, name: event.target.value })}
                  onBlur={() => setTouched(current => ({ ...current, name: true }))}
                  placeholder="Your full name"
                  maxLength={ATTENDEE_NAME_MAX_LENGTH}
                  aria-invalid={showNameError}
                  aria-describedby={showNameError ? 'booking-name-error' : undefined}
                  disabled={detailsLocked}
                  required
                />
                {showNameError && (
                  <FieldError id="booking-name-error">
                    {trimmedName.length > ATTENDEE_NAME_MAX_LENGTH
                      ? `Keep your name to ${ATTENDEE_NAME_MAX_LENGTH} characters or fewer.`
                      : 'Enter your full name.'}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={showEmailError} data-disabled={detailsLocked}>
                <FieldLabel htmlFor="booking-email">Email address</FieldLabel>
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
                  maxLength={ATTENDEE_EMAIL_MAX_LENGTH}
                  aria-invalid={showEmailError}
                  aria-describedby={showEmailError ? 'booking-email-error' : 'booking-email-help'}
                  disabled={detailsLocked}
                  required
                />
                {showEmailError ? (
                  <FieldError id="booking-email-error">
                    {trimmedEmail.length > ATTENDEE_EMAIL_MAX_LENGTH
                      ? `Keep your email to ${ATTENDEE_EMAIL_MAX_LENGTH} characters or fewer.`
                      : 'Enter a valid email address.'}
                  </FieldError>
                ) : (
                  <FieldDescription id="booking-email-help">
                    {isPaid
                      ? 'Your receipt and calendar invitation will be sent here.'
                      : 'Your calendar invitation and meeting details will be sent here.'}
                  </FieldDescription>
                )}
              </Field>

              <Field data-invalid={showPhoneError} data-disabled={detailsLocked}>
                <FieldLabel htmlFor="booking-phone">Mobile number</FieldLabel>
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
                  disabled={detailsLocked}
                  required
                />
                {showPhoneError ? (
                  <FieldError id="booking-phone-error">
                    Include your country code, for example +1 555 123 4567.
                  </FieldError>
                ) : (
                  <FieldDescription id="booking-phone-help">
                    Used for session coordination and enabled reminders.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>

            <Button type="submit" size="lg" className="mt-7 w-full">
              Review booking
              <ArrowRight data-icon="inline-end" />
            </Button>
          </>
        ) : (
          <>
            <header className="mb-7">
              <p className="text-muted-foreground text-xs font-medium">Step 4 of 4</p>
              <h2
                data-booking-step-heading
                tabIndex={-1}
                className="mt-1 text-xl font-semibold tracking-tight outline-none sm:text-2xl"
              >
                Review booking
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Confirm the session, time, and contact details below.
              </p>
            </header>

            {detailsLocked && (
              <Alert className="mb-6">
                <LockKeyhole />
                <AlertTitle>Details locked for this payment attempt</AlertTitle>
                <AlertDescription>
                  Choose a new time to start a new attempt with different details.
                </AlertDescription>
              </Alert>
            )}

            <dl className="divide-y border-y text-sm">
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Session</dt>
                <dd className="font-medium break-words">
                  {selectedEventType?.title ?? 'Not selected'}
                  {selectedEventType && (
                    <span className="text-muted-foreground ml-2 font-normal">
                      {selectedEventType.length} minutes
                    </span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Date and time</dt>
                <dd>
                  {selectedStart
                    ? format(selectedStart, "EEEE, MMMM d, yyyy 'at' h:mm a")
                    : 'Not selected'}
                  <span className="text-muted-foreground block text-xs break-words">
                    {timeZone}
                  </span>
                </dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Price</dt>
                <dd>
                  {formattedPrice}
                  {isPaid && (
                    <span className="text-muted-foreground block text-xs">
                      Applicable taxes are calculated at checkout. Discuno adds no service fee.
                    </span>
                  )}
                </dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Question</dt>
                <dd className="break-words whitespace-pre-wrap">{formData.topic}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="break-words">{formData.name}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-words">{formData.email}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-muted-foreground">Mobile</dt>
                <dd>{formData.phone}</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:flex-1"
                disabled={detailsLocked || createBookingMutation.isPending}
                onClick={() => setReviewing(false)}
              >
                Edit details
              </Button>
              <Button
                type="submit"
                size="lg"
                className="sm:flex-1"
                disabled={createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    {isPaid ? 'Opening checkout…' : 'Confirming session…'}
                  </>
                ) : (
                  <>
                    {isPaid ? 'Continue to checkout' : 'Confirm session'}
                    <ArrowRight data-icon="inline-end" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
