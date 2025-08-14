import type { UseMutationResult } from '@tanstack/react-query'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import type { EventType } from '~/app/(app)/(public)/mentor/[username]/book/actions'
import type { BookingFormData } from '~/app/(app)/(public)/mentor/[username]/book/components/BookingEmbed'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

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
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 p-6 duration-200">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Your Details</h2>
        <p className="text-muted-foreground text-sm">
          Please provide your contact information for the booking
        </p>
      </div>

      <div className="max-w-md space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your full name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number (optional for reminders)</Label>
          <PhoneInput
            id="phone"
            international
            defaultCountry="US"
            value={formData.phone}
            onChange={value => setFormData({ ...formData, phone: value })}
            placeholder="Your phone number"
          />
        </div>

        {/* Booking Summary */}
        {selectedEventType && selectedTimeSlot && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <h3 className="mb-2 font-medium">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Session:</span>
                  <span>{selectedEventType.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{selectedDate?.toDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{selectedTimeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{selectedEventType.length} minutes</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Price:</span>
                  <span>
                    {selectedEventType.price && selectedEventType.price > 0
                      ? `$${(selectedEventType.price / 100).toFixed(2)} ${selectedEventType.currency}`
                      : 'Free'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentStep('calendar')}>
            Back
          </Button>
          <Button
            onClick={() => createBookingMutation.mutate()}
            disabled={!formData.name || !formData.email || createBookingMutation.isPending}
            className="flex-1"
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
      </div>
    </div>
  )
}
