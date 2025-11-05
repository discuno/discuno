import type { UseMutationResult } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Check, Mail, Phone as PhoneIcon, User } from 'lucide-react'
import { useState } from 'react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { validateEmail } from '~/lib/utils/validation'

interface AttendeeDetailsStepProps {
  selectedEventType: EventType | null
  selectedDate?: Date
  selectedTimeSlot: string | null
  formData: BookingFormData
  setFormData: (formData: BookingFormData) => void
  setCurrentStep: (step: 'calendar' | 'payment' | 'booking') => void
  createBookingMutation: UseMutationResult<void, Error, void>
}

export const AttendeeDetailsStep = ({
  selectedEventType,
  selectedDate,
  selectedTimeSlot,
  formData,
  setFormData,
  setCurrentStep,
  createBookingMutation,
}: AttendeeDetailsStepProps) => {
  const [emailError, setEmailError] = useState<string>('')
  const [nameError, setNameError] = useState<string>('')

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email })
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name })
    if (name && name.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
    } else {
      setNameError('')
    }
  }

  const isFormValid = formData.name.trim().length >= 2 && validateEmail(formData.email)

  return (
    <div className="slide-in-up h-full overflow-y-auto p-3">
      <div className="mb-2">
        <h2 className="text-base font-semibold">Your Details</h2>
        <p className="text-muted-foreground text-xs">
          Please provide your contact information for the booking
        </p>
      </div>

      <FieldGroup className="max-w-md space-y-2">
        <Field data-invalid={!!nameError} className="gap-1">
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <User className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              id="name"
              type="text"
              value={formData.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Your full name"
              aria-invalid={!!nameError}
              required
              minLength={2}
            />
            {!nameError && formData.name.trim().length >= 2 && (
              <InputGroupAddon align="inline-end">
                <Check className="h-4 w-4 text-green-500" />
              </InputGroupAddon>
            )}
          </InputGroup>
          <FieldError>{nameError}</FieldError>
        </Field>

        <Field data-invalid={!!emailError} className="gap-1">
          <FieldLabel htmlFor="email">Email Address</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Mail className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleEmailChange(e.target.value)}
              placeholder="your.email@example.com"
              aria-invalid={!!emailError}
              required
            />
            {!emailError && formData.email && validateEmail(formData.email) && (
              <InputGroupAddon align="inline-end">
                <Check className="h-4 w-4 text-green-500" />
              </InputGroupAddon>
            )}
          </InputGroup>
          <FieldError>{emailError}</FieldError>
        </Field>

        <Field className="gap-1">
          <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <PhoneIcon className="h-4 w-4" />
            </InputGroupAddon>
            <PhoneInput
              id="phone"
              international
              defaultCountry="US"
              value={formData.phone}
              onChange={value => setFormData({ ...formData, phone: value })}
              placeholder="Your phone number"
              className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
              data-slot="input-group-control"
            />
          </InputGroup>
          <FieldDescription className="text-xs">Optional - for SMS reminders</FieldDescription>
        </Field>

        {/* Booking Summary */}
        {selectedEventType && selectedTimeSlot && (
          <Card className="mt-3">
            <CardContent className="p-2.5">
              <h3 className="mb-1 text-sm font-medium">Booking Summary</h3>
              <div className="space-y-0 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session:</span>
                  <span className="font-medium">{selectedEventType.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{selectedDate?.toDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{format(new Date(selectedTimeSlot), 'p')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{selectedEventType.length} minutes</span>
                </div>
                <div className="mt-1 flex justify-between border-t pt-1">
                  <span className="font-medium">Price:</span>
                  <span className="font-semibold">
                    {selectedEventType.price && selectedEventType.price > 0
                      ? `$${(selectedEventType.price / 100).toFixed(2)} ${selectedEventType.currency}`
                      : 'Free'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('calendar')} size="sm">
            Back
          </Button>
          <Button
            onClick={() => {
              createBookingMutation.mutate()
            }}
            disabled={!isFormValid || createBookingMutation.isPending}
            className="flex-1"
            size="sm"
          >
            {createBookingMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : selectedEventType?.price && selectedEventType.price > 0 ? (
              'Continue to Payment'
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </div>
      </FieldGroup>
    </div>
  )
}
