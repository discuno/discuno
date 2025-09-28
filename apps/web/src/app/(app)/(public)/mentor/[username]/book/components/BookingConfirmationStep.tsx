import { CheckCircle } from 'lucide-react'

export const BookingConfirmationStep = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <CheckCircle className="text-success mb-4 h-16 w-16" />
      <h2 className="mb-2 text-2xl font-semibold">Booking Confirmed!</h2>
      <p className="text-muted-foreground">
        Please look out for a booking confirmation email with all the details.
      </p>
    </div>
  )
}
